/**
 * Shared keep-alive ping used by the scheduled CI job and the Vercel cron endpoint.
 *
 * Supabase pauses Free plan projects that do not receive enough user database activity
 * over a 7-day window. A single read per day has already proven too little: the project
 * was warned while a once-daily cron existed. Only queries that reach Postgres count.
 * Every ping here is a PostgREST table read so the request is evaluated inside the
 * database rather than short-circuited at the edge. One invocation issues several of
 * those reads, and the schedulers call it several times a day.
 */

import { timingSafeEqual } from "node:crypto";

const DEFAULT_PING_TABLES = ["keepalive_heartbeat", "upc_cache", "profiles"];
const PING_TIMEOUT_MS = 10000;

// "A few user requests to the database each day" is the published bar. Three separate
// reads per invocation, from several daily schedules, stays above a single daily ping
// without turning the job into a load test.
const DEFAULT_READS_PER_RUN = 3;
const MAX_READS_PER_RUN = 5;

// Narrow columns so the row that comes back is a few bytes. `select=*` on upc_cache
// would pull the cached lookup payload across the wire for no benefit.
const CHEAP_SELECT_BY_TABLE = {
  keepalive_heartbeat: "id",
  upc_cache: "upc",
  profiles: "id",
};

// Patient enough to ride out a restored project's warm-up, which is exactly when this job
// matters most: for ~30s after an unpause, PostgREST is up but cannot reach Postgres yet.
const RETRY_BACKOFF_MS = [500, 2000, 5000, 10000];

// Sweeping every candidate table through the full retry schedule can run for minutes, which
// outlives the execution limit on a serverless invocation. Callers with a hard ceiling pass
// a smaller budget; the ping then gives up early and reports why.
const DEFAULT_BUDGET_MS = 90000;

// Secondary pause signal: the edge can answer 540/544 while a project is transitioning.
// The *primary* signal is DNS, see DEFINITIVE_DNS_FAILURE_CODES below.
const PAUSED_STATUS_CODES = new Set([540, 544]);

// Pausing tears the instance down and removes the project's DNS record, so in practice a
// paused project fails to resolve rather than returning an HTTP status. Verified against a
// real project: `getaddrinfo ENOTFOUND <ref>.supabase.co` while paused, HTTP 401 once
// restored. Every candidate table shares the host, so this is worth short-circuiting.
const DEFINITIVE_DNS_FAILURE_CODES = new Set(["ENOTFOUND"]);

// A resolver hiccup rather than a missing record; worth one more try.
const TRANSIENT_DNS_FAILURE_CODES = new Set(["EAI_AGAIN"]);

// Observed on a freshly restored project: for a while after PostgREST stops returning
// PGRST002, its schema cache is still empty, so *every* table reports PGRST205 as though it
// did not exist. Three wrong table names at once is far less likely than one warming cache,
// so when a whole sweep misses, wait and sweep again instead of giving up.
const SCHEMA_CACHE_RESWEEP_DELAYS_MS = [5000, 15000];

// PostgREST answers this from its in-memory schema cache without reaching Postgres, so it
// means "wrong table name", not "database is awake". Failing over to another table is the
// only useful response.
const MISSING_TABLE_CODES = new Set(["PGRST205"]);

