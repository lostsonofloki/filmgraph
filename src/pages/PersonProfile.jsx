import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPersonWithCredits } from '../api/tmdb';
import { useLists } from '../context/ListContext';
import { getPosterUrl } from '../api/tmdb';
import './PersonProfile.css';

function PersonProfile() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cast');
  const [genreFilter, setGenreFilter] = useState('');
  const { lists } = useLists();

  useEffect(() => {
    if (!personId) return;
    setIsLoading(true);
    setError('');
    getPersonWithCredits(parseInt(personId, 10))
      .then((data) => {
        if (!data) throw new Error('Person not found.');
        setPerson(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load person.');
      })
      .finally(() => setIsLoading(false));
  }, [personId]);

  // Build a set of TMDB IDs the user has logged
  const loggedTmdbIds = new Set();
  lists.forEach((list) => {
    list.list_items?.forEach((item) => {
      if (item.tmdb_id) loggedTmdbIds.add(item.tmdb_id);
    });
  });

  // Get unique movies from cast or crew, sorted by popularity
  const getMovies = () => {
    if (!person) return [];
    const movies = activeTab === 'cast' ? person.cast || [] : person.crew || [];

    // Deduplicate by id
    const seen = new Set();
    const unique = movies.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // Sort by popularity descending
    unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    // Filter by genre if selected
    if (genreFilter) {
      return unique.filter((m) =>
        m.genre_ids?.includes(parseInt(genreFilter, 10))
      );
    }

    return unique;
  };

  const movies = getMovies();

  if (isLoading) {
    return (
      <div className="person-profile-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="person-profile-error">
        <h2>{error || 'Person not found'}</h2>
        <Link to="/search" className="back-to-search-link">
          ← Back to Search
        </Link>
      </div>
    );
  }

  const birthDate = person.birthday
    ? new Date(person.birthday).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const deathDate = person.deathday
    ? new Date(person.deathday).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const knownFor = person.known_for_department || person.department || '';

  return (
    <div className="person-profile-page">
      {/* Header */}
      <div className="person-header">
        <div className="person-header-content">
          {person.profile_path ? (
            <img
              src={getPosterUrl(person.profile_path, 'w342')}
              alt={person.name}
              className="person-profile-image"
            />
          ) : (
            <div className="person-profile-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div className="person-info">
            <h1 className="person-name">{person.name}</h1>
            {knownFor && (
              <span className="person-department">{knownFor}</span>
            )}
            <div className="person-meta">
              {birthDate && (
                <span className="person-birth">
                  Born: {birthDate}
                  {person.place_of_birth && ` in ${person.place_of_birth}`}
                </span>
              )}
              {deathDate && <span className="person-death">Died: {deathDate}</span>}
            </div>
            {person.biography && (
              <p className="person-biography">{person.biography}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div className="person-filmography">
        <div className="filmography-header">
          <h2>Filmography</h2>
          <div className="filmography-controls">
            {/* Cast / Crew Tabs */}
            <div className="filmography-tabs">
              <button
                className={`film-tab ${activeTab === 'cast' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('cast');
                  setGenreFilter('');
                }}
              >
                Cast ({(person.cast || []).length})
              </button>
              <button
                className={`film-tab ${activeTab === 'crew' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('crew');
                  setGenreFilter('');
                }}
              >
                Crew ({(person.crew || []).length})
              </button>
            </div>

            {/* Genre Filter */}
            <select
              className="genre-filter-select"
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
            >
              <option value="">All Genres</option>
              <option value="28">Action</option>
              <option value="12">Adventure</option>
              <option value="16">Animation</option>
              <option value="35">Comedy</option>
              <option value="80">Crime</option>
              <option value="18">Drama</option>
              <option value="14">Fantasy</option>
              <option value="27">Horror</option>
              <option value="9648">Mystery</option>
              <option value="10749">Romance</option>
              <option value="878">Sci-Fi</option>
              <option value="53">Thriller</option>
            </select>
          </div>
        </div>

        {movies.length === 0 ? (
          <p className="no-movies">No {activeTab} movies found.</p>
        ) : (
          <div className="filmography-grid">
            {movies.map((movie) => {
              const isLogged = loggedTmdbIds.has(movie.id);
              return (
                <Link
                  key={movie.id}
                  to={`/movie/${movie.id}`}
                  className="film-card"
                >
                  <div className="film-card-poster">
                    {movie.poster_path ? (
                      <img
                        src={getPosterUrl(movie.poster_path, 'w185')}
                        alt={movie.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="film-card-placeholder">
                        <span>No Poster</span>
                      </div>
                    )}
                    {isLogged && <span className="logged-badge">✓ Logged</span>}
                  </div>
                  <div className="film-card-info">
                    <span className="film-card-title">{movie.title}</span>
                    <span className="film-card-year">
                      {movie.release_date?.split('-')[0] || 'N/A'}
                    </span>
                    {movie.character && activeTab === 'cast' && (
                      <span className="film-card-character">as {movie.character}</span>
                    )}
                    {movie.job && activeTab === 'crew' && (
                      <span className="film-card-job">{movie.job}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="person-profile-footer">
        <Link to="/search" className="back-to-search-link">
          ← Back to Search
        </Link>
      </div>
    </div>
  );
}

export default PersonProfile;
