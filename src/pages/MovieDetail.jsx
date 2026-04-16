import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { getMovieDetails, getBackdropUrl, getPosterUrl, getProfileUrl, fetchWatchProviders } from '../api/tmdb';
import { getRtScoreByImdbId } from '../api/omdb';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getSupabase } from '../supabaseClient';
import LogMovieModal from '../components/LogMovieModal';
import AddToListButton from '../components/AddToListButton';
import { buildMovieSharePayload, executeShare } from '../utils/share';
import './MovieDetail.css';

// Content Safety Filter - Blacklisted keywords (case-insensitive)
const ADULT_KEYWORDS = ['erotic', 'adult', 'sex', 'sexual', 'porn'];

// Content Safety Filter - Blacklisted TMDB IDs
const BLACKLISTED_IDS = [1015959];

/**
 * Check if movie content is safe to display
 * @param {Object} movie - TMDB movie object
 * @returns {boolean} - True if safe, false if should be blocked
 */
const isContentSafe = (movie) => {
  if (!movie) return false;

  // Check if ID is blacklisted
  if (BLACKLISTED_IDS.includes(movie.id)) {
    return false;
  }

  // Check title for adult keywords
  const title = (movie.title || '').toLowerCase();
  for (const keyword of ADULT_KEYWORDS) {
    if (title.includes(keyword)) {
      return false;
    }
  }

  // Check overview for adult keywords
  const overview = (movie.overview || '').toLowerCase();
  for (const keyword of ADULT_KEYWORDS) {
    if (overview.includes(keyword)) {
      return false;
    }
  }

  // Check genres for adult content
  if (movie.genres && Array.isArray(movie.genres)) {
    for (const genre of movie.genres) {
      const genreName = (genre.name || '').toLowerCase();
      for (const keyword of ADULT_KEYWORDS) {
        if (genreName.includes(keyword)) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Filter recommendations for adult content
 * @param {Array} recommendations - Array of movie recommendations
 * @returns {Array} - Filtered recommendations
 */
const filterRecommendations = (recommendations) => {
  if (!recommendations || !Array.isArray(recommendations)) return [];

  return recommendations.filter(movie => {
    // Skip blacklisted IDs
    if (BLACKLISTED_IDS.includes(movie.id)) {
      return false;
    }

    // Check title for adult keywords
    const title = (movie.title || '').toLowerCase();
    for (const keyword of ADULT_KEYWORDS) {
      if (title.includes(keyword)) {
        return false;
      }
    }

    // Check overview for adult keywords
    const overview = (movie.overview || '').toLowerCase();
    for (const keyword of ADULT_KEYWORDS) {
      if (overview.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
};

// Mood category colors (same as LibraryPage)
const MOOD_COLORS = {
  emotional: 'mood-warm',
  vibe: 'mood-cool',
  intellectual: 'mood-slate',
};

// Mood categories
const FEATURED_CREW_JOBS = new Set([
  'Director of Photography',
  'Editor',
  'Original Music Composer',
  'Production Design',
]);

/** @param {Array<{ id: number }>} entries */
function dedupeCrewById(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/** @param {Array<{ id: number, job?: string, department?: string }>|undefined} crew */
function pickDirectors(crew) {
  if (!crew?.length) return [];
  return dedupeCrewById(crew.filter((c) => c.job === 'Director' || c.job === 'Co-Director'));
}

/** @param {Array<{ id: number, job?: string, department?: string }>|undefined} crew */
function pickWriters(crew) {
  if (!crew?.length) return [];
  return dedupeCrewById(
    crew.filter(
      (c) =>
        c.department === 'Writing' ||
        ['Screenplay', 'Writer', 'Story', 'Novel'].includes(c.job)
    )
  );
}

/** @param {Array<{ id: number, job?: string }>|undefined} crew */
function pickFeaturedCrew(crew, heroIds) {
  if (!crew?.length) return [];
  return dedupeCrewById(
    crew.filter((c) => FEATURED_CREW_JOBS.has(c.job) && !heroIds.has(c.id))
  ).slice(0, 12);
}

const MOOD_CATEGORIES = {
  bittersweet: 'emotional',
  heartwarming: 'emotional',
  tearjerker: 'emotional',
  uplifting: 'emotional',
  bleak: 'emotional',
  atmospheric: 'vibe',
  dark: 'vibe',
  gritty: 'vibe',
  neon: 'vibe',
  tense: 'vibe',
  whimsical: 'vibe',
  gory: 'vibe',
  eerie: 'vibe',
  claustrophobic: 'vibe',
  campy: 'vibe',
  dread: 'vibe',
  'jump-scary': 'vibe',
  psychological: 'intellectual',
  mindbending: 'intellectual',
  challenging: 'intellectual',
  philosophical: 'intellectual',
  slowburn: 'intellectual',
  complex: 'intellectual',
};

/**
 * MovieDetail page - Shows movie details with backdrop and RT score
 */
function MovieDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const toast = useToast();
  const [movie, setMovie] = useState(null);
  const [rtScore, setRtScore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [userLog, setUserLog] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);

  useEffect(() => {
    const fetchMovieData = async () => {
      setIsLoading(true);

      // Fetch full movie details from TMDB
      const movieData = await getMovieDetails(id);
      
      if (movieData) {
        // SAFETY CHECK: Block adult/blacklisted content
        if (!isContentSafe(movieData)) {
          console.warn('Blocked adult/blacklisted content:', movieData.title, movieData.id);
          navigate('/', { replace: true });
          setIsLoading(false);
          return;
        }

        setMovie(movieData);

        // Fetch watch providers for this movie
        const providers = await fetchWatchProviders(id);
        setWatchProviders(providers);

        // SAFETY CHECK: Filter recommendations
        const filteredRecs = filterRecommendations(movieData.recommendations?.results || []);
        setRecommendations(filteredRecs.slice(0, 6));

        // Fetch RT score from OMDb using IMDB ID
        if (movieData.imdb_id) {
          const rt = await getRtScoreByImdbId(movieData.imdb_id);
          setRtScore(rt);
        }
      }

      setIsLoading(false);
    };

    fetchMovieData();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  // Fetch user's log for this movie
  useEffect(() => {
    const fetchUserLog = async () => {
      if (!isAuthenticated || !user?.id || !movie?.id) return;

      try {
        const supabase = getSupabase();
        // FIX 1: Use explicit column list (NOT select('*'))
        // FIX 2: Use .maybeSingle() instead of .single()
        const { data, error } = await supabase
          .from('movie_logs')
          .select('id, rating, review, moods, genres, tmdb_id, user_id')
          .eq('tmdb_id', movie.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user log:', error);
        } else if (data) {
          setUserLog(data);
        } else {
          setUserLog(null);
        }
      } catch (err) {
        console.error('Error fetching user log:', err);
      }
    };

    fetchUserLog();
  }, [isAuthenticated, user?.id, movie?.id]);

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogMovie = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    setEditingLog(userLog);
    setShowLogModal(true);
  };

  const handleModalClose = () => {
    setEditingLog(null);
    setShowLogModal(false);
  };

  const handleModalSaved = (savedLog) => {
    setUserLog(savedLog);
    setEditingLog(null);
    setShowLogModal(false);
  };

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated || !movie?.id) {
      navigate('/login', { state: { from: location } });
      return;
    }
    try {
      const supabase = getSupabase();
      const { data: existing } = await supabase
        .from('movie_logs')
        .select('id, watch_status, rating')
        .eq('tmdb_id', movie.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.watch_status === 'to-watch') {
          if (!existing.rating) {
            await supabase.from('movie_logs').delete().eq('id', existing.id);
            toast.success('Removed from Watchlist');
            setUserLog(null);
          } else {
            await supabase.from('movie_logs').update({ watch_status: null }).eq('id', existing.id);
            toast.success('Removed from Watchlist');
            setUserLog(prev => prev ? { ...prev, watch_status: null } : null);
          }
        } else {
          await supabase.from('movie_logs').update({ watch_status: 'to-watch' }).eq('id', existing.id);
          toast.success('Added to Watchlist');
          setUserLog(prev => prev ? { ...prev, watch_status: 'to-watch' } : null);
        }
      } else {
        const { data: newLog, error } = await supabase
          .from('movie_logs')
          .insert({
            user_id: user.id,
            tmdb_id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            watch_status: 'to-watch',
          })
          .select().single();
        if (error) throw error;
        toast.success('Added to Watchlist');
        setUserLog(newLog);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      toast.error('Failed to update watchlist');
    }
  };

  const handleShareMovie = async () => {
    const payload = buildMovieSharePayload({
      title: movie?.title,
      year: movie?.release_date?.split('-')[0] || null,
      rating: userLog?.rating,
      moods: userLog?.moods || [],
      tmdbId: movie?.id,
    });
    const result = await executeShare(payload);
    if (result.status === 'shared') {
      toast.success('Shared successfully.');
      return;
    }
    if (result.status === 'copied') {
      toast.success('Share link copied to clipboard.');
      return;
    }
    if (result.status === 'cancelled') {
      return;
    }
    toast.error('Could not share from this browser.');
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner-large"></div>
        <p>Loading movie details...</p>
      </div>
    );
  }

  // Ghost Hunter Fix - catches invalid IDs, empty data, or TMDB returning 200 OK with no data
  if (!movie || !movie.title) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-4xl font-creepster text-accent mb-4">Signal Lost</h2>
        <p className="text-text-muted mb-8 max-w-md">
          The archives have no record of this tape. It may have been corrupted, deleted, or it never existed at all.
        </p>
        <button 
          onClick={handleBack}
          className="btn-primary"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'original');
  const posterUrl = getPosterUrl(movie.poster_path, 'w500');
  const rtNumeric = rtScore ? parseInt(rtScore) : null;

  const crewList = movie.credits?.crew || [];
  const directors = pickDirectors(crewList);
  const writers = pickWriters(crewList);
  const heroPersonIds = new Set([...directors, ...writers].map((p) => p.id));
  const featuredCrew = pickFeaturedCrew(crewList, heroPersonIds);

  return (
    <>
      <div className="movie-detail-page">
        {/* Hero Section with Backdrop */}
        <div className="movie-hero">
          {backdropUrl ? (
            <div className="hero-backdrop pointer-events-none">
              <img src={backdropUrl} alt={movie.title} loading="lazy" />
              <div className="hero-overlay"></div>
            </div>
          ) : (
            <div className="hero-backdrop no-image">
              <div className="hero-overlay"></div>
            </div>
          )}
          
          <button className="back-nav-button" onClick={handleBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="hero-content">
            <div className="hero-poster">
              {posterUrl ? (
                <img src={posterUrl} alt={movie.title} loading="lazy" />
              ) : (
                <div className="no-poster">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="hero-info">
              <h1 className="movie-title">{movie.title}</h1>
              <p className="movie-tagline">{movie.tagline}</p>
              
              <div className="movie-meta">
                <span className="meta-item">
                  {movie.release_date?.split('-')[0]}
                </span>
                <span className="meta-divider">•</span>
                <span className="meta-item">
                  {movie.runtime} min
                </span>
                <span className="meta-divider">•</span>
                <span className="meta-item">
                  {movie.certification || 'NR'}
                </span>
              </div>

              <div className="scores-row">
                <div className="score-block tmdb">
                  <span className="score-label">TMDB</span>
                  <div className="score-value">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {movie.vote_average?.toFixed(1)}
                  </div>
                </div>
                
                {rtScore !== null && (
                  <div className={`score-block rt ${rtNumeric >= 75 ? 'fresh' : rtNumeric >= 60 ? 'rotten' : 'splatted'}`}>
                    <span className="score-label">Rotten Tomatoes</span>
                    <div className="score-value rt-score">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8 2 4 6 4 10c0 5 4 10 8 12 4-2 8-7 8-12 0-4-4-8-8-8z" />
                      </svg>
                      {rtScore}
                    </div>
                  </div>
                )}
              </div>

              <div className="genres-row">
                {movie.genres?.map((genre) => (
                  <span key={genre.id} className="genre-chip">{genre.name}</span>
                ))}
              </div>

              {(directors.length > 0 || writers.length > 0) && (
                <div className="crew-hero-lines">
                  {directors.length > 0 && (
                    <p className="crew-hero-row">
                      <span className="crew-hero-label">Directed by</span>
                      {directors.map((person, index) => (
                        <span key={person.id}>
                          {index > 0 && ', '}
                          <Link to={`/actor/${person.id}`} className="crew-hero-link">
                            {person.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                  {writers.length > 0 && (
                    <p className="crew-hero-row">
                      <span className="crew-hero-label">Written by</span>
                      {writers.map((person, index) => (
                        <span key={person.id}>
                          {index > 0 && ', '}
                          <Link to={`/actor/${person.id}`} className="crew-hero-link">
                            {person.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              )}

              {/* Where to Watch Section */}
              {watchProviders && (
                <div className="watch-providers-section">
                  <h3 className="watch-section-title">Where to Watch</h3>
                  <div className="watch-providers-row">
                    {/* Priority 1: Free Streaming (flatrate) - deduplicated by provider name */}
                    {watchProviders.flatrate && watchProviders.flatrate.length > 0 ? (
                      Array.from(
                        new Map(watchProviders.flatrate.map(p => [p.provider_name, p])).values()
                      ).map((provider) => (
                        <div
                          key={provider.provider_id}
                          className="provider-logo-wrapper"
                          title={`Stream on ${provider.provider_name}`}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name}
                            loading="lazy"
                            className="provider-logo"
                          />
                          <span className="provider-tooltip">{provider.provider_name}</span>
                        </div>
                      ))
                    ) : (
                      /* Fallback: Rent & Buy options if no free streaming - deduplicated */
                      <>
                        {watchProviders.rent && watchProviders.rent.length > 0 && (
                          Array.from(
                            new Map(watchProviders.rent.slice(0, 4).map(p => [p.provider_name, p])).values()
                          ).map((provider) => (
                            <div
                              key={provider.provider_id}
                              className="provider-logo-wrapper rent"
                              title={`Rent on ${provider.provider_name}`}
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                alt={provider.provider_name}
                                loading="lazy"
                                className="provider-logo"
                              />
                              <span className="provider-tooltip">{provider.provider_name} (Rent)</span>
                            </div>
                          ))
                        )}
                        {watchProviders.buy && watchProviders.buy.length > 0 && (
                          Array.from(
                            new Map(watchProviders.buy.slice(0, 4).map(p => [p.provider_name, p])).values()
                          ).map((provider) => (
                            <div
                              key={provider.provider_id}
                              className="provider-logo-wrapper buy"
                              title={`Buy on ${provider.provider_name}`}
                            >
                              <img
                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                alt={provider.provider_name}
                                loading="lazy"
                                className="provider-logo"
                              />
                              <span className="provider-tooltip">{provider.provider_name} (Buy)</span>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons - Three Button Layout */}
              <div className="movie-actions">
                {/* Watchlist Button (Eye Icon) */}
                <button
                  className={`watchlist-btn ${userLog?.watch_status === 'to-watch' ? 'active' : ''}`}
                  onClick={handleToggleWatchlist}
                  title={userLog?.watch_status === 'to-watch' ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{userLog?.watch_status === 'to-watch' ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                {/* Log Movie Button (Primary) */}
                <button className="log-movie-btn-primary" onClick={handleLogMovie}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>{userLog ? 'Edit Log' : 'Log Movie'}</span>
                </button>

                {/* Add to List Button (Folder Icon) */}
                <AddToListButton
                  movie={{ tmdb_id: movie.id, title: movie.title, poster_path: movie.poster_path }}
                  className="add-to-list-detail"
                />

                {/* Share Button */}
                <button
                  className="share-movie-btn"
                  onClick={handleShareMovie}
                  title="Share movie"
                  aria-label={`Share ${movie.title}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
                  </svg>
                  <span className="share-btn-text">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Review Section - User's Personal Log (Above Overview) */}
        {userLog && (
          <section className="detail-section dark-section">
            <div className="section-content">
              <h2 className="section-title">My Review</h2>
              <div className="user-review-card">
                <div className="user-review-header">
                  {userLog.rating && (
                    <div className="user-review-rating">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>{userLog.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {userLog.watch_status && (
                    <span className={`status-badge ${userLog.watch_status === 'watched' ? 'watched' : 'to-watch'}`}>
                      {userLog.watch_status === 'watched' ? '✓ Watched' : '○ Want to Watch'}
                    </span>
                  )}
                </div>
                {userLog.moods && userLog.moods.length > 0 && (
                  <div className="user-review-moods">
                    {userLog.moods.map((mood) => {
                      const category = MOOD_CATEGORIES[mood] || 'vibe';
                      return (
                        <span key={mood} className={`mood-chip ${MOOD_COLORS[category]}`}>
                          {mood}
                        </span>
                      );
                    })}
                  </div>
                )}
                {userLog.review && (
                  <div className="user-review-text">
                    <p>"{userLog.review}"</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Overview Section */}
        {movie.overview && (
          <section className="detail-section dark-section">
            <div className="section-content">
              <h2 className="section-title">Overview</h2>
              <p className="overview-text">{movie.overview}</p>
            </div>
          </section>
        )}

        {/* Cast Section */}
        {movie.credits?.cast?.length > 0 && (
          <section className="detail-section dark-section">
            <div className="section-content">
              <h2 className="section-title">Cast</h2>
              <div className="cast-grid">
                {movie.credits.cast.slice(0, 10).map((actor) => (
                  <Link
                    key={actor.id}
                    to={`/actor/${actor.id}`}
                    className="cast-card-link"
                  >
                    <div className="cast-card">
                      <div className="cast-image">
                        {getProfileUrl(actor.profile_path) ? (
                          <img src={getProfileUrl(actor.profile_path)} alt={actor.name} loading="lazy" />
                        ) : (
                          <div className="no-cast-image" />
                        )}
                      </div>
                      <p className="cast-name">{actor.name}</p>
                      <p className="cast-character">{actor.character}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {featuredCrew.length > 0 && (
          <section className="detail-section dark-section">
            <div className="section-content">
              <h2 className="section-title">Behind the camera</h2>
              <p className="crew-section-subtitle">Director of photography, editing, music, and design</p>
              <div className="cast-grid">
                {featuredCrew.map((person) => (
                  <Link
                    key={`${person.id}-${person.job}`}
                    to={`/actor/${person.id}`}
                    className="cast-card-link"
                  >
                    <div className="cast-card">
                      <div className="cast-image">
                        {getProfileUrl(person.profile_path) ? (
                          <img src={getProfileUrl(person.profile_path)} alt={person.name} loading="lazy" />
                        ) : (
                          <div className="no-cast-image" />
                        )}
                      </div>
                      <p className="cast-name">{person.name}</p>
                      <p className="cast-character">{person.job}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <section className="detail-section dark-section">
            <div className="section-content">
              <h2 className="section-title">Recommendations</h2>
              <div className="recommendations-grid">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rec-card"
                    onClick={() => handleMovieClick(rec.id)}
                  >
                    <div className="rec-poster">
                      {getPosterUrl(rec.poster_path) ? (
                        <img src={getPosterUrl(rec.poster_path)} alt={rec.title} loading="lazy" />
                      ) : (
                        <div className="no-poster-small">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="rec-title">{rec.title}</p>
                    <div className="rec-meta">
                      <span>{rec.release_date?.split('-')[0]}</span>
                      <span className="rec-vote">★ {rec.vote_average?.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {showLogModal && (
        <LogMovieModal
          movie={movie}
          existingLog={editingLog}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </>
  );
}

export default MovieDetail;
