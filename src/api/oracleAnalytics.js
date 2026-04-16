import { getSupabase } from '../supabaseClient';

export async function fetchOracleProviderEvents(days = 14) {
  try {
    const supabase = getSupabase();
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('oracle_provider_events')
      .select('*')
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      console.error('Error fetching Oracle analytics:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Failed to fetch Oracle analytics:', error);
    return { success: false, error: error.message };
  }
}
