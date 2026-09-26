import { fetchTMDBMovie } from '../api/tmdb';
import { callGroqJSON } from './groq';

// Leading "1." / "-" / "*" list markers.
const LIST_MARKER = /^\s*(?:\d+[.)]\s*|[-*•·]\s*)/;

// Only a closed set of labels is stripped. A generic `word:` rule would mangle real titles
// such as "Mission: Impossible".
const KNOWN_LABEL = /^(?:watched|watch|seen|rewatched|re-watched|movie|film|title)\s*:\s*/i;

const PAREN_YEAR = /\((1[89]\d{2}|20\d{2})\)/;
const COMMA_YEAR = /,\s*(1[89]\d{2}|20\d{2})\s*$/;
const RATING_CHARS = /[★☆⭐]+/g;

// Requires whitespace around the dash so hyphenated titles like "Spider-Man" survive.
const TRAILING_NOTE = /\s+[-–—]\s+.*$/;

const HEADER_LINE = /^(?:my\s+)?(?:watchlist|watch list|list|movies|films|to watch|seen)\s*:?\s*$/i;

/**
 * Deterministic fallback parser.
 *
 * Handles the formats the AI prompt advertises without needing the network, so an outage or
 * another model retirement cannot block an import. Deliberately conservative: a slightly
 * messy title still matches in TMDB search, and the review step lets the user drop misses,
 * whereas an over-eager strip silently loses films.
 *
 * @param {string} text - Raw text input from user
 * @returns {Array<{title: string, year: string}>}
 */
export const parseArchiveLocally = (text) => {
  const movies = [];

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    line = line.replace(LIST_MARKER, '').replace(KNOWN_LABEL, '').replace(RATING_CHARS, '').trim();
    if (!line || HEADER_LINE.test(line)) continue;

    let year = 'N/A';
    const parenYear = line.match(PAREN_YEAR);
    const commaYear = line.match(COMMA_YEAR);

    if (parenYear) {
      year = parenYear[1];
      line = line.replace(parenYear[0], ' ').trim();
    } else if (commaYear) {
      year = commaYear[1];
      line = line.slice(0, commaYear.index).trim();
    }
    // A bare trailing number is never read as a year, so "Blade Runner 2049" keeps its title.

    line = line.replace(TRAILING_NOTE, '').replace(/[\s,;:–—-]+$/, '').trim();
    if (!line || /^\d+$/.test(line)) continue;

    movies.push({ title: line, year });
  }

  return movies;
};

/**
 * Normalise the several shapes the model may return into a flat movie array.
 */
const normalizeParsedMovies = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.movies)) return parsed.movies;
  if (parsed?.title) return [parsed];

  // Some models wrap the array under an unadvertised key ("films", "results", ...).
  const wrapped = parsed && typeof parsed === 'object' ? Object.values(parsed).find(Array.isArray) : null;
  if (wrapped) return wrapped;

  return [];
};

/**
 * Parse messy movie list text using Groq LPU, falling back to a local parser.
 * Extracts title and year from various formats (Letterboxd, notes, etc.)
 * @param {string} text - Raw text input from user
 * @returns {Promise<Array<{title: string, year: string}>>} - Parsed movie list
 */
export const parseArchiveWithGroq = async (text) => {
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
    const parsed = await callGroqJSON({
      systemPrompt,
      userMessage: `Parse this movie list:\n\n${text}`,
      maxTokens: 2000,
    });

    const movies = normalizeParsedMovies(parsed).filter((movie) => movie?.title);
    if (movies.length > 0) {
      return movies;
    }

    throw new Error('Groq returned no recognisable titles');
  } catch (error) {
    // Importing a watchlist must not depend on an AI provider being healthy.
    console.warn(`⚠️ Groq parsing unavailable (${error.message}); using local parser.`);

    const localMovies = parseArchiveLocally(text);
    if (localMovies.length > 0) {
      console.log(`📄 Local parser recovered ${localMovies.length} titles.`);
      return localMovies;
    }

    console.error('Archive parsing failed:', error.message);
    throw new Error("Couldn't find any movie titles in that list. Try one title per line.");
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
    poster_path: movie.tmdb.poster_path || null,
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
