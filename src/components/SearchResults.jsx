import { useNavigate } from 'react-router-dom';
import './SearchResults.css';

/**
 * SearchResults component displaying a grid of movie cards
 * @param {Array} movies - Array of movie search results
 */
function SearchResults({ movies }) {
  const navigate = useNavigate();

  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <h2 className="results-title">Search Results</h2>
        <span className="results-count">{movies.length} movies found</span>
      </div>
      <div className="movies-grid">
        {movies.map((movie) => (
          <div
            key={movie.tmdb_id || movie.imdbID}
            className="movie-card-wrapper"
            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
          >
            <div className="movie-card">
              <div className="movie-card-poster">
                <img
                  src={movie.Poster}
                  alt={`${movie.Title} poster`}
                  loading="lazy"
                />
              </div>
              <div className="movie-card-content">
                <h3 className="movie-card-title">{movie.Title}</h3>
                <p className="movie-card-year">{movie.Year}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
