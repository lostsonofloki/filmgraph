import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchBugReports, updateBugStatus, deleteBugReport } from '../api/bugReports';
import './BugList.css';

// Status badge colors
const STATUS_COLORS = {
  open: 'status-open',
  'in-progress': 'status-progress',
  fixed: 'status-fixed',
  wontfix: 'status-wontfix',
  closed: 'status-closed',
};

/**
 * BugList - Admin component to view and manage bug reports
 * Only accessible by admin (sonofloke@gmail.com)
 */
function BugList() {
  const { user } = useUser();
  const [bugs, setBugs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const isAdmin = user?.email === 'sonofloke@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      fetchBugs();
    }
  }, [isAdmin]);

  const fetchBugs = async () => {
    try {
      setIsLoading(true);
      const result = await fetchBugReports();

      if (!result.success) {
        setError(result.error);
      } else {
        setBugs(result.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsFixed = async (bugId) => {
    try {
      setUpdatingId(bugId);
      const result = await updateBugStatus(bugId, 'fixed');

      if (result.success) {
        // Update local state
        setBugs(bugs.map(bug => 
          bug.id === bugId ? { ...bug, status: 'fixed' } : bug
        ));
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      setUpdatingId(bugId);
      const result = await updateBugStatus(bugId, newStatus);

      if (result.success) {
        setBugs(bugs.map(bug => 
          bug.id === bugId ? { ...bug, status: newStatus } : bug
        ));
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bugId) => {
    if (!confirm('Delete this bug report? This cannot be undone.')) return;

    try {
      const result = await deleteBugReport(bugId);

      if (result.success) {
        setBugs(bugs.filter(bug => bug.id !== bugId));
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bug-list-admin">
        <div className="admin-restricted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            <path d="M10 12l2-2m0 0l2 2m-2-2v6" />
          </svg>
          <h3>Admin Access Required</h3>
          <p>This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bug-list-admin">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading bug reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bug-list-admin">
      <div className="bug-list-header">
        <h1>Bug Reports</h1>
        <button onClick={fetchBugs} className="refresh-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
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

      {bugs.length === 0 ? (
        <div className="no-bugs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No bug reports yet</h3>
          <p>All clear! No bugs have been reported.</p>
        </div>
      ) : (
        <div className="bugs-grid">
          {bugs.map((bug) => (
            <div key={bug.id} className="bug-card">
              <div className="bug-card-header">
                <div className="bug-id">#{bug.id.slice(0, 8)}</div>
                <span className={`status-badge ${STATUS_COLORS[bug.status] || 'status-open'}`}>
                  {bug.status}
                </span>
              </div>

              <div className="bug-card-content">
                <p className="bug-description">{bug.description}</p>
                
                <div className="bug-meta">
                  <div className="meta-item">
                    <span className="meta-label">Version:</span>
                    <span className="meta-value">{bug.app_version || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Page:</span>
                    <a href={bug.page_url} target="_blank" rel="noopener noreferrer" className="meta-value">
                      {bug.page_url}
                    </a>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">User:</span>
                    <span className="meta-value">{bug.user_email}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Reported:</span>
                    <span className="meta-value">
                      {new Date(bug.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bug-card-actions">
                {bug.status !== 'fixed' && (
                  <button
                    className="mark-fixed-btn"
                    onClick={() => handleMarkAsFixed(bug.id)}
                    disabled={updatingId === bug.id}
                  >
                    {updatingId === bug.id ? (
                      <>
                        <div className="btn-spinner"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Mark as Fixed
                      </>
                    )}
                  </button>
                )}

                <select
                  className="status-select"
                  value={bug.status}
                  onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                  disabled={updatingId === bug.id}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="fixed">Fixed</option>
                  <option value="wontfix">Won't Fix</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(bug.id)}
                  disabled={updatingId === bug.id}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BugList;
