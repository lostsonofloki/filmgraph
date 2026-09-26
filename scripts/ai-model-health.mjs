/* global process, console */

/**
 * Scheduled AI model availability check.
 *
 * Usage:
 *   node scripts/ai-model-health.mjs
 *   npm run ai:model-health
 *
 * Every AI outage this app has had was a vendor retiring a model id we had hardcoded, found
 * by a user hitting a dead feature: Groq dropped two llama ids, Google dropped all four of its
 * 1.5/2.0 ids at once, and OpenRouter dropped `google/gemini-2.0-flash-001`. Fallback ladders
 * absorb the first retirement in a list; they cannot tell anyone the list is being eaten.
 *
 * So this asks each vendor which models it still serves and compares that against the exact
 * ids `src/config/aiModels.js` ships, exiting non-zero the moment one is gone. It reads model
 * lists rather than sending completions, so a daily run costs no tokens and cannot trip a rate
 * limit.
 */

import fs from "node:fs";
import { MODEL_LADDERS } from "../src/config/aiModels.js";

const loadLocalEnvFile = () => {
  if (process.env.CI) return;
  try {
    if (fs.existsSync(".env")) {
      process.loadEnvFile(".env");
    }
  } catch {
    // Local convenience only; CI supplies real environment variables.
  }
};

/** Accepts the bundler-prefixed names too, so a local `.env` works without duplication. */
const readKey = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return null;
};

const FETCH_TIMEOUT_MS = 20000;

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return body;
};

/**
 * One entry per provider: how to authenticate, and how to turn its model list into the flat
 * set of ids we can compare against a ladder.
 */
const PROVIDERS = {
  groq: {
    label: "Groq",
    keyNames: ["GROQ_API_KEY", "VITE_GROQ_API_KEY"],
    secretName: "GROQ_API_KEY",
    listModels: async (key) => {
      const body = await fetchJson("https://api.groq.com/openai/v1/models", {
        Authorization: `Bearer ${key}`,
      });
      return (body?.data || []).map((model) => model.id);
    },
  },
  gemini: {
    label: "Google Gemini",
    keyNames: ["GEMINI_API_KEY", "VITE_GEMINI_API_KEY"],
    secretName: "GEMINI_API_KEY",
    listModels: async (key) => {
      const body = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
      );
      // An id that exists but cannot answer generateContent is just as dead to this app.
      return (body?.models || [])
        .filter((model) => (model.supportedGenerationMethods || []).includes("generateContent"))
        .map((model) => String(model.name).replace(/^models\//, ""));
    },
  },
  openrouter: {
    label: "OpenRouter",
    keyNames: ["OPENROUTER_API_KEY", "VITE_OPENROUTER_API_KEY"],
    secretName: "OPENROUTER_API_KEY",
    // The catalogue is public; a key only matters for completions.
    keyOptional: true,
    listModels: async (key) => {
      const body = await fetchJson(
        "https://openrouter.ai/api/v1/models",
        key ? { Authorization: `Bearer ${key}` } : {},
      );
      return (body?.data || []).map((model) => model.id);
    },
  },
};

const checkProvider = async (name, models) => {
  const provider = PROVIDERS[name];
  const key = readKey(...provider.keyNames);

  if (!key && !provider.keyOptional) {
    return { name, label: provider.label, status: "skipped", reason: "no API key in environment" };
  }

  let available;
  try {
    available = await provider.listModels(key);
  } catch (error) {
    // A vendor being unreachable right now is not the same as a model being retired, and it
    // must not be reported as one.
    return { name, label: provider.label, status: "unreachable", reason: error.message };
  }

  const live = new Set(available);
  const results = models.map((id) => ({ id, present: live.has(id) }));
  const missing = results.filter((entry) => !entry.present).map((entry) => entry.id);

  return {
    name,
    label: provider.label,
    status: missing.length === 0 ? "ok" : "retired",
    results,
    missing,
    availableCount: available.length,
  };
};

const formatReport = (checks) => {
  const lines = [];

  for (const check of checks) {
    if (check.status === "skipped") {
      lines.push(`- ${check.label}: skipped (${check.reason})`);
      continue;
    }
    if (check.status === "unreachable") {
      lines.push(`- ${check.label}: unreachable (${check.reason})`);
      continue;
    }

    lines.push(
      `- ${check.label}: ${check.status === "ok" ? "all models available" : `${check.missing.length} retired`} (${check.availableCount} models offered)`,
    );
    for (const entry of check.results) {
      lines.push(`    ${entry.present ? "ok  " : "GONE"}  ${entry.id}`);
    }
  }

  return lines.join("\n");
};

const appendStepSummary = (body) => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    fs.appendFileSync(summaryPath, `${body}\n`);
  } catch {
    // Never fail the run over summary formatting.
  }
};

const main = async () => {
  loadLocalEnvFile();

  const checks = [];
  for (const [name, models] of Object.entries(MODEL_LADDERS)) {
    checks.push(await checkProvider(name, models));
  }

  const report = formatReport(checks);
  const retired = checks.filter((check) => check.status === "retired");
  const unreachable = checks.filter((check) => check.status === "unreachable");
  const skipped = checks.filter((check) => check.status === "skipped");

  // A ladder that has lost its first choice still works, so the distinction that matters is
  // whether any usable model is left. Losing every id in a ladder is the outage.
  const exhausted = retired.filter(
    (check) => check.missing.length === check.results.length,
  );

  console.log(report);

  for (const check of retired) {
    const level = exhausted.includes(check) ? "error" : "warning";
    console.log(
      `::${level} title=${check.label} models retired::${check.missing.join(", ")} — update src/config/aiModels.js`,
    );
  }
  for (const check of unreachable) {
    console.log(`::warning title=${check.label} unreachable::${check.reason}`);
  }
  for (const check of skipped) {
    console.log(
      `::warning title=${check.label} not checked::Set the ${PROVIDERS[check.name].secretName} repository secret to enable this check.`,
    );
  }

  appendStepSummary(
    [
      "## AI model health",
      "",
      exhausted.length > 0
        ? `> **${exhausted.map((c) => c.label).join(", ")} has no usable model left.** That provider is down until \`src/config/aiModels.js\` is updated.`
        : retired.length > 0
          ? `> ${retired.map((c) => c.label).join(", ")} lost a model but still has a working fallback. Replace the retired id before the ladder runs out.`
          : "> Every configured model is still served.",
      "",
      "```",
      report,
      "```",
    ].join("\n"),
  );

  // Any retirement fails the run: a ladder quietly down to its last option is exactly the
  // state that turned into a user-facing outage three times already.
  process.exit(retired.length > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error(`AI model health check crashed: ${error?.stack || error}`);
  process.exit(1);
});
