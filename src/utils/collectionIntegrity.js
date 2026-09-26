import { getSupabase } from '../supabaseClient';

export const checkDuplicateInCollection = async ({ userId, tmdbId, sourceUpc = '' }) => {
  const cleanUpc = String(sourceUpc || '').trim();

  if (!userId || (!tmdbId && !cleanUpc)) {
    return { isDuplicate: false, reasons: [], failedChecks: [], isComplete: true };
  }

  const supabase = getSupabase();
  const probes = [];

  // A UPC scan with no TMDB match still has a barcode worth checking, but the
  // tmdb_id probes would send `eq.undefined` to an integer column and fail.
  if (tmdbId) {
    probes.push({
      label: 'library',
      query: supabase
        .from('movie_logs')
        .select('id, watch_status, title, source_upc')
        .eq('user_id', userId)
        .eq('tmdb_id', tmdbId)
        .limit(1),
      toReason: (rows) =>
        `already exists in ${rows[0].watch_status === 'to-watch' ? 'watchlist' : 'watched logs'}`,
    });
    probes.push({
      label: 'lists',
      query: supabase
        .from('list_items')
        .select('id, list_id, title, lists!inner(user_id)')
        .eq('tmdb_id', tmdbId)
        .eq('lists.user_id', userId)
        .limit(1),
      toReason: () => 'already exists in one of your lists',
    });
  }

  if (cleanUpc) {
    probes.push({
      label: 'barcode',
      query: supabase
        .from('movie_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('source_upc', cleanUpc)
        .limit(1),
      toReason: () => 'barcode already logged',
    });
  }

  const results = await Promise.all(probes.map((probe) => probe.query));

  const reasons = [];
  const failedChecks = [];

  results.forEach((result, index) => {
    const probe = probes[index];
    if (result.error) {
      console.error(`Duplicate check failed (${probe.label}):`, result.error);
      failedChecks.push(probe.label);
      return;
    }
    if (result.data && result.data.length > 0) {
      reasons.push(probe.toReason(result.data));
    }
  });

  return {
    isDuplicate: reasons.length > 0,
    reasons,
    failedChecks,
    isComplete: failedChecks.length === 0,
  };
};
