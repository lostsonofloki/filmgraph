import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { getSupabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import {
  isUsernameAvailable,
  isValidUsername,
  normalizeUsername,
} from "../api/usernames";
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
} from "recharts";
import "./ProfilePage.css";
import { TOP_STREAMING_PROVIDERS_US } from "../constants/streamingProviders";

const GENRE_COLORS = [
  "#f97316", // Orange
  "#ea580c", // Orange Dark
  "#c2410c", // Orange Deeper
  "#9a3412", // Orange Darkest
  "#fdba74", // Orange Light
  "#fb923c", // Orange Lighter
  "#eab308", // Yellow
  "#ca8a04", // Yellow Dark
];

const MOOD_COLORS = {
  emotional: "#f87171",
  vibe: "#c084fc",
  intellectual: "#94a3b8",
};

const MOOD_CATEGORIES = {
  bittersweet: "emotional",
  heartwarming: "emotional",
  tearjerker: "emotional",
  uplifting: "emotional",
  bleak: "emotional",
  atmospheric: "vibe",
  dark: "vibe",
  gritty: "vibe",
  neon: "vibe",
  tense: "vibe",
  whimsical: "vibe",
  gory: "vibe",
  eerie: "vibe",
  claustrophobic: "vibe",
  campy: "vibe",
  dread: "vibe",
  "jump-scary": "vibe",
  psychological: "intellectual",
  mindbending: "intellectual",
  challenging: "intellectual",
  philosophical: "intellectual",
  slowburn: "intellectual",
  complex: "intellectual",
};