// PGRST002 is the opposite case and must not be confused with the above: PostgREST is
// running but could not query Postgres for the schema cache. Observed for ~30s after
// restoring a paused project. Retrying is correct; failing over is not, because every
// table on the instance returns it.
const TRANSIENT_DB_CODES = new Set(["PGRST002"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const parseTableList = (raw) =>
  String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const resolveKeepaliveConfig = (env = process.env) => {
  const url = stripTrailingSlash(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const tables = parseTableList(env.SUPABASE_KEEPALIVE_TABLES);

  // Prefer the anon key for the read so the common path needs no privileged secret.
  const apiKey = anonKey || serviceRoleKey;

  return {
    url,
    apiKey,
    serviceRoleKey,
    tables: tables.length ? tables : DEFAULT_PING_TABLES,
    readsPerRun: resolveReadCount(env),
    isConfigured: Boolean(url && apiKey),
  };
};

export const resolveReadCount = (env = process.env) => {
  const raw = Number(env.SUPABASE_KEEPALIVE_READS);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_READS_PER_RUN;
  return Math.min(raw, MAX_READS_PER_RUN);
};

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` only when that env var exists.
 * Missing and wrong secrets both refuse the request. An open route would let anyone
 * trigger database reads through the deployment.
 */
export const authorizeCronRequest = (authorizationHeader, env = process.env) => {
  const secret = String(env.CRON_SECRET || "").trim();
  if (!secret) {
    return {
      ok: false,
      status: "not-configured",
      error: "CRON_SECRET is not set. The keep-alive route is closed until that secret is configured.",
    };
  }

  const presented = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const header = typeof presented === "string" ? presented : "";
  const expected = `Bearer ${secret}`;
  // Compare bytes, not UTF-16 length. A matching character count can still encode to a
  // different number of bytes, and timingSafeEqual throws on a length mismatch.
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  const authorized = headerBuf.length === expectedBuf.length && timingSafeEqual(headerBuf, expectedBuf);

  if (!authorized) {
    return { ok: false, status: "unauthorized", error: "Unauthorized." };
  }

  return { ok: true, status: "authorized" };
};

const selectListForTable = (table) => CHEAP_SELECT_BY_TABLE[table] || "*";

const fetchWithTimeout = async (url, options = {}, timeoutMs = PING_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const readBody = async (response) => {
  try {
    const raw = await response.text();
    if (!raw) return { raw: "", json: null };
    try {
      return { raw, json: JSON.parse(raw) };
    } catch {
      return { raw, json: null };
    }
  } catch {
    return { raw: "", json: null };
  }
};

const describeHttpFailure = (status, body) => {
  const code = body.json?.code ? ` ${body.json.code}` : "";
  const message = body.json?.message || body.json?.hint || body.raw.slice(0, 180);
  return `HTTP ${status}${code}${message ? `: ${message}` : ""}`;
};

/**
 * One read attempt against one table. Returns a classified outcome instead of throwing so
 * the caller can decide what is worth retrying and what is worth failing over.
 */
const attemptTableRead = async ({ url, apiKey, table, timeoutMs = PING_TIMEOUT_MS }) => {
  const select = selectListForTable(table);
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=1`;

  let response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      {
        method: "GET",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
      timeoutMs,
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      return { outcome: "retry", error: `Request timed out after ${timeoutMs}ms` };
    }

    const dnsCode = error?.cause?.code;
    if (DEFINITIVE_DNS_FAILURE_CODES.has(dnsCode)) {
      return { outcome: "dns-failure", error: `${dnsCode}: host ${error.cause.hostname} does not resolve` };
    }
    if (TRANSIENT_DNS_FAILURE_CODES.has(dnsCode)) {
      return { outcome: "retry", error: `${dnsCode}: temporary DNS failure` };
    }

    return { outcome: "retry", error: `Network error: ${error?.message || error}` };
  }

  if (response.ok) {
    return { outcome: "alive", status: response.status };
  }

  const body = await readBody(response);

  if (PAUSED_STATUS_CODES.has(response.status)) {
    return {
      outcome: "paused",
      status: response.status,
      error: describeHttpFailure(response.status, body),
    };
  }

  if (TRANSIENT_DB_CODES.has(body.json?.code)) {
    return {
      outcome: "retry",
      status: response.status,
      error: describeHttpFailure(response.status, body),
    };
  }

  if (MISSING_TABLE_CODES.has(body.json?.code) || response.status === 404) {
    return {
      outcome: "next-table",
      status: response.status,
      code: body.json?.code,
      error: describeHttpFailure(response.status, body),
    };
  }

  // 401/403 usually means RLS blocked this table for the anon role. Another candidate
  // table may still work, so fail over rather than retrying an answer that won't change.
  if (response.status === 401 || response.status === 403) {
    return {
      outcome: "next-table",
      status: response.status,
      error: describeHttpFailure(response.status, body),
    };
  }

  if (response.status >= 500) {
    return {
      outcome: "retry",
      status: response.status,
      error: describeHttpFailure(response.status, body),
    };
  }

  return {
    outcome: "next-table",
    status: response.status,
    error: describeHttpFailure(response.status, body),
  };
};

const readTableWithRetries = async ({ url, apiKey, table, remainingMs }) => {
  let attempts = 0;
  let last = null;

  for (let i = 0; i <= RETRY_BACKOFF_MS.length; i += 1) {
    const budgetLeft = remainingMs();
    if (budgetLeft <= 0) {
      return {
        outcome: "out-of-time",
        attempts,
        error: last?.error || "Ran out of time before a successful read",
      };
    }

    attempts += 1;
    last = await attemptTableRead({
      url,
      apiKey,
      table,
      timeoutMs: Math.min(PING_TIMEOUT_MS, budgetLeft),
    });

    if (last.outcome !== "retry") {
      return { ...last, attempts };
    }

    if (i < RETRY_BACKOFF_MS.length && remainingMs() > RETRY_BACKOFF_MS[i]) {
      await sleep(RETRY_BACKOFF_MS[i]);
    }
  }

  return { ...last, outcome: "failed", attempts };
};

/**
 * The first successful read found a table Postgres will actually answer. The rest are
 * plain repeats of that same cheap read so one cron firing counts as several requests.
 */
const repeatSuccessfulRead = async ({ url, apiKey, table, requestedReads, remainingMs }) => {
  let reads = 1;
  let lastError = null;

  while (reads < requestedReads) {
    const budgetLeft = remainingMs();
    if (budgetLeft <= 250) {
      lastError = `Only ${reads} of ${requestedReads} reads finished before the time budget ran out`;
      break;
    }

    const next = await attemptTableRead({
      url,
      apiKey,
      table,
      timeoutMs: Math.min(PING_TIMEOUT_MS, budgetLeft),
    });

    if (next.outcome === "alive") {
      reads += 1;
      continue;
    }

    if (next.outcome === "retry" && remainingMs() > 500) {
      await sleep(200);
      const retry = await attemptTableRead({
        url,
        apiKey,
        table,
        timeoutMs: Math.min(PING_TIMEOUT_MS, remainingMs()),
      });
      if (retry.outcome === "alive") {
        reads += 1;
        continue;
      }
      lastError = retry.error || next.error;
      break;
    }

    lastError = next.error || `Follow-up read failed (${next.outcome})`;
    break;
  }

  return {
    reads,
    requestedReads,
    error:
      reads >= requestedReads
        ? undefined
        : lastError || `Only ${reads} of ${requestedReads} reads reached Postgres`,
  };
};

const recordHeartbeat = async ({ url, serviceRoleKey, source, timeoutMs }) => {
  if (!serviceRoleKey) {
    return { recorded: false, skipped: "no service-role key configured" };
  }

  if (timeoutMs <= 0) {
    return { recorded: false, skipped: "no time left in the ping budget" };
  }

  try {
    const response = await fetchWithTimeout(
      `${url}/rest/v1/rpc/record_keepalive_ping`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ping_source: String(source || "unknown").slice(0, 64) }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const body = await readBody(response);
      return { recorded: false, error: describeHttpFailure(response.status, body) };
    }

    const body = await readBody(response);
    return { recorded: true, pingedAt: typeof body.json === "string" ? body.json : null };
  } catch (error) {
    // Bookkeeping only. The read above is what keeps the project awake.
    return { recorded: false, error: error?.message || String(error) };
  }
};

