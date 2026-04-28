import { useNavigate } from 'react-router-dom';
import QuickMovieActions from './QuickMovieActions';
import './SearchResults.css';

/**
 * SearchResults component displaying a grid of movie and person search results
 * @param {Array} movies - Array of search results (movies and/or people)
 */
function SearchResults({ movies }) {
  const navigate = useNavigate();

  if (!movies || movies.length === 0) {
    return null;
  }

  const movieCount = movies.filter(m => m.media_type !== 'person').length;
  const personCount = movies.filter(m => m.media_type === 'person').length;

  return (
    <div className="search-results">
      <div className="results-header">
        <h2 className="results-title">Search Results</h2>
        <span className="results-count">
          {movieCount} movie{movieCount !== 1 ? 's' : ''}
          {personCount > 0 && `, ${personCount} people`}
        </span>
      </div>
      <div className="movies-grid">
        {movies.map((item) => {
          if (item.media_type === 'person') {
            return (
              <div
                key={`person-${item.tmdb_id}`}
                className="movie-card-wrapper person-card-wrapper"
                onClick={() => navigate(`/actor/${item.tmdb_id}`)}
              >
                <div className="movie-card person-card">
                  <div className="movie-card-poster person-poster">
                    <img
                      src={item.Poster}
                      alt={item.Title}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="media-type-badge">Person</span>
                  </div>
                  <div className="movie-card-content">
                    <h3 className="movie-card-title">{item.Title}</h3>
                    {item.known_for_department && (
                      <p className="movie-card-department">{item.known_for_department}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={`movie-${item.tmdb_id}`}
              className="movie-card-wrapper"
              onClick={() => navigate(`/movie/${item.tmdb_id}`)}
            >
              <div className="movie-card">
                <div className="movie-card-poster">
                  <img
                    src={item.Poster}
                    alt={`${item.Title} poster`}
                    loading="lazy"
                  />
                  <div
                    className="search-card-quick-actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <QuickMovieActions movie={item} />
                  </div>
                  <span className="media-type-badge">Movie</span>
                </div>
                <div className="movie-card-content">
                  <h3 className="movie-card-title">{item.Title}</h3>
                  <p className="movie-card-year">{item.Year}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SearchResults;
