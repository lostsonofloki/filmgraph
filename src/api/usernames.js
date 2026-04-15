import { getSupabase } from '../supabaseClient';

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(value) {
  return (value || '').trim().toLowerCase();
}

export function isValidUsername(value) {
  return USERNAME_RE.test(normalizeUsername(value));
}

export async function isUsernameAvailable(username, excludeUserId = null) {
  const supabase = getSupabase();
  const normalized = normalizeUsername(username);

  if (!isValidUsername(normalized)) {
    return { data: false, error: new Error('Username must be 3-24 chars: lowercase letters, numbers, underscore.') };
  }

  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: normalized,
    p_exclude_user_id: excludeUserId,
  });

  if (error) return { data: null, error };
  return { data: !!data, error: null };
}

