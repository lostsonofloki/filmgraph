const FALLBACK_RATIONALE =
  "Fallback recommendation based on your vibe and available metadata.";
const FALLBACK_VIBE_CHECK = "Fallback pick for your vibe";

export const ORACLE_PROVIDER_TIMEOUT_MS = {
  gemini: 9000,
  openrouter: 9000,
  tmdb: 6000,
};

export const ORACLE_PROVIDER_MAX_RETRIES = {
  gemini: 2,
  openrouter: 1,
  tmdb: 1,
};

export const isAbortLikeError = (error) => {
  const raw = String(error?.message || "").toLowerCase();
  return Boolean(
    error?.name === "AbortError" ||
      error?.isAbort ||
      raw.includes("aborted") ||
      raw.includes("cancelled"),
  );
};

export const getOracleFailureBucket = (error) => {
  const raw = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || 0);
  if (isAbortLikeError(error) || raw.includes("timeout")) return "timeout";
  if (status === 429 || raw.includes("rate limit")) return "rate_limit";
  if (raw.includes("parse") || raw.includes("json") || status === 422) return "parse_fail";
  if (
    status === 500 ||
    status === 503 ||
    status === 502 ||
    raw.includes("network") ||
    raw.includes("fetch") ||
    raw.includes("unavailable")
  ) {
    return "upstream_unavailable";
  }
  return "unknown";
};

export const shouldRetryOracleError = (error) => {
  if (isAbortLikeError(error)) return false;
  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 404) return false;
  return status === 429 || status === 500 || status === 503 || getOracleFailureBucket(error) === "timeout";
};

export const ensureOracleRecommendationShape = (recommendations = []) =>
  (recommendations || [])
    .filter(Boolean)
    .map((rec) => ({
      ...rec,
      title: String(rec?.title || "").trim(),
      year: Number.isFinite(Number(rec?.year)) ? Number(rec.year) : null,
      rationale: String(rec?.rationale || "").trim() || FALLBACK_RATIONALE,
      vibeCheck: String(rec?.vibeCheck || "").trim() || FALLBACK_VIBE_CHECK,
    }))
    .filter((rec) => rec.title.length > 0);