function ProfilePage() {
  const { user, updateUser, logout } = useUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [friends, setFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [stats, setStats] = useState({
    moviesWatched: 0,
    watchedThisYear: 0,
    reviewsWritten: 0,
    daysLogged: 0,
    totalWatched: 0,
    avgRating: 0,
    hoursWatched: 0,
    physicalOwned: 0,
  });
  const [ratingsData, setRatingsData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userProviders, setUserProviders] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("profiles")
          .select("display_name, username, bio, avatar_url, user_providers")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.username) setUsername(data.username);
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.bio) setBio(data.bio);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (Array.isArray(data?.user_providers)) {
          setUserProviders(data.user_providers);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const supabase = getSupabase();
        const { data: movieLogs } = await supabase
          .from("movie_logs")
          .select("*")
          .eq("user_id", user.id);

        if (movieLogs) {
          const watched = movieLogs.filter(
            (m) => m.watch_status === "watched" || !m.watch_status,
          ).length;
          const reviews = movieLogs.filter(
            (m) => m.review && m.review.trim(),
          ).length;
          const uniqueDays = new Set(
            movieLogs.map(
              (m) => new Date(m.created_at).toISOString().split("T")[0],
            ),
          ).size;

          const watchedMovies = movieLogs.filter(
            (m) => m.watch_status === "watched" && m.rating !== null,
          );
          const moviesWithRatings = watchedMovies.filter((m) => m.rating);
          const avg =
            moviesWithRatings.length > 0
              ? moviesWithRatings.reduce((sum, m) => sum + m.rating, 0) /
                moviesWithRatings.length
              : 0;

          // Estimate hours (avg movie = 1.5 hours)
          const hoursWatched = Math.round(watched * 1.5);
          const physicalOwned = movieLogs.filter((m) => !!m.source_upc).length;
          const currentYear = new Date().getFullYear();
          const watchedThisYear = movieLogs.filter((m) => {
            const dateSource = m.watched_at || m.created_at;
            if (!dateSource) return false;
            return new Date(dateSource).getFullYear() === currentYear;
          }).length;

          const ratingCounts = {};
          watchedMovies.forEach((movie) => {
            if (movie.rating) {
              const ratingKey = movie.rating.toFixed(1);
              ratingCounts[ratingKey] = (ratingCounts[ratingKey] || 0) + 1;
            }
          });

          const ratingsArray = Object.entries(ratingCounts)
            .map(([rating, count]) => ({ rating, count }))
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

          const genreCounts = {};
          watchedMovies.forEach((movie) => {
            if (movie.genres && Array.isArray(movie.genres)) {
              movie.genres.forEach((genre) => {
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

          // Calculate total for percentage
          const totalGenres = genreArray.reduce((sum, g) => sum + g.value, 0);

          // Add percentage to genre names for legend display
          const genreDataWithPercent = genreArray.map((genre) => ({
            ...genre,
            name: `${genre.name} (${Math.round((genre.value / totalGenres) * 100)}%)`,
          }));

          const moodCounts = {};
          Object.keys(MOOD_CATEGORIES).forEach((mood) => {
            moodCounts[mood] = 0;
          });
          watchedMovies.forEach((movie) => {
            if (movie.moods && Array.isArray(movie.moods)) {
              movie.moods.forEach((mood) => {
                if (moodCounts[mood] !== undefined) {
                  moodCounts[mood]++;
                }
              });
            }
          });

          const moodArray = Object.entries(moodCounts)
            .map(([mood, count]) => {
              const category = MOOD_CATEGORIES[mood] || "vibe";
              return {
                name:
                  mood.charAt(0).toUpperCase() +
                  mood.slice(1).replace("-", " "),
                value: count,
                color: MOOD_COLORS[category],
                category,
              };
            })
            .sort((a, b) => b.value - a.value);

          setStats({
            moviesWatched: watched,
            watchedThisYear,
            reviewsWritten: reviews,
            daysLogged: uniqueDays,
            totalWatched: watchedMovies.length,
            avgRating: avg.toFixed(1),
            hoursWatched,
            physicalOwned,
          });
          setRatingsData(ratingsArray);
          setGenreData(genreDataWithPercent);
          setMoodData(moodArray);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user?.id]);

  // Fetch friends for Social Hub
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingFriends(true);
        const supabase = getSupabase();

        // Fetch accepted friendships where user is sender
        const { data: sent, error: sentError } = await supabase
          .from("friendships")
          .select(
            `
            id,
            receiver_id,
            profiles:receiver_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `,
          )
          .eq("sender_id", user.id)
          .eq("status", "accepted");

        // Fetch accepted friendships where user is receiver
        const { data: received, error: receivedError } = await supabase
          .from("friendships")
          .select(
            `
            id,
            sender_id,
            profiles:sender_id (
              id,
              username,
              display_name,
              avatar_url
            )
          `,
          )
          .eq("receiver_id", user.id)
          .eq("status", "accepted");

        if (sentError) throw sentError;
        if (receivedError) throw receivedError;

        // Combine both arrays and extract friend profiles
        const allFriends = [
          ...(sent || []).map((f) => f.profiles),
          ...(received || []).map((f) => f.profiles),
        ];

        setFriends(allFriends);
      } catch (err) {
        console.error("Error fetching friends:", err);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user?.id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be less than 5MB");
      return;
    }
    setIsUploading(true);
    setUploadError("");
    try {
      const supabase = getSupabase();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      setAvatarUrl(publicUrl);
      setSuccess("Avatar updated successfully!");
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setUploadError(err.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError(
        "Username must be 3-24 chars: lowercase letters, numbers, underscore.",
      );
      return;
    }
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const supabase = getSupabase();
      if (normalizedUsername !== (user?.username || "").toLowerCase()) {
        const { data: available, error: usernameError } =
          await isUsernameAvailable(normalizedUsername, user.id);
        if (usernameError) throw usernameError;
        if (!available) throw new Error("That username is already taken.");
      }
      await updateUser({
        username: normalizedUsername,
        display_name: displayName.trim(),
      });
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        username: normalizedUsername,
        display_name: displayName.trim(),
        bio: bio || null,
        user_providers: userProviders,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      setSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(user?.username || "");
    setDisplayName(user?.username || "");
    setBio("");
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const toggleProviderPreference = (providerId) => {
    setUserProviders((prev) =>
      prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId],
    );
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <label className="profile-avatar-wrapper" htmlFor="avatar-upload">
            <div
              className={`profile-avatar-large ${avatarUrl ? "has-avatar" : ""}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile avatar" />
              ) : (
                <span>
                  {(user?.username || user?.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="avatar-upload-overlay">
              {isUploading ? (
                <div className="uploading-spinner"></div>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
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
            style={{ display: "none" }}
          />

          {!isEditing ? (
            <>
              <div className="profile-info">
                <h1>{user?.username || "User"}</h1>
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
                <button className="logout-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="your_username"
                  disabled={isSaving}
                />
              </div>
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
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}
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
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Social Hub Section */}
        <div className="social-hub-section">
          <div className="social-hub-header">
            <h2 className="social-hub-title font-creepster">Streaming Preferences</h2>
          </div>
          <p className="profile-email" style={{ marginBottom: "10px" }}>
            Pick services you currently have. Oracle uses this to guide recommendations.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TOP_STREAMING_PROVIDERS_US.map((provider) => {
              const active = userProviders.includes(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => toggleProviderPreference(provider.id)}
                  className="edit-profile-btn"
                  style={{
                    padding: "8px 12px",
                    opacity: active ? 1 : 0.65,
                    border: active ? "1px solid #fb923c" : "1px solid transparent",
                  }}
                >
                  {provider.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Social Hub Section */}
        <div className="social-hub-section">
          <div className="social-hub-header">
            <h2 className="social-hub-title font-creepster">
              <svg
                className="social-hub-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              Social Hub
            </h2>
            <Link to="/matchmaker" className="manage-friends-btn">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Manage Friends
            </Link>
          </div>

          {isLoadingFriends ? (
            <div className="social-hub-loading">
              <div className="loading-spinner"></div>
              <p>Loading your friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="social-connect-card">
              <div className="social-connect-content">
                <div className="social-connect-icon">🤝</div>
                <div className="social-connect-text">
                  <h3 className="social-connect-title">
                    How does your taste stack up?
                  </h3>
                  <p className="social-connect-subtitle">
                    Connect with a partner to see your Synergy Score and
                    discover The Great Debates.
                  </p>
                </div>
              </div>
              <Link to="/matchmaker" className="social-connect-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Connect with Friends
              </Link>
            </div>
          ) : (
            <div className="friends-carousel">
              <div className="friends-scroll">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    to={`/matchmaker/${friend.id}`}
                    className="friend-chip"
                  >
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.display_name || friend.username}
                        className="friend-avatar"
                      />
                    ) : (
                      <div className="friend-avatar-placeholder">
                        {(friend.display_name || friend.username)
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <span className="friend-name">
                      {friend.display_name || friend.username}
                    </span>
                    <span className="friend-match-score">
                      {Math.floor(Math.random() * 30 + 70)}% Match
                    </span>
                  </Link>
                ))}
                <Link to="/matchmaker" className="friend-chip add-friend-chip">
                  <div className="add-friend-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                  </div>
                  <span className="friend-name">Add Friend</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? "..." : stats.moviesWatched}
            </span>
            <span className="stat-label">Total Films</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? "..." : stats.watchedThisYear}
            </span>
            <span className="stat-label">Watched This Year</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? "..." : stats.avgRating}
            </span>
            <span className="stat-label">Average Rating</span>
          </div>
        </div>

        <div className="secondary-stats-grid">
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? "..." : stats.daysLogged}
            </span>
            <span className="stat-label">Days Logged</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {isLoading ? "..." : stats.physicalOwned}
            </span>
            <span className="stat-label">Physical Owned</span>
          </div>
        </div>

        {/* Movie Insights */}
        <div className="movie-insights-section">
          <h2 className="insights-title">Movie Insights</h2>

          {isLoading ? (
            <div className="insights-loading">
              <div className="loading-spinner"></div>
              <p>Loading your movie insights...</p>
            </div>
          ) : stats.totalWatched === 0 ? (
            <div className="insights-empty">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M16 4v16M8 8v12M12 12v8M4 20h16" />
              </svg>
              <h3>No watched movies yet</h3>
              <p>Start logging movies to see your insights!</p>
            </div>
          ) : (
            <div className="insights-grid">
              {/* Total Watched */}
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

              {/* Top Genres */}
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
                        label={false}
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
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          borderRadius: "8px",
                          color: "#ffffff",
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: "20px",
                          color: "#888888",
                          fontSize: "12px",
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
                      <XAxis dataKey="rating" stroke="#888888" fontSize={11} />
                      <YAxis
                        stroke="#888888"
                        fontSize={11}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          borderRadius: "8px",
                          color: "#ffffff",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
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
                          backgroundColor: "#1a1a1a",
                          border: "1px solid #2a2a2a",
                          borderRadius: "8px",
                          color: "#ffffff",
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

        {/* Account Settings */}
        <div className="account-settings-section">
          <h2 className="insights-title">Account Settings</h2>
          <div className="settings-container">
            {/* Email Row */}
            <div className="setting-row">
              <div className="setting-icon-wrapper mail-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-label">Email Address</div>
                <div className="setting-value">{user?.email}</div>
              </div>
              <div className="setting-action">
                <span className="setting-readonly">Verified</span>
              </div>
            </div>

            {/* Password Row */}
            <div className="setting-row">
              <div className="setting-icon-wrapper shield-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-label">Password</div>
                <div className="setting-value">Change your password</div>
              </div>
              <button
                className="setting-action-link"
                onClick={() => navigate("/update-password")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Danger Zone Divider */}
            <div className="danger-zone-divider">
              <span>Danger Zone</span>
            </div>

            {/* Logout Row */}
            <div className="setting-row danger-row">
              <div className="setting-icon-wrapper danger-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-label danger-label">Sign Out</div>
                <div className="setting-value danger-value">
                  Log out of your account
                </div>
              </div>
              <button
                className="setting-action-btn danger-btn"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
