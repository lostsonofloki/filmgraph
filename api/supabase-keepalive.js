/* global console */

/**
 * Vercel cron target for the Supabase keep-alive ping.
 *
 * Hobby cron expressions may run only once per day, so vercel.json registers several
 * daily schedules against this same path. Each invocation performs multiple PostgREST
 * reads. GitHub Actions is a second scheduler and can call this route with the same
 * bearer token when repository secrets do not include the database keys directly.
 */

import { authorizeCronRequest, formatKeepaliveResult, runKeepalive } from "../scripts/lib/supabase-keepalive.mjs";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  const auth = authorizeCronRequest(req.headers?.authorization);
  if (!auth.ok) {
    const status = auth.status === "not-configured" ? 503 : 401;
    res.status(status).json({ ok: false, status: auth.status, error: auth.error });
    return;
  }

  try {
    // Stay inside the serverless execution limit so a slow database produces a reported
    // failure instead of a killed invocation with no diagnostics. Three reads of a
    // one-row payload fit comfortably; the budget is what stops a hung connection.
    const result = await runKeepalive({ source: "vercel-cron", budgetMs: 8000 });

    res.setHeader("Cache-Control", "no-store");
    res.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      status: result.status,
      table: result.table ?? null,
      reads: result.reads ?? 0,
      requestedReads: result.requestedReads ?? null,
      durationMs: result.durationMs,
      heartbeatRecorded: Boolean(result.heartbeat?.recorded),
      detail: formatKeepaliveResult(result),
    });
  } catch (error) {
    console.error("[supabase-keepalive]", error?.message || error);
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({
      ok: false,
      status: "error",
      error: "Keep-alive failed before it could report a result.",
    });
  }
}
