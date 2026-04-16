import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import './WatchHistory.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toDayKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const getDayLabel = (dayKey) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const buildMonthCells = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < firstDayIndex; i += 1) {
    cells.push({ type: 'filler', id: `filler-start-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ type: 'day', day, dayKey: toDayKey(date) });
  }

  const trailingFillers = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingFillers; i += 1) {
    cells.push({ type: 'filler', id: `filler-end-${i}` });
  }

  return cells;
};

/**
 * WatchHistory - Calendar view of watched movies with day drilldown
 */
function WatchHistory() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [moviesByDay, setMoviesByDay] = useState({});
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const indexMoviesByDay = (data) => {
    const grouped = data.reduce((acc, movie) => {
      const dayKey = toDayKey(movie.created_at);
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(movie);
      return acc;
    }, {});

    Object.values(grouped).forEach((entries) =>
      entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    );

    setMoviesByDay(grouped);

    if (!selectedDayKey && data.length > 0) {
      setSelectedDayKey(toDayKey(data[0].created_at));
    }
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
      indexMoviesByDay(data || []);
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

  const currentMonthLabel = getMonthLabel(currentMonthDate);
  const monthCells = buildMonthCells(currentMonthDate);
  const selectedDayMovies = selectedDayKey ? moviesByDay[selectedDayKey] || [] : [];
  const isCurrentMonthSelectedDay = selectedDayKey
    ? selectedDayKey.startsWith(toDayKey(currentMonthDate).slice(0, 7))
    : false;

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(toDayKey(now));
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

      <div className="history-calendar-wrap">
        <div className="calendar-header-row">
          <button className="calendar-nav-btn" onClick={handlePrevMonth} type="button" aria-label="Previous month">
            Previous
          </button>
          <h2 className="calendar-month-title">{currentMonthLabel}</h2>
          <button className="calendar-nav-btn" onClick={handleNextMonth} type="button" aria-label="Next month">
            Next
          </button>
        </div>

        <button className="calendar-today-btn" onClick={handleJumpToToday} type="button">
          Jump to Today
        </button>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {monthCells.map((cell) => {
            if (cell.type === 'filler') {
              return <div key={cell.id} className="calendar-cell calendar-cell-filler" aria-hidden="true" />;
            }

            const dayMovies = moviesByDay[cell.dayKey] || [];
            const isActive = dayMovies.length > 0;
            const isSelected = selectedDayKey === cell.dayKey;

            return (
              <button
                key={cell.dayKey}
                type="button"
                className={`calendar-cell calendar-cell-day ${isActive ? 'is-active' : ''} ${
                  isSelected ? 'is-selected' : ''
                }`}
                onClick={() => isActive && setSelectedDayKey(cell.dayKey)}
                disabled={!isActive}
              >
                <span className="calendar-day-number">{cell.day}</span>
                {isActive && <span className="calendar-day-count">{dayMovies.length}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="selected-day-panel">
        {selectedDayKey && selectedDayMovies.length > 0 && isCurrentMonthSelectedDay ? (
          <>
            <div className="selected-day-header">
              <h3>{getDayLabel(selectedDayKey)}</h3>
              <p>
                {selectedDayMovies.length} movie{selectedDayMovies.length !== 1 ? 's' : ''} watched
              </p>
            </div>

            <div className="selected-day-movies">
              {selectedDayMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="selected-day-movie-card"
                  onClick={() => movie.tmdb_id && navigate(`/movie/${movie.tmdb_id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && movie.tmdb_id) {
                      navigate(`/movie/${movie.tmdb_id}`);
                    }
                  }}
                >
                  <div className="selected-day-poster">
                    {(movie.poster_path || movie.poster) ? (
                      <img
                        src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : movie.poster}
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
                  <div className="selected-day-movie-info">
                    <div className="selected-day-date">{formatDate(movie.created_at)}</div>
                    <h4>{movie.title}</h4>
                    <p>{movie.year}</p>
                    {movie.rating ? (
                      <div className="selected-day-rating">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {movie.rating.toFixed(1)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="selected-day-empty">
            <p>Select a highlighted day to view movies watched on that date.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WatchHistory;
