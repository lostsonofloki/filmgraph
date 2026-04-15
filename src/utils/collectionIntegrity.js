import { getSupabase } from '../supabaseClient';

export const checkDuplicateInCollection = async ({ userId, tmdbId, sourceUpc = '' }) => {
  if (!userId || (!tmdbId && !sourceUpc)) return { isDuplicate: false, reasons: [] };

  const supabase = getSupabase();
  const reasons = [];
  const cleanUpc = String(sourceUpc || '').trim();

  const checks = [
    supabase
      .from('movie_logs')
      .select('id, watch_status, title, source_upc')
      .eq('user_id', userId)
      .eq('tmdb_id', tmdbId)
      .limit(1),
    supabase
      .from('list_items')
      .select('id, list_id, title, lists!inner(user_id)')
      .eq('tmdb_id', tmdbId)
      .eq('lists.user_id', userId)
      .limit(1),
  ];

  if (cleanUpc) {
    checks.push(
      supabase
        .from('movie_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('source_upc', cleanUpc)
        .limit(1)
    );
  } else {
    checks.push(Promise.resolve({ data: [] }));
  }

  const [{ data: movieLog }, { data: listItems }, { data: upcMatches }] = await Promise.all(checks);

  if (movieLog && movieLog.length > 0) {
    const status = movieLog[0].watch_status === 'to-watch' ? 'watchlist' : 'watched logs';
    reasons.push(`already exists in ${status}`);
  }

  if (listItems && listItems.length > 0) {
    reasons.push('already exists in one of your lists');
  }

  if (upcMatches && upcMatches.length > 0) {
    reasons.push('barcode already logged');
  }

  return {
    isDuplicate: reasons.length > 0,
    reasons,
  };
};
