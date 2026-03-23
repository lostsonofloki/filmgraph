import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with v1beta endpoint for Gemini 3 Preview models
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ VITE_GEMINI_API_KEY is not configured!');
}

// Use v1beta API endpoint required for Gemini 3 Preview models
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 3.1 Flash Lite Preview - March 2026 workhorse model (15 RPM limit)
const MODEL_NAME = "gemini-3.1-flash-lite-preview";

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL = 24 * 60 * 60 * 1000;

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
  const cacheKey = `${userId}-${favoriteMoods.join('-')}-${banishedIds.length}-${libraryIds.length}`;

  // Check cache first (unless bypassing)
  if (!bypassCache && supabase) {
    try {
      const { data: cached } = await supabase
        .from('ai_cache')
        .select('recommendations, created_at')
        .eq('user_id', userId)
        .eq('cache_type', 'discovery')
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        if (cacheAge < CACHE_TTL) {
          console.log('✅ Using cached recommendations');
          return {
            recommendations: cached.recommendations,
            fromCache: true,
          };
        }
        console.log('⏰ Cache expired, fetching fresh recommendations');
      }
    } catch (err) {
      console.log('No cache found, fetching fresh recommendations');
    }
  }

  // Combine banished IDs and library IDs into one exclusion list
  const excludedIds = [...new Set([...banishedIds, ...libraryIds])];

  // Initialize Gemini model with minimal thinking for speed
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  });

  const exclusionNote = excludedIds.length > 0
    ? `\n\nSTRICT CONSTRAINT - DO NOT suggest these TMDB IDs: [${excludedIds.join(',')}]. User already has these or rejected them.`
    : '';

  const prompt = `You are the Ignes Discovery Engine. Your goal is to suggest high-quality cinema across ALL genres based on the user's logged history.

THE EEAAO RULE: The user has rated ambitious, non-linear films like Everything Everywhere All at Once 10/10. Do not limit suggestions to one genre; prioritize complexity and emotional resonance.

Top-rated watched: ${JSON.stringify(topRatedMovies)}
Want to watch: ${JSON.stringify(recentToWatch)}
Favorite moods: ${favoriteMoods.join(',')}${exclusionNote}

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
    const result = await model.generateContentStream(prompt);
    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.text());
    }

    const responseText = chunks.join('');
    const recommendations = JSON.parse(responseText);

    // Cache the results
    if (supabase && userId) {
      await supabase.from('ai_cache').upsert({
        user_id: userId,
        cache_type: 'discovery',
        cache_key: cacheKey,
        recommendations: recommendations,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,cache_type',
      });
      console.log('💾 Recommendations cached');
    }

    return {
      recommendations,
      fromCache: false,
    };
  } catch (error) {
    console.error('Error getting AI recommendations:', error);
    throw new Error(error.message || 'The Oracle could not be reached');
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
    console.error('TMDB API key missing');
    return null;
  }
  
  try {
    // Try 1: Search with title in query and year in primary_release_year
    const searchQuery = encodeURIComponent(title);
    const yearParam = year && year !== 'N/A' ? `&primary_release_year=${year}` : '';
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        console.log(`✅ TMDB match: "${title}" → "${movie.title}" (${movie.release_date?.split('-')[0]})`);
        return {
          tmdb_id: movie.id,
          title: movie.title,
          year: movie.release_date?.split('-')[0] || year,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          verified: true,
        };
      }
    }
    
    // Try 2: Clean title (remove common suffixes) and retry
    const cleanTitle = title
      .replace(/\s*\([^)]*\)\s*/g, '') // Remove parentheses
      .replace(/:\s*.*$/, '') // Remove everything after colon
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
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
      responseMimeType: 'application/json',
    },
  });

  const moodData = movieLogs
    .filter(m => m.moods && m.moods.length > 0)
    .slice(0, 20)
    .map(m => ({
      title: m.title,
      moods: m.moods,
      rating: m.rating,
    }));

  const prompt = `You are a Global Cinema Strategist for Ignes. Analyze the ENTIRE movie_logs array for common threads in pacing, cinematography, and narrative complexity across ALL genres (Action, Drama, Sci-Fi, Horror, etc.).

${JSON.stringify(moodData)}

Return JSON with these exact keys:
{"dominant_category":"emotional|vibe|intellectual","horror_palate":"description of their core aesthetic across all genres","surprising_observation":"insight about their viewing patterns","curators_note":"diverse film advice referencing multiple genres they enjoy"}`;

  try {
    const result = await model.generateContentStream(prompt);
    const chunks = [];
    for await (const chunk of result.stream) {
      chunks.push(chunk.text());
    }
    return JSON.parse(chunks.join(''));
  } catch (error) {
    console.error('Error analyzing mood patterns:', error);
    return null;
  }
};
