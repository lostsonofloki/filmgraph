import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import SearchResults from '../components/SearchResults';
import AdvancedFilterEngine from '../components/AdvancedFilterEngine';
import { searchMovies, discoverMovies, searchPeople } from '../api/tmdb';
import { getPosterUrl } from '../api/tmdb';
import { Link } from 'react-router-dom';
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
 * and Advanced Filter Engine for querying personal movie_logs
 */
function SearchPage() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState('search');
  const [lastQuery, setLastQuery] = useState('');
  const [filterError, setFilterError] = useState('');
  const [resultTab, setResultTab] = useState('movies'); // 'movies' | 'people'
  const [unifiedQuery, setUnifiedQuery] = useState('');

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [selectedYear, setSelectedYear] = useState('');

  const initialQuery = searchParams.get('q') || '';
  const initialGenres = searchParams.get('genres') || '';

  // Handle search when URL query changes
  useEffect(() => {
    if (initialGenres) {
      const genreIds = initialGenres.split(',');
      setSelectedGenre(genreIds[0]);
      setLastQuery(initialQuery);
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
  }, [initialQuery, initialGenres]);

  // Handle discover mode when filters change
  useEffect(() => {
    if (searchMode === 'discover') {
      handleDiscover();
    }
  }, [selectedGenre, sortBy, selectedYear]);

  const handleSearch = async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchMode('search');

    try {
      const results = await searchMovies(query);
      const mappedMovies = results.map(movie => ({
        Title: movie.title,
        Year: movie.release_date?.split('-')[0] || 'N/A',
        imdbID: movie.id,
        Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        tmdb_id: movie.id,
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
      const mappedMovies = results.map(movie => ({
        Title: movie.title,
        Year: movie.release_date?.split('-')[0] || 'N/A',
        imdbID: movie.id,
        Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        tmdb_id: movie.id,
      }));
      setMovies(mappedMovies);
      setResultTab('movies');
    } catch (error) {
      console.error('Error discovering movies:', error);
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnifiedSearch = async (e) => {
    e?.preventDefault();
    if (!unifiedQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setSearchMode('unified');
    setResultTab('movies');

    try {
      const [movieResults, peopleResults] = await Promise.all([
        searchMovies(unifiedQuery),
        searchPeople(unifiedQuery),
      ]);

      const mappedMovies = movieResults.map(movie => ({
        Title: movie.title,
        Year: movie.release_date?.split('-')[0] || 'N/A',
        imdbID: movie.id,
        Poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        tmdb_id: movie.id,
      }));

      setMovies(mappedMovies);
      setPeople(peopleResults);
    } catch (error) {
      console.error('Error searching:', error);
      setMovies([]);
      setPeople([]);
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

  // Advanced Filter Engine callbacks
  const handleAdvancedResults = useCallback((results) => {
    const mappedMovies = results.map(movie => ({
      Title: movie.title,
      Year: movie.year || 'N/A',
      imdbID: movie.tmdb_id,
      Poster: movie.poster || null,
      tmdb_id: movie.tmdb_id,
      rating: movie.rating,
      moods: movie.moods,
      review: movie.review,
      watch_status: movie.watch_status,
    }));
    setMovies(mappedMovies);
    setHasSearched(true);
    setSearchMode('library');
  }, []);

  const handleAdvancedError = useCallback((message) => {
    setFilterError(message);
    setTimeout(() => setFilterError(''), 5000);
  }, []);

  return (
    <div className="search-page">
      {/* Power Filter Bar (TMDB Discovery) */}
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

      {/* Advanced Filter Engine (Personal Library) */}
      {user && (
        <AdvancedFilterEngine
          onResults={handleAdvancedResults}
          onError={handleAdvancedError}
        />
      )}

      {/* Filter Error */}
      {filterError && (
        <div className="filter-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {filterError}
        </div>
      )}

      {/* Unified Search Bar */}
      <form onSubmit={handleUnifiedSearch} className="unified-search-bar">
        <input
          type="text"
          placeholder="Search movies, actors, directors..."
          value={unifiedQuery}
          onChange={(e) => setUnifiedQuery(e.target.value)}
          className="unified-search-input"
        />
        <button type="submit" className="unified-search-btn" disabled={isLoading || !unifiedQuery.trim()}>
          Search
        </button>
      </form>

      {/* Result Tabs */}
      {searchMode === 'unified' && (movies.length > 0 || people.length > 0) && (
        <div className="search-result-tabs">
          <button
            className={`search-tab ${resultTab === 'movies' ? 'active' : ''}`}
            onClick={() => setResultTab('movies')}
          >
            Movies ({movies.length})
          </button>
          <button
            className={`search-tab ${resultTab === 'people' ? 'active' : ''}`}
            onClick={() => setResultTab('people')}
          >
            People ({people.length})
          </button>
        </div>
      )}

      {isLoading && (
        <div className="search-loading">
          <div className="loading-spinner-large"></div>
          <p>Searching...</p>
        </div>
      )}

      {/* Movies Results */}
      {!isLoading && resultTab === 'movies' && movies.length > 0 && (
        <SearchResults movies={movies} />
      )}

      {/* People Results */}
      {!isLoading && resultTab === 'people' && people.length > 0 && (
        <div className="people-results-grid">
          {people.map((person) => (
            <Link
              key={person.id}
              to={`/person/${person.id}`}
              className="person-result-card"
            >
              {person.profile_path ? (
                <img
                  src={getPosterUrl(person.profile_path, 'w185')}
                  alt={person.name}
                  loading="lazy"
                />
              ) : (
                <div className="person-result-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
              <div className="person-result-info">
                <span className="person-result-name">{person.name}</span>
                <span className="person-result-known">{person.known_for_department || 'Actor'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && hasSearched && resultTab === 'movies' && movies.length === 0 && searchMode !== 'library' && (
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

      {!isLoading && hasSearched && resultTab === 'people' && people.length === 0 && searchMode === 'unified' && (
        <div className="no-results">
          <h3>No people found</h3>
          <p>Try a different name</p>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
