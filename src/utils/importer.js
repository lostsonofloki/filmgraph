import { fetchTMDBMovie } from '../api/tmdb';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Parse messy movie list text using Groq LPU
 * Extracts title and year from various formats (Letterboxd, notes, etc.)
 * @param {string} text - Raw text input from user
 * @returns {Promise<Array<{title: string, year: string}>>} - Parsed movie list
 */
export const parseArchiveWithGroq = async (text) => {
  if (!GROQ_API_KEY) {
    throw new Error('VITE_GROQ_API_KEY is not configured');
  }

  const systemPrompt = `You are a movie list parser. Extract movie titles and years from messy text input.

INPUT FORMATS YOU MAY ENCOUNTER:
- Letterboxd exports: "The Shawshank Redemption (1994) ★★★★☆"
- Plain lists: "Pulp Fiction, 1994"
- Notes: "Watched: Inception (2010) - loved it!"
- Numbered lists: "1. The Matrix (1999)"
- Just titles: "Shrek" or "Blade Runner 2049"
- Single movie: "The Godfather"

RULES:
1. Extract the movie title (REQUIRED - always extract)
2. Extract the release year if present (OPTIONAL - use "N/A" if missing)
3. Ignore ratings, reviews, notes, and extra text
4. Even a single word like "Shrek" or "Jaws" is a valid movie title
5. Return ONLY a valid JSON array - NO explanation, NO markdown

OUTPUT FORMAT:
[{"title": "Exact Movie Title", "year": "1994"}]

EXAMPLE INPUT 1 (Multiple movies):
"The Shawshank Redemption (1994) ★★★★☆
Pulp Fiction, 1994
Watched: Inception (2010) - loved it!"

EXAMPLE OUTPUT 1:
[{"title": "The Shawshank Redemption", "year": "1994"}, {"title": "Pulp Fiction", "year": "1994"}, {"title": "Inception", "year": "2010"}]

EXAMPLE INPUT 2 (Single movie, no year):
"Shrek"

EXAMPLE OUTPUT 2:
[{"title": "Shrek", "year": "N/A"}]

EXAMPLE INPUT 3 (Mixed formats):
"The Matrix
Goodfellas (1990)
3. Pulp Fiction"

EXAMPLE OUTPUT 3:
[{"title": "The Matrix", "year": "N/A"}, {"title": "Goodfellas", "year": "1990"}, {"title": "Pulp Fiction", "year": "N/A"}]`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this movie list:\n\n${text}` },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq');
    }

    const parsed = JSON.parse(content);

    // Handle multiple formats:
    // 1. Array: [{"title": "Jaws", "year": "N/A"}]
    // 2. Object with movies key: {"movies": [...]}
    // 3. Single movie object: {"title": "Jaws", "year": "N/A"}
    let movies;
    if (Array.isArray(parsed)) {
      movies = parsed;
    } else if (parsed.movies && Array.isArray(parsed.movies)) {
      movies = parsed.movies;
    } else if (parsed.title) {
      // Single movie object - wrap in array
      movies = [parsed];
    } else {
      movies = [];
    }

    return movies;

  } catch (error) {
    console.error('Archive parsing failed:', error.message);
    throw error;
  }
};

/**
 * Verify multiple movies against TMDB in parallel
 * Uses Promise.allSettled to handle partial failures gracefully
 * @param {Array<{title: string, year: string}>} parsedMovies - Parsed movie list
 * @returns {Promise<Array<{parsed: Object, tmdb: Object|null, status: 'found'|'not_found'|'error'}>>}
 */
export const verifyBatchWithTMDB = async (parsedMovies) => {
  console.log(`🔍 Verifying ${parsedMovies.length} movies with TMDB...`);

  const verificationPromises = parsedMovies.map(async (movie) => {
    try {
      const tmdbData = await fetchTMDBMovie(movie.title, movie.year);
      
      return {
        parsed: movie,
        tmdb: tmdbData,
        status: tmdbData ? 'found' : 'not_found',
      };
    } catch (error) {
      console.warn(`Failed to verify "${movie.title}":`, error.message);
      return {
        parsed: movie,
        tmdb: null,
        status: 'error',
        error: error.message,
      };
    }
  });

  const results = await Promise.all(verificationPromises);
  
  const found = results.filter(r => r.status === 'found').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ TMDB Verification: ${found} found, ${notFound} not found, ${errors} errors`);
  
  return results;
};

/**
 * Optimized Batch Save
 * Performs a single network request for the entire list
 * Uses UPSERT with onConflict to handle duplicates automatically
 * @param {Array<Object>} confirmedMovies - Array of {tmdb, watch_status, rating, moods, review}
 * @param {string} userId - User ID
 * @param {Object} supabase - Supabase client
 * @returns {Promise<{success: number, skipped: number, errors: number}>}
 */
export const batchSaveMovies = async (confirmedMovies, userId, supabase) => {
  console.log(`💾 Preparing batch save for ${confirmedMovies.length} movies...`);

  // Map the confirmed TMDB data to your schema format
  const moviesToInsert = confirmedMovies.map(movie => ({
    user_id: userId,
    tmdb_id: movie.tmdb.id,
    title: movie.tmdb.title,
    year: movie.tmdb.release_date?.split('-')[0] || 'N/A',
    poster: movie.tmdb.poster_path,
    watch_status: movie.watch_status || 'to-watch',
    rating: movie.rating || 0,
    moods: movie.moods || [],
    review: movie.review || '',
    genres: [],
  }));

  try {
    // Single UPSERT call
    // onConflict tells Supabase: "If this user already has this tmdb_id, skip it"
    // Must reference the columns that make up the unique constraint
    const { data, error } = await supabase
      .from('movie_logs')
      .upsert(moviesToInsert, { 
        onConflict: 'user_id, tmdb_id', 
        ignoreDuplicates: true 
      })
      .select();

    if (error) throw error;

    const successCount = data?.length || 0;
    const skippedCount = moviesToInsert.length - successCount;

    console.log(`💾 Batch complete: ${successCount} saved, ${skippedCount} duplicates skipped`);

    return { 
      success: successCount, 
      skipped: skippedCount, 
      errors: 0 
    };
  } catch (error) {
    console.error('❌ Batch save failed:', error.message);
    throw error;
  }
};
