/**
 * Single source of truth for the model ids this app talks to.
 *
 * Every AI outage Filmgraph has had was a silent retirement discovered by a user rather than
 * by us: Groq dropped `llama-3.3-70b-specdec`, then `llama-3.3-70b-versatile`; Google dropped
 * all four of its 1.5/2.0 ids at once, which left the Oracle running on OpenRouter without
 * anyone noticing; OpenRouter dropped `google/gemini-2.0-flash-001`. A hardcoded id is a dead
 * man's switch on a schedule the vendor controls.
 *
 * The ladders live here, in plain data with no bundler-specific syntax, so
 * `scripts/ai-model-health.mjs` can import the exact ids the app ships and fail a daily cron
 * the moment one disappears. Keep it dependency-free for that reason.
 *
 * Each list is ordered best-first and every id below was confirmed present on this project's
 * keys on 2026-09-26. Callers walk their list and advance when a vendor reports an id gone,
 * so a retirement costs one wasted round trip instead of a broken feature.
 */

/**
 * Groq serves small strict-JSON tasks (genre extraction, list parsing). Ordered by measured
 * suitability: qwen3.8-27b answers genre extraction in ~90ms and honours a tight token
 * budget; the gpt-oss pair are reliable but spend tokens reasoning before emitting JSON.
 */
export const GROQ_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
];

/**
 * Google's direct API, the Oracle's primary provider.
 *
 * `flash-lite` leads on measured behaviour against this project's free-tier key, not on paper
 * quality: over six back-to-back Oracle prompts it answered 6/6 in ~1.7s average, while
 * `gemini-2.5-flash` answered 2/6 (the rest HTTP 429) at ~2.9s. Its recommendations were still
 * deep cuts, and rerolling an Oracle result issues several calls a minute, so the tighter quota
 * on full `flash` made it the slower choice in practice. It stays on the ladder for when the
 * quota allows.
 *
 * The `-latest` alias trails both pinned ids because it answers 503 under load. All of these
 * are 2.5+, which spend hidden "thinking" tokens out of `maxOutputTokens` unless told not to —
 * see `withThinkingDisabled` in `src/utils/gemini.js`.
 */
export const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

/**
 * OpenRouter backs the Oracle when Google's own API will not serve us. That is usually our key
 * hitting a quota rather than Google being down, so leading with a `google/*` route is fine and
 * the list still spans three vendors in case the outage is Google's.
 *
 * Ordered by measured latency on a full Oracle prompt: flash-lite ~2.8s, gpt-4o-mini ~4s,
 * llama-3.3-70b 12-19s. The previous order led with the llama route, which made the safety net
 * slow enough to feel broken, behind an id (`google/gemini-2.0-flash-001`) OpenRouter had
 * already retired.
 */
export const OPENROUTER_MODELS = [
  "google/gemini-3.1-flash-lite",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-70b-instruct",
];

/** Everything the health check sweeps, keyed by the provider that serves it. */
export const MODEL_LADDERS = {
  groq: GROQ_MODELS,
  gemini: GEMINI_MODELS,
  openrouter: OPENROUTER_MODELS,
};
