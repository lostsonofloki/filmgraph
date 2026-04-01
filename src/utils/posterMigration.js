import { getSupabase } from '../supabaseClient';
import { fetchTMDBMovie } from '../api/tmdb';

/**
 * Migration: Fix poster_path for movies imported before v1.8.2
 * Updates poster_path column - Supabase generated column syncs to poster automatically
 */

/**
 * Fix a single movie's poster URL
 * @param {string} movieId - movie_logs.id
 * @param {string} tmdbId - TMDB movie ID
 * @param {string} currentPosterPath - Current poster_path value (relative path or null)
 * @param {Object} supabase - Supabase client
 */
export const fixMoviePoster = async (movieId, tmdbId, currentPosterPath, supabase) => {
  // Skip if already a full URL (shouldn't happen with poster_path)
  if (currentPosterPath?.startsWith('https://')) {
    return { success: false, reason: 'Already has full URL' };
  }

  // Skip if null/empty
  if (!currentPosterPath || currentPosterPath === 'N/A') {
    // Try to fetch from TMDB
    if (!tmdbId) {
      return { success: false, reason: 'No TMDB ID' };
    }

    const tmdbData = await fetchTMDBMovieByTmdbId(tmdbId);
    if (!tmdbData?.poster_path) {
      return { success: false, reason: 'No poster on TMDB' };
    }

    const { error } = await supabase
      .from('movie_logs')
      .update({ poster_path: tmdbData.poster_path })
      .eq('id', movieId);

    if (error) {
      console.error(`❌ PATCH failed for ${movieId}:`, error.message);
      return { success: false, reason: error.message };
    }

    return { success: true, action: 'Fetched from TMDB' };
  }

  // Already has relative path - update with full poster_path
  const { error } = await supabase
    .from('movie_logs')
    .update({ poster_path: currentPosterPath })
    .eq('id', movieId);

  if (error) {
    console.error(`❌ PATCH failed for ${movieId}:`, error.message);
    return { success: false, reason: error.message };
  }

  return { success: true, action: 'Updated poster_path' };
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
 * @returns {Promise<{fixed: number, skipped: number, errors: number}>}
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
    return { fixed: 0, skipped: 0, errors: 1 };
  }

  // Filter: Only process movies where poster_path is null OR doesn't start with http
  const moviesNeedingRefresh = movies.filter(m => 
    !m.poster_path || 
    m.poster_path === 'N/A' || 
    !m.poster_path.startsWith('http')
  );

  console.log(`📦 Total movies found: ${movies.length}`);
  console.log(`🔍 Movies needing poster_path refresh: ${moviesNeedingRefresh.length}`);
  console.log('📋 Movies to process:', moviesNeedingRefresh.map(m => ({ id: m.id, tmdb_id: m.tmdb_id, current_poster_path: m.poster_path })));

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const movie of moviesNeedingRefresh) {
    try {
      console.log(`\n--- Processing movie ID: ${movie.id}, TMDB ID: ${movie.tmdb_id} ---`);
      console.log(`📌 Current poster_path: ${movie.poster_path}`);

      // Skip if no TMDB ID
      if (!movie.tmdb_id) {
        console.log(`⏭️ Skipped: ${movie.id} - No TMDB ID`);
        skipped++;
        continue;
      }

      // Fetch from TMDB
      const tmdbData = await fetchTMDBMovieByTmdbId(movie.tmdb_id);
      
      if (!tmdbData?.poster_path) {
        console.log(`⏭️ Skipped: ${movie.id} - No poster_path from TMDB`);
        skipped++;
        continue;
      }

      const newPosterPath = tmdbData.poster_path;
      console.log(`🎬 TMDB returned poster_path: ${newPosterPath}`);

      // Build the update payload
      const updatePayload = { poster_path: newPosterPath };
      console.log(`📦 Update payload being sent:`, JSON.stringify(updatePayload, null, 2));

      // Execute the update - targeting poster_path column explicitly
      const { data, error, status } = await supabase
        .from('movie_logs')
        .update(updatePayload)
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

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n🎉 Migration complete: ${fixed} fixed, ${skipped} skipped, ${errors} errors`);

  return { fixed, skipped, errors };
};
