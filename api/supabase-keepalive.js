/* global process */

/**
 * Vercel cron target for the Supabase keep-alive ping.
 *
 * This is the second of two independent triggers. The GitHub Actions schedule is the
 * primary one; this endpoint keeps working even if scheduled workflows get disabled for
 * repository inactivity, because it is tied to the production deployment instead.
 */

import { runKeepalive, formatKeepaliveResult } from "../scripts/lib/supabase-keepalive.mjs";

// Vercel sends `Authorization: Bearer $CRON_SECRET` on cron invocations when the env var
// is set. Without a secret configured the endpoint stays open, so it is written to leak
// nothing beyond liveness.
const isAuthorizedCronRequest = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header = req.headers?.authorization || "";
  return header === `Bearer ${secret}`;
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!isAuthorizedCronRequest(req)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  // Stay inside the serverless execution limit so a slow database produces a reported
  // failure instead of a killed invocation with no diagnostics.
  const result = await runKeepalive({ source: "vercel-cron", budgetMs: 8000 });

  res.setHeader("Cache-Control", "no-store");

  // 200 on success, 503 otherwise, so Vercel surfaces failed pings as function errors
  // instead of silently logging them.
  res.status(result.ok ? 200 : 503).json({
    ok: result.ok,
    status: result.status,
    table: result.table ?? null,
    durationMs: result.durationMs,
    heartbeatRecorded: Boolean(result.heartbeat?.recorded),
    detail: formatKeepaliveResult(result),
  });
}
