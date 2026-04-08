import { useState, useRef, useEffect } from 'react';
import { useLists } from '../context/ListContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { fetchUserSharedLists, addListEntry, isEntryInSharedList } from '../utils/sharedLists';
import CreateListModal from './CreateListModal';
import SharedListModal from './SharedListModal';
import './AddToListButton.css';

/**
 * AddToListButton - Dropdown button to add a movie to custom lists
 * @param {Object} movie - Movie object with tmdb_id, title, poster_path
 * @param {string} className - Additional CSS class name
 * @param {'default' | 'icon'} variant - Button variant ('default' shows text, 'icon' shows icon only)
 */
function AddToListButton({ movie, className = '', variant = 'default' }) {
  const { user, isAuthenticated } = useUser();
  const { lists, isLoading, addMovieToList, isMovieInList, getListsContainingMovie } = useLists();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSharedListModal, setShowSharedListModal] = useState(false);
  const [sharedLists, setSharedLists] = useState([]);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [isAdding, setIsAdding] = useState(null); // tmdb_id of movie being added
  const dropdownRef = useRef(null);

  const existingLists = getListsContainingMovie(movie?.tmdb_id);
  const existingSharedLists = sharedLists.filter(sl =>
    sl.list_entries?.some(e => e.tmdb_id === movie?.tmdb_id)
  );

  // Load shared lists when dropdown opens
  useEffect(() => {
    if (isOpen && user?.id) {
      setIsLoadingShared(true);
      fetchUserSharedLists(user.id)
        .then(setSharedLists)
        .catch((err) => console.error('Failed to load shared lists:', err))
        .finally(() => setIsLoadingShared(false));
    }
  }, [isOpen, user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    if (!isAuthenticated) return;
    setIsOpen(!isOpen);
  };

  const handleAddToList = async (listId) => {
    if (!movie?.tmdb_id) return;

    const list = lists.find(l => l.id === listId);
    if (!list) return;

    try {
      setIsAdding(listId);
      await addMovieToList(listId, movie);
      toast.success(`Added to ${list.name}!`);
      setIsOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add to list.');
    } finally {
      setIsAdding(null);
    }
  };

  const handleAddToSharedList = async (sharedList) => {
    if (!movie?.tmdb_id || !user?.id) return;

    try {
      setIsAdding(sharedList.id);
      const exists = await isEntryInSharedList(sharedList.id, movie.tmdb_id);
      if (exists) {
        toast.info(`"${movie.title}" is already in ${sharedList.name}.`);
        return;
      }

      await addListEntry(
        sharedList.id,
        movie.tmdb_id,
        movie.title,
        movie.poster_path,
        user.id
      );
      toast.success(`Added to ${sharedList.name}!`);
      setIsOpen(false);
      // Refresh shared lists
      const updated = await fetchUserSharedLists(user.id);
      setSharedLists(updated);
    } catch (err) {
      toast.error(err.message || 'Failed to add to shared list.');
    } finally {
      setIsAdding(null);
    }
  };

  const handleCreateNewList = () => {
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleListCreated = () => {
    toast.success('List created!');
    setShowCreateModal(false);
    setIsOpen(true); // Reopen dropdown to select the new list
  };

  // Don't show button if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className={`add-to-list-container ${className}`} ref={dropdownRef}>
        {variant === 'icon' ? (
          <button
            className="add-to-list-button-icon"
            onClick={handleToggleDropdown}
            disabled={isLoading}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title={existingLists.length > 0 ? `In ${existingLists.length} list(s)` : 'Add to list'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {existingLists.length > 0 && (
              <span className="add-to-list-badge">{existingLists.length}</span>
            )}
          </button>
        ) : (
          <button
            className="add-to-list-button"
            onClick={handleToggleDropdown}
            disabled={isLoading}
            aria-expanded={isOpen}
            aria-haspopup="true"
            title={existingLists.length > 0 ? `In ${existingLists.length} list(s)` : 'Add to list'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add to List</span>
            {existingLists.length > 0 && (
              <span className="add-to-list-badge">{existingLists.length}</span>
            )}
          </button>
        )}

        {isOpen && (
          <div className="add-to-list-dropdown">
            {isLoading ? (
              <div className="add-to-list-loading">
                <div className="loading-spinner"></div>
                <span>Loading lists...</span>
              </div>
            ) : lists.length === 0 ? (
              <div className="add-to-list-empty">
                <p>You don't have any lists yet.</p>
                <button
                  className="add-to-list-create-empty"
                  onClick={handleCreateNewList}
                >
                  Create Your First List
                </button>
              </div>
            ) : (
              <>
                {/* Personal Lists */}
                <div className="add-to-list-header">
                  <span>Your Lists</span>
                </div>
                <div className="add-to-list-items">
                  {lists.map((list) => {
                    const isInList = isMovieInList(list.id, movie?.tmdb_id);
                    return (
                      <button
                        key={list.id}
                        className={`add-to-list-item ${isInList ? 'in-list' : ''}`}
                        onClick={() => !isInList && handleAddToList(list.id)}
                        disabled={isInList || isAdding === list.id}
                      >
                        <span className="list-name">{list.name}</span>
                        <span className="list-count">
                          {list.list_items?.length || 0} movies
                        </span>
                        {isInList ? (
                          <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : isAdding === list.id ? (
                          <div className="adding-spinner"></div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Shared Lists */}
                {sharedLists.length > 0 && (
                  <>
                    <div className="add-to-list-header">
                      <span>Shared Lists</span>
                    </div>
                    <div className="add-to-list-items">
                      {sharedLists.map((sl) => {
                        const isInList = sl.list_entries?.some(e => e.tmdb_id === movie?.tmdb_id);
                        const memberInfo = sl.list_members?.find(m => m.user_id === user.id);
                        const canEdit = memberInfo?.role === 'owner' || memberInfo?.role === 'editor';
                        return (
                          <button
                            key={sl.id}
                            className={`add-to-list-item add-to-list-shared ${isInList ? 'in-list' : ''}`}
                            onClick={() => canEdit && !isInList && handleAddToSharedList(sl)}
                            disabled={!canEdit || isInList || isAdding === sl.id}
                            title={!canEdit ? 'View only — cannot add movies' : ''}
                          >
                            <span className="list-name">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="shared-list-icon">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                              </svg>
                              {sl.name}
                            </span>
                            <span className="list-count">
                              {sl.list_entries?.length || 0} movies
                            </span>
                            {isInList ? (
                              <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            ) : isAdding === sl.id ? (
                              <div className="adding-spinner"></div>
                            ) : !canEdit ? (
                              <span className="view-only-badge">View</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Loading shared lists */}
                {isLoadingShared && (
                  <div className="add-to-list-loading">
                    <div className="loading-spinner"></div>
                  </div>
                )}

                <div className="add-to-list-footer">
                  <button
                    className="add-to-list-create"
                    onClick={handleCreateNewList}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create Personal List
                  </button>
                  <button
                    className="add-to-list-create add-to-list-create-shared"
                    onClick={() => {
                      setShowSharedListModal(true);
                      setIsOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Create Shared List
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleListCreated}
        />
      )}

      {showSharedListModal && (
        <SharedListModal
          mode="create"
          onClose={() => setShowSharedListModal(false)}
          onEntryAdded={() => {
            if (user?.id) {
              fetchUserSharedLists(user.id).then(setSharedLists);
            }
          }}
        />
      )}
    </>
  );
}

export default AddToListButton;
