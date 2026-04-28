import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLists } from '../context/ListContext';
import { useToast } from '../context/ToastContext';
import { getSupabase } from '../supabaseClient';
import LogMovieModal from '../components/LogMovieModal';
import MovieCard from '../components/MovieCard';
import CreateListModal from '../components/CreateListModal';
import ArchiveImporterModal from '../components/ArchiveImporterModal';
import { MovieGridSkeleton } from '../components/Skeleton';
import { runPosterMigration } from '../utils/posterMigration';
import { parseLibraryQuery } from '../utils/naturalLanguageSort';
import { buildListSharePayload, buildMovieSharePayload, executeShare } from '../utils/share';
import SeoHead from '../components/seo/SeoHead';
import './LibraryPage.css';

const SORT_OPTIONS = [
  { id: 'date_newest', label: 'Newest' },
  { id: 'date_oldest', label: 'Oldest' },
  { id: 'rating_high', label: 'Highest Rating' },
];

function LibraryPage() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const {
    lists,
    fetchLists,
    deleteList,
    removeMovieFromList,
    inviteCollaborator,
    changeCollaboratorRole,
    removeCollaborator,
    isListOwner,
    canEditList,
  } = useLists();
  const [activeTab, setActiveTab] = useState('watched');
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingMovie, setEditingMovie] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [sortBy, setSortBy] = useState('date_newest');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isMigratingPosters, setIsMigratingPosters] = useState(false);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('editor');
  const [isInvitingCollaborator, setIsInvitingCollaborator] = useState(false);
  const [collabActionLoading, setCollabActionLoading] = useState('');
  const [parsedQuery, setParsedQuery] = useState(parseLibraryQuery(''));
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const parsed = parseLibraryQuery(naturalQuery);
    setParsedQuery(parsed);

    if (parsed.sortBy) {
      setSortBy(parsed.sortBy);
    }

    if (parsed.status && parsed.status !== activeTab) {
      setActiveTab(parsed.status);
      setSelectedList(null);
    }

    if (parsed.mood) {
      setSelectedMood(parsed.mood);
    }

    if (parsed.searchText) {
      setSearchQuery(parsed.searchText);
    }
  }, [naturalQuery, activeTab]);

  const fetchMovies = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (activeTab === 'collection') {
        query = query.not('source_upc', 'is', null);
      } else {
        query = query.eq(
          'watch_status',
          activeTab === 'watched' ? 'watched' : 'to-watch',
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setMovies(data || []);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load your library.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchMovies();
  }, [isAuthenticated, navigate, fetchMovies]);

  useEffect(() => {
    if (!selectedList?.id) return;
    const latest = lists.find((list) => list.id === selectedList.id);
    if (latest) {
      setSelectedList(latest);
    } else {
      setSelectedList(null);
    }
  }, [lists, selectedList?.id]);

  useEffect(() => {
    const requestedListId = new URLSearchParams(location.search).get('list');
    if (!requestedListId || lists.length === 0) return;

    const requestedList = lists.find((list) => list.id === requestedListId);
    if (!requestedList) return;

    setSelectedList(requestedList);
    setActiveTab('lists');
    navigate('/library', { replace: true });
  }, [location.search, lists, navigate]);

  useEffect(() => {
    if (activeTab !== 'lists' || !selectedList?.id) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`shared-list-${selectedList.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${selectedList.id}`,
        },
        async () => {
          await fetchLists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, selectedList?.id, fetchLists]);

  const handleEdit = (e, movie) => {
    e.stopPropagation();
    setEditingMovie(movie);
    setShowEditModal(true);
  };

  const handleDelete = async (e, logId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this log?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('movie_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) throw error;
      setMovies(movies.filter((m) => m.id !== logId));
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Failed to delete movie log.');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!confirm('Delete this list?')) return;
    try {
      await deleteList(listId);
      setSelectedList(null);
      toast.success('List deleted.');
    } catch (err) {
      console.error('Error deleting list:', err);
      toast.error('Failed to delete list.');
    }
  };

  const handleViewList = (list) => {
    setSelectedList(list);
    setActiveTab('lists');
  };

  const handleInviteCollaborator = async () => {
    if (!selectedList?.id || !collaboratorInput.trim()) return;
    try {
      setIsInvitingCollaborator(true);
      await inviteCollaborator(selectedList.id, collaboratorInput.trim(), collaboratorRole);
      setCollaboratorInput('');
      toast.success('Collaborator added.');
    } catch (err) {
      console.error('Invite collaborator error:', err);
      toast.error(err.message || 'Failed to invite collaborator.');
    } finally {
      setIsInvitingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (memberUserId) => {
    if (!selectedList?.id) return;
    if (!confirm('Remove this collaborator from the list?')) return;
    try {
      setCollabActionLoading(`remove-${memberUserId}`);
      await removeCollaborator(selectedList.id, memberUserId);
      toast.success('Collaborator removed.');
    } catch (err) {
      console.error('Remove collaborator error:', err);
      toast.error(err.message || 'Failed to remove collaborator.');
    } finally {
      setCollabActionLoading('');
    }
  };

  const handleRoleChange = async (memberUserId, role) => {
    if (!selectedList?.id) return;
    try {
      setCollabActionLoading(`role-${memberUserId}`);
      await changeCollaboratorRole(selectedList.id, memberUserId, role);
      toast.success(`Role updated to ${role}.`);
    } catch (err) {
      console.error('Role change error:', err);
      toast.error(err.message || 'Failed to update role.');
    } finally {
      setCollabActionLoading('');
    }
  };

  const handleRefreshPosters = async () => {
    if (!confirm('This will fetch poster images for all movies imported without posters. Continue?')) {
      return;
    }

    setIsMigratingPosters(true);
    setError('');

    try {
      const stats = await runPosterMigration(user.id);
      alert(`Poster refresh complete!\n\nFixed: ${stats.fixed}\nSkipped: ${stats.skipped}\nErrors: ${stats.errors}`);
      fetchMovies();
    } catch (err) {
      console.error('Error refreshing posters:', err);
      setError('Failed to refresh posters.');
    } finally {
      setIsMigratingPosters(false);
    }
  };

  const notifyShareResult = (result) => {
    if (result.status === 'shared') {
      toast.success('Shared successfully.');
      return;
    }
    if (result.status === 'copied') {
      toast.success('Share link copied to clipboard.');
      return;
    }
    if (result.status === 'cancelled') {
      return;
    }
    toast.error('Could not share from this browser.');
  };

  const handleShareMovie = async (movie) => {
    const payload = buildMovieSharePayload({
      title: movie.title,
      year: movie.year || movie.release_date?.split('-')[0] || null,
      rating: movie.rating,
      moods: movie.moods || [],
      tmdbId: movie.tmdb_id,
    });
    const result = await executeShare(payload);
    notifyShareResult(result);
  };

  const handleShareList = async (list) => {
    const payload = buildListSharePayload({
      listId: list.id,
      listName: list.name,
      itemCount: list.list_items?.length || 0,
    });
    const result = await executeShare(payload);
    notifyShareResult(result);
  };

  const filteredMovies = movies.filter((movie) => {
    const normalizedSearch = (parsedQuery.searchText || searchQuery).toLowerCase();
    const matchesSearch = movie.title.toLowerCase().includes(normalizedSearch);
    const matchesMood = !selectedMood || (movie.moods && movie.moods.includes(selectedMood));
    const runtimeValue = Number(movie.runtime_minutes || movie.runtime || 0);
    const matchesRuntime = !parsedQuery.maxRuntime || !runtimeValue || runtimeValue <= parsedQuery.maxRuntime;
    return matchesSearch && matchesMood && matchesRuntime;
  });

  const sortedMovies = [...filteredMovies].sort((a, b) => {
    switch (sortBy) {
      case 'date_oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'rating_high':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  const allMoods = [...new Set(movies.flatMap((m) => m.moods || []))];

  const shelfCountLabel =
    activeTab === 'lists'
      ? `${lists.length} list${lists.length === 1 ? '' : 's'}`
      : isLoading
        ? 'Loading…'
        : `${sortedMovies.length} shown · ${movies.length} in this shelf`;

  if (!isAuthenticated) return null;

  return (
    <div className="library-page">
      <SeoHead
        title="My Library"
        description="Track watched films, watchlist picks, physical collection scans, and curated lists in your Filmgraph library."
        pathname="/library"
      />
      <div className="library-container">
        <header className="library-top">
          <div className="library-top-text">
            <div className="library-top-heading-row">
              <h1 className="library-title">Library</h1>
              <span className="library-count-pill" aria-live="polite">
                {shelfCountLabel}
              </span>
            </div>
            <p className="library-tagline">
              Import, scan, search, and sort — everything in one place.
            </p>
          </div>

          <div className="library-toolbar" role="toolbar" aria-label="Library quick actions">
            <button type="button" className="library-tool library-tool--import" onClick={() => setShowImportModal(true)}>
              <span className="library-tool-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <span className="library-tool-label">Import</span>
            </button>
            <button type="button" className="library-tool library-tool--scan" onClick={() => setShowScanModal(true)}>
              <span className="library-tool-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7V5a1 1 0 0 1 1-1h2" />
                  <path d="M20 7V5a1 1 0 0 0-1-1h-2" />
                  <path d="M4 17v2a1 1 0 0 0 1 1h2" />
                  <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
                  <path d="M7 12h10" />
                  <path d="M9 9v6" />
                </svg>
              </span>
              <span className="library-tool-label">Scan</span>
            </button>
            <button type="button" className="library-tool library-tool--list" onClick={() => setShowCreateListModal(true)}>
              <span className="library-tool-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="library-tool-label">New list</span>
            </button>
            <button
              type="button"
              className="library-tool library-tool--refresh"
              onClick={handleRefreshPosters}
              disabled={isMigratingPosters}
            >
              <span className="library-tool-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </span>
              <span className="library-tool-label">{isMigratingPosters ? 'Fixing…' : 'Fix posters'}</span>
            </button>
          </div>
        </header>

        {!isOnline && (
          <div className="library-offline-banner" role="status">
            You’re offline — cached browsing works; queued logs will sync when you’re back online.
          </div>
        )}

        <div className="library-tabs" role="tablist" aria-label="Library sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'watched'}
            className={`library-tab ${activeTab === 'watched' ? 'library-tab--active' : ''}`}
            onClick={() => { setActiveTab('watched'); setSelectedList(null); }}
          >
            Watched
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'to-watch'}
            className={`library-tab ${activeTab === 'to-watch' ? 'library-tab--active' : ''}`}
            onClick={() => { setActiveTab('to-watch'); setSelectedList(null); }}
          >
            Watchlist
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'collection'}
            className={`library-tab ${activeTab === 'collection' ? 'library-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('collection');
              setSelectedList(null);
            }}
          >
            Collection
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lists'}
            className={`library-tab ${activeTab === 'lists' ? 'library-tab--active' : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            Lists
            <span className="library-tab-badge">{lists.length}</span>
          </button>
        </div>

        {activeTab === 'lists' && (
          <div className="lists-view">
            {selectedList ? (
              <div className="list-detail">
                <div className="list-detail-header">
                  <button
                    type="button"
                    className="back-to-lists"
                    onClick={() => setSelectedList(null)}
                  >
                    ← Back to Lists
                  </button>
                  <h2>{selectedList.name}</h2>
                  <button
                    type="button"
                    className="share-list-btn"
                    onClick={() => handleShareList(selectedList)}
                  >
                    Share
                  </button>
                  {isListOwner(selectedList.id) && (
                    <button
                      type="button"
                      className="delete-list-btn"
                      onClick={() => handleDeleteList(selectedList.id)}
                    >
                      Delete List
                    </button>
                  )}
                </div>
                {selectedList.description && (
                  <p className="text-sm text-zinc-500 mb-6">{selectedList.description}</p>
                )}
                <div className="list-collab-panel">
                  <div className="list-collab-header">
                    <h3>Collaborators</h3>
                    <span>
                      Role: <strong>{selectedList.membership?.role || 'viewer'}</strong>
                    </span>
                  </div>

                  {isListOwner(selectedList.id) && (
                    <div className="list-collab-invite">
                      <input
                        type="text"
                        value={collaboratorInput}
                        onChange={(e) => setCollaboratorInput(e.target.value)}
                        placeholder="Invite by email, username, or UUID"
                        className="collab-input"
                      />
                      <select
                        value={collaboratorRole}
                        onChange={(e) => setCollaboratorRole(e.target.value)}
                        className="collab-role-select"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="button"
                        className="collab-invite-btn"
                        disabled={isInvitingCollaborator || !collaboratorInput.trim()}
                        onClick={handleInviteCollaborator}
                      >
                        {isInvitingCollaborator ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                  )}

                  <div className="collab-members">
                    {(selectedList.list_members || []).map((member) => {
                      const isMe = member.user_id === user?.id;
                      const displayName =
                        member.profile?.display_name ||
                        member.profile?.username ||
                        member.profile?.email ||
                        (isMe ? 'You' : member.user_id);
                      const memberLoading =
                        collabActionLoading === `remove-${member.user_id}` ||
                        collabActionLoading === `role-${member.user_id}`;
                      return (
                        <div key={member.user_id} className="collab-member-chip">
                          <span className="collab-member-name">{displayName}</span>
                          <span className={`collab-role collab-role-${member.role}`}>{member.role}</span>
                          {isListOwner(selectedList.id) && member.role !== 'owner' && (
                            <>
                              <select
                                className="collab-member-role-select"
                                value={member.role}
                                disabled={memberLoading}
                                onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                type="button"
                                className="collab-remove-btn"
                                disabled={memberLoading}
                                onClick={() => handleRemoveCollaborator(member.user_id)}
                              >
                                {memberLoading ? '...' : 'Remove'}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="library-movie-grid library-movie-grid--list-detail">
                  {selectedList.list_items && selectedList.list_items.length > 0 ? (
                    selectedList.list_items.map((item) => (
                      <div key={item.id} className="library-poster-cell group relative min-w-0">
                        <div className="aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900">
                          <img
                            src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-zinc-300 line-clamp-1 group-hover:text-orange-500 transition-colors">
                            {item.title}
                          </p>
                          <p className="list-item-added-by">
                            Added by{' '}
                            {item.added_by_profile?.display_name ||
                              item.added_by_profile?.username ||
                              item.added_by_profile?.email ||
                              (item.added_by === user?.id ? 'You' : 'Unknown')}
                          </p>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg">
                          {canEditList(selectedList.id) && (
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors"
                              onClick={() => removeMovieFromList(selectedList.id, item.tmdb_id)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="library-movie-grid-empty">This list is empty.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="lists-grid">
                {lists.length > 0 ? (
                  lists.map((list) => (
                    <div key={list.id} className="list-card">
                      <div className="list-card-header">
                        <h3>{list.name}</h3>
                        <span className="item-count">
                          {list.list_items?.length || 0} movies
                        </span>
                      </div>
                      <p className="list-membership-meta">
                        {list.membership?.role === 'owner'
                          ? 'Owner'
                          : list.membership?.role === 'editor'
                          ? 'Shared • Editor'
                          : 'Shared • Viewer'}
                      </p>
                      {list.description && (
                        <p className="list-card-description">{list.description}</p>
                      )}
                      <div className="list-card-posters">
                        {list.list_items?.slice(0, 4).map((item) => (
                          <img
                            key={item.id}
                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                            alt={item.title}
                            loading="lazy"
                          />
                        ))}
                      </div>
                      <div className="list-card-actions">
                        <button
                          type="button"
                          className="view-list-btn"
                          onClick={() => handleViewList(list)}
                        >
                          View List
                        </button>
                        <button
                          type="button"
                          className="list-share-btn"
                          onClick={() => handleShareList(list)}
                          aria-label={`Share list ${list.name}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
                          </svg>
                          <span className="share-btn-text">Share</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-lists">
                    <h3>No lists yet</h3>
                    <p>Create your first custom list to organize your movies.</p>
                    <button
                      type="button"
                      className="create-first-list"
                      onClick={() => setShowCreateListModal(true)}
                    >
                      Create List
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab !== 'lists' && (
          <>
            <section className="library-filters-card" aria-label="Search and filters">
              <h2 className="library-filters-heading">Find & refine</h2>
              <div className="library-filters-grid">
                <div className="library-filter-field library-filter-field--full">
                  <label htmlFor="library-search-titles" className="library-filter-label">Search titles</label>
                  <input
                    id="library-search-titles"
                    type="text"
                    placeholder="Type part of a movie name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="library-input"
                  />
                </div>
                <div className="library-filter-field library-filter-field--full">
                  <label htmlFor="library-natural" className="library-filter-label">Smart filter</label>
                  <input
                    id="library-natural"
                    type="text"
                    placeholder="e.g. under 90 min, dark mood, highest rated"
                    value={naturalQuery}
                    onChange={(e) => setNaturalQuery(e.target.value)}
                    className="library-input library-input--natural"
                  />
                  <p className="library-filter-hint">Natural language updates mood, sort, and filters when it recognizes them.</p>
                </div>
                {allMoods.length > 0 && (
                  <div className="library-filter-field">
                    <label htmlFor="library-mood" className="library-filter-label">Mood</label>
                    <select
                      id="library-mood"
                      value={selectedMood}
                      onChange={(e) => setSelectedMood(e.target.value)}
                      className="library-select"
                    >
                      <option value="">All moods</option>
                      {allMoods.map((mood) => (
                        <option key={mood} value={mood}>
                          {mood.charAt(0).toUpperCase() + mood.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="library-filter-field">
                  <label htmlFor="library-sort" className="library-filter-label">Sort</label>
                  <select
                    id="library-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="library-select"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {isLoading ? (
              <MovieGridSkeleton count={12} />
            ) : error ? (
              <div className="library-alert library-alert--error">{error}</div>
            ) : sortedMovies.length === 0 ? (
              <div className="library-empty">
                <p>No movies match. Try clearing search or switching shelves.</p>
              </div>
            ) : (
              <div className="library-movie-grid">
                {sortedMovies.map((movie) => (
                  <div key={movie.id} className="library-poster-cell">
                    <button
                      type="button"
                      className="library-share-movie-btn"
                      onClick={() => handleShareMovie(movie)}
                      title="Share this movie"
                      aria-label={`Share ${movie.title}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
                      </svg>
                      <span className="share-btn-text">Share</span>
                    </button>
                    <MovieCard
                      movie={movie}
                      isLibraryCard={true}
                      showOwnedBadge={activeTab === 'collection' || !!movie.source_upc}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showEditModal && editingMovie && (
        <LogMovieModal
          movie={editingMovie}
          existingLog={editingMovie}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setMovies(movies.map((m) => (m.id === updated.id ? updated : m)));
            setShowEditModal(false);
          }}
        />
      )}

      {showCreateListModal && (
        <CreateListModal
          onClose={() => setShowCreateListModal(false)}
          onSuccess={() => {
            setShowCreateListModal(false);
            toast.success('List created.');
          }}
        />
      )}

      {showImportModal && (
        <ArchiveImporterModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={(stats) => {
            console.log('Import complete:', stats);
            fetchMovies();
          }}
        />
      )}

      {showScanModal && (
        <LogMovieModal
          movie={null}
          onClose={() => setShowScanModal(false)}
          onSaved={() => {
            setShowScanModal(false);
            toast.success('Scanned movie added to your library.');
            fetchMovies();
          }}
        />
      )}
    </div>
  );
}

export default LibraryPage;
