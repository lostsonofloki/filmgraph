/* global fetch, process, AbortController, setTimeout, clearTimeout */

/**
 * Shared keep-alive ping used by the scheduled CI job and the Vercel cron endpoint.
 *
 * Supabase pauses Free plan projects after ~7 days of low database activity, and only
 * queries that reach Postgres count. Every ping here is a PostgREST table read so the
 * request is evaluated inside the database rather than short-circuited at the edge.
 */

const DEFAULT_PING_TABLES = ["keepalive_heartbeat", "upc_cache", "profiles"];
const PING_TIMEOUT_MS = 10000;
const RETRY_BACKOFF_MS = [500, 2000];

// Retrying three tables through three attempts each can run well past a minute, which
// outlives the execution limit on a serverless invocation. Callers with a hard ceiling
// pass a smaller budget; the ping then gives up early and reports why.
const DEFAULT_BUDGET_MS = 90000;

// Returned by Supabase's edge once a Free plan project has actually been paused.
const PAUSED_STATUS_CODES = new Set([540, 544]);

// PostgREST answers these from its in-memory schema cache without reaching Postgres, so
// they mean "wrong table name", not "database is awake".
const MISSING_TABLE_CODES = new Set(["PGRST002", "PGRST205"]);

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
    isConfigured: Boolean(url && apiKey),
  };
};

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
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`;

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
    const timedOut = error?.name === "AbortError";
    return {
      outcome: "retry",
      error: timedOut ? `Request timed out after ${timeoutMs}ms` : `Network error: ${error?.message || error}`,
    };
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

  if (MISSING_TABLE_CODES.has(body.json?.code) || response.status === 404) {
    return {
      outcome: "next-table",
      status: response.status,
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
 * `paused`, `unreachable`, `timed-out`, or `not-configured`.
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

  for (const table of config.tables) {
    const result = await readTableWithRetries({
      url: config.url,
      apiKey: config.apiKey,
      table,
      remainingMs,
    });
    tried.push({ table, outcome: result.outcome, status: result.status, attempts: result.attempts, error: result.error });

    if (result.outcome === "alive") {
      const heartbeat = await recordHeartbeat({
        url: config.url,
        serviceRoleKey: config.serviceRoleKey,
        source,
        timeoutMs: Math.min(PING_TIMEOUT_MS, remainingMs()),
      });

      return {
        ok: true,
        status: "alive",
        source,
        table,
        attempts: result.attempts,
        heartbeat,
        tried,
        durationMs: Date.now() - startedAt,
      };
    }

    // A paused project is a property of the project, not of the table being read.
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

    if (result.outcome === "out-of-time") break;
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
};

export const formatKeepaliveResult = (result) => {
  const lines = [];

  if (result.status === "alive") {
    const attemptNote = result.attempts > 1 ? ` after ${result.attempts} attempts` : "";
    lines.push(`Database is awake. Read public.${result.table}${attemptNote} in ${result.durationMs}ms.`);
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
