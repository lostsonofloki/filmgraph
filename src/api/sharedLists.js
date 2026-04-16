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

const EDITOR_ROLES = new Set(['owner', 'editor']);
const VALID_ROLES = new Set(['owner', 'editor', 'viewer']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isJoinedAtColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    message.includes('joined_at') ||
    details.includes('joined_at') ||
    code === 'PGRST204'
  );
}

function isAddedByColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    message.includes('added_by') ||
    details.includes('added_by') ||
    code === 'PGRST204'
  );
}

/**
 * True if role can mutate list items.
 * @param {string | null | undefined} role
 * @returns {boolean}
 */
export function canEditRole(role) {
  return EDITOR_ROLES.has(role);
}

/**
 * Resolve a collaborator by UUID, email, or username.
 * @param {string} identifier
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function resolveProfileByIdentifier(identifier) {
  const supabase = getSupabase();
  const raw = (identifier || '').trim();
  if (!raw) {
    return { data: null, error: new Error('Enter an email, username, or user ID.') };
  }

  const isUuid = UUID_RE.test(raw);
  let query = supabase.from('profiles').select('id, email, username, display_name, avatar_url');
  if (isUuid) {
    query = query.eq('id', raw);
  } else if (raw.includes('@')) {
    query = query.eq('email', raw.toLowerCase());
  } else {
    query = query.eq('username', raw);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: new Error('User not found.') };
  return { data, error: null };
}

/**
 * All lists the user can access via `list_members`, with items embedded like ListContext.
 *
 * @param {string} userId
 * @returns {Promise<{ data: Array | null, error: Error | null }>}
 */
export async function getUserLists(userId) {
  const supabase = getSupabase();

  let { data: memberships, error: memError } = await supabase
    .from('list_members')
    .select('list_id, role, joined_at')
    .eq('user_id', userId);

  if (memError && isJoinedAtColumnError(memError)) {
    const fallback = await supabase
      .from('list_members')
      .select('list_id, role')
      .eq('user_id', userId);
    memberships = (fallback.data || []).map((m) => ({ ...m, joined_at: null }));
    memError = fallback.error;
  }

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

  let { data: lists, error: listsError } = await supabase
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

  if (listsError && isAddedByColumnError(listsError)) {
    const fallback = await supabase
      .from('lists')
      .select(
        `
        *,
        list_items (
          id,
          tmdb_id,
          title,
          poster_path,
          added_at
        )
      `
      )
      .in('id', ids)
      .order('created_at', { ascending: false });
    lists = (fallback.data || []).map((list) => ({
      ...list,
      list_items: (list.list_items || []).map((item) => ({
        ...item,
        added_by: null,
      })),
    }));
    listsError = fallback.error;
  }

  if (listsError) {
    console.error('sharedLists.getUserLists lists:', listsError);
    return { data: null, error: listsError };
  }

  let { data: membersData, error: membersError } = await supabase
    .from('list_members')
    .select('list_id, user_id, role, joined_at')
    .in('list_id', ids);

  if (membersError && isJoinedAtColumnError(membersError)) {
    const fallback = await supabase
      .from('list_members')
      .select('list_id, user_id, role')
      .in('list_id', ids);
    membersData = (fallback.data || []).map((m) => ({ ...m, joined_at: null }));
    membersError = fallback.error;
  }

  if (membersError) {
    console.error('sharedLists.getUserLists members:', membersError);
    return { data: null, error: membersError };
  }

  const profileIds = [
    ...new Set(
      (membersData || [])
        .map((m) => m.user_id)
        .concat((lists || []).flatMap((list) => (list.list_items || []).map((i) => i.added_by)))
        .filter(Boolean)
    ),
  ];

  let profileMap = {};
  if (profileIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, username, display_name, avatar_url')
      .in('id', profileIds);
    if (profilesError) {
      console.error('sharedLists.getUserLists profiles:', profilesError);
      return { data: null, error: profilesError };
    }
    profileMap = Object.fromEntries((profilesData || []).map((p) => [p.id, p]));
  }

  const membersByList = (membersData || []).reduce((acc, member) => {
    const listMembers = acc[member.list_id] || [];
    listMembers.push({
      ...member,
      profile: profileMap[member.user_id] || null,
    });
    acc[member.list_id] = listMembers;
    return acc;
  }, {});

  const enriched = (lists || []).map((list) => {
    const listItems = (list.list_items || []).map((item) => ({
      ...item,
      added_by_profile: item.added_by ? profileMap[item.added_by] || null : null,
    }));
    return {
      ...list,
      list_items: listItems,
      list_members: membersByList[list.id] || [],
      membership: metaByListId[list.id] || null,
    };
  });

  return { data: enriched, error: null };
}

