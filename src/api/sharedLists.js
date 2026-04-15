import { getSupabase } from '../supabaseClient';

/**
 * Collaborative shared lists API (Phase 6.17)
 *
 * Filmgraph stores movies in `list_items` (not a separate `list_entries` table).
 * `list_members` controls who can see or edit a list.
 *
 * All helpers return `{ data, error }` in Supabase client style (`error` is null on success).
 */

/**
 * Create a list and register the creator as `owner` in `list_members`.
 *
 * @param {string} userId - auth user id (must match the signed-in user for RLS)
 * @param {string} name
 * @param {string} [description]
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function createList(userId, name, description = '') {
  const supabase = getSupabase();
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return { data: null, error: new Error('List name is required.') };
  }

  const { data: list, error: insertListError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: trimmedName,
      description: (description || '').trim(),
      is_public: false,
    })
    .select()
    .single();

  if (insertListError) {
    console.error('sharedLists.createList lists insert:', insertListError);
    return { data: null, error: insertListError };
  }

  const { error: memberError } = await supabase.from('list_members').insert({
    list_id: list.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) {
    console.error('sharedLists.createList list_members insert:', memberError);
    await supabase.from('lists').delete().eq('id', list.id);
    return { data: null, error: memberError };
  }

  return { data: { ...list, list_items: [] }, error: null };
}

/**
 * All lists the user can access via `list_members`, with items embedded like ListContext.
 *
 * @param {string} userId
 * @returns {Promise<{ data: Array | null, error: Error | null }>}
 */
export async function getUserLists(userId) {
  const supabase = getSupabase();

  const { data: memberships, error: memError } = await supabase
    .from('list_members')
    .select('list_id, role, joined_at')
    .eq('user_id', userId);

  if (memError) {
    console.error('sharedLists.getUserLists memberships:', memError);
    return { data: null, error: memError };
  }

  if (!memberships?.length) {
    return { data: [], error: null };
  }

  const metaByListId = Object.fromEntries(
    memberships.map((m) => [m.list_id, { role: m.role, joined_at: m.joined_at }])
  );
  const ids = [...new Set(memberships.map((m) => m.list_id))];

  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select(
      `
      *,
      list_items (
        id,
        tmdb_id,
        title,
        poster_path,
        added_at,
        added_by
      )
    `
    )
    .in('id', ids)
    .order('created_at', { ascending: false });

  if (listsError) {
    console.error('sharedLists.getUserLists lists:', listsError);
    return { data: null, error: listsError };
  }

  const enriched = (lists || []).map((list) => ({
    ...list,
    membership: metaByListId[list.id] || null,
  }));

  return { data: enriched, error: null };
}

/**
 * Add a movie to a list (`list_items`). Sets `added_by` when the column exists.
 *
 * @param {string} listId
 * @param {number} tmdbId
 * @param {string} userId - current user (for `added_by`)
 * @param {{ title?: string, poster_path?: string | null }} [movie] - optional TMDB display fields
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function addMovieToList(listId, tmdbId, userId, movie = {}) {
  const supabase = getSupabase();
  if (listId == null || tmdbId == null) {
    return { data: null, error: new Error('listId and tmdbId are required.') };
  }

  const row = {
    list_id: listId,
    tmdb_id: tmdbId,
    title: movie.title ?? 'Unknown',
    poster_path: movie.poster_path ?? null,
    added_by: userId,
  };

  const { data, error } = await supabase.from('list_items').insert(row).select().single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: new Error('This movie is already in the list.') };
    }
    console.error('sharedLists.addMovieToList:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * All movies (`list_items`) for a list, newest first.
 *
 * @param {string} listId
 * @returns {Promise<{ data: Array | null, error: Error | null }>}
 */
export async function getListEntries(listId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('sharedLists.getListEntries:', error);
    return { data: null, error };
  }

  return { data: data || [], error: null };
}
