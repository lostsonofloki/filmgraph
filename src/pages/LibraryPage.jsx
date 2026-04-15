import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLists } from '../context/ListContext';
import { getSupabase } from '../supabaseClient';
import LogMovieModal from '../components/LogMovieModal';
import MovieCard from '../components/MovieCard';
import CreateListModal from '../components/CreateListModal';
import ArchiveImporterModal from '../components/ArchiveImporterModal';
import { MovieGridSkeleton } from '../components/Skeleton';
import { runPosterMigration } from '../utils/posterMigration';
import './LibraryPage.css';

const SORT_OPTIONS = [
  { id: 'date_newest', label: 'Newest' },
  { id: 'date_oldest', label: 'Oldest' },
  { id: 'rating_high', label: 'Highest Rating' },
];

function LibraryPage() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { lists, fetchLists, removeMovieFromList } = useLists();
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
  const [selectedList, setSelectedList] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isMigratingPosters, setIsMigratingPosters] = useState(false);

  const fetchMovies = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('watch_status', activeTab === 'watched' ? 'watched' : 'to-watch')
        .order('created_at', { ascending: false });

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

  const handleCreateList = async (name, description) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      setShowCreateListModal(false);
      fetchLists();
    } catch (err) {
      console.error('Error creating list:', err);
      setError('Failed to create list.');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!confirm('Delete this list?')) return;
    try {
      const supabase = getSupabase();
      await supabase.from('list_items').delete().eq('list_id', listId);
      await supabase.from('lists').delete().eq('id', listId);
      fetchLists();
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  const handleViewList = (list) => {
    setSelectedList(list);
    setActiveTab('lists');
  };

  const handleRefreshPosters = async () => {
    if (!confirm('This will fetch poster images for all movies imported without posters. Continue?')) {
      return;
    }

    setIsMigratingPosters(true);
    setError('');

    try {
      const stats = await runPosterMigration(user.id);
      alert(`Poster refresh complete!\n\n✅ Fixed: ${stats.fixed}\n⏭️ Skipped: ${stats.skipped}\n❌ Errors: ${stats.errors}`);
      fetchMovies(); // Refresh to show new posters
    } catch (err) {
      console.error('Error refreshing posters:', err);
      setError('Failed to refresh posters.');
    } finally {
      setIsMigratingPosters(false);
    }
  };

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMood = !selectedMood || (movie.moods && movie.moods.includes(selectedMood));
    return matchesSearch && matchesMood;
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

  if (!isAuthenticated) return null;

  return (
    <div className="library-page">
      <div className="library-container">
        {/* Header */}
        <div className="library-header">
          <h1>My Library</h1>
          <div className="library-actions">
            <button
              className="btn-import"
              onClick={() => setShowImportModal(true)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              ✨ Magic Import
            </button>
            <button
              className="create-list-btn"
              onClick={() => setShowCreateListModal(true)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create List
            </button>
            <button
              className="btn-secondary"
              onClick={handleRefreshPosters}
              disabled={isMigratingPosters}
              style={{ opacity: isMigratingPosters ? 0.5 : 1 }}
            >
              {isMigratingPosters ? '⏳ Refreshing...' : '🖼️ Refresh Posters'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="library-tabs">
          <button
            className={`tab ${activeTab === 'watched' ? 'active' : ''}`}
            onClick={() => { setActiveTab('watched'); setSelectedList(null); }}
          >
            Watched
          </button>
          <button
            className={`tab ${activeTab === 'to-watch' ? 'active' : ''}`}
            onClick={() => { setActiveTab('to-watch'); setSelectedList(null); }}
          >
            Want to Watch
          </button>
          <button
            className={`tab ${activeTab === 'lists' ? 'active' : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            My Lists ({lists.length})
          </button>
        </div>

        {/* Lists View */}
        {activeTab === 'lists' && (
          <div className="lists-view">
            {selectedList ? (
              <div className="list-detail">
                <div className="list-detail-header">
                  <button
                    className="back-to-lists"
                    onClick={() => setSelectedList(null)}
                  >
                    ← Back to Lists
                  </button>
                  <h2>{selectedList.name}</h2>
                  <button
                    className="delete-list-btn"
                    onClick={() => handleDeleteList(selectedList.id)}
                  >
                    Delete List
                  </button>
                </div>
                {selectedList.description && (
                  <p className="text-sm text-zinc-500 mb-6">{selectedList.description}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {selectedList.list_items && selectedList.list_items.length > 0 ? (
                    selectedList.list_items.map((item) => (
                      <div key={item.id} className="group relative">
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
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-lg">
                          <button
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 transition-colors"
                            onClick={() => removeMovieFromList(selectedList.id, item.tmdb_id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="col-span-full text-center text-zinc-500 py-12">This list is empty.</p>
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
                          className="view-list-btn"
                          onClick={() => handleViewList(list)}
                        >
                          View List
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-lists">
                    <h3>No lists yet</h3>
                    <p>Create your first custom list to organize your movies.</p>
                    <button
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

        {/* Movies View */}
        {activeTab !== 'lists' && (
          <>
            {/* Filters */}
            <div className="library-filters">
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {allMoods.length > 0 && (
                <select
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                  className="mood-filter"
                >
                  <option value="">All Moods</option>
                  {allMoods.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood.charAt(0).toUpperCase() + mood.slice(1)}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Movie Grid */}
            {isLoading ? (
              <MovieGridSkeleton count={12} />
            ) : error ? (
              <div className="error">{error}</div>
            ) : sortedMovies.length === 0 ? (
              <div className="empty-state">
                <p>No movies found. Start logging!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sortedMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isLibraryCard={true}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
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

      {/* Create List Modal */}
      {showCreateListModal && (
        <CreateListModal
          onClose={() => setShowCreateListModal(false)}
          onCreateList={handleCreateList}
        />
      )}

      {/* Archive Importer Modal */}
      {showImportModal && (
        <ArchiveImporterModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={(stats) => {
            console.log('📦 Import complete:', stats);
            fetchMovies(); // Refresh library to show newly imported movies
          }}
        />
      )}
    </div>
  );
}

export default LibraryPage;