/**
 * List collaborators for a specific list.
 * @param {string} listId
 * @returns {Promise<{ data: Array | null, error: Error | null }>}
 */
export async function getListMembers(listId) {
  const supabase = getSupabase();
  let { data: membersData, error } = await supabase
    .from('list_members')
    .select('list_id, user_id, role, joined_at')
    .eq('list_id', listId);

  if (error && isJoinedAtColumnError(error)) {
    const fallback = await supabase
      .from('list_members')
      .select('list_id, user_id, role')
      .eq('list_id', listId);
    membersData = (fallback.data || []).map((m) => ({ ...m, joined_at: null }));
    error = fallback.error;
  }
  if (error) return { data: null, error };

  const memberIds = [...new Set((membersData || []).map((m) => m.user_id).filter(Boolean))];
  if (memberIds.length === 0) return { data: [], error: null };

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, username, display_name, avatar_url')
    .in('id', memberIds);
  if (profilesError) return { data: null, error: profilesError };

  const profileMap = Object.fromEntries((profilesData || []).map((p) => [p.id, p]));
  return {
    data: (membersData || []).map((member) => ({
      ...member,
      profile: profileMap[member.user_id] || null,
    })),
    error: null,
  };
}

/**
 * Invite a collaborator by UUID/email/username.
 * @param {string} listId
 * @param {string} identifier
 * @param {'editor'|'viewer'} [role='editor']
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function inviteListMember(listId, identifier, role = 'editor') {
  const supabase = getSupabase();
  const normalizedRole = VALID_ROLES.has(role) ? role : 'editor';
  if (normalizedRole === 'owner') {
    return { data: null, error: new Error('Owner role cannot be invited.') };
  }

  const { data: profile, error: profileError } = await resolveProfileByIdentifier(identifier);
  if (profileError) return { data: null, error: profileError };

  const { error: upsertError } = await supabase.from('list_members').upsert(
    {
      list_id: listId,
      user_id: profile.id,
      role: normalizedRole,
    },
    { onConflict: 'list_id,user_id' }
  );
  if (upsertError) return { data: null, error: upsertError };

  return {
    data: {
      list_id: listId,
      user_id: profile.id,
      role: normalizedRole,
      profile,
    },
    error: null,
  };
}

/**
 * Change a collaborator role.
 * @param {string} listId
 * @param {string} memberUserId
 * @param {'editor'|'viewer'} role
 * @returns {Promise<{ data: object | null, error: Error | null }>}
 */
export async function updateListMemberRole(listId, memberUserId, role) {
  const supabase = getSupabase();
  if (!VALID_ROLES.has(role) || role === 'owner') {
    return { data: null, error: new Error('Invalid role update.') };
  }

  let { data, error } = await supabase
    .from('list_members')
    .update({ role })
    .eq('list_id', listId)
    .eq('user_id', memberUserId)
    .select('list_id, user_id, role, joined_at')
    .single();

  if (error && isJoinedAtColumnError(error)) {
    const fallback = await supabase
      .from('list_members')
      .update({ role })
      .eq('list_id', listId)
      .eq('user_id', memberUserId)
      .select('list_id, user_id, role')
      .single();
    data = fallback.data ? { ...fallback.data, joined_at: null } : null;
    error = fallback.error;
  }
  if (error) return { data: null, error };
  return { data, error: null };
}

/**
 * Remove a collaborator from a list.
 * @param {string} listId
 * @param {string} memberUserId
 * @returns {Promise<{ data: boolean, error: Error | null }>}
 */
export async function removeListMember(listId, memberUserId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', memberUserId);
  if (error) return { data: false, error };
  return { data: true, error: null };
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

  let { data, error } = await supabase.from('list_items').insert(row).select().single();

  if (error && isAddedByColumnError(error)) {
    const { added_by, ...fallbackRow } = row;
    const fallbackInsert = await supabase
      .from('list_items')
      .insert(fallbackRow)
      .select()
      .single();
    data = fallbackInsert.data;
    error = fallbackInsert.error;
  }

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
