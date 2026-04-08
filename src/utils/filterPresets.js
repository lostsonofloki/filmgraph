import { getSupabase } from '../supabaseClient';

const PRESETS_TABLE = 'user_filter_presets';

/**
 * Save the current filter state as a named preset.
 */
export async function saveFilterPreset(userId, name, filterConfig) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from(PRESETS_TABLE)
    .insert({
      user_id: userId,
      preset_name: name,
      filter_config: filterConfig,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Load a preset's filter configuration by its ID.
 */
export async function loadFilterPreset(presetId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from(PRESETS_TABLE)
    .select('filter_config')
    .eq('id', presetId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Preset not found.');

  return data.filter_config;
}

/**
 * Fetch all presets for the current user.
 */
export async function fetchUserPresets(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from(PRESETS_TABLE)
    .select('id, preset_name, filter_config, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a preset by ID.
 */
export async function deleteFilterPreset(presetId) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from(PRESETS_TABLE)
    .delete()
    .eq('id', presetId);

  if (error) throw error;
}
