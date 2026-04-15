import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPosterUrl, getProfileUrl, GENRES } from '../api/tmdb';
import { getSupabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import './ActorPage.css';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const FILMOGRAPHY_LIMIT = 150;

/** @param {string|undefined} releaseDate */
function yearFromRelease(releaseDate) {
  if (!releaseDate) return null;
  const y = parseInt(releaseDate.split('-')[0], 10);
  return Number.isFinite(y) ? y : null;
}

/** @param {number|null} year */
function decadeKeyFromYear(year) {
  if (year == null || !Number.isFinite(year)) return null;
  if (year < 1970) return 'earlier';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

const DECADE_LABELS = {
  earlier: 'Pre-1970',
  '1970s': '1970s',
  '1980s': '1980s',
  '1990s': '1990s',
  '2000s': '2000s',
  '2010s': '2010s',
  '2020s': '2020s',
  '2030s': '2030s',
};

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
  const [selectedGenreIds, setSelectedGenreIds] = useState(() => new Set());
  const [selectedDecade, setSelectedDecade] = useState('all');
  const [watchedOnly, setWatchedOnly] = useState(false);

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
            .slice(0, FILMOGRAPHY_LIMIT);
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

  useEffect(() => {
    setSelectedGenreIds(new Set());
    setSelectedDecade('all');
    setWatchedOnly(false);
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

  const genreIdsPresent = useMemo(() => {
    const ids = new Set();
    for (const m of movies) {
      for (const gid of m.genre_ids || []) {
        ids.add(gid);
      }
    }
    return [...ids].sort((a, b) =>
      (GENRES[a] || '').localeCompare(GENRES[b] || '')
    );
  }, [movies]);

  const decadesPresent = useMemo(() => {
    const keys = new Set();
    for (const m of movies) {
      const y = yearFromRelease(m.release_date);
      const dk = decadeKeyFromYear(y);
      if (dk) keys.add(dk);
    }
    const order = ['earlier', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s', '2030s'];
    return order.filter((k) => keys.has(k));
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const gids = m.genre_ids || [];
      if (selectedGenreIds.size > 0) {
        const match = [...selectedGenreIds].some((gid) => gids.includes(gid));
        if (!match) return false;
      }
      if (selectedDecade !== 'all') {
        const y = yearFromRelease(m.release_date);
        const dk = decadeKeyFromYear(y);
        if (dk !== selectedDecade) return false;
      }
      if (watchedOnly && !loggedIds.has(m.id)) return false;
      return true;
    });
  }, [movies, selectedGenreIds, selectedDecade, watchedOnly, loggedIds]);

  const toggleGenre = (genreId) => {
    setSelectedGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedGenreIds(new Set());
    setSelectedDecade('all');
    setWatchedOnly(false);
  };

  const hasActiveFilters =
    selectedGenreIds.size > 0 || selectedDecade !== 'all' || watchedOnly;

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
              Showing {filteredMovies.length} of {movies.length} credits (by popularity)
            </p>

            <div className="actor-filmography-filters" role="region" aria-label="Filmography filters">
              {genreIdsPresent.length > 0 && (
                <div className="actor-filter-row">
                  <span className="actor-filter-label">Genre</span>
                  <div className="actor-filter-chips" role="group" aria-label="Filter by genre">
                    {genreIdsPresent.map((gid) => (
                      <button
                        key={gid}
                        type="button"
                        className={`actor-filter-chip ${selectedGenreIds.has(gid) ? 'is-active' : ''}`}
                        onClick={() => toggleGenre(gid)}
                        aria-pressed={selectedGenreIds.has(gid)}
                      >
                        {GENRES[gid] || `Genre ${gid}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {decadesPresent.length > 0 && (
                <div className="actor-filter-row">
                  <span className="actor-filter-label">Decade</span>
                  <div className="actor-filter-chips" role="group" aria-label="Filter by decade">
                    <button
                      type="button"
                      className={`actor-filter-chip ${selectedDecade === 'all' ? 'is-active' : ''}`}
                      onClick={() => setSelectedDecade('all')}
                      aria-pressed={selectedDecade === 'all'}
                    >
                      All
                    </button>
                    {decadesPresent.map((dk) => (
                      <button
                        key={dk}
                        type="button"
                        className={`actor-filter-chip ${selectedDecade === dk ? 'is-active' : ''}`}
                        onClick={() => setSelectedDecade(dk)}
                        aria-pressed={selectedDecade === dk}
                      >
                        {DECADE_LABELS[dk] || dk}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="actor-filter-row actor-filter-row--tight">
                <button
                  type="button"
                  className={`actor-filter-chip actor-filter-chip--toggle ${watchedOnly ? 'is-active' : ''}`}
                  onClick={() => setWatchedOnly((v) => !v)}
                  aria-pressed={watchedOnly}
                  disabled={!user?.id}
                  title={!user?.id ? 'Sign in to filter by your library' : undefined}
                >
                  Logged only
                </button>
                {hasActiveFilters && (
                  <button type="button" className="actor-filter-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {filteredMovies.length === 0 ? (
              <p className="filmography-empty">No credits match these filters. Try clearing or picking another genre.</p>
            ) : (
              <div className="filmography-grid">
                {filteredMovies.map((movie) => {
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
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default ActorPage;
