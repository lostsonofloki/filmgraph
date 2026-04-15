import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPosterUrl, getProfileUrl } from '../api/tmdb';
import { getSupabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import './ActorPage.css';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

/**
 * ActorPage — Person hub with bio, filmography grid, and "Watched" badge
 */
function ActorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [actor, setActor] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loggedIds, setLoggedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch actor bio + credits concurrently
  useEffect(() => {
    const fetchActorData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [actorRes, creditsRes] = await Promise.all([
          fetch(`${TMDB_BASE}/person/${id}?api_key=${API_KEY}`),
          fetch(`${TMDB_BASE}/person/${id}/movie_credits?api_key=${API_KEY}`),
        ]);

        const actorData = await actorRes.json();
        if (actorData.status_code) throw new Error(actorData.status_message);
        setActor(actorData);

        const creditsData = await creditsRes.json();
        if (creditsData.cast) {
          const sorted = [...creditsData.cast]
            .filter(m => m.poster_path)
            .sort((a, b) => {
              if (b.popularity !== a.popularity) return b.popularity - a.popularity;
              return new Date(b.release_date || 0) - new Date(a.release_date || 0);
            })
            .slice(0, 40);
          setMovies(sorted);
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

  // Fetch user's logged TMDB IDs for "Watched" badge
  useEffect(() => {
    const fetchLoggedIds = async () => {
      if (!user?.id) return;
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('movie_logs')
          .select('tmdb_id')
          .eq('user_id', user.id)
          .not('tmdb_id', 'is', null);

        if (!error && data) {
          setLoggedIds(new Set(data.map(row => row.tmdb_id)));
        }
      } catch (err) {
        console.error('Error fetching logged IDs:', err);
      }
    };

    fetchLoggedIds();
  }, [user?.id]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="actor-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading person details...</p>
        </div>
      </div>
    );
  }

  if (error || !actor) {
    return (
      <div className="actor-page">
        <div className="error-state">
          <h2>Person not found</h2>
          <p>{error || 'Unable to load information'}</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="actor-page">
      {/* Bio Section */}
      <div className="actor-header">
        <div className="actor-header-content">
          {actor.profile_path ? (
            <img
              src={getProfileUrl(actor.profile_path, 'w500')}
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
              {actor.known_for_department && (
                <span className="actor-department-badge">{actor.known_for_department}</span>
              )}
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
          </div>
        </div>
      </div>

      {/* Filmography Grid */}
      {movies.length > 0 && (
        <section className="actor-filmography">
          <div className="section-content">
            <h2>Filmography</h2>
            <p className="filmography-subtitle">
              {movies.length} movies by popularity
            </p>
            <div className="filmography-grid">
              {movies.map((movie) => {
                const isWatched = loggedIds.has(movie.id);
                return (
                  <div
                    key={movie.id}
                    className="film-card"
                    onClick={() => handleMovieClick(movie.id)}
                  >
                    <div className="film-card-poster">
                      <img
                        src={getPosterUrl(movie.poster_path, 'w342')}
                        alt={movie.title}
                        loading="lazy"
                      />
                      {isWatched && (
                        <span className="watched-badge" title="Watched">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="film-card-info">
                      <h3>{movie.title}</h3>
                      <p className="film-year">
                        {movie.release_date?.split('-')[0] || 'N/A'}
                      </p>
                      {movie.character && (
                        <p className="film-character">as {movie.character}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ActorPage;
