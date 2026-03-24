import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import { getMovieRecommendations, analyzeMoodPatterns, verifyRecommendation } from '../utils/gemini';
import { useNavigate } from 'react-router-dom';
import LogMovieModal from '../components/LogMovieModal';
import SearchBar from '../components/SearchBar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import './ProfilePage.css';

// Genre color palette - vibrant, modern colors
const GENRE_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#f472b6', // Pink
];

// Mood category colors
const MOOD_COLORS = {
  emotional: '#f87171',
  vibe: '#c084fc',
  intellectual: '#94a3b8',
};

// Mood categories mapping
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
 * Profile Page with integrated Movie Insights and Avatar Upload
 */
function ProfilePage() {
  const { user, updateUser, logout } = useUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // AI Settings state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isAiToggling, setIsAiToggling] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [isGettingRecs, setIsGettingRecs] = useState(false);
  const [aiMoodAnalysis, setAiMoodAnalysis] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState({});
  const [movieToLog, setMovieToLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState({});
  const [isBypassingCache, setIsBypassingCache] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    moviesWatched: 0,
    reviewsWritten: 0,
    daysLogged: 0,
    totalWatched: 0,
    avgRating: 0,
  });
  const [ratingsData, setRatingsData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('profiles')
          .select('display_name, bio, avatar_url, ai_enabled')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.bio) {
          setBio(data.bio);
        }
        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
        if (data?.ai_enabled !== undefined) {
          setAiEnabled(data.ai_enabled);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Fetch all stats and movie data
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      
      try {
        const supabase = getSupabase();
        const { data: movieLogs } = await supabase
          .from('movie_logs')
          .select('*')
          .eq('user_id', user.id);

        if (movieLogs) {
          // Basic stats
          const watched = movieLogs.filter(m => m.watch_status === 'watched' || !m.watch_status).length;
          const reviews = movieLogs.filter(m => m.review && m.review.trim()).length;
          const uniqueDays = new Set(movieLogs.map(m => 
            new Date(m.created_at).toISOString().split('T')[0]
          )).size;

          // Filter watched movies with ratings for detailed stats
          const watchedMovies = movieLogs.filter(m => m.watch_status === 'watched' && m.rating !== null);
          
          // Average rating
          const moviesWithRatings = watchedMovies.filter(m => m.rating);
          const avg = moviesWithRatings.length > 0
            ? moviesWithRatings.reduce((sum, m) => sum + m.rating, 0) / moviesWithRatings.length
            : 0;

          // Ratings distribution
          const ratingCounts = {};
          watchedMovies.forEach(movie => {
            if (movie.rating) {
              const ratingKey = movie.rating.toFixed(1);
              ratingCounts[ratingKey] = (ratingCounts[ratingKey] || 0) + 1;
            }
          });

          const ratingsArray = Object.entries(ratingCounts)
            .map(([rating, count]) => ({ rating, count }))
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

          // Genre breakdown (Top 10)
          const genreCounts = {};
          watchedMovies.forEach(movie => {
            if (movie.genres && Array.isArray(movie.genres)) {
              movie.genres.forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
              });
            }
          });

          const genreArray = Object.entries(genreCounts)
            .map(([genre, count], index) => ({
              name: genre,
              value: count,
              color: GENRE_COLORS[index % GENRE_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

          // Mood breakdown - Include ALL 22 moods (even with 0 count)
          const moodCounts = {};
          // Initialize all moods with 0
          Object.keys(MOOD_CATEGORIES).forEach(mood => {
            moodCounts[mood] = 0;
          });
          // Count actual mood usage
          watchedMovies.forEach(movie => {
            if (movie.moods && Array.isArray(movie.moods)) {
              movie.moods.forEach(mood => {
                if (moodCounts[mood] !== undefined) {
                  moodCounts[mood]++;
                }
              });
            }
          });

          const moodArray = Object.entries(moodCounts)
            .map(([mood, count]) => {
              const category = MOOD_CATEGORIES[mood] || 'vibe';
              return {
                name: mood.charAt(0).toUpperCase() + mood.slice(1).replace('-', ' '),
                value: count,
                color: MOOD_COLORS[category],
                category,
              };
            })
            .sort((a, b) => b.value - a.value);

          setStats({
            moviesWatched: watched,
            reviewsWritten: reviews,
            daysLogged: uniqueDays,
            totalWatched: watchedMovies.length,
            avgRating: avg.toFixed(1),
          });
          setRatingsData(ratingsArray);
          setGenreData(genreArray);
          setMoodData(moodArray);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  // Handle AI toggle
  const handleAiToggle = async () => {
    setIsAiToggling(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ai_enabled: !aiEnabled,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAiEnabled(!aiEnabled);
      setSuccess(aiEnabled ? 'AI discovery disabled.' : 'AI discovery enabled! Ignes will now analyze your moods for recommendations.');
      
      // Clear AI data when disabled
      if (aiEnabled) {
        setAiRecommendations(null);
        setAiMoodAnalysis(null);
      }
    } catch (err) {
      console.error('Error toggling AI:', err);
      setError('Failed to update AI settings');
    } finally {
      setIsAiToggling(false);
    }
  };

  // Get AI recommendations with TMDB verification
  const handleGetRecommendations = async (bypassCache = false) => {
    // Prevent infinite loop - only load once per session unless explicitly refreshed
    if (!aiEnabled || hasLoadedRecommendations) return;
    
    if (bypassCache) {
      setIsBypassingCache(true);
    }
    setIsGettingRecs(true);
    setAiRecommendations(null);
    setError('');
    setFeedbackGiven({});
    setIsVerifying(true);

    try {
      const supabase = getSupabase();

      // Fetch user's TOP 10 highest-rated watched movies
      const { data: watchedMovies, error: fetchError } = await supabase
        .from('movie_logs')
        .select('title, tmdb_id, moods, rating')
        .eq('user_id', user.id)
        .eq('watch_status', 'watched')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(10);

      if (fetchError) {
        throw new Error('Failed to fetch watch history: ' + fetchError.message);
      }

      if (!watchedMovies || watchedMovies.length === 0) {
        setError('You need to log some watched movies first!');
        setIsGettingRecs(false);
        setIsBypassingCache(false);
        setIsVerifying(false);
        return;
      }

      // Fetch user's TOP 5 most recent to-watch additions
      const { data: recentToWatch } = await supabase
        .from('movie_logs')
        .select('title, tmdb_id')
        .eq('user_id', user.id)
        .eq('watch_status', 'to-watch')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch ALL movies in user's library (for exclusion list)
      const { data: libraryMovies } = await supabase
        .from('movie_logs')
        .select('tmdb_id')
        .eq('user_id', user.id)
        .not('tmdb_id', 'is', null);

      const libraryIds = libraryMovies
        ? libraryMovies.map(m => m.tmdb_id).filter(Boolean)
        : [];

      console.log('Library IDs to exclude:', libraryIds.length);

      // Get favorite moods from watched movies
      const moodCounts = {};
      watchedMovies.forEach(m => {
        if (m.moods) {
          m.moods.forEach(mood => {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
          });
        }
      });

      const favoriteMoods = Object.entries(moodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([mood]) => mood);

      // Fetch banished movies (thumbs-down feedback) - THE BANISH LIST
      const { data: feedbackData } = await supabase
        .from('recommendation_feedback')
        .select('tmdb_id')
        .eq('user_id', user.id)
        .eq('is_liked', false);

      const banishedIds = feedbackData
        ? feedbackData.filter(f => f.tmdb_id).map(f => f.tmdb_id)
        : [];

      console.log('Banished IDs:', banishedIds);

      // Call Gemini AI with caching and library exclusion
      const { recommendations, fromCache } = await getMovieRecommendations({
        topRatedMovies: watchedMovies,
        recentToWatch: recentToWatch || [],
        favoriteMoods,
        banishedIds,
        libraryIds,
        supabase,
        userId: user.id,
        bypassCache,
      });

      console.log(`Recommendations ${fromCache ? 'from cache' : 'generated'}:`, recommendations);

      // VERIFY each recommendation against TMDB to get real IDs
      // Wrap each verification in try/catch to prevent crashes
      const verifiedRecommendations = await Promise.all(
        recommendations.map(async (rec, index) => {
          try {
            // Try to verify with TMDB
            const verified = await verifyRecommendation(rec.title, rec.year.toString());
            
            if (verified) {
              console.log(`✅ Verified: ${rec.title}`);
              return { ...rec, ...verified };
            }
            
            // If not found by exact match, try without year
            console.log(`⚠️ "${rec.title}" not found with year ${rec.year}, trying without year...`);
            const verifiedNoYear = await verifyRecommendation(rec.title, '');
            
            if (verifiedNoYear) {
              console.log(`✅ Verified (no year): ${rec.title}`);
              return { ...rec, ...verifiedNoYear };
            }
            
            // Fallback: Create a placeholder with just the AI data
            console.log(`⚠️ "${rec.title}" not found in TMDB, using AI data only`);
            return {
              ...rec,
              tmdb_id: null,
              poster_path: null,
              backdrop_path: null,
              verified: false,
            };
          } catch (err) {
            console.warn(`❌ Failed to verify "${rec.title}":`, err.message);
            // Return with AI data only on error
            return {
              ...rec,
              tmdb_id: null,
              poster_path: null,
              backdrop_path: null,
              verified: false,
            };
          }
        })
      );

      // Filter out ONLY completely null entries (keep fallbacks)
      const validRecommendations = verifiedRecommendations.filter(r => r !== null);

      console.log('Final recommendations:', validRecommendations);
      console.log(`Showing ${validRecommendations.length} of ${recommendations.length} requested`);
      
      // Update state ONCE with the entire verified array
      setAiRecommendations(validRecommendations);
      setSuccess(fromCache ? 'From the Vault archives...' : `The Oracle has spoken! ${validRecommendations.length} picks.`);
      
      // Mark as loaded to prevent infinite loop
      setHasLoadedRecommendations(true);
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError(err.message || 'The Oracle is silent. Please try again.');
    } finally {
      setIsGettingRecs(false);
      setIsBypassingCache(false);
      setIsVerifying(false);
    }
  };

  // Refresh recommendations (force bypass cache)
  const handleRefreshRecommendations = () => {
    setHasLoadedRecommendations(false); // Reset gate
    handleGetRecommendations(true);
  };

  // Clear AI cache when library changes
  const clearAiCache = async () => {
    try {
      const supabase = getSupabase();
      await supabase
        .from('ai_cache')
        .delete()
        .eq('user_id', user.id)
        .eq('cache_type', 'discovery');
      console.log('💾 AI cache cleared');
    } catch (err) {
      console.error('Error clearing AI cache:', err);
    }
  };

  // Get AI mood analysis
  const handleGetMoodAnalysis = async () => {
    if (!aiEnabled) return;
    
    setIsGettingRecs(true);
    setError('');
    
    try {
      const supabase = getSupabase();
      
      const { data: movieLogs, error: fetchError } = await supabase
        .from('movie_logs')
        .select('title, moods, rating, watch_status')
        .eq('user_id', user.id)
        .eq('watch_status', 'watched');
      
      if (fetchError) {
        throw new Error('Failed to fetch watch history: ' + fetchError.message);
      }
      
      if (!movieLogs || movieLogs.length === 0) {
        setError('You need to log some watched movies first!');
        setIsGettingRecs(false);
        return;
      }
      
      console.log('Getting mood analysis for:', movieLogs.length, 'movies');
      
      const analysis = await analyzeMoodPatterns(movieLogs);
      
      if (!analysis) {
        throw new Error('AI failed to analyze mood patterns');
      }
      
      console.log('Mood analysis:', analysis);
      setAiMoodAnalysis(analysis);
      setSuccess('Your horror palate analysis is ready!');
    } catch (err) {
      console.error('Error getting mood analysis:', err);
      setError(err.message || 'Failed to get mood analysis. Please try again.');
    } finally {
      setIsGettingRecs(false);
    }
  };

  // Handle recommendation feedback - INSTANT BANISHMENT
  const handleFeedback = async (index, title, tmdbId, isLiked) => {
    try {
      const supabase = getSupabase();
      
      // Save feedback to Supabase immediately
      const { error } = await supabase
        .from('recommendation_feedback')
        .insert({
          user_id: user.id,
          title: title,
          tmdb_id: tmdbId,
          is_liked: isLiked,
          created_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      // INSTANT UI REMOVAL for thumbs down
      if (!isLiked) {
        // Mark as disliked for fade animation
        setFeedbackGiven(prev => ({ ...prev, [index]: 'disliked' }));
        
        // Remove from recommendations after 300ms fade
        setTimeout(() => {
          setAiRecommendations(prev => prev.filter((_, i) => i !== index));
          setFeedbackGiven(prev => {
            const updated = { ...prev };
            delete updated[index];
            return updated;
          });
        }, 300);
      } else {
        // Thumbs up - just show message
        setFeedbackGiven(prev => ({ ...prev, [index]: 'shown' }));
        setTimeout(() => {
          setFeedbackGiven(prev => ({ ...prev, [index]: 'shown' }));
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving feedback:', err);
    }
  };

  // Add to watchlist
  const handleAddToWatchlist = async (index, recommendation) => {
    setIsAddingToWatchlist(prev => ({ ...prev, [index]: true }));
    
    try {
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('movie_logs')
        .insert({
          user_id: user.id,
          tmdb_id: recommendation.tmdb_id,
          title: recommendation.title,
          year: recommendation.year.toString(),
          watch_status: 'to-watch',
          created_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      // Show success and remove card
      setSuccess(`"${recommendation.title}" added to your watchlist!`);
      
      // Fade out and remove
      setTimeout(() => {
        setAiRecommendations(prev => prev.filter((_, i) => i !== index));
      }, 300);
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      setError('Failed to add to watchlist');
    } finally {
      setIsAddingToWatchlist(prev => ({ ...prev, [index]: false }));
    }
  };

  // Mark as watched - open log modal
  const handleMarkAsWatched = (recommendation) => {
    setMovieToLog({
      id: recommendation.tmdb_id,
      title: recommendation.title,
      release_date: `${recommendation.year}-01-01`,
    });
    setShowLogModal(true);
  };

  // Handle avatar file selection
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile with avatar URL
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      setSuccess('Avatar updated successfully!');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setUploadError(err.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const supabase = getSupabase();

      // Update auth metadata
      await updateUser({ username: displayName });

      // Upsert profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.username || '');
    setBio('');
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          {/* Clickable Avatar */}
          <label className="profile-avatar-wrapper" htmlFor="avatar-upload">
            <div className={`profile-avatar-large ${avatarUrl ? 'has-avatar' : ''}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" />
              ) : (
                <span>{(user?.username || user?.email || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="avatar-upload-overlay">
              {isUploading ? (
                <div className="uploading-spinner"></div>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Change</span>
                </>
              )}
            </div>
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={isUploading}
            style={{ display: 'none' }}
          />

          {!isEditing ? (
            <>
              <div className="profile-info">
                <h1>{user?.username || 'User'}</h1>
                <p className="profile-email">{user?.email}</p>
                {bio && <p className="profile-bio">{bio}</p>}
                {uploadError && <p className="upload-error">{uploadError}</p>}
                {success && <p className="upload-success">{success}</p>}
              </div>
              <div className="profile-actions">
                <button
                  className="edit-profile-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
                <button
                  className="logout-btn"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  disabled={isSaving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio (optional)</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  disabled={isSaving}
                />
              </div>

              {error && (
                <div className="form-error">{error}</div>
              )}
              {success && (
                <div className="form-success">{success}</div>
              )}

              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="profile-stats">
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? '...' : stats.moviesWatched}
            </span>
            <span className="stat-label">Movies Logged</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? '...' : stats.reviewsWritten}
            </span>
            <span className="stat-label">Reviews Written</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? '...' : stats.daysLogged}
            </span>
            <span className="stat-label">Days Logged</span>
          </div>
        </div>

        {/* AI Settings Section */}
        <div className="ai-settings-section">
          <div className="ai-settings-header">
            <h2 className="ai-settings-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
              AI Discovery
            </h2>
            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={handleAiToggle}
                disabled={isAiToggling}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <p className="ai-settings-description">
            When enabled, Ignes uses Gemini AI to analyze your moods and suggest your next watch.
            Your data is never used for training.
          </p>
          
          {/* Search Bar */}
          <div className="search-bar-wrapper">
            <SearchBar
              onSearch={(query) => {
                navigate(`/search?q=${encodeURIComponent(query)}`);
              }}
              isLoading={isGettingRecs}
            />
          </div>
          
          {aiEnabled ? (
            <>
              <div className="ai-enabled-badge">
                <span className="badge-dot"></span>
                AI Discovery Active
              </div>
              <div className="ai-actions">
                <button
                  className="ai-action-btn"
                  onClick={handleGetRecommendations}
                  disabled={isGettingRecs || stats.totalWatched === 0}
                >
                  {isGettingRecs ? (
                    <><span className="loading-dots"></span> Ignite Discovery...</>
                  ) : '🔥 Ignite Discovery'}
                </button>
                <button
                  className="ai-action-btn secondary"
                  onClick={handleGetMoodAnalysis}
                  disabled={isGettingRecs || stats.totalWatched === 0}
                >
                  {isGettingRecs ? (
                    <><span className="loading-dots"></span> Analyzing Taste...</>
                  ) : '🧠 Stoke the Embers'}
                </button>
              </div>
              {stats.totalWatched === 0 && (
                <p className="ai-notice">Log some movies first to get recommendations!</p>
              )}
              {isVerifying && (
                <p className="verifying-tmdb">
                  <span className="loading-dots"></span> Verifying with TMDB...
                </p>
              )}
            </>
          ) : (
            <p className="ai-disabled-notice">Enable AI Discovery to unlock personalized recommendations</p>
          )}
          
          {/* AI Recommendations Display */}
          {aiEnabled && aiRecommendations && (
            <div className="ai-recommendations">
              <div className="ai-recommendations-header">
                <h3 className="ai-section-title">🎬 The Oracle's Picks</h3>
                <button
                  className="ai-refresh-btn"
                  onClick={handleRefreshRecommendations}
                  disabled={isGettingRecs}
                  title="Get fresh recommendations (bypass cache)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isGettingRecs ? 'spinning' : ''}>
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </button>
              </div>
              {isBypassingCache && (
                <p className="consulting-oracle">
                  <span className="loading-dots"></span> Ignite Discovery...
                </p>
              )}
              {isVerifying && (
                <p className="verifying-tmdb">
                  <span className="loading-dots"></span> Verifying with TMDB...
                </p>
              )}
              <div className="ai-recommendations-list">
                {aiRecommendations.map((rec, index) => (
                  <div
                    key={`${rec.tmdb_id || 'ai'}-${index}`}
                    className={`ai-rec-card ${feedbackGiven[index] === 'disliked' ? 'disliked' : ''}`}
                    onClick={() => rec.tmdb_id && navigate(`/movie/${rec.tmdb_id}`)}
                    style={{ cursor: rec.tmdb_id ? 'pointer' : 'default' }}
                  >
                    <div className="ai-rec-poster">
                      {rec.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${rec.poster_path}`} alt={rec.title} />
                      ) : (
                        <div className="no-poster">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                      {!rec.verified && (
                        <span className="ai-unverified-badge">AI Pick</span>
                      )}
                    </div>
                    <div className="ai-rec-content">
                      <div className="ai-rec-header">
                        <span className="ai-rec-title">{rec.title}</span>
                        <span className="ai-rec-year">{rec.year}</span>
                      </div>
                      <p className="ai-rec-vibe">{rec.vibeCheck}</p>
                    </div>
                    {feedbackGiven[index] === 'shown' ? (
                      <p className="vault-remembers">The Vault remembers...</p>
                    ) : (
                      <div className="ai-rec-actions">
                        <div className="ai-rec-feedback">
                          <button
                            className="feedback-btn feedback-up"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFeedback(index, rec.title, rec.tmdb_id, true);
                            }}
                            title="The Vault approves"
                            disabled={isAddingToWatchlist[index]}
                          >
                            👍
                          </button>
                          <button
                            className="feedback-btn feedback-down"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFeedback(index, rec.title, rec.tmdb_id, false);
                            }}
                            title="The Vault rejects"
                            disabled={isAddingToWatchlist[index]}
                          >
                            👎
                          </button>
                        </div>
                        <div className="ai-rec-library-actions">
                          <button
                            className="library-btn library-btn-watchlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToWatchlist(index, rec);
                            }}
                            disabled={isAddingToWatchlist[index]}
                            title="Add to Watchlist"
                          >
                            {isAddingToWatchlist[index] ? (
                              <span className="loading-spinner-small"></span>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14"/>
                              </svg>
                            )}
                            <span>{isAddingToWatchlist[index] ? 'Adding...' : 'Watchlist'}</span>
                          </button>
                          <button
                            className="library-btn library-btn-watched"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsWatched(rec);
                            }}
                            disabled={isAddingToWatchlist[index]}
                            title="Mark as Watched"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <span>Watched</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Mood Analysis Display */}
          {aiMoodAnalysis && (
            <div className="ai-mood-analysis">
              <h3 className="ai-section-title">🧠 Your Cinematic Identity</h3>
              <div className="ai-analysis-grid">
                <div className="ai-analysis-card">
                  <span className="ai-analysis-label">Core Aesthetic</span>
                  <span className="ai-analysis-value">{aiMoodAnalysis.dominant_category}</span>
                </div>
                <div className="ai-analysis-card full-width">
                  <span className="ai-analysis-label">Your Cinematic Identity</span>
                  <p className="ai-analysis-text">{aiMoodAnalysis.horror_palate}</p>
                </div>
                <div className="ai-analysis-card full-width">
                  <span className="ai-analysis-label">Surprising Observation</span>
                  <p className="ai-analysis-text">{aiMoodAnalysis.surprising_observation}</p>
                </div>
                <div className="ai-analysis-card full-width curators-note">
                  <span className="ai-analysis-label">Curator's Note</span>
                  <p className="ai-analysis-text">{aiMoodAnalysis.curators_note}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Movie Insights Section */}
        <div className="movie-insights-section">
          <h2 className="insights-title">Movie Insights</h2>
          
          {isLoading ? (
            <div className="insights-loading">
              <div className="loading-spinner"></div>
              <p>Loading your movie insights...</p>
            </div>
          ) : stats.totalWatched === 0 ? (
            <div className="insights-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 4v16M8 8v12M12 12v8M4 20h16" />
              </svg>
              <h3>No watched movies yet</h3>
              <p>Start logging movies to see your insights!</p>
            </div>
          ) : (
            <div className="insights-grid">
              {/* Total Watched Counter */}
              <div className="insights-card insights-card-large total-watched-card">
                <h2 className="total-watched-label">Total Watched</h2>
                <div className="total-watched-number">{stats.totalWatched}</div>
                <p className="total-watched-subtitle">movies completed</p>
                {stats.avgRating && (
                  <div className="avg-rating">
                    <span className="rating-label">Average Rating:</span>
                    <span className="rating-value">{stats.avgRating}</span>
                  </div>
                )}
              </div>

              {/* Top Genres - Pie Chart */}
              <div className="insights-card insights-card-large">
                <h3 className="insights-card-title">Top Genres</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={genreData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: '20px',
                          color: '#888888'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ratings Distribution */}
              <div className="insights-card">
                <h3 className="insights-card-title">Ratings Distribution</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={ratingsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis
                        dataKey="rating"
                        stroke="#888888"
                        fontSize={11}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={11}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mood Breakdown */}
              <div className="insights-card">
                <h3 className="insights-card-title">Mood Breakdown</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={moodData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis
                        type="number"
                        stroke="#888888"
                        fontSize={11}
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#888888"
                        fontSize={11}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '8px',
                          color: '#ffffff'
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {moodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLogModal && movieToLog && (
        <LogMovieModal
          movie={movieToLog}
          existingLog={null}
          onClose={() => {
            setShowLogModal(false);
            setMovieToLog(null);
          }}
          onSaved={(savedLog) => {
            setShowLogModal(false);
            setMovieToLog(null);
            setSuccess(`"${savedLog.title}" logged to your library!`);
            // Refresh stats
            fetchStats();
            // Clear AI cache so new recommendations don't include this movie
            clearAiCache();
          }}
        />
      )}
    </div>
  );
}

export default ProfilePage;
