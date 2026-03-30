import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { getSupabase } from '../supabaseClient';
import { getPosterUrl } from '../api/tmdb';
import './SynergyDashboard.css';

/**
 * SynergyDashboard - Compare movie tastes with a friend
 * Shows compatibility score, shared watchlist, and genre overlap
 */
function SynergyDashboard() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const toast = useToast();
  
  const [friend, setFriend] = useState(null);
  const [synergyData, setSynergyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, shared, genres

  useEffect(() => {
    if (friendId && user?.id) {
      fetchSynergyData();
    }
  }, [friendId, user?.id]);

  const fetchSynergyData = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();

      // Fetch friend info
      const { data: friendData, error: friendError } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', friendId)
        .single();

      if (friendError) throw friendError;
      setFriend(friendData);

      // Fetch both users' movie logs
      const { data: myLogs, error: myLogsError } = await supabase
        .from('movie_logs')
        .select('tmdb_id, title, poster_path, rating, genres, watch_status')
        .eq('user_id', user.id);

      const { data: friendLogs, error: friendLogsError } = await supabase
        .from('movie_logs')
        .select('tmdb_id, title, poster_path, rating, genres, watch_status')
        .eq('user_id', friendId);

      if (myLogsError) throw myLogsError;
      if (friendLogsError) throw friendLogsError;

      // Calculate synergy metrics
      const synergy = calculateSynergy(myLogs || [], friendLogs || []);
      setSynergyData(synergy);
    } catch (err) {
      console.error('Error fetching synergy data:', err);
      toast.error('Failed to load compatibility data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate compatibility metrics between two users
   */
  const calculateSynergy = (myLogs, friendLogs) => {
    // Create maps for quick lookup
    const myMoviesMap = new Map(myLogs.map(m => [m.tmdb_id, m]));
    const friendMoviesMap = new Map(friendLogs.map(m => [m.tmdb_id, m]));

    // Find shared movies (both have watched and rated)
    const sharedMovies = [];
    myLogs.forEach(myMovie => {
      const friendMovie = friendMoviesMap.get(myMovie.tmdb_id);
      if (friendMovie && myMovie.rating && friendMovie.rating) {
        sharedMovies.push({
          tmdb_id: myMovie.tmdb_id,
          title: myMovie.title,
          poster_path: myMovie.poster_path,
          myRating: myMovie.rating,
          theirRating: friendMovie.rating,
          difference: Math.abs(myMovie.rating - friendMovie.rating),
        });
      }
    });

    // Find shared watchlist (both want to watch)
    const myWatchlist = new Set(
      myLogs.filter(m => m.watch_status === 'to-watch').map(m => m.tmdb_id)
    );
    const theirWatchlist = new Set(
      friendLogs.filter(m => m.watch_status === 'to-watch').map(m => m.tmdb_id)
    );
    
    const sharedWatchlist = [];
    const seenTmdbIds = new Set();
    
    myLogs.forEach(myMovie => {
      if (myWatchlist.has(myMovie.tmdb_id) && theirWatchlist.has(myMovie.tmdb_id)) {
        if (!seenTmdbIds.has(myMovie.tmdb_id)) {
          sharedWatchlist.push({
            tmdb_id: myMovie.tmdb_id,
            title: myMovie.title,
            poster_path: myMovie.poster_path,
          });
          seenTmdbIds.add(myMovie.tmdb_id);
        }
      }
    });

    // Calculate genre overlap
    const myGenres = {};
    const friendGenres = {};
    
    myLogs.forEach(movie => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => {
          myGenres[genre] = (myGenres[genre] || 0) + 1;
        });
      }
    });
    
    friendLogs.forEach(movie => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => {
          friendGenres[genre] = (friendGenres[genre] || 0) + 1;
        });
      }
    });

    // Find shared top genres
    const sharedGenres = [];
    Object.keys(myGenres).forEach(genre => {
      if (friendGenres[genre]) {
        sharedGenres.push({
          genre,
          myCount: myGenres[genre],
          theirCount: friendGenres[genre],
          total: myGenres[genre] + friendGenres[genre],
        });
      }
    });
    sharedGenres.sort((a, b) => b.total - a.total);

    // Calculate compatibility score (0-100%)
    let compatibilityScore = 50; // Base score
    
    // Factor 1: Rating agreement on shared movies (max +25%)
    if (sharedMovies.length > 0) {
      const avgDifference = sharedMovies.reduce((sum, m) => sum + m.difference, 0) / sharedMovies.length;
      const agreementScore = Math.max(0, (5 - avgDifference) / 5) * 25;
      compatibilityScore += agreementScore;
    }
    
    // Factor 2: Shared watchlist overlap (max +15%)
    const watchlistOverlap = sharedWatchlist.length / Math.max(myWatchlist.size, theirWatchlist.size, 1);
    compatibilityScore += watchlistOverlap * 15;
    
    // Factor 3: Genre similarity (max +10%)
    const genreOverlap = sharedGenres.length / Math.max(Object.keys(myGenres).length, Object.keys(friendGenres).length, 1);
    compatibilityScore += genreOverlap * 10;

    // Cap at 100%
    compatibilityScore = Math.min(100, Math.round(compatibilityScore));

    // Find "The Great Debates" - movies with 2+ point rating difference
    const greatDebates = sharedMovies
      .filter(m => m.difference >= 2.0)
      .sort((a, b) => b.difference - a.difference);

    return {
      compatibilityScore,
      sharedMovies,
      sharedWatchlist,
      sharedGenres: sharedGenres.slice(0, 5), // Top 5
      greatDebates,
      myTotalMovies: myLogs.length,
      theirTotalMovies: friendLogs.length,
    };
  };

  if (isLoading) {
    return (
      <div className="synergy-dashboard">
        <div className="synergy-loading">
          <div className="loading-spinner"></div>
          <p>Calculating compatibility...</p>
        </div>
      </div>
    );
  }

  if (!synergyData || !friend) {
    return (
      <div className="synergy-dashboard">
        <div className="synergy-error">
          <h2>Unable to Load Data</h2>
          <p>Could not fetch compatibility information.</p>
          <button className="back-btn" onClick={() => navigate('/matchmaker')}>
            Back to Matchmaker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="synergy-dashboard">
      <div className="synergy-container">
        {/* Header */}
        <div className="synergy-header">
          <button className="back-nav-btn" onClick={() => navigate('/matchmaker')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="synergy-title-section">
            <h1 className="synergy-title font-creepster">Compatibility Report</h1>
            <p className="synergy-subtitle">
              You & {friend.display_name || friend.username}
            </p>
          </div>
        </div>

        {/* Compatibility Score Card */}
        <div className="compatibility-card">
          <div className="score-circle">
            <div className="score-fill" style={{ '--score': synergyData.compatibilityScore }}>
              <span className="score-percentage">{synergyData.compatibilityScore}%</span>
            </div>
          </div>
          <div className="score-label">Taste Match</div>
          {synergyData.compatibilityScore >= 75 ? (
            <div className="score-badge high">🎬 Movie Twins</div>
          ) : synergyData.compatibilityScore >= 50 ? (
            <div className="score-badge medium">👍 Good Vibes</div>
          ) : (
            <div className="score-badge low">🎭 Different Strokes</div>
          )}
        </div>

        {/* Tabs */}
        <div className="synergy-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            Shared Watchlist ({synergyData.sharedWatchlist.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'genres' ? 'active' : ''}`}
            onClick={() => setActiveTab('genres')}
          >
            Genre Overlap
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Stats Grid */}
            <div className="synergy-stats-grid">
              <div className="synergy-stat-card">
                <div className="stat-value">{synergyData.sharedMovies.length}</div>
                <div className="stat-label">Movies Both Watched</div>
              </div>
              <div className="synergy-stat-card">
                <div className="stat-value">{synergyData.sharedWatchlist.length}</div>
                <div className="stat-label">Shared Watchlist</div>
              </div>
              <div className="synergy-stat-card">
                <div className="stat-value">{synergyData.sharedGenres.length}</div>
                <div className="stat-label">Shared Genres</div>
              </div>
            </div>

            {/* The Great Debates */}
            {synergyData.greatDebates.length > 0 && (
              <div className="great-debates-section">
                <h2 className="section-title">
                  <span className="debate-icon">⚡</span>
                  The Great Debates
                </h2>
                <p className="section-description">
                  Movies where your ratings differed by 2+ points
                </p>
                <div className="debates-list">
                  {synergyData.greatDebates.slice(0, 5).map((debate) => (
                    <div key={debate.tmdb_id} className="debate-card">
                      {debate.poster_path && (
                        <img
                          src={getPosterUrl(debate.poster_path, 'w185')}
                          alt={debate.title}
                          className="debate-poster"
                        />
                      )}
                      <div className="debate-info">
                        <div className="debate-title">{debate.title}</div>
                        <div className="debate-ratings">
                          <span className="my-rating">You: {debate.myRating.toFixed(1)}★</span>
                          <span className="vs">vs</span>
                          <span className="their-rating">
                            {friend.display_name || friend.username}: {debate.theirRating.toFixed(1)}★
                          </span>
                        </div>
                        <div className="debate-difference">
                          Difference: {debate.difference.toFixed(1)} points
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'shared' && (
          <div className="shared-content">
            {synergyData.sharedWatchlist.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3>No Shared Watchlist</h3>
                <p>You don't have any movies you both want to watch yet.</p>
              </div>
            ) : (
              <div className="shared-watchlist-grid">
                {synergyData.sharedWatchlist.map((movie) => (
                  <div key={movie.tmdb_id} className="shared-movie-card">
                    {movie.poster_path ? (
                      <img
                        src={getPosterUrl(movie.poster_path, 'w342')}
                        alt={movie.title}
                        className="shared-poster"
                      />
                    ) : (
                      <div className="no-poster">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="shared-title">{movie.title}</div>
                    <button className="add-to-watchlist-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add to List
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'genres' && (
          <div className="genres-content">
            {synergyData.sharedGenres.length === 0 ? (
              <div className="empty-state">
                <h3>No Genre Overlap</h3>
                <p>You haven't watched any movies in the same genres yet.</p>
              </div>
            ) : (
              <div className="genre-bars">
                {synergyData.sharedGenres.map((sharedGenre) => (
                  <div key={sharedGenre.genre} className="genre-bar-container">
                    <div className="genre-label">{sharedGenre.genre}</div>
                    <div className="genre-bar-wrapper">
                      <div className="genre-bar-segment my-segment" style={{ width: `${(sharedGenre.myCount / sharedGenre.total) * 100}%` }}>
                        <span className="bar-label">You: {sharedGenre.myCount}</span>
                      </div>
                      <div className="genre-bar-segment their-segment" style={{ width: `${(sharedGenre.theirCount / sharedGenre.total) * 100}%` }}>
                        <span className="bar-label">{friend.display_name || friend.username}: {sharedGenre.theirCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SynergyDashboard;
