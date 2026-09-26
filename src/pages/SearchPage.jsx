import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import SearchResults from '../components/SearchResults';
import { searchMultiStrict, discoverMoviesStrict, isTmdbRequestError } from '../api/tmdb';
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

const DEFAULT_SORT = 'popularity.desc';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

const SORT_COMPARATORS = {
  'popularity.desc': (a, b) => (b.popularity || 0) - (a.popularity || 0),
  'vote_average.desc': (a, b) => (b.vote_average || 0) - (a.vote_average || 0),
  'primary_release_date.desc': (a, b) =>
    String(b.release_date || '').localeCompare(String(a.release_date || '')),
};

const posterUrl = (path) => (path ? `https://image.tmdb.org/t/p/w500${path}` : null);

const mapDiscoverResult = (movie) => ({
  Title: movie.title,
  Year: movie.release_date?.split('-')[0] || 'N/A',
  imdbID: movie.id,
  Poster: posterUrl(movie.poster_path),
  tmdb_id: movie.id,
});

const mapMultiResult = (item) => ({
  Title: item.media_type === 'person' ? item.name : item.title,
  Year: item.media_type === 'person' ? null : (item.release_date?.split('-')[0] || 'N/A'),
  imdbID: item.id,
  Poster: posterUrl(item.media_type === 'person' ? item.profile_path : item.poster_path),
  tmdb_id: item.id,
  media_type: item.media_type,
  known_for_department: item.known_for_department || null,
  character: item.character || null,
});

/**
 * TMDB text search accepts neither a genre nor a year, so a query combined with filters is
 * narrowed here. Replacing the query with a discover call would answer a search for "Alien" with
 * unrelated popular sci-fi.
 */
const refineSearchResults = (results, { genre, year, sortBy }) => {
  const narrowing = Boolean(genre) || Boolean(year);
  const filtered = results.filter((item) => {
    if (!narrowing) return true;
    // People carry neither a genre nor a release date, so they cannot survive a narrowing filter.
    if (item.media_type === 'person') return false;
    if (genre && !(item.genre_ids || []).includes(Number(genre))) return false;
    if (year && !String(item.release_date || '').startsWith(year)) return false;
    return true;
  });

  return [...filtered].sort(SORT_COMPARATORS[sortBy] || SORT_COMPARATORS[DEFAULT_SORT]);
};

/**
 * SearchPage - Main page for searching and logging movies with Power Filter
 */
function SearchPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [resultMode, setResultMode] = useState('search');
  const [requestFailed, setRequestFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const query = searchParams.get('q') || '';
  const genreParam = searchParams.get('genres') || '';

  // Filter states
  const [selectedGenre, setSelectedGenre] = useState(() => genreParam.split(',')[0] || '');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [selectedYear, setSelectedYear] = useState('');

  const filtersActive =
    Boolean(selectedGenre) || Boolean(selectedYear) || sortBy !== DEFAULT_SORT;

  // The genre link shape only ever carries a genre, never a sort or a year.
  useEffect(() => {
    const urlGenre = genreParam.split(',')[0];
    if (urlGenre) setSelectedGenre(urlGenre);
  }, [genreParam]);

  // One effect owns every fetch: the URL query and the filter bar feed the same request, so a
  // filter change can no longer race a second effect for the same results.
  useEffect(() => {
    if (!query && !filtersActive) {
      setMovies([]);
      setHasSearched(false);
      setRequestFailed(false);
      setResultMode('search');
      // Clearing the filters can abandon an in-flight request, whose own finally block is skipped.
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasSearched(true);
    setRequestFailed(false);

    const run = async () => {
      try {
        if (!query) {
          const results = await discoverMoviesStrict(selectedGenre, sortBy, selectedYear);
          if (cancelled) return;
          setMovies(results.map(mapDiscoverResult));
          setResultMode('discover');
          return;
        }

        const results = await searchMultiStrict(query);
        if (cancelled) return;
        const refined = filtersActive
          ? refineSearchResults(results, { genre: selectedGenre, year: selectedYear, sortBy })
          : results;
        setMovies(refined.map(mapMultiResult));
        setResultMode(filtersActive ? 'refined' : 'search');
      } catch (error) {
        if (cancelled) return;
        console.error('TMDB request failed:', error.message);
        setMovies([]);
        // A transport failure is not an empty shelf, and must not be reported as one.
        setRequestFailed(isTmdbRequestError(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [query, selectedGenre, sortBy, selectedYear, filtersActive, retryToken]);

  const handleFilterChange = (setter, value) => {
    setter(value);
  };

  const clearFilters = () => {
    setSelectedGenre('');
    setSortBy(DEFAULT_SORT);
    setSelectedYear('');
  };

  const genreName = TMDB_GENRES.find((genre) => String(genre.id) === String(selectedGenre))?.name;
  const filterSummary = [
    genreName,
    selectedYear,
    SORT_OPTIONS.find((option) => option.id === sortBy)?.label,
  ]
    .filter(Boolean)
    .join(' · ');

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

      {!isLoading && requestFailed && (
        <div className="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <h3>Couldn't reach TMDB</h3>
          <p>Nothing matched because the request failed, not because the catalogue is empty.</p>
          <button
            className="clear-filters-btn"
            style={{ alignSelf: 'center' }}
            onClick={() => setRetryToken((token) => token + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !requestFailed && hasSearched && movies.length === 0 && (
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

      {!isLoading && !requestFailed && movies.length > 0 && (
        <>
          {resultMode !== 'search' && (
            <p className="page-subtitle" style={{ padding: '0 24px 12px' }}>
              {resultMode === 'discover'
                ? `Browsing ${filterSummary}`
                : `Results for "${query}", narrowed to ${filterSummary}`}
            </p>
          )}
          <SearchResults movies={movies} />
        </>
      )}
    </div>
  );
}

export default SearchPage;
