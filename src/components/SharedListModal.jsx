import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import {
  createSharedList,
  inviteMember,
  removeMember,
  fetchSharedList,
  fetchUserSharedLists,
  searchUserByNickname,
  addListEntry,
  removeListEntry,
  isEntryInSharedList,
} from '../utils/sharedLists';
import './SharedListModal.css';

/**
 * SharedListModal — Create, manage, and view shared lists.
 * Can be opened in two modes:
 *   1. "create" — shows the create form
 *   2. "view" — shows an existing shared list with members and entries
 */
function SharedListModal({ mode = 'create', listId = null, onClose, onEntryAdded }) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('members');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create mode state
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');

  // View mode state
  const [sharedList, setSharedList] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Invite state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviteRole, setInviteRole] = useState('viewer');

  // Add movie state (for onEntryAdded callback)
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [addMovieTmdbId, setAddMovieTmdbId] = useState('');
  const [addMovieTitle, setAddMovieTitle] = useState('');
  const [addMoviePoster, setAddMoviePoster] = useState('');

  // Load existing list
  useEffect(() => {
    if (mode === 'view' && listId) {
      loadList();
    }
  }, [mode, listId]);

  const loadList = useCallback(async () => {
    if (!listId) return;
    setIsLoadingList(true);
    try {
      const data = await fetchSharedList(listId);
      setSharedList(data);
    } catch (err) {
      setError(err.message || 'Failed to load list.');
    } finally {
      setIsLoadingList(false);
    }
  }, [listId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!listName.trim()) {
      setError('List name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newList = await createSharedList(user.id, listName.trim(), listDescription.trim());
      setSuccess(`"${newList.name}" created! You can now invite collaborators.`);
      setListName('');
      setListDescription('');
      // Reload as view mode
      setSharedList(newList);
    } catch (err) {
      setError(err.message || 'Failed to create shared list.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUserByNickname(searchQuery.trim());
      // Filter out existing members
      const existingIds = new Set(sharedList?.list_members?.map(m => m.user_id) || []);
      const filtered = results.filter(r => r.id !== user.id && !existingIds.has(r.id));
      setSearchResults(filtered);
    } catch (err) {
      setError(err.message || 'Failed to search users.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (targetUser) => {
    if (!sharedList?.id) return;

    try {
      await inviteMember(sharedList.id, targetUser.id, inviteRole);
      setSuccess(`Invited ${targetUser.display_name || targetUser.username} as ${inviteRole}.`);
      setSearchResults([]);
      setSearchQuery('');
      loadList();
    } catch (err) {
      setError(err.message || 'Failed to invite user.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!sharedList?.id || targetUserId === user.id) return;

    try {
      await removeMember(sharedList.id, targetUserId);
      setSuccess('Member removed.');
      loadList();
    } catch (err) {
      setError(err.message || 'Failed to remove member.');
    }
  };

  const handleAddMovie = async () => {
    if (!addMovieTmdbId || !addMovieTitle) {
      setError('Movie ID and title are required.');
      return;
    }

    try {
      const exists = await isEntryInSharedList(sharedList.id, parseInt(addMovieTmdbId, 10));
      if (exists) {
        setError('This movie is already in the list.');
        return;
      }

      await addListEntry(
        sharedList.id,
        parseInt(addMovieTmdbId, 10),
        addMovieTitle,
        addMoviePoster,
        user.id
      );

      setSuccess(`"${addMovieTitle}" added to the list.`);
      setAddMovieTmdbId('');
      setAddMovieTitle('');
      setAddMoviePoster('');
      setShowAddMovie(false);
      loadList();
      onEntryAdded?.();
    } catch (err) {
      setError(err.message || 'Failed to add movie.');
    }
  };

  const handleRemoveEntry = async (entryId, tmdbId) => {
    if (!sharedList?.id) return;

    try {
      await removeListEntry(sharedList.id, tmdbId);
      setSuccess('Movie removed from list.');
      loadList();
      onEntryAdded?.();
    } catch (err) {
      setError(err.message || 'Failed to remove movie.');
    }
  };

  const isOwner = sharedList?.list_members?.some(
    m => m.user_id === user.id && m.role === 'owner'
  );

  const isEditor = sharedList?.list_members?.some(
    m => m.user_id === user.id && (m.role === 'owner' || m.role === 'editor')
  );

  return (
    <div className="shared-list-modal-overlay" onClick={onClose}>
      <div className="shared-list-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="slm-header">
          <h2 className="slm-title">
            {mode === 'create' && !sharedList ? 'Create Shared List' : sharedList?.name || 'Shared List'}
          </h2>
          <button className="slm-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        {error && <div className="slm-error">{error}</div>}
        {success && <div className="slm-success">{success}</div>}

        {/* Create Mode */}
        {mode === 'create' && !sharedList && (
          <form onSubmit={handleCreate} className="slm-create-form">
            <div className="slm-field">
              <label htmlFor="slm-list-name">List Name</label>
              <input
                id="slm-list-name"
                type="text"
                placeholder="e.g. Horror Night Picks"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="slm-input"
              />
            </div>
            <div className="slm-field">
              <label htmlFor="slm-list-desc">Description (optional)</label>
              <textarea
                id="slm-list-desc"
                placeholder="What's this list about?"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                className="slm-textarea"
                rows={3}
              />
            </div>
            <button type="submit" className="slm-btn slm-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Shared List'}
            </button>
          </form>
        )}

        {/* View Mode */}
        {sharedList && (
          <div className="slm-view">
            {/* Tabs */}
            <div className="slm-tabs">
              <button
                className={`slm-tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                Members ({sharedList.list_members?.length || 0})
              </button>
              <button
                className={`slm-tab ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => setActiveTab('movies')}
              >
                Movies ({sharedList.list_entries?.length || 0})
              </button>
            </div>

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="slm-tab-content">
                {/* Invite Section */}
                {isOwner && (
                  <div className="slm-invite-section">
                    <h3 className="slm-section-title">Invite Collaborator</h3>
                    <div className="slm-invite-row">
                      <input
                        type="text"
                        placeholder="Search by username or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="slm-input slm-input-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="slm-select"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        className="slm-btn slm-btn-sm"
                        onClick={handleSearchUsers}
                        disabled={isSearching || !searchQuery.trim()}
                      >
                        {isSearching ? '...' : 'Search'}
                      </button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="slm-search-results">
                        {searchResults.map((u) => (
                          <div key={u.id} className="slm-search-result-item">
                            <div className="slm-user-info">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="slm-avatar" />
                              ) : (
                                <div className="slm-avatar-placeholder">
                                  {(u.display_name || u.username || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="slm-user-name">{u.display_name || u.username}</span>
                            </div>
                            <button
                              className="slm-btn slm-btn-xs slm-btn-primary"
                              onClick={() => handleInvite(u)}
                            >
                              Invite
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Members List */}
                <div className="slm-members-list">
                  {sharedList.list_members?.map((member) => {
                    const profile = member.profiles || {};
                    const isSelf = member.user_id === user.id;
                    return (
                      <div key={member.user_id} className="slm-member-item">
                        <div className="slm-user-info">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="slm-avatar" />
                          ) : (
                            <div className="slm-avatar-placeholder">
                              {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="slm-user-name">
                              {profile.display_name || profile.username}
                              {isSelf && ' (You)'}
                            </span>
                            <span className="slm-user-role">{member.role}</span>
                          </div>
                        </div>
                        {isOwner && !isSelf && (
                          <button
                            className="slm-btn slm-btn-xs slm-btn-danger"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Movies Tab */}
            {activeTab === 'movies' && (
              <div className="slm-tab-content">
                {/* Add Movie */}
                {isEditor && (
                  <div className="slm-add-movie-section">
                    {!showAddMovie ? (
                      <button
                        className="slm-btn slm-btn-primary"
                        onClick={() => setShowAddMovie(true)}
                      >
                        + Add Movie
                      </button>
                    ) : (
                      <div className="slm-add-movie-form">
                        <input
                          type="text"
                          placeholder="TMDB ID"
                          value={addMovieTmdbId}
                          onChange={(e) => setAddMovieTmdbId(e.target.value)}
                          className="slm-input slm-input-sm"
                        />
                        <input
                          type="text"
                          placeholder="Movie title"
                          value={addMovieTitle}
                          onChange={(e) => setAddMovieTitle(e.target.value)}
                          className="slm-input slm-input-sm"
                        />
                        <input
                          type="text"
                          placeholder="Poster path (optional)"
                          value={addMoviePoster}
                          onChange={(e) => setAddMoviePoster(e.target.value)}
                          className="slm-input slm-input-sm"
                        />
                        <div className="slm-add-actions">
                          <button
                            className="slm-btn slm-btn-xs slm-btn-primary"
                            onClick={handleAddMovie}
                          >
                            Add
                          </button>
                          <button
                            className="slm-btn slm-btn-xs"
                            onClick={() => {
                              setShowAddMovie(false);
                              setAddMovieTmdbId('');
                              setAddMovieTitle('');
                              setAddMoviePoster('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Entries List */}
                <div className="slm-entries-list">
                  {sharedList.list_entries?.length === 0 ? (
                    <p className="slm-empty">No movies added yet.</p>
                  ) : (
                    sharedList.list_entries?.map((entry) => {
                      const addedBy = entry.profiles || {};
                      return (
                        <div key={entry.id} className="slm-entry-item">
                          {entry.poster_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${entry.poster_path}`}
                              alt={entry.title}
                              className="slm-entry-poster"
                            />
                          )}
                          <div className="slm-entry-info">
                            <span className="slm-entry-title">{entry.title}</span>
                            <span className="slm-entry-added-by">
                              Added by {addedBy.display_name || addedBy.username || 'Unknown'}
                            </span>
                          </div>
                          {isEditor && (
                            <button
                              className="slm-btn slm-btn-xs slm-btn-danger"
                              onClick={() => handleRemoveEntry(entry.id, entry.tmdb_id)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {mode === 'view' && isLoadingList && (
          <div className="slm-loading">
            <div className="slm-spinner"></div>
            <p>Loading shared list...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SharedListModal;
