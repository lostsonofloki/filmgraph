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

  // Absent credentials are a setup state, not a liveness signal, so they follow the same
  // convention as the Vercel investigation workflow and exit gracefully rather than
  // painting the schedule red every day until someone fills the secrets in. A warning
  // annotation keeps it visible on the run so it cannot rot unnoticed.
  const isSetupNeeded = result.status === "not-configured";

  if (result.ok) {
    console.log(report);
  } else if (isSetupNeeded) {
    console.log(`::warning title=Supabase keep-alive not configured::${result.error}`);
    console.log(
      [
        report,
        "",
        "Set the SUPABASE_URL and SUPABASE_ANON_KEY repository secrets to enable this job.",
        "The Vercel cron in api/supabase-keepalive.js pings the same database independently,",
        "so the project is not necessarily unprotected while this one is idle.",
      ].join("\n"),
    );
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
        ? "\n> Add the `SUPABASE_URL` and `SUPABASE_ANON_KEY` repository secrets to enable this job."
        : "",
    ].join("\n"),
  );

  process.exit(result.ok || isSetupNeeded ? 0 : 1);
};

main().catch((error) => {
  console.error(`Supabase keep-alive crashed: ${error?.stack || error}`);
  process.exit(1);
});
