import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLists } from '../context/ListContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { checkDuplicateInCollection } from '../utils/collectionIntegrity';
import { placeAddToListDropdown } from '../utils/placeAddToListDropdown';
import CreateListModal from './CreateListModal';
import './AddToListButton.css';

/**
 * AddToListButton - Dropdown button to add a movie to custom lists
 * @param {Object} movie - Movie object with tmdb_id, title, poster_path
 * @param {string} className - Additional CSS class name
 * @param {'default' | 'icon'} variant - Button variant ('default' shows text, 'icon' shows icon only)
 */
function AddToListButton({ movie, className = '', variant = 'default' }) {
  const { isAuthenticated, user } = useUser();
  const {
    lists,
    isLoading,
    addMovieToList,
    isMovieInList,
    getListsContainingMovie,
    canEditList,
  } = useLists();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdding, setIsAdding] = useState(null); // tmdb_id of movie being added
  const [panelStyle, setPanelStyle] = useState(null);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);

  const existingLists = getListsContainingMovie(movie?.tmdb_id);

  // Close dropdown when clicking outside (the panel is portaled, so check both nodes)
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelStyle(null);
      return undefined;
    }

    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const next = placeAddToListDropdown(
        rect,
        panel.offsetHeight,
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPanelStyle((prev) => {
        if (
          prev
          && prev.top === next.top
          && prev.left === next.left
          && prev.width === next.width
          && prev.maxHeight === next.maxHeight
        ) {
          return prev;
        }
        return next;
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen, isLoading, lists.length]);

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
      const duplicateCheck = await checkDuplicateInCollection({
        userId: user?.id,
        tmdbId: movie.tmdb_id,
      });

      if (duplicateCheck.isDuplicate) {
        toast.error(`Anti-Double-Buy: ${duplicateCheck.reasons.join(' + ')}`);
        setIsOpen(false);
        return;
      }

      await addMovieToList(listId, movie);
      toast.success(`Added to ${list.name}!`);
      setIsOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add to list.');
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
      <div className={`add-to-list-container ${className}`} ref={anchorRef}>
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

        {isOpen && createPortal(
          <div
            ref={panelRef}
            className="add-to-list-dropdown"
            style={panelStyle ? {
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
              maxHeight: panelStyle.maxHeight,
            } : {
              top: 0,
              left: 0,
              visibility: 'hidden',
            }}
          >
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
                <div className="add-to-list-header">
                  <span>Add to list...</span>
                </div>
                <div className="add-to-list-items">
                  {lists.map((list) => {
                    const isInList = isMovieInList(list.id, movie?.tmdb_id);
                    const isReadOnly = !canEditList(list.id);
                    return (
                      <button
                        key={list.id}
                        className={`add-to-list-item ${isInList ? 'in-list' : ''} ${isReadOnly ? 'read-only' : ''}`}
                        onClick={() => !isInList && handleAddToList(list.id)}
                        disabled={isInList || isAdding === list.id || isReadOnly}
                        title={isReadOnly ? 'View-only list' : undefined}
                      >
                        <span className="list-name">{list.name}</span>
                        <span className="list-count">
                          {list.list_items?.length || 0} movies
                        </span>
                        {isReadOnly && (
                          <span className="list-role-badge">Viewer</span>
                        )}
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
                <div className="add-to-list-footer">
                  <button
                    className="add-to-list-create"
                    onClick={handleCreateNewList}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create New List
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
      </div>

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleListCreated}
        />
      )}
    </>
  );
}

export default AddToListButton;
