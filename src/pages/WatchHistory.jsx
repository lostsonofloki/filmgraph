import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import './WatchHistory.css';

/**
 * WatchHistory - Vertical timeline of watched movies grouped by month
 */
function WatchHistory() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [groupedMovies, setGroupedMovies] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const groupMoviesByMonth = (data) => {
    const grouped = {};

    data.forEach((movie) => {
      const date = new Date(movie.created_at);
      const monthKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      const monthYearSort = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthYearSort]) {
        grouped[monthYearSort] = {
          label: monthKey,
          movies: [],
        };
      }

      grouped[monthYearSort].movies.push(movie);
    });

    // Sort by month (newest first)
    const sortedGrouped = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    setGroupedMovies(sortedGrouped);
  };

  const fetchMovies = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('watch_status', 'watched')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMovies(data || []);
      groupMoviesByMonth(data || []);
    } catch (err) {
      console.error('Error fetching movies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      navigate('/login');
      return;
    }

    fetchMovies();
  }, [user, isAuthenticated, navigate, fetchMovies]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="watch-history">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your watch history...</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="watch-history">
        <div className="history-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h2>No watch history yet</h2>
          <p>Start logging movies to build your timeline!</p>
          <button onClick={() => navigate('/')} className="browse-btn">
            Browse Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="watch-history">
      <div className="history-header">
        <h1>Watch History</h1>
        <p className="history-subtitle">
          {movies.length} movie{movies.length !== 1 ? 's' : ''} watched
        </p>
      </div>

      <div className="timeline">
        {Object.entries(groupedMovies).map(([monthSort, { label, movies: monthMovies }]) => (
          <div key={monthSort} className="timeline-month">
            <div className="timeline-month-header">
              <h2 className="timeline-month-label">{label}</h2>
              <span className="timeline-month-count">{monthMovies.length} movie{monthMovies.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="timeline-divider"></div>
            <div className="timeline-movies">
              {monthMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="timeline-entry"
                  onClick={() => movie.tmdb_id && navigate(`/movie/${movie.tmdb_id}`)}
                >
                  <div className="timeline-line">
                    <div className="timeline-node"></div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-date">{formatDate(movie.created_at)}</div>
                    <div className="timeline-movie-card">
                      <div className="timeline-poster">
                        {(movie.poster_path || movie.poster) ? (
                          <img 
                            src={movie.poster_path 
                              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
                              : movie.poster} 
                            alt={movie.title} 
                            loading="lazy"
                          />
                        ) : (
                          <div className="no-poster">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="timeline-movie-info">
                        <h3 className="timeline-movie-title">{movie.title}</h3>
                        <p className="timeline-movie-year">{movie.year}</p>
                        {movie.rating && (
                          <div className="timeline-rating">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {movie.rating.toFixed(1)}
                          </div>
                        )}
                        {movie.moods && movie.moods.length > 0 && (
                          <div className="timeline-moods">
                            {movie.moods.slice(0, 3).map((mood) => (
                              <span key={mood} className="timeline-mood-chip">
                                {mood}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WatchHistory;
