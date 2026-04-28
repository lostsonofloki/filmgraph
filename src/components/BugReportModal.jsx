import { useState } from 'react';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import { APP_VERSION } from '../constants';
import { notifyBugReportCreated } from '../api/adminNotifications';
import { createPortal } from 'react-dom';
import './BugReportModal.css';

/**
 * BugReportModal - Modal for submitting bug reports to Supabase
 * @param {Function} onClose - Callback when modal is closed
 */
function BugReportModal({ onClose }) {
  const { user } = useUser();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please describe the bug you encountered.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const supabase = getSupabase();

      // Auto-capture page URL, user info, and app version
      const bugData = {
        user_id: user?.id,
        user_email: user?.email,
        page_url: window.location.href,
        app_version: APP_VERSION,
        description: description.trim(),
        status: 'open',
      };

      const { data: insertedBug, error: insertError } = await supabase
        .from('bug_reports')
        .insert(bugData)
        .select()
        .single();

      if (insertError) throw insertError;

      const notifyResult = await notifyBugReportCreated({
        id: insertedBug?.id,
        user_email: insertedBug?.user_email || bugData.user_email,
        page_url: insertedBug?.page_url || bugData.page_url,
        app_version: insertedBug?.app_version || bugData.app_version,
        status: insertedBug?.status || bugData.status,
        description: insertedBug?.description || bugData.description,
        created_at: insertedBug?.created_at,
      });

      if (!notifyResult.success) {
        // Keep bug submission success path intact even if email delivery fails.
        console.warn('Bug report notification email was not sent:', notifyResult.error);
      }

      // Show success message
      setSubmitted(true);

      // Close modal after brief delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting bug report:', err);
      setError(err.message || 'Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="bug-report-overlay"
      onClick={onClose}
    >
      <div
        className="bug-report-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bug-report-header">
          <div className="header-content">
            <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2>Report a Bug</h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={isSubmitting || submitted}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="bug-report-form">
          {submitted ? (
            <div className="success-message">
              <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <h3>Bug reported! Thanks, Josh.</h3>
              <p>We'll look into this shortly.</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="bug-description">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  What happened?
                </label>
                <textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the bug you encountered. What were you doing? What did you expect to happen? What actually happened?"
                  rows={6}
                  disabled={isSubmitting}
                  autoFocus
                  className="bug-textarea"
                />
              </div>

              {/* Auto-captured info */}
              <div className="auto-info">
                <div className="info-item">
                  <span className="info-label">Page:</span>
                  <span className="info-value">{window.location.href}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">User:</span>
                  <span className="info-value">{user?.email}</span>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting || !description.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="submit-spinner"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default BugReportModal;
