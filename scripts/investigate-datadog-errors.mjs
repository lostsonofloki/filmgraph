import fs from "node:fs/promises";
import path from "node:path";

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const DATADOG_APP_KEY = process.env.DATADOG_APP_KEY;
const DATADOG_SITE = normalizeSite(process.env.DATADOG_SITE || "datadoghq.com");
const DATADOG_ERROR_QUERY = process.env.DATADOG_ERROR_QUERY || "service:ignes env:prod";
const REPORT_PATH = process.env.REPORT_PATH || "artifacts/datadog-error-report.md";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TOP_N = Number(process.env.TOP_N || "10");
const DATADOG_TRACK = process.env.DATADOG_TRACK || "logs";
const DATADOG_PERSONA = process.env.DATADOG_PERSONA || "BACKEND";

function nowMs() {
  return Date.now();
}

function oneDayAgoMs() {
  return nowMs() - 24 * 60 * 60 * 1000;
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function normalizeSite(siteInput) {
  const raw = String(siteInput).trim().toLowerCase();
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const host = withoutProtocol.replace(/^app\./, "").replace(/\/.*$/, "");
  const trimmedApiPrefix = host.replace(/^api\./, "");
  if (!trimmedApiPrefix || trimmedApiPrefix === "datadoghq.com") return "datadoghq.com";
  return trimmedApiPrefix;
}

async function ddRequest(urlPath, body) {
  if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
    throw new Error("Missing DATADOG_API_KEY or DATADOG_APP_KEY.");
  }

  const endpoint = `https://api.${DATADOG_SITE}${urlPath}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "DD-API-KEY": DATADOG_API_KEY,
      "DD-APPLICATION-KEY": DATADOG_APP_KEY
    },
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }

  if (!response.ok) {
    const details = typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed);
    throw new Error(`Datadog API ${response.status}: ${details}`);
  }

  return parsed;
}

function parseIssue(record, includedById) {
  const resultAttrs = record?.attributes || {};
  const issueRelId = record?.relationships?.issue?.data?.id || record?.id;
  const issueAttrs = includedById.get(issueRelId)?.attributes || {};

  const title = issueAttrs.error_message || issueAttrs.error_type || "Unknown error";
  const service = issueAttrs.service || resultAttrs.service || "unknown-service";
  const env = issueAttrs.env || resultAttrs.env || "unknown-env";
  const platform = issueAttrs.platform || "UNKNOWN";
  const totalCount = resultAttrs.total_count ?? 0;
  const impactedSessions = resultAttrs.impacted_sessions ?? 0;
  const firstSeen = issueAttrs.first_seen ? toIso(issueAttrs.first_seen) : "n/a";
  const lastSeen = issueAttrs.last_seen ? toIso(issueAttrs.last_seen) : "n/a";
  const filePath = issueAttrs.file_path || "n/a";
  const functionName = issueAttrs.function_name || "n/a";

  return {
    issueId: issueRelId || record?.id || "unknown-issue",
    signature: `${service} :: ${title}`.slice(0, 220),
    title,
    service,
    env,
    platform,
    totalCount,
    impactedSessions,
    firstSeen,
    lastSeen,
    filePath,
    functionName
  };
}

function clusterBySignature(issues) {
  const clusters = new Map();
  for (const issue of issues) {
    const key = issue.signature;
    const existing = clusters.get(key);
    if (!existing) {
      clusters.set(key, {
        signature: key,
        service: issue.service,
        env: issue.env,
        totalCount: issue.totalCount,
        impactedSessions: issue.impactedSessions,
        issueIds: [issue.issueId],
        examples: [issue]
      });
      continue;
    }
    existing.totalCount += issue.totalCount;
    existing.impactedSessions += issue.impactedSessions;
    existing.issueIds.push(issue.issueId);
    if (existing.examples.length < 2) existing.examples.push(issue);
  }

  return [...clusters.values()].sort((a, b) => {
    const scoreA = a.totalCount * 10 + a.impactedSessions;
    const scoreB = b.totalCount * 10 + b.impactedSessions;
    return scoreB - scoreA;
  });
}

function buildMarkdownReport(clusters, windowStart, windowEnd) {
  const lines = [
    "# Daily Datadog Error Investigation",
    "",
    `- Window: \`${toIso(windowStart)}\` -> \`${toIso(windowEnd)}\``,
    `- Query: \`${DATADOG_ERROR_QUERY}\``,
    `- Cluster count: \`${clusters.length}\``,
    "",
    "## Top Root-Cause Clusters",
    ""
  ];

  if (clusters.length === 0) {
    lines.push("No high-impact issues matched the query in this window.");
    return lines.join("\n");
  }

  clusters.slice(0, TOP_N).forEach((cluster, idx) => {
    const sample = cluster.examples[0];
    lines.push(`### ${idx + 1}) ${cluster.signature}`);
    lines.push(`- Frequency: **${cluster.totalCount}**`);
    lines.push(`- User impact (sessions): **${cluster.impactedSessions}**`);
    lines.push(`- Service/env: \`${cluster.service}\` / \`${cluster.env}\``);
    lines.push(`- Last seen: \`${sample.lastSeen}\``);
    lines.push(`- Trace hint: \`${sample.filePath}\` :: \`${sample.functionName}\``);
    lines.push(`- Issue IDs: \`${cluster.issueIds.slice(0, 5).join(", ")}\``);
    lines.push("- Hypothesis: _Add investigation notes and deployment correlation here._");
    lines.push("- Fix recommendation: _Add a low-risk fix plan or create follow-up task._");
    lines.push("");
  });

  lines.push("## Next Actions");
  lines.push("- Validate top 1-2 hypotheses against recent deploys and stack traces.");
  lines.push("- Land only high-confidence, low-risk fixes.");
  lines.push("- Add regression tests for fixed failure modes.");

  return lines.join("\n");
}

async function maybeSendSlack(markdown, clusters) {
  if (!SLACK_WEBHOOK_URL) return;
  const preview = clusters
    .slice(0, 3)
    .map((c, i) => `${i + 1}. ${c.signature} (count=${c.totalCount}, sessions=${c.impactedSessions})`)
    .join("\n");

  const text = [
    "*Daily Datadog Error Investigation*",
    `Query: ${DATADOG_ERROR_QUERY}`,
    clusters.length ? preview : "No matching high-impact issues in the last 24h.",
    `Report file: ${REPORT_PATH}`
  ].join("\n");

  await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
}

async function main() {
  const windowStart = oneDayAgoMs();
  const windowEnd = nowMs();

  const payload = {
    data: {
      type: "search_request",
      attributes: {
        from: windowStart,
        to: windowEnd,
        query: DATADOG_ERROR_QUERY,
        track: DATADOG_TRACK,
        persona: DATADOG_PERSONA,
        order_by: "TOTAL_COUNT"
      }
    }
  };

  const response = await ddRequest("/api/v2/error-tracking/issues/search", payload);
  const data = Array.isArray(response?.data) ? response.data : [];
  const included = Array.isArray(response?.included) ? response.included : [];
  const includedById = new Map(included.map((item) => [item?.id, item]));

  const issues = data.map((record) => parseIssue(record, includedById));
  const clusters = clusterBySignature(issues);
  const report = buildMarkdownReport(clusters, windowStart, windowEnd);

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, "utf8");
  await maybeSendSlack(report, clusters);

  console.log(`Wrote ${REPORT_PATH} with ${clusters.length} clusters.`);
}

main().catch((error) => {
  console.error("Datadog investigation failed:", error.message);
  process.exitCode = 1;
});
