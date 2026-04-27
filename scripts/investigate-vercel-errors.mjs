import fs from "node:fs/promises";
import path from "node:path";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_iIkI4ciHrkV9Jd3bZtoT1bljjJQn";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_QdNpBui25BY0NLPgy4c3Ozub";
const REPORT_PATH = process.env.REPORT_PATH || "artifacts/vercel-error-report.md";
const TOP_N = Number(process.env.TOP_N || "10");
const LOOKBACK_HOURS = Number(process.env.LOOKBACK_HOURS || "24");

function nowMs() {
  return Date.now();
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function lookbackMs(hours) {
  return nowMs() - hours * 60 * 60 * 1000;
}

function deploymentState(dep) {
  return dep?.readyState || dep?.state || "UNKNOWN";
}

function signatureFor(dep) {
  const code =
    dep?.errorCode ||
    dep?.readyStateReason ||
    dep?.meta?.githubCommitMessage ||
    dep?.meta?.githubCommitRef ||
    "unspecified-vercel-error";
  return String(code).slice(0, 220);
}

async function vercelRequest(urlPath) {
  if (!VERCEL_TOKEN) {
    throw new Error("Missing VERCEL_TOKEN.");
  }

  const endpoint = `https://api.vercel.com${urlPath}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  const raw = await response.text();
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }

  if (!response.ok) {
    throw new Error(`Vercel API ${response.status}: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

function clusterDeployments(deployments) {
  const clusters = new Map();

  for (const dep of deployments) {
    const key = signatureFor(dep);
    const existing = clusters.get(key);
    const depCreatedAt = dep?.createdAt || 0;
    const depUrl = dep?.url ? `https://${dep.url}` : "n/a";
    const depState = deploymentState(dep);

    if (!existing) {
      clusters.set(key, {
        signature: key,
        count: 1,
        states: new Set([depState]),
        latestSeen: depCreatedAt,
        deploymentIds: [dep.uid || dep.id || "unknown"],
        sample: {
          id: dep.uid || dep.id || "unknown",
          state: depState,
          createdAt: depCreatedAt,
          commit: dep?.meta?.githubCommitSha || "n/a",
          branch: dep?.meta?.githubCommitRef || "n/a",
          url: depUrl
        }
      });
      continue;
    }

    existing.count += 1;
    existing.states.add(depState);
    existing.latestSeen = Math.max(existing.latestSeen, depCreatedAt);
    existing.deploymentIds.push(dep.uid || dep.id || "unknown");
  }

  return [...clusters.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.latestSeen - a.latestSeen;
    })
    .slice(0, TOP_N)
    .map((cluster) => ({
      ...cluster,
      states: [...cluster.states]
    }));
}

function buildSetupReport() {
  return [
    "# Daily Vercel Error Investigation",
    "",
    "Investigation skipped because Vercel credentials are not configured.",
    "",
    "## Missing Configuration",
    "- `VERCEL_TOKEN`",
    "",
    "## Optional Configuration",
    "- `VERCEL_PROJECT_ID`",
    "- `VERCEL_TEAM_ID`",
    "",
    "## Next Actions",
    "- Add `VERCEL_TOKEN` as a GitHub repository secret.",
    "- Re-run this workflow manually after setting the secret.",
    "- Keep `VERCEL_PROJECT_ID` and `VERCEL_TEAM_ID` aligned with `.vercel/project.json`.",
    ""
  ].join("\n");
}

function buildMarkdownReport(clusters, failures, windowStart, windowEnd) {
  const lines = [
    "# Daily Vercel Error Investigation",
    "",
    `- Window: \`${toIso(windowStart)}\` -> \`${toIso(windowEnd)}\``,
    `- Project: \`${VERCEL_PROJECT_ID}\``,
    `- Team: \`${VERCEL_TEAM_ID || "n/a"}\``,
    `- Failure deployments: \`${failures.length}\``,
    `- Root-cause clusters: \`${clusters.length}\``,
    "",
    "## Top Error Clusters",
    ""
  ];

  if (!failures.length) {
    lines.push("No failed/canceled deployments found in the time window.");
    lines.push("");
    lines.push("## Next Actions");
    lines.push("- Keep monitoring daily trend.");
    lines.push("- If users report errors, widen lookback window to 72h.");
    return lines.join("\n");
  }

  clusters.forEach((cluster, idx) => {
    const sample = cluster.sample;
    lines.push(`### ${idx + 1}) ${cluster.signature}`);
    lines.push(`- Frequency: **${cluster.count}** failed/canceled deployments`);
    lines.push(`- States: \`${cluster.states.join(", ")}\``);
    lines.push(`- Last seen: \`${toIso(cluster.latestSeen)}\``);
    lines.push(`- Sample deployment: \`${sample.id}\``);
    lines.push(`- Branch/commit: \`${sample.branch}\` / \`${sample.commit}\``);
    lines.push(`- Deployment URL: ${sample.url}`);
    lines.push(`- Related IDs: \`${cluster.deploymentIds.slice(0, 5).join(", ")}\``);
    lines.push("- Root cause hypothesis: _Correlate with recent code/config changes._");
    lines.push("- Fix recommendation: _Apply lowest-risk patch and verify next deployment._");
    lines.push("");
  });

  lines.push("## Next Actions");
  lines.push("- Triage top 1-2 clusters first (highest frequency + recency).");
  lines.push("- Map to recent commits and configuration changes.");
  lines.push("- Add regression checks where possible.");

  return lines.join("\n");
}

async function main() {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });

  if (!VERCEL_TOKEN) {
    const setup = buildSetupReport();
    await fs.writeFile(REPORT_PATH, setup, "utf8");
    console.log(`Wrote ${REPORT_PATH} (setup required).`);
    return;
  }

  const windowStart = lookbackMs(LOOKBACK_HOURS);
  const windowEnd = nowMs();
  const query = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    limit: "100",
    teamId: VERCEL_TEAM_ID
  });

  const payload = await vercelRequest(`/v6/deployments?${query.toString()}`);
  const deployments = Array.isArray(payload?.deployments) ? payload.deployments : [];
  const failures = deployments.filter((dep) => {
    const createdAt = dep?.createdAt || 0;
    const state = deploymentState(dep);
    const failedState = state === "ERROR" || state === "CANCELED";
    return createdAt >= windowStart && failedState;
  });

  const clusters = clusterDeployments(failures);
  const report = buildMarkdownReport(clusters, failures, windowStart, windowEnd);
  await fs.writeFile(REPORT_PATH, report, "utf8");
  console.log(`Wrote ${REPORT_PATH} with ${clusters.length} clusters.`);
}

main().catch((error) => {
  console.error("Vercel investigation failed:", error.message);
  process.exitCode = 1;
});
