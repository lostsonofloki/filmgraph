/**
 * Scheduled Supabase keep-alive runner.
 *
 * Usage:
 *   node scripts/supabase-keepalive.mjs
 *   npm run supabase:keepalive
 *
 * Exits non-zero when the database could not be reached, including when credentials are
 * missing. A green run with empty secrets does not count as activity and must not look
 * successful.
 */

import fs from "node:fs";
import {
  formatKeepaliveResult,
  pingKeepaliveEndpoint,
  resolveKeepaliveConfig,
  runKeepalive,
} from "./lib/supabase-keepalive.mjs";

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

  const source = process.env.KEEPALIVE_SOURCE || (process.env.CI ? "github-actions" : "cli");
  const config = resolveKeepaliveConfig();

  // Direct PostgREST is preferred: it does not depend on the website being up. The
  // protected route is the fallback for a scheduler that only has CRON_SECRET.
  let result;
  if (config.isConfigured) {
    result = await runKeepalive({ source });
  } else if (process.env.KEEPALIVE_URL && process.env.CRON_SECRET) {
    result = await pingKeepaliveEndpoint({
      url: process.env.KEEPALIVE_URL,
      secret: process.env.CRON_SECRET,
    });
    result.source = source;
  } else {
    result = {
      ok: false,
      status: "not-configured",
      source,
      durationMs: 0,
      error:
        "Missing required configuration: set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) for a direct read, or KEEPALIVE_URL and CRON_SECRET to call the protected route.",
    };
  }

  const report = result.detail || formatKeepaliveResult(result);
  const isSetupNeeded = result.status === "not-configured";

  // Missing credentials used to exit 0. That painted ten straight days of green runs
  // while the job never queried Postgres, which is how the pause warning got through.
  if (result.ok) {
    console.log(report);
  } else if (isSetupNeeded) {
    console.error(`::error title=Supabase keep-alive not configured::${result.error}`);
    console.error(report);
  } else {
    console.error(report);
  }

  appendStepSummary(
    [
      "## Supabase keep-alive",
      "",
      `- Result: **${result.status}**`,
      `- Source: \`${source}\``,
      `- Duration: ${result.durationMs}ms`,
      "",
      "```",
      report,
      "```",
      result.status === "paused"
        ? "\n> The project is already paused. Restore it from the Supabase dashboard, then re-run this job."
        : "",
      isSetupNeeded
        ? "\n> Set `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or `CRON_SECRET` plus `KEEPALIVE_URL`, or this job cannot reach the database."
        : "",
    ].join("\n"),
  );

  process.exit(result.ok ? 0 : 1);
};

main().catch((error) => {
  console.error(`Supabase keep-alive crashed: ${error?.stack || error}`);
  process.exit(1);
});
