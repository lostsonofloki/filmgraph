/* global process, console */

/**
 * Scheduled Supabase keep-alive runner.
 *
 * Usage:
 *   node scripts/supabase-keepalive.mjs
 *   npm run supabase:keepalive
 *
 * Exits non-zero when the database could not be reached so the scheduled CI job turns red
 * (and emails) while there is still time to act, rather than after the project is paused.
 */

import fs from "node:fs";
import { runKeepalive, formatKeepaliveResult } from "./lib/supabase-keepalive.mjs";

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
  const result = await runKeepalive({ source });
  const report = formatKeepaliveResult(result);

  if (result.ok) {
    console.log(report);
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
    ].join("\n"),
  );

  process.exit(result.ok ? 0 : 1);
};

main().catch((error) => {
  console.error(`Supabase keep-alive crashed: ${error?.stack || error}`);
  process.exit(1);
});
