import { getSupabase } from '../supabaseClient';

/**
 * Update the status of a bug report
 * @param {string} bugId - The UUID of the bug report
 * @param {string} newStatus - The new status value (e.g., 'open', 'fixed', 'wontfix', 'in-progress')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateBugStatus(bugId, newStatus) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('bug_reports')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', bugId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bug status:', error);
      return { success: false, error: error.message };
    }

    console.log(`Bug ${bugId} status updated to: ${newStatus}`);
    return { success: true, data };
  } catch (err) {
    console.error('Failed to update bug status:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all bug reports (admin function)
 *
 * Authorization is the RLS policy on `bug_reports`, which already limits SELECT to the
 * admin. Filtering on `user_email` here asked for reports *filed by* the admin, so every
 * report a user submitted was invisible on the triage page.
 *
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function fetchBugReports() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bug reports:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to fetch bug reports:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a bug report
 * @param {string} bugId - The UUID of the bug report to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteBugReport(bugId) {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', bugId);

    if (error) {
      console.error('Error deleting bug report:', error);
      return { success: false, error: error.message };
    }

    console.log(`Bug report ${bugId} deleted`);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete bug report:', err);
    return { success: false, error: err.message };
  }
}
