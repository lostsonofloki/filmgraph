import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import LogMovieModal from '../components/LogMovieModal';
import MovieCard from '../components/MovieCard';
import './LibraryPage.css';

// Mood category colors
const MOOD_COLORS = {
  emotional: 'mood-warm',
  vibe: 'mood-cool',
  intellectual: 'mood-slate',
};

// Mood categories
const MOOD_CATEGORIES = {
  bittersweet: 'emotional',
  heartwarming: 'emotional',
  tearjerker: 'emotional',
  uplifting: 'emotional',
  bleak: 'emotional',
  atmospheric: 'vibe',
  dark: 'vibe',
  gritty: 'vibe',
  neon: 'vibe',
  tense: 'vibe',
  whimsical: 'vibe',
  gory: 'vibe',
  eerie: 'vibe',
  claustrophobic: 'vibe',
  campy: 'vibe',
  dread: 'vibe',
  'jump-scary': 'vibe',
  psychological: 'intellectual',
  mindbending: 'intellectual',
  challenging: 'intellectual',
  philosophical: 'intellectual',
  slowburn: 'intellectual',
  complex: 'intellectual',
};

const GENRES = [
  'Horror',
  'Sci-Fi',
  'Action',
  'Comedy',
  'Drama',
  'Thriller',
  'Romance',
  'Fantasy',
  'Adventure',
  'Animation',
  'Crime',
  'Documentary',
  'Mystery',
  'War',
  'Western',
];

const SORT_OPTIONS = [
  { id: 'date_newest', label: 'Newest' },
  { id: 'date_oldest', label: 'Oldest' },
  { id: 'rating_high', label: 'Highest Rating' },
];

/**
 * LibraryPage - StoryGraph-style library with tabs and rich cards
 */
