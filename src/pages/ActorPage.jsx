import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBackdropUrl, getPosterUrl } from '../api/tmdb';
import './ActorPage.css';

/**
 * ActorPage - Shows actor details and filmography
 */
function ActorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchActorData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Fetch actor details
        const actorResponse = await fetch(
          `https://api.themoviedb.org/3/person/${id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
        );
        const actorData = await actorResponse.json();

        if (actorData.status_code) {
          throw new Error(actorData.status_message);
        }

        setActor(actorData);

        // Fetch actor's movie credits
        const creditsResponse = await fetch(
          `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${import.meta.env.VITE_TMDB_API_KEY}`
        );
        const creditsData = await creditsResponse.json();

        if (creditsData.cast) {
          // Sort by popularity and release date
          const sortedMovies = [...creditsData.cast]
            .filter(movie => movie.poster_path) // Only movies with posters
            .sort((a, b) => {
              // First by popularity
              if (b.popularity !== a.popularity) {
                return b.popularity - a.popularity;
              }
              // Then by release date
              return new Date(b.release_date || 0) - new Date(a.release_date || 0);
            })
            .slice(0, 20); // Top 20 movies

          setMovies(sortedMovies);
        }
      } catch (err) {
        console.error('Error fetching actor data:', err);
        setError(err.message || 'Failed to load actor data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActorData();
    window.scrollTo(0, 0);
  }, [id]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="actor-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading actor details...</p>
        </div>
      </div>
    );
  }

  if (error || !actor) {
    return (
      <div className="actor-page">
        <div className="error-state">
          <h2>Actor not found</h2>
          <p>{error || 'Unable to load actor information'}</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="actor-page">
      {/* Actor Header */}
      <div className="actor-header">
        <div className="actor-header-content">
          {actor.profile_path ? (
            <img
              src={getPosterUrl(actor.profile_path, 'w500')}
              alt={actor.name}
              className="actor-profile-image"
            />
          ) : (
            <div className="actor-profile-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="8" r="4" />
                <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z" />
              </svg>
            </div>
          )}

          <div className="actor-info">
            <h1>{actor.name}</h1>
            <p className="actor-meta">
              {actor.birthday && (
                <span>Born: {new Date(actor.birthday).toLocaleDateString()}</span>
              )}
              {actor.place_of_birth && (
                <span> • {actor.place_of_birth}</span>
              )}
            </p>
            {actor.biography && (
              <div className="actor-bio">
                <h2>Biography</h2>
                <p>{actor.biography}</p>
              </div>
            )}
            {actor.known_for_department && (
              <p className="actor-department">
                Known for: {actor.known_for_department}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filmography */}
      {movies.length > 0 && (
        <section className="actor-filmography">
          <div className="section-content">
            <h2>Filmography</h2>
            <p className="filmography-subtitle">
              Top {movies.length} movies by popularity
            </p>
            <div className="movies-grid">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="movie-card"
                  onClick={() => handleMovieClick(movie.id)}
                >
                  <div className="movie-card-poster">
                    <img
                      src={getBackdropUrl(movie.poster_path, 'w500')}
                      alt={movie.title}
                    />
                  </div>
                  <div className="movie-card-info">
                    <h3>{movie.title}</h3>
                    <p className="movie-year">
                      {movie.release_date?.split('-')[0] || 'N/A'}
                    </p>
                    {movie.character && (
                      <p className="movie-character">as {movie.character}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ActorPage;
