import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrendingMovies, getBackdropUrl, discoverMovies } from '../api/tmdb';
import QuickMovieActions from '../components/QuickMovieActions';
import SeoHead from '../components/seo/SeoHead';
import './TrendingMovies.css';

const TMDB_GENRES = [
  { id: 27, name: 'Horror' },
  { id: 53, name: 'Thriller' },
  { id: 9648, name: 'Mystery' },
  { id: 878, name: 'Sci-Fi' },
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 10402, name: 'Music' },
  { id: 10749, name: 'Romance' },
  { id: 10770, name: 'TV Movie' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' }
];

const SORT_OPTIONS = [
  { id: 'popularity.desc', label: 'Most Popular' },
  { id: 'vote_average.desc', label: 'Highest Rated' },
  { id: 'primary_release_date.desc', label: 'Newest' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

/**
 * TrendingMovies page - Displays trending movies with backdrop images and Power Filter
 */
function TrendingMovies() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('week');
  const [useDiscover, setUseDiscover] = useState(false);
  const navigate = useNavigate();

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      
      if (useDiscover || (selectedGenre || selectedYear)) {
        const results = await discoverMovies(selectedGenre, sortBy, selectedYear);
        setMovies(results);
      } else {
        const trending = await getTrendingMovies(timeWindow);
        setMovies(trending);
      }
      
      setIsLoading(false);
    };

    fetchMovies();
  }, [timeWindow, useDiscover, selectedGenre, sortBy, selectedYear]);

  const handleMovieClick = (movie) => {
    navigate(`/movie/${movie.id}`, { state: { movie } });
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setSortBy('popularity.desc');
    setSelectedYear('');
    setUseDiscover(false);
  };

  return (
    <div className="trending-page">
      <SeoHead
        title="Trending Movies"
        description="Browse trending films, filter by genre and year, and jump into detailed movie insights on Filmgraph."
        pathname="/"
      />
      <div className="trending-header">
        <h1 className="trending-title">Trending Movies</h1>
        <div className="time-window-toggle">
          <button
            className={`toggle-btn ${timeWindow === 'day' ? 'active' : ''}`}
            onClick={() => {
              setTimeWindow('day');
              setUseDiscover(false);
            }}
          >
            Today
          </button>
          <button
            className={`toggle-btn ${timeWindow === 'week' ? 'active' : ''}`}
            onClick={() => {
              setTimeWindow('week');
              setUseDiscover(false);
            }}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Power Filter Bar */}
      <div className="power-filter-bar">
        <div className="filter-group">
          <label htmlFor="genre-filter">Genre</label>
          <select
            id="genre-filter"
            className="filter-select"
            value={selectedGenre}
            onChange={(e) => {
              setSelectedGenre(e.target.value);
              if (e.target.value) setUseDiscover(true);
            }}
          >
            <option value="">All Genres</option>
            {TMDB_GENRES.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
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
            onChange={(e) => {
              setSortBy(e.target.value);
              setUseDiscover(true);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="year-filter">Year</label>
          <select
            id="year-filter"
            className="filter-select"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              if (e.target.value) setUseDiscover(true);
            }}
          >
            <option value="">All Years</option>
            {YEAR_RANGE.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {(selectedGenre || sortBy !== 'popularity.desc' || selectedYear) && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>Loading movies...</p>
        </div>
      ) : (
        <div className="backdrop-grid">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="backdrop-card"
              onClick={() => handleMovieClick(movie)}
            >
              <div className="backdrop-image-wrapper">
                {movie.backdrop_path ? (
                  <img
                    src={getBackdropUrl(movie.backdrop_path, 'w780')}
                    alt={movie.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="no-backdrop">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <div className="backdrop-overlay"></div>
                <div
                  className="backdrop-quick-actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <QuickMovieActions movie={movie} />
                </div>
                <div className="backdrop-content">
                  <h3 className="backdrop-title">{movie.title}</h3>
                  <div className="backdrop-meta">
                    <span className="vote-average">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {movie.vote_average?.toFixed(1)}
                    </span>
                    <span className="release-year">{movie.release_date?.split('-')[0]}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrendingMovies;