/**
 * Ping the database and report what happened.
 *
 * Resolves to `{ ok, status, ... }` rather than throwing: `status` is one of `alive`,
 * `partial`, `paused`, `host-unresolved`, `no-ping-target`, `unreachable`, `timed-out`,
 * or `not-configured`. `partial` means at least one read reached Postgres but fewer than
 * the requested count did.
 */
export const runKeepalive = async ({
  env = process.env,
  source = "unknown",
  budgetMs = DEFAULT_BUDGET_MS,
} = {}) => {
  const startedAt = Date.now();
  const remainingMs = () => budgetMs - (Date.now() - startedAt);
  const config = resolveKeepaliveConfig(env);

  if (!config.isConfigured) {
    const missing = [
      config.url ? null : "SUPABASE_URL (or VITE_SUPABASE_URL)",
      config.apiKey ? null : "SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)",
    ].filter(Boolean);

    return {
      ok: false,
      status: "not-configured",
      source,
      error: `Missing required configuration: ${missing.join(", ")}`,
      durationMs: Date.now() - startedAt,
    };
  }

  const tried = [];
  let sweep = 0;

  for (;;) {
    const sweepStartIndex = tried.length;

    for (const table of config.tables) {
      const result = await readTableWithRetries({
        url: config.url,
        apiKey: config.apiKey,
        table,
        remainingMs,
      });
      tried.push({
        table,
        outcome: result.outcome,
        status: result.status,
        code: result.code,
        attempts: result.attempts,
        error: result.error,
      });

      if (result.outcome === "alive") {
        const repeated = await repeatSuccessfulRead({
          url: config.url,
          apiKey: config.apiKey,
          table,
          requestedReads: config.readsPerRun,
          remainingMs,
        });
        const heartbeat = await recordHeartbeat({
          url: config.url,
          serviceRoleKey: config.serviceRoleKey,
          source,
          timeoutMs: Math.min(PING_TIMEOUT_MS, remainingMs()),
        });
        const complete = repeated.reads >= repeated.requestedReads;

        return {
          ok: complete,
          status: complete ? "alive" : "partial",
          source,
          table,
          attempts: result.attempts,
          reads: repeated.reads,
          requestedReads: repeated.requestedReads,
          heartbeat,
          tried,
          error: repeated.error,
          durationMs: Date.now() - startedAt,
        };
      }

      // Both of these describe the project rather than the table, so trying further
      // candidates against the same host cannot help.
      if (result.outcome === "paused") {
        return {
          ok: false,
          status: "paused",
          source,
          error: `Project appears to be paused (${result.error}). Restore it from the Supabase dashboard.`,
          tried,
          durationMs: Date.now() - startedAt,
        };
      }

      if (result.outcome === "dns-failure") {
        return {
          ok: false,
          status: "host-unresolved",
          source,
          error:
            `${result.error}. A paused Supabase project loses its DNS record, so this most ` +
            `likely means the project is paused — restore it from the dashboard. Otherwise ` +
            `check SUPABASE_URL for a typo or a deleted project.`,
          tried,
          durationMs: Date.now() - startedAt,
        };
      }

      if (result.outcome === "out-of-time") break;
    }

    const thisSweep = tried.slice(sweepStartIndex);
    const everyCandidateMissing =
      thisSweep.length === config.tables.length &&
      thisSweep.every((entry) => entry.code === "PGRST205");
    const reSweepDelay = SCHEMA_CACHE_RESWEEP_DELAYS_MS[sweep];

    if (everyCandidateMissing && reSweepDelay && remainingMs() > reSweepDelay) {
      await sleep(reSweepDelay);
      sweep += 1;
      continue;
    }

    if (everyCandidateMissing) {
      return {
        ok: false,
        status: "no-ping-target",
        source,
        // PGRST205 is served from the schema cache without touching Postgres, so this did
        // not refresh the inactivity window even though the request "succeeded".
        error:
          `None of the candidate tables (${config.tables.join(", ")}) exist in the schema ` +
          `cache, so nothing actually queried Postgres and the inactivity window was not ` +
          `reset. Apply the keepalive_heartbeat migration, or set SUPABASE_KEEPALIVE_TABLES ` +
          `to a table that does exist.`,
        tried,
        durationMs: Date.now() - startedAt,
      };
    }

    const ranOutOfTime = remainingMs() <= 0;

    return {
      ok: false,
      status: ranOutOfTime ? "timed-out" : "unreachable",
      source,
      error: `${
        ranOutOfTime ? `Exhausted the ${budgetMs}ms ping budget` : "No candidate table could be read"
      }. Tried: ${tried.map((entry) => `${entry.table} (${entry.error || entry.outcome})`).join("; ")}`,
      tried,
      durationMs: Date.now() - startedAt,
    };
  }
};

