import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchGroqGenres, TMDB_GENRES } from "./groq";

// Initialize Gemini AI client

/**
 * Base system prompt for the Oracle
 * Exported for use in getHybridRecommendation
 */
export const BASE_SYSTEM_PROMPT = `You are the Oracle, an elite film historian and curator for Filmgraph, a premium movie discovery platform.

YOUR ROLE:
- Recommend films that are PERFECT tonal matches for the user's mood
- Prioritize DEEP CUTS and underappreciated gems over mainstream blockbusters
- NEVER suggest obvious IMDB Top 250 picks unless they're genuinely the best match
- Focus on directorial vision, cinematography, and emotional resonance

YOUR RESPONSE FORMAT:
Return ONLY valid JSON with this structure:
{
  "title": "Exact movie title",
  "year": 1994,
  "rationale": "2-3 sentences explaining WHY this film matches their mood, referencing specific directorial choices, themes, or cinematic techniques",
  "vibeCheck": "A short, punchy 5-7 word tagline capturing the essence"
}

USER CONTEXT:
The user has provided their favorite films and current mood. Use this to understand their taste profile. If they love atmospheric horror, don't suggest slapstick comedy. If they appreciate slow-burn indie dramas, don't recommend Michael Bay.

CONSTRAINT - REJECTED MOVIES:
If the user provides a list of rejected movies, DO NOT suggest any of them again. These films have been explicitly rejected and the user wants different recommendations.

AVOID:
- Generic plot summaries
- Obvious blockbuster recommendations
- Films that don't match the stated mood
- More than 1-2 sentences in the rationale

BE SPECIFIC:
Instead of "This film is dark and moody," say "Rehane's use of natural lighting and long takes creates an oppressive atmosphere that mirrors the protagonist's psychological decay."`;
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ VITE_GEMINI_API_KEY is not configured!");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Keep a model ladder because Google model availability can change per key/project.
const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
];

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL = 24 * 60 * 60 * 1000;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o-mini",
];

const toErrorString = (error) =>
  String(error?.message || error || "").toLowerCase();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractStatusCode = (error) => {
  const direct = Number(error?.status || error?.statusCode);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const match = String(error?.message || "").match(/\b(4\d\d|5\d\d)\b/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const withTaggedError = (message, provider, status = null) => {
  const prefix = `[ORACLE:${provider}${status ? `:${status}` : ""}]`;
  const error = new Error(`${prefix} ${message}`);
  error.provider = provider;
  error.status = status;
  return error;
};

const isRetryableGeminiError = (error) => {
  const status = extractStatusCode(error);
  if (status === 404) return false;
  if (status === 429 || status === 500 || status === 503) return true;
  const raw = toErrorString(error);
  return raw.includes("high demand") || raw.includes("overloaded");
};

const runWithRetries = async (fn, shouldRetry, maxAttempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      const delayMs =
        250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 120);
      await sleep(delayMs);
    }
  }
  throw lastError;
};

const parseJsonResponse = (responseText) => {
  const cleanJson = String(responseText || "")
    .replace(/```json\s*|\s*```/g, "")
    .trim();
  return JSON.parse(cleanJson);
};

const runOpenRouterWithFallback = async (
  prompt,
  generationConfig,
  validator,
) => {
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    throw withTaggedError(
      "OpenRouter fallback unavailable: missing VITE_OPENROUTER_API_KEY",
      "openrouter",
      0,
    );
  }

  let lastError;

  for (let i = 0; i < OPENROUTER_MODELS.length; i += 1) {
    const modelName = OPENROUTER_MODELS[i];
    try {
      const response = await runWithRetries(
        async () =>
          fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.origin,
              "X-Title": "Filmgraph Oracle",
            },
            body: JSON.stringify({
              model: modelName,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Return valid JSON only." },
                { role: "user", content: prompt },
              ],
              temperature: generationConfig?.temperature ?? 0.9,
              max_tokens: generationConfig?.maxOutputTokens ?? 1200,
            }),
          }),
        (error) => {
          const status = extractStatusCode(error);
          return status === 429 || status === 500 || status === 503;
        },
      );

      if (!response.ok) {
        throw withTaggedError(
          `OpenRouter error ${response.status}`,
          "openrouter",
          response.status,
        );
      }

      const data = await response.json();
      const message = data?.choices?.[0]?.message?.content;
      const parsed = parseJsonResponse(message);
      if (validator) validator(parsed);
      return { parsed, modelUsed: modelName };
    } catch (error) {
      lastError = error;
      if (i === OPENROUTER_MODELS.length - 1) {
        throw withTaggedError(
          error.message || "OpenRouter failure",
          "openrouter",
          extractStatusCode(error),
        );
      }
      console.warn(
        `⚠️ OpenRouter model failed (${modelName}). Trying next model.`,
      );
    }
  }

  throw withTaggedError(
    lastError?.message || "No OpenRouter model available",
    "openrouter",
    extractStatusCode(lastError),
  );
};