function LibraryPage() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('watched');
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingMovie, setEditingMovie] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('date_newest');

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchMovies();
    }
  }, [user, isAuthenticated]);

  const fetchMovies = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();

      const { data, error: fetchError } = await supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMovies(data || []);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm('Delete this movie from your library?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('movie_logs').delete().eq('id', id);

      if (error) throw error;

      setMovies(movies.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting movie:', err);
    }
  };

  const handleEdit = (e, movie) => {
    e.stopPropagation();
    setEditingMovie(movie);
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setEditingMovie(null);
    setShowEditModal(false);
  };

  const handleModalSaved = (updatedMovie) => {
    if (editingMovie) {
      // Update the movie in the local list
      setMovies(movies.map(m => m.id === updatedMovie.id ? updatedMovie : m));
    } else {
      // New movie was added
      setMovies([updatedMovie, ...movies]);
    }
    setEditingMovie(null);
    setShowEditModal(false);
  };

  // Filter movies by tab, search query, mood, genre, and sort
  const filteredMovies = movies.filter(movie => {
    // First filter by tab
    const matchesTab = activeTab === 'watched'
      ? movie.watch_status === 'watched' || !movie.watch_status
      : movie.watch_status === 'to-watch';

    // Then filter by search query (case-insensitive)
    const matchesSearch = !searchQuery ||
      movie.title?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by selected mood
    const matchesMood = !selectedMood ||
      (movie.moods && movie.moods.includes(selectedMood));

    // Filter by selected genre (case-insensitive)
    const matchesGenre = !selectedGenre ||
      (movie.genres && movie.genres.some(g => 
        g.toLowerCase() === selectedGenre.toLowerCase()
      ));

    return matchesTab && matchesSearch && matchesMood && matchesGenre;
  }).sort((a, b) => {
    // Sort the filtered results
    if (sortBy === 'date_newest') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'date_oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'rating_high') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  const watchedCount = movies.filter(m => m.watch_status === 'watched' || !m.watch_status).length;
  const toWatchCount = movies.filter(m => m.watch_status === 'to-watch').length;

  // Up Next Queue: Top 5 to-watch movies, sorted by created_at descending
  const upNextQueue = movies
    .filter(m => m.watch_status === 'to-watch')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  if (!isAuthenticated) {
    return (
      <div className="library-page">
        <div className="library-empty">
          <h2>Please log in to view your library</h2>
          <button onClick={() => navigate('/login')} className="login-btn">
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="library-header">
        <div className="library-header-content">
          <h1>My Library</h1>
          <p className="library-count">
            {watchedCount} watched · {toWatchCount} to watch
          </p>
        </div>

        {/* Local Search Input */}
        <div className="library-search">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="library-search-input"
            placeholder="Filter your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <label htmlFor="mood-filter">Mood</label>
            <select
              id="mood-filter"
              className="filter-select"
              value={selectedMood}
              onChange={(e) => setSelectedMood(e.target.value)}
            >
              <option value="">All Moods</option>
              {Object.entries(
                Object.fromEntries(
                  Object.entries(MOOD_CATEGORIES).map(([mood, cat]) => [mood, cat])
                )
              ).map(([mood]) => (
                <option key={mood} value={mood}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="genre-filter">Genre</label>
            <select
              id="genre-filter"
              className="filter-select"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="">All Genres</option>
              {GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Sort By</label>
            <select
              id="sort-filter"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Library Tabs */}
        <div className="library-tabs">
          <button
            className={`library-tab ${activeTab === 'watched' ? 'active' : ''}`}
            onClick={() => setActiveTab('watched')}
          >
            Watched
            <span className="tab-count">{watchedCount}</span>
          </button>
          <button
            className={`library-tab ${activeTab === 'to-watch' ? 'active' : ''}`}
            onClick={() => setActiveTab('to-watch')}
          >
            Want to Watch
            <span className="tab-count">{toWatchCount}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your library...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>Error loading movies: {error}</p>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="library-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <h2>
            {activeTab === 'watched' 
              ? 'No watched movies yet' 
              : 'No movies in your watchlist'}
          </h2>
          <p>
            {activeTab === 'watched'
              ? 'Start logging movies you have watched!'
              : 'Add movies you want to watch!'}
          </p>
          <button onClick={() => navigate('/')} className="browse-btn">
            {activeTab === 'watched' ? 'Browse Movies' : 'Find Movies'}
          </button>
        </div>
      ) : (
        <>
          {/* Up Next Queue - Only show on Want to Watch tab */}
          {activeTab === 'to-watch' && (
            <div className="up-next-section">
              <div className="up-next-header">
                <div className="up-next-label">
                  <span className="up-next-dot"></span>
                  Next Up
                </div>
                {upNextQueue.length === 0 && (
                  <p className="up-next-empty-hint">
                    Your queue is empty. Use Power Search to bank some movies!
                  </p>
                )}
              </div>
              {upNextQueue.length > 0 && (
                <div className="up-next-shelf">
                  {upNextQueue.map((movie) => (
                    <div
                      key={movie.id}
                      className="up-next-card"
                      onClick={() => movie.tmdb_id && navigate(`/movie/${movie.tmdb_id}`)}
                    >
                      <div className="up-next-poster">
                        {movie.poster ? (
                          <img src={movie.poster} alt={movie.title} />
                        ) : (
                          <div className="no-poster">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                        {/* Add to List Button Overlay */}
                        <div className="up-next-actions" onClick={(e) => e.stopPropagation()}>
                          <AddToListButton 
                            movie={{ 
                              tmdb_id: movie.tmdb_id, 
                              title: movie.title, 
                              poster_path: movie.poster?.replace('https://image.tmdb.org/t/p/w500', '') 
                            }} 
                            className="add-to-list-up-next"
                          />
                        </div>
                      </div>
                      <div className="up-next-info">
                        <h3 className="up-next-title-text">{movie.title}</h3>
                        <p className="up-next-year">{movie.year}</p>
                        {movie.rating && (
                          <div className="up-next-rating">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {movie.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="library-grid gap-8">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isLibraryCard={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {showEditModal && (
        <LogMovieModal
          movie={editingMovie}
          existingLog={editingMovie}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}

export default LibraryPage;
