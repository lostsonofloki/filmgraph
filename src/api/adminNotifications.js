/**
 * Fire-and-forget admin notification for new bug reports.
 * This must stay fail-soft so reporting still succeeds even if email fails.
 */
export async function notifyBugReportCreated(payload) {
  try {
    const response = await fetch('/api/notify-bug-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorBody.error || `Notification failed (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Notification request failed',
    };
  }
}