const runGeminiWithFallback = async (prompt, generationConfig, validator) => {
  if (!genAI) {
    throw withTaggedError(
      "Gemini unavailable: missing VITE_GEMINI_API_KEY",
      "gemini",
      0,
    );
  }

  let lastError;

  for (let i = 0; i < GEMINI_MODEL_CANDIDATES.length; i += 1) {
    const modelName = GEMINI_MODEL_CANDIDATES[i];

    try {
      const chunks = await runWithRetries(async () => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const result = await model.generateContentStream(prompt);
        const streamed = [];
        for await (const chunk of result.stream) {
          streamed.push(chunk.text());
        }
        return streamed;
      }, isRetryableGeminiError);

      const parsed = parseJsonResponse(chunks.join(""));
      if (validator) validator(parsed);

      return { parsed, modelUsed: modelName };
    } catch (error) {
      lastError = error;
      const status = extractStatusCode(error);
      if (
        i === GEMINI_MODEL_CANDIDATES.length - 1 ||
        (!isRetryableGeminiError(error) && status !== 404)
      ) {
        throw withTaggedError(
          error.message || "Gemini request failed",
          "gemini",
          status,
        );
      }
      console.warn(`⚠️ Gemini model failed (${modelName}). Trying next model.`);
    }
  }

  throw withTaggedError(
    lastError?.message || "No Gemini model available",
    "gemini",
    extractStatusCode(lastError),
  );
};

const getLocalVibeCheck = (vibe) => {
  const trimmed = String(vibe || "").trim();
  if (!trimmed) return "Tailored pick for your mood";
  const words = trimmed.split(/\s+/).slice(0, 7).join(" ");
  return `${words}${words.length < trimmed.length ? "..." : ""}`;
};