export const formatKeepaliveResult = (result) => {
  const lines = [];

  if (result.status === "alive" || result.status === "partial") {
    const reads = result.reads || 1;
    const requested = result.requestedReads || reads;
    const attemptNote = result.attempts > 1 ? ` after ${result.attempts} attempts` : "";
    lines.push(
      `${reads} of ${requested} reads of public.${result.table} reached Postgres${attemptNote} in ${result.durationMs}ms.`,
    );
    if (result.status === "partial" && result.error) {
      lines.push(result.error);
    }
    if (result.heartbeat?.recorded) {
      lines.push(`Heartbeat recorded${result.heartbeat.pingedAt ? ` at ${result.heartbeat.pingedAt}` : ""}.`);
    } else if (result.heartbeat?.error) {
      lines.push(`Heartbeat write skipped: ${result.heartbeat.error}`);
    }
  } else {
    lines.push(`Keep-alive ping failed (${result.status}): ${result.error}`);
  }

  for (const entry of result.tried || []) {
    if (entry.outcome === "alive") continue;
    lines.push(`  - ${entry.table}: ${entry.outcome}${entry.error ? ` — ${entry.error}` : ""}`);
  }

  return lines.join("\n");
};

/**
 * Backup path for the GitHub Action when database credentials are not stored as
 * repository secrets. The production route already has those credentials; this only
 * forwards the shared cron secret and reports the JSON body.
 */
export const pingKeepaliveEndpoint = async ({
  url,
  secret,
  fetchImpl = fetch,
  timeoutMs = 20000,
} = {}) => {
  if (!url || !secret) {
    return {
      ok: false,
      status: "not-configured",
      source: "endpoint",
      error: "KEEPALIVE_URL and CRON_SECRET are required to call the keep-alive route.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    const ok = response.ok && json?.ok === true;
    return {
      ok,
      status: json?.status || (response.ok ? "unknown" : `http-${response.status}`),
      source: "endpoint",
      reads: json?.reads,
      requestedReads: json?.requestedReads,
      durationMs: json?.durationMs,
      detail: typeof json?.detail === "string" ? json.detail : undefined,
      error: ok ? undefined : json?.error || json?.detail || `HTTP ${response.status}`,
    };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return {
      ok: false,
      status: aborted ? "timed-out" : "unreachable",
      source: "endpoint",
      error: aborted
        ? `Keep-alive route timed out after ${timeoutMs}ms`
        : `Network error: ${error?.message || error}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
