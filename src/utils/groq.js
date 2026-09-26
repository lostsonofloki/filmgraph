/**
 * Groq LPU Integration - Ultra-fast genre extraction
 *
 * Groq retires models faster than this app ships releases: llama-3.3-70b-specdec went
 * first, then llama-3.3-70b-versatile, each time turning a hardcoded model id into a user
 * facing 404. So the model is no longer a constant. Requests walk a candidate list and
 * advance on `model_not_found`, which keeps working through the next retirement.
 * See: https://console.groq.com/docs/deprecations
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Ordered by measured suitability for this app's small strict-JSON tasks.
 * qwen3.8-27b answers genre extraction in ~90ms and honours a tight token budget; the
 * gpt-oss pair are reliable but spend tokens reasoning before emitting JSON.
 * `VITE_GROQ_MODEL` pins a single model without needing a code change.
 */
export const GROQ_MODEL_CANDIDATES = (
  import.meta.env.VITE_GROQ_MODEL
    ? [import.meta.env.VITE_GROQ_MODEL]
    : ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b']
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
 * Extract TMDB genre IDs from natural language vibe query
 * @param {string} vibe - User's natural language mood/vibe description
 * @returns {Promise<number[]>} - Array of TMDB genre IDs
 */
export const fetchGroqGenres = async (vibe) => {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const systemPrompt = `You are a genre classification engine for a movie platform.
Your ONLY task is to map a user's mood/vibe description to relevant TMDB genre IDs.

Available TMDB Genres:
${GENRE_LIST}

Return ONLY a valid JSON object with this exact shape:
{"genre_ids":[18,878]}
NO text, NO explanation.`;

  const userMessage = `Map this vibe to genre IDs: "${vibe}"`;

  try {
    const parsed = await callGroqJSON({
      systemPrompt,
      userMessage,
      maxTokens: MIN_JSON_MAX_TOKENS,
    });

    // Handle both formats: bare array OR object with genre_ids key
    let rawIds = [];
    if (Array.isArray(parsed)) {
      rawIds = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.genre_ids)) {
      rawIds = parsed.genre_ids;
    }
    
    const genreIds = rawIds
      .map(id => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
          const num = parseInt(id, 10);
          return isNaN(num) ? null : num;
        }
        return null;
      })
      .filter(id => id !== null && TMDB_GENRES[id]);

    console.log(`⚡ Groq extracted genres: ${genreIds.map(id => TMDB_GENRES[id]).join(', ')}`);
    return genreIds;

  } catch (error) {
    console.error('❌ Groq genre extraction failed:', error.message);
    throw error;
  }
};