const buildTmdbFallbackRecommendations = async (
  vibe,
  genreIds,
  rejectedTitles = [],
) => {
  const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!tmdbApiKey) {
    throw new Error("TMDB fallback unavailable: missing VITE_TMDB_API_KEY");
  }

  const rejected = new Set(
    rejectedTitles.map((t) => String(t || "").toLowerCase()),
  );
  const uniqueGenreIds = (genreIds || []).filter(Boolean);
  const genreParam =
    uniqueGenreIds.length > 0 ? `&with_genres=${uniqueGenreIds.join("|")}` : "";
  const page = 1 + Math.floor(Math.random() * 3);

  const response = await runWithRetries(
    async () =>
      fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&include_adult=false&sort_by=vote_average.desc&vote_count.gte=300&page=${page}${genreParam}`,
      ),
    (error) => {
      const status = extractStatusCode(error);
      return status === 429 || status === 500 || status === 503;
    },
  );

  if (!response.ok) {
    throw withTaggedError(
      `TMDB fallback failed: ${response.status}`,
      "tmdb",
      response.status,
    );
  }

  const data = await response.json();
  const picks = (data?.results || [])
    .filter(
      (movie) =>
        movie?.title && !rejected.has(String(movie.title).toLowerCase()),
    )
    .slice(0, 5)
    .map((movie) => ({
      title: movie.title,
      year: movie.release_date?.split("-")[0]
        ? Number(movie.release_date.split("-")[0])
        : null,
      rationale: `Gemini is currently unavailable, so this pick is sourced from TMDB based on your vibe and genre fit. ${movie.title} has strong audience reception and should align with your current request.`,
      vibeCheck: getLocalVibeCheck(vibe),
    }));

  if (picks.length === 0) {
    throw withTaggedError(
      "TMDB fallback returned no usable results",
      "tmdb",
      204,
    );
  }

  return picks;
};

/**
 * Get AI-powered movie recommendations with caching
 * @param {Object} params - Parameters object
 * @param {Array} params.topRatedMovies - User's top 10 highest-rated watched movies
 * @param {Array} params.recentToWatch - User's 5 most recent to-watch additions
 * @param {Array} params.favoriteMoods - User's most frequently selected moods
 * @param {Array} params.banishedIds - Array of TMDB IDs the user has thumbs-downed
 * @param {Array} params.libraryIds - Array of TMDB IDs already in user's library
 * @param {Object} params.supabase - Supabase client for caching
 * @param {string} params.userId - User ID for cache lookup
 * @param {boolean} params.bypassCache - Force refresh ignoring cache
 * @returns {Promise<Object>} - { recommendations: Array, fromCache: boolean }
 */
export const getMovieRecommendations = async ({
  topRatedMovies,
  recentToWatch,
  favoriteMoods,
  banishedIds = [],
  libraryIds = [],
  supabase,
  userId,
  bypassCache = false,
}) => {
  // Create a cache key from user's preferences
  const cacheKey = `${userId}-${favoriteMoods.join("-")}-${banishedIds.length}-${libraryIds.length}`;

  // Check cache first (unless bypassing)
  if (!bypassCache && supabase) {
    try {
      const { data: cached } = await supabase
        .from("ai_cache")
        .select("recommendations, created_at")
        .eq("user_id", userId)
        .eq("cache_type", "discovery")
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        if (cacheAge < CACHE_TTL) {
          console.log("✅ Using cached recommendations");
          return {
            recommendations: cached.recommendations,
            fromCache: true,
          };
        }
        console.log("⏰ Cache expired, fetching fresh recommendations");
      }
    } catch (_err) {
      console.log("No cache found, fetching fresh recommendations");
    }
  }

  // Combine banished IDs and library IDs into one exclusion list
  const excludedIds = [...new Set([...banishedIds, ...libraryIds])];

  const exclusionNote =
    excludedIds.length > 0
      ? `\n\nSTRICT CONSTRAINT - DO NOT suggest these TMDB IDs: [${excludedIds.join(",")}]. User already has these or rejected them.`
      : "";

  const prompt = `You are the Filmgraph Discovery Engine. Your goal is to suggest high-quality cinema across ALL genres based on the user's logged history.

THE EEAAO RULE: The user has rated ambitious, non-linear films like Everything Everywhere All at Once 10/10. Do not limit suggestions to one genre; prioritize complexity and emotional resonance.

Top-rated watched: ${JSON.stringify(topRatedMovies)}
Want to watch: ${JSON.stringify(recentToWatch)}
Favorite moods: ${favoriteMoods.join(",")}${exclusionNote}

CRITICAL REQUIREMENTS:
1. Return EXACTLY 3 movies - no more, no less
2. Each movie must be unique (no duplicates)
3. Suggest films from DIVERSE genres (Sci-Fi, Drama, Thriller, Action, Mystery, etc.)
4. Prioritize narrative complexity, emotional resonance, and visual storytelling over genre
5. Match the user's mood preferences but NOT limited to horror
6. NEVER include tmdb_id - we will verify separately

Return ONLY a valid JSON array. NO text before or after. NO markdown formatting.

Format:
[{"title":"Movie Name","year":2023,"vibeCheck":"One-sentence mood description"}]`;

  try {
    const { parsed: recommendations } = await runGeminiWithFallback(
      prompt,
      {
        temperature: 0.7,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      },
      (parsed) => {
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid response format from Gemini");
        }
      },
    );

    // Cache the results
    if (supabase && userId) {
      await supabase.from("ai_cache").upsert(
        {
          user_id: userId,
          cache_type: "discovery",
          cache_key: cacheKey,
          recommendations: recommendations,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,cache_type",
        },
      );
      console.log("💾 Recommendations cached");
    }

    return {
      recommendations,
      fromCache: false,
    };
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error(error.message || "The Oracle could not be reached");
  }
};

/**
 * Verify AI recommendation against TMDB API to get real IDs
 * More lenient search - tries multiple approaches
 * @param {string} title - Movie title from AI
 * @param {string} year - Movie year from AI (optional)
 * @returns {Promise<Object|null>} - Verified TMDB data or null if not found
 */
export const verifyRecommendation = async (title, year) => {
  const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    console.error("TMDB API key missing");
    return null;
  }

  try {
    // Try 1: Search with title in query and year in primary_release_year
    const searchQuery = encodeURIComponent(title);
    const yearParam =
      year && year !== "N/A" ? `&primary_release_year=${year}` : "";

    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}`,
    );

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        console.log(
          `✅ TMDB match: "${title}" → "${movie.title}" (${movie.release_date?.split("-")[0]})`,
        );
        return {
          tmdb_id: movie.id,
          title: movie.title,
          year: movie.release_date?.split("-")[0] || year,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          verified: true,
        };
      }
    }

    // Try 2: Clean title (remove common suffixes) and retry
    const cleanTitle = title
      .replace(/\s*\([^)]*\)\s*/g, "") // Remove parentheses
      .replace(/:\s*.*$/, "") // Remove everything after colon
      .trim();

    if (cleanTitle !== title) {
      console.log(`🔄 Trying cleaned title: "${cleanTitle}"`);
      return verifyRecommendation(cleanTitle, year);
    }

    console.log(`⚠️ No TMDB match for "${title}"`);
    return null;
  } catch (error) {
    console.error(`❌ Error verifying "${title}":`, error.message);
    return null;
  }
};

