/**
 * Groq LPU Integration - Ultra-fast genre extraction
 *
 * Groq retires models faster than this app ships releases: llama-3.3-70b-specdec went
 * first, then llama-3.3-70b-versatile, each time turning a hardcoded model id into a user
 * facing 404. So the model is no longer a constant. Requests walk a candidate list and
 * advance on `model_not_found`, which keeps working through the next retirement.
 * See: https://console.groq.com/docs/deprecations
 */

import { GROQ_MODELS } from '../config/aiModels';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * The ladder lives in `src/config/aiModels.js` so the daily health check can sweep the exact
 * ids shipped here. `VITE_GROQ_MODEL` pins a single model without needing a code change.
 */
export const GROQ_MODEL_CANDIDATES = (
  import.meta.env.VITE_GROQ_MODEL
    ? [import.meta.env.VITE_GROQ_MODEL]
    : GROQ_MODELS
);

/**
 * Reasoning-style models emit hidden reasoning tokens before the JSON body, and those count
 * against max_tokens. Truncated output fails Groq's JSON validation with a 400 rather than
 * returning partial content, so never ask for strict JSON on a starvation budget.
 * Measured: gpt-oss-20b fails genre extraction at 128 tokens and succeeds at 256.
 */
const MIN_JSON_MAX_TOKENS = 256;

const isModelUnavailable = (status, errorBody) =>
  status === 404 || errorBody?.error?.code === 'model_not_found';

/**
 * POST a strict-JSON chat completion, falling forward through GROQ_MODEL_CANDIDATES when a
 * model has been retired. Returns the parsed JSON body.
 *
 * Only model availability triggers the next candidate. Other failures (rate limits, auth,
 * network) are the caller's problem and are thrown, because retrying them against a
 * different model would just multiply the same error.
 */
export const callGroqJSON = async ({ systemPrompt, userMessage, maxTokens, temperature = 0.1 }) => {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const attempted = [];

  for (const model of GROQ_MODEL_CANDIDATES) {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: Math.max(maxTokens, MIN_JSON_MAX_TOKENS),
        response_format: { type: 'json_object' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }
      return JSON.parse(content);
    }

    const errorBody = await response.json().catch(() => ({}));

    if (isModelUnavailable(response.status, errorBody)) {
      attempted.push(model);
      console.warn(`⚠️ Groq model "${model}" is unavailable, trying the next candidate.`);
      continue;
    }

    throw new Error(errorBody.error?.message || `Groq API error: ${response.status}`);
  }

  throw new Error(
    `No available Groq model. Tried: ${attempted.join(', ')}. ` +
      'Check https://console.groq.com/docs/deprecations and update GROQ_MODEL_CANDIDATES.',
  );
};

// Shared TMDB Genre ID mapping - exported for use in gemini.js
export const TMDB_GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const GENRE_LIST = Object.entries(TMDB_GENRES)
  .map(([id, name]) => `${id}: ${name}`)
  .join(', ');

/**
 * Exported so another provider can run the same extraction when Groq is unavailable. Groq's
 * free tier allows only 1000 output tokens per minute across the whole account, so this step
 * gets rate-limited in ordinary use, not just during an outage.
 */
export const GENRE_SYSTEM_PROMPT = `You are a genre classification engine for a movie platform.
Your ONLY task is to map a user's mood/vibe description to relevant TMDB genre IDs.

Available TMDB Genres:
${GENRE_LIST}

Return ONLY a valid JSON object with this exact shape:
{"genre_ids":[18,878]}
NO text, NO explanation.`;

export const buildGenreUserMessage = (vibe) => `Map this vibe to genre IDs: "${vibe}"`;

/**
 * Normalise a genre reply into real TMDB ids, tolerating a bare array or an object wrapper and
 * ids returned as strings. Unknown ids are dropped rather than passed downstream.
 */
export const toGenreIds = (parsed) => {
  let rawIds = [];
  if (Array.isArray(parsed)) {
    rawIds = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.genre_ids)) {
    rawIds = parsed.genre_ids;
  }

  return rawIds
    .map(id => {
      if (typeof id === 'number') return id;
      if (typeof id === 'string') {
        const num = parseInt(id, 10);
        return isNaN(num) ? null : num;
      }
      return null;
    })
    .filter(id => id !== null && TMDB_GENRES[id]);
};

/**
 * Extract TMDB genre IDs from natural language vibe query
 * @param {string} vibe - User's natural language mood/vibe description
 * @returns {Promise<number[]>} - Array of TMDB genre IDs
 */
export const fetchGroqGenres = async (vibe) => {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  try {
    const parsed = await callGroqJSON({
      systemPrompt: GENRE_SYSTEM_PROMPT,
      userMessage: buildGenreUserMessage(vibe),
      maxTokens: MIN_JSON_MAX_TOKENS,
    });

    const genreIds = toGenreIds(parsed);

    console.log(`⚡ Groq extracted genres: ${genreIds.map(id => TMDB_GENRES[id]).join(', ')}`);
    return genreIds;

  } catch (error) {
    console.error('❌ Groq genre extraction failed:', error.message);
    throw error;
  }
};
