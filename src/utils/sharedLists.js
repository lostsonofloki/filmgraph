import { getSupabase } from '../supabaseClient';

/**
 * Create a new shared list.
 * Creates the list, then inserts the creator as owner in list_members.
 */
export async function createSharedList(userId, name, description = '') {
  const supabase = getSupabase();

  const { data: list, error: listError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      is_shared: true,
    })
    .select()
    .single();

  if (listError) throw listError;

  // Insert creator as owner
  const { error: memberError } = await supabase
    .from('list_members')
    .insert({
      list_id: list.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) throw memberError;

  return { ...list, list_members: [{ user_id: userId, role: 'owner' }] };
}

/**
 * Invite a user to a shared list by their user_id.
 */
export async function inviteMember(listId, targetUserId, role = 'viewer') {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('list_members')
    .insert({
      list_id: listId,
      user_id: targetUserId,
      role,
    })
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a member from a shared list.
 */
export async function removeMember(listId, targetUserId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', targetUserId);

  if (error) throw error;
}

/**
 * Update a member's role (owner/editor/viewer).
 */
export async function updateMemberRole(listId, targetUserId, role) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('list_members')
    .update({ role })
    .eq('list_id', listId)
    .eq('user_id', targetUserId)
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add a movie to a shared list (list_entries with attribution).
 */
export async function addListEntry(listId, tmdbId, title, posterPath, addedByUserId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('list_entries')
    .insert({
      list_id: listId,
      tmdb_id: tmdbId,
      title,
      poster_path: posterPath || null,
      added_by: addedByUserId,
    })
    .select(`
      *,
      profiles:added_by (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a movie from a shared list.
 */
export async function removeListEntry(listId, tmdbId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('list_entries')
    .delete()
    .eq('list_id', listId)
    .eq('tmdb_id', tmdbId);

  if (error) throw error;
}

/**
 * Fetch a shared list with its members and entries.
 */
export async function fetchSharedList(listId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('lists')
    .select(`
      *,
      list_members (
        user_id,
        role,
        added_at,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      ),
      list_entries (
        id,
        tmdb_id,
        title,
        poster_path,
        added_at,
        added_by,
        profiles:added_by (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('id', listId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all shared lists the user is a member of.
 */
export async function fetchUserSharedLists(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('lists')
    .select(`
      *,
      list_members (
        user_id,
        role,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      ),
      list_entries (
        id,
        tmdb_id,
        title,
        poster_path,
        added_at,
        added_by,
        profiles:added_by (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('is_shared', true)
    .or(`user_id.eq.${userId},list_members.user_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Search for a user by username or display_name (for invite flow).
 */
export async function searchUserByNickname(query) {
  const supabase = getSupabase();

  const term = `%${query}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.${term},display_name.ilike.${term}`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

/**
 * Check if a tmdb_id already exists in a shared list's entries.
 */
export async function isEntryInSharedList(listId, tmdbId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('list_entries')
    .select('id')
    .eq('list_id', listId)
    .eq('tmdb_id', tmdbId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