/**
 * Analyze user's mood patterns and provide insights
 * Optimized for speed with minimal thinking and JSON output
 * @param {Array} movieLogs - User's movie log with moods and ratings
 * @returns {Promise<Object>} - Mood analysis and patterns
 */
export const analyzeMoodPatterns = async (movieLogs) => {
  const moodData = movieLogs
    .filter((m) => m.moods && m.moods.length > 0)
    .slice(0, 20)
    .map((m) => ({
      title: m.title,
      moods: m.moods,
      rating: m.rating,
    }));

  const prompt = `You are a Global Cinema Strategist for Filmgraph. Analyze the ENTIRE movie_logs array for common threads in pacing, cinematography, and narrative complexity across ALL genres (Action, Drama, Sci-Fi, Horror, etc.).

${JSON.stringify(moodData)}

Return JSON with these exact keys:
{"dominant_category":"emotional|vibe|intellectual","horror_palate":"description of their core aesthetic across all genres","surprising_observation":"insight about their viewing patterns","curators_note":"diverse film advice referencing multiple genres they enjoy"}`;

  try {
    const { parsed } = await runGeminiWithFallback(
      prompt,
      {
        temperature: 0.7,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
      (result) => {
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new Error("Invalid mood analysis format from Gemini");
        }
      },
    );
    return parsed;
  } catch (error) {
    console.error("Error analyzing mood patterns:", error);
    return null;
  }
};

/**
 * Oracle - AI-powered single movie discovery with deep cuts
 * @param {Object} params - Parameters object
 * @param {string} params.mood - User's current mood or vibe description
 * @param {string} params.userContext - User's favorite films for context
 * @param {string} params.systemPrompt - Custom system prompt for the Oracle
 * @returns {Promise<Object>} - Single movie recommendation with rationale
 */
export const discoverMovies = async ({ mood, userContext, systemPrompt }) => {
  const prompt = `${systemPrompt}

USER CONTEXT:
${userContext}

CURRENT MOOD/REQUEST:
"${mood}"

Return ONLY valid JSON. NO text before or after. NO markdown formatting.

Format:
{"title":"Exact Movie Title","year":2023,"rationale":"2-3 sentences explaining why this matches their mood","vibeCheck":"5-7 word punchy tagline"}`;

  try {
    const { parsed } = await runGeminiWithFallback(
      prompt,
      {
        temperature: 0.9,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
      (result) => {
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          throw new Error("Invalid Oracle response format from Gemini");
        }
      },
    );
    return parsed;
  } catch (error) {
    console.error("Error in Oracle discovery:", error);
    throw new Error("The Oracle is silent. Please try again.");
  }
};

/**
 * Multi-Model Orchestration: Groq (fast) + Gemini (deep reasoning)
 * Pipeline: User Query → Groq Genre IDs → Gemini with context → 3-5 Recommendations
 * Fallback: If Groq fails, bypass to Gemini-only mode
 *
 * @param {string} vibe - User's natural language mood/vibe description
 * @param {Object} options - Optional parameters
 * @param {string} options.userContext - User's favorite films for context
 * @param {string} options.systemPrompt - Custom system prompt
 * @param {string[]} options.rejectedTitles - Movies to exclude
 * @returns {Promise<Object>} - { recommendations: Array, _meta: Object }
 */
