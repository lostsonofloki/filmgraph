import { getSupabase } from '../supabaseClient';

/**
 * Migration: Fix poster_path for movies imported before v1.8.2
 * Updates poster_path column - Supabase generated column syncs to poster automatically
 */

// The base can appear more than once when a broken value was written back through the UI, hence
// the global flag and the `http` lookahead alternative.
const TMDB_IMAGE_BASE = /https?:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]*(?=\/|https?:)/gi;

/**
 * A row that stores a whole `https://image.tmdb.org/t/p/w500/abc.jpg` URL renders as
 * `…/w500https://…` because the UI prepends the base again. The relative path is already inside
 * the stored value, so no TMDB request is needed to recover it.
 * @param {string} value - Stored poster_path value
 * @returns {string|null} - Relative TMDB path, or null when the value is not such a URL
 */
export const posterPathFromLegacyUrl = (value) => {
  const source = String(value || '').trim();
  const stripped = source.replace(TMDB_IMAGE_BASE, '').trim();
  if (stripped === source) return null;
  return stripped.startsWith('/') && stripped.length > 1 ? stripped : null;
};

/**
 * Rows worth touching: the poster is missing, or it holds a full URL instead of the relative
 * path the UI expects. A correct relative path is left alone.
 * @param {string} posterPath - Stored poster_path value
 */
export const needsPosterRepair = (posterPath) =>
  !posterPath || posterPath === 'N/A' || /^https?:\/\//i.test(posterPath);

/**
 * Fix a single movie's poster_path
 * @param {string} movieId - movie_logs.id
 * @param {string} tmdbId - TMDB movie ID
 * @param {string} currentPosterPath - Current poster_path value (full URL, 'N/A', or null)
 * @param {Object} supabase - Supabase client
 */
export const fixMoviePoster = async (movieId, tmdbId, currentPosterPath, supabase) => {
  if (!needsPosterRepair(currentPosterPath)) {
    return { success: false, reason: 'Already a relative path' };
  }

  let nextPosterPath = posterPathFromLegacyUrl(currentPosterPath);
  let action = 'Stripped the TMDB image base';

  if (!nextPosterPath) {
    if (!tmdbId) {
      return { success: false, reason: 'No TMDB ID' };
    }

    const tmdbData = await fetchTMDBMovieByTmdbId(tmdbId);
    if (!tmdbData?.poster_path) {
      return { success: false, reason: 'No poster on TMDB' };
    }

    nextPosterPath = tmdbData.poster_path;
    action = 'Fetched from TMDB';
  }

  if (nextPosterPath === currentPosterPath) {
    return { success: false, reason: 'Already correct' };
  }

  const { error } = await supabase
    .from('movie_logs')
    .update({ poster_path: nextPosterPath })
    .eq('id', movieId);

  if (error) {
    console.error(`❌ PATCH failed for ${movieId}:`, error.message);
    return { success: false, reason: error.message };
  }

  return { success: true, action };
};

/**
 * Fetch TMDB movie by TMDB ID (not search)
 * @param {number} tmdbId - TMDB movie ID
 */
export const fetchTMDBMovieByTmdbId = async (tmdbId) => {
  const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
  
  if (!TMDB_API_KEY) {
    console.error('TMDB API key missing');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error(`Error fetching TMDB movie ${tmdbId}:`, error.message);
    return null;
  }
};

/**
 * Run the full migration for all movies
 * @param {string} userId - User ID to migrate
 * @returns {Promise<{checked: number, fixed: number, skipped: number, errors: number}>}
 */
export const runPosterMigration = async (userId) => {
  const supabase = getSupabase();

  console.log('🔧 Starting poster migration...');

  // Fetch all movies for user - check poster_path column only
  const { data: movies, error } = await supabase
    .from('movie_logs')
    .select('id, tmdb_id, poster_path')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Failed to fetch movies:', error);
    return { checked: 0, fixed: 0, skipped: 0, errors: 1 };
  }

  const moviesNeedingRefresh = movies.filter((m) => needsPosterRepair(m.poster_path));

  console.log(`📦 Total movies found: ${movies.length}`);
  console.log(`🔍 Movies needing poster_path repair: ${moviesNeedingRefresh.length}`);
  console.log('📋 Movies to process:', moviesNeedingRefresh.map(m => ({ id: m.id, tmdb_id: m.tmdb_id, current_poster_path: m.poster_path })));

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const movie of moviesNeedingRefresh) {
    let usedTmdb = false;

    try {
      console.log(`\n--- Processing movie ID: ${movie.id}, TMDB ID: ${movie.tmdb_id} ---`);
      console.log(`📌 Current poster_path: ${movie.poster_path}`);

      // A stored full URL already contains the path, so repair it locally.
      let newPosterPath = posterPathFromLegacyUrl(movie.poster_path);

      if (newPosterPath) {
        console.log(`✂️ Recovered poster_path from the stored URL: ${newPosterPath}`);
      } else {
        if (!movie.tmdb_id) {
          console.log(`⏭️ Skipped: ${movie.id} - No TMDB ID`);
          skipped++;
          continue;
        }

        usedTmdb = true;
        const tmdbData = await fetchTMDBMovieByTmdbId(movie.tmdb_id);

        if (!tmdbData?.poster_path) {
          console.log(`⏭️ Skipped: ${movie.id} - No poster_path from TMDB`);
          skipped++;
          continue;
        }

        newPosterPath = tmdbData.poster_path;
        console.log(`🎬 TMDB returned poster_path: ${newPosterPath}`);
      }

      if (newPosterPath === movie.poster_path) {
        console.log(`⏭️ Skipped: ${movie.id} - poster_path already correct`);
        skipped++;
        continue;
      }

      // Execute the update - targeting poster_path column explicitly
      const { data, error, status } = await supabase
        .from('movie_logs')
        .update({ poster_path: newPosterPath })
        .eq('id', movie.id)
        .select();

      // Verbose response logging
      console.log(`📡 Supabase response for movie ${movie.id}:`);
      console.log(`   - Status: ${status}`);
      console.log(`   - Error:`, error);
      console.log(`   - Data:`, data);

      // Check for RLS blocking (no error but no data returned)
      if (!error && !data) {
        console.warn(`⚠️ WARNING: RLS may be blocking update for movie ${movie.id} - no error but no data returned`);
        skipped++;
        continue;
      }

      if (error) {
        console.error(`❌ PATCH failed for ${movie.id}:`, error.message);
        errors++;
        continue;
      }

      if (data && data.length > 0) {
        console.log(`✅ Fixed: ${movie.id} - poster_path updated to ${newPosterPath}`);
        fixed++;
      } else {
        console.log(`⏭️ Skipped: ${movie.id} - No rows affected`);
        skipped++;
      }
    } catch (err) {
      console.error(`❌ Error fixing ${movie.id}:`, err);
      errors++;
    }

    // Rate limiting only matters for rows that actually hit TMDB.
    if (usedTmdb) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n🎉 Migration complete: ${fixed} repaired, ${skipped} unchanged, ${errors} errors`);

  return { checked: moviesNeedingRefresh.length, fixed, skipped, errors };
};
