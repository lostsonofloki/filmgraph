import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import SearchResults from '../components/SearchResults';
import { searchMulti, discoverMovies } from '../api/tmdb';
import SeoHead from '../components/seo/SeoHead';
import './SearchPage.css';

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
 * SearchPage - Main page for searching and logging movies with Power Filter
 */
function SearchPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState('search');
  const [lastQuery, setLastQuery] = useState('');

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [selectedYear, setSelectedYear] = useState('');

  const initialQuery = searchParams.get('q') || '';
  const initialGenres = searchParams.get('genres') || '';

  // Handle search when URL query changes
  useEffect(() => {
    // If genres param exists, use discover mode with those genres
    if (initialGenres) {
      const genreIds = initialGenres.split(',');
      setSelectedGenre(genreIds[0]); // Use first genre for discover
      setLastQuery(initialQuery);
      // Trigger discover search with the genre
      setTimeout(() => {
        setIsLoading(true);
        setHasSearched(true);
        setSearchMode('discover');
        discoverMovies(genreIds[0], sortBy, selectedYear || CURRENT_YEAR.toString())
          .then(results => {
            const mappedMovies = results.map(movie => ({
              Title: movie.title,
              Year: movie.release_date?.split('-')[0] || 'N/A',
              imdbID: movie.id,
              Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
              tmdb_id: movie.id,
            }));
            setMovies(mappedMovies);
          })
          .catch(() => setMovies([]))
          .finally(() => setIsLoading(false));
      }, 0);
      return;
    }
    
    if (initialQuery && initialQuery !== lastQuery) {
      setLastQuery(initialQuery);
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Sync from URL only; filter state is intentionally excluded to avoid re-fetch loops
  }, [initialQuery, initialGenres]);

  // Handle discover mode when filters change
  useEffect(() => {
    if (searchMode === 'discover') {
      handleDiscover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Filter-driven discover; searchMode/handleDiscover omitted to avoid double-fetch with URL effect
  }, [selectedGenre, sortBy, selectedYear]);

  const handleSearch = async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchMode('search');

    try {
      const results = await searchMulti(query);
      // Map TMDB multi-search results to a unified format
      const mappedMovies = results.map(item => ({
        Title: item.media_type === 'person' ? item.name : item.title,
        Year: item.media_type === 'person' ? null : (item.release_date?.split('-')[0] || 'N/A'),
        imdbID: item.id,
        Poster: item.media_type === 'person'
          ? (item.profile_path ? `https://image.tmdb.org/t/p/w500${item.profile_path}` : null)
          : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null),
        tmdb_id: item.id,
        media_type: item.media_type,
        known_for_department: item.known_for_department || null,
        character: item.character || null,
      }));
      setMovies(mappedMovies);
    } catch (error) {
      console.error('Error searching movies:', error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscover = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchMode('discover');

    try {
      const results = await discoverMovies(selectedGenre, sortBy, selectedYear);
      // Map TMDB results to MovieCard format
      const mappedMovies = results.map(movie => ({
        Title: movie.title,
        Year: movie.release_date?.split('-')[0] || 'N/A',
        imdbID: movie.id,
        Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        tmdb_id: movie.id,
      }));
      setMovies(mappedMovies);
    } catch (error) {
      console.error('Error discovering movies:', error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setSortBy('popularity.desc');
    setSelectedYear('');
  };

  return (
    <div className="search-page">
      <SeoHead
        title="Search Movies"
        description="Search Filmgraph for movies, people, genres, and discover curated titles with advanced filters."
        pathname={`${location.pathname}${location.search}`}
      />
      {/* Power Filter Bar */}
      <div className="power-filter-bar">
        <div className="filter-group">
          <label htmlFor="genre-filter">Genre</label>
          <select
            id="genre-filter"
            className="filter-select"
            value={selectedGenre}
            onChange={(e) => handleFilterChange(setSelectedGenre, e.target.value)}
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
            onChange={(e) => handleFilterChange(setSortBy, e.target.value)}
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
            onChange={(e) => handleFilterChange(setSelectedYear, e.target.value)}
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

      {isLoading && (
        <div className="search-loading">
          <div className="loading-spinner-large"></div>
          <p>Searching for movies...</p>
        </div>
      )}

      {!isLoading && hasSearched && movies.length === 0 && (
        <div className="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M8 8l6 6M14 8l-6 6" />
          </svg>
          <h3>No movies found</h3>
          <p>Try adjusting your filters or search with a different title</p>
        </div>
      )}

      {!isLoading && movies.length > 0 && (
        <SearchResults movies={movies} />
      )}
    </div>
  );
}

export default SearchPage;