export const getHybridRecommendation = async (vibe, options = {}) => {
  const {
    userContext = "No favorite films provided",
    systemPrompt = BASE_SYSTEM_PROMPT,
    rejectedTitles = [],
  } = options;

  const rejectedContext =
    rejectedTitles.length > 0
      ? `\n\nREJECTED MOVIES (DO NOT SUGGEST): ${rejectedTitles.join(", ")}`
      : "";

  const fullSystemPrompt = `${systemPrompt}${rejectedContext}`;

  let genreIds = [];
  let groqSuccess = false;
  let startTime = performance.now();

  // Step 1: Try Groq for fast genre extraction (target: sub-500ms)
  try {
    genreIds = await fetchGroqGenres(vibe);
    const latency = Math.round(performance.now() - startTime);
    console.log(`⚡ Groq latency: ${latency}ms`);
    groqSuccess = true;
  } catch (groqError) {
    console.warn(
      "⚠️ Groq failed, falling back to Gemini-only mode:",
      groqError.message,
    );
  }

  const genreContext =
    groqSuccess && genreIds.length > 0
      ? `\n\nEXTRACTED GENRE IDS: [${genreIds.join(", ")}]
    These genres were extracted from the user's vibe: ${genreIds.map((id) => TMDB_GENRES[id]).join(", ")}
    Use this as guidance, but prioritize narrative complexity and emotional resonance over strict genre matching.`
      : "";

  const prompt = `${fullSystemPrompt}

USER CONTEXT (Curated Favorites):
${userContext}

CURRENT MOOD/REQUEST:
"${vibe}"${genreContext}

CRITICAL REQUIREMENTS:
1. Return EXACTLY 3 to 5 unique movies - no more, no less
2. Mix well-known cult classics with obscure deep cuts
3. Each movie must be unique (no duplicates)
4. Prioritize narrative complexity, emotional resonance, and visual storytelling
5. NEVER include tmdb_id - we will verify separately

🚫 REJECTED MOVIES LIST (STRICT CONSTRAINT - DO NOT VIOLATE):
${
  rejectedTitles.length > 0
    ? `Under NO circumstances suggest ANY of these titles. They are already in the user's library, watchlist, or custom collections:

[${rejectedTitles.slice(0, 80).join(", ")}${rejectedTitles.length > 80 ? `... and ${rejectedTitles.length - 80} more` : ""}]

Your job is to suggest NEW discoveries they haven't logged yet.`
    : ""
}

🎯 TASTE TRIANGULATION:
Use the USER CONTEXT above to understand their niche interests. If they love atmospheric horror, don't suggest slapstick comedy. If they appreciate slow-burn indie dramas, don't recommend Michael Bay. Match their aesthetic while expanding their horizons.

Return ONLY valid JSON. NO text before or after. NO markdown formatting.

Format:
{
  "recommendations": [
    {
      "title": "Exact Movie Title",
      "year": 2023,
      "rationale": "2-3 sentences explaining why this matches their mood, referencing specific directorial choices or cinematic techniques",
      "vibeCheck": "5-7 word punchy tagline"
    }
  ]
}`;

  try {
    const { parsed, modelUsed } = await runGeminiWithFallback(
      prompt,
      {
        temperature: 0.9,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
      (result) => {
        if (
          !result ||
          !Array.isArray(result.recommendations) ||
          result.recommendations.length === 0
        ) {
          throw new Error("Invalid response format from Gemini");
        }
      },
    );

    return {
      recommendations: parsed.recommendations,
      _meta: {
        provider: "gemini",
        groqUsed: groqSuccess,
        genreIds: genreIds,
        modelUsed,
        latency: groqSuccess
          ? `${Math.round(performance.now() - startTime)}ms`
          : "fallback",
      },
    };
  } catch (error) {
    console.error("❌ Hybrid recommendation failed:", error.message);

    try {
      const { parsed, modelUsed } = await runOpenRouterWithFallback(
        prompt,
        {
          temperature: 0.9,
          maxOutputTokens: 1500,
        },
        (result) => {
          if (
            !result ||
            !Array.isArray(result.recommendations) ||
            result.recommendations.length === 0
          ) {
            throw new Error("Invalid response format from OpenRouter");
          }
        },
      );

      return {
        recommendations: parsed.recommendations,
        _meta: {
          provider: "openrouter",
          groqUsed: groqSuccess,
          genreIds,
          modelUsed,
          latency: `${Math.round(performance.now() - startTime)}ms`,
          fallbackReason: "gemini_unavailable",
        },
      };
    } catch (openRouterError) {
      console.warn("⚠️ OpenRouter fallback failed:", openRouterError.message);
    }

    try {
      const fallbackRecommendations = await buildTmdbFallbackRecommendations(
        vibe,
        genreIds,
        rejectedTitles,
      );
      return {
        recommendations: fallbackRecommendations,
        _meta: {
          provider: "tmdb",
          groqUsed: groqSuccess,
          genreIds,
          modelUsed: "tmdb-fallback",
          latency: `${Math.round(performance.now() - startTime)}ms`,
          fallbackReason: "gemini_unavailable",
        },
      };
    } catch (fallbackError) {
      console.error("❌ TMDB fallback failed:", fallbackError.message);
      throw withTaggedError(
        "All recommendation providers are unavailable. Please try again shortly.",
        "orchestration",
        extractStatusCode(fallbackError),
      );
    }
  }
};
