import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
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
import './StatsDashboard.css';

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

function StatsDashboard() {
  const { user, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const [ratingsData, setRatingsData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [moodData, setMoodData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMovies, setTotalMovies] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) {
      setTotalMovies(0);
      setAvgRating(0);
      setRatingsData([]);
      setGenreData([]);
      setMoodData([]);
      return;
    }

    // FILTER: Only include watched movies (has rating and watch_status === 'watched')
    const watchedMovies = data.filter(m => m.watch_status === 'watched' && m.rating !== null);

    // Total watched movies
    setTotalMovies(watchedMovies.length);

    // Average rating (only from watched movies)
    const moviesWithRatings = watchedMovies.filter(m => m.rating);
    const avg = moviesWithRatings.length > 0
      ? moviesWithRatings.reduce((sum, m) => sum + m.rating, 0) / moviesWithRatings.length
      : 0;
    setAvgRating(avg.toFixed(1));

    // Ratings distribution (5.0, 4.5, 4.0, etc.)
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

    setRatingsData(ratingsArray);

    // Genre breakdown (Top Genres) - only from watched movies
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
      .slice(0, 10); // Top 10 genres

    setGenreData(genreArray);

    // Mood breakdown - only from watched movies
    const moodCounts = {};
    watchedMovies.forEach(movie => {
      if (movie.moods && Array.isArray(movie.moods)) {
        movie.moods.forEach(mood => {
          moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
      }
    });

    const moodArray = Object.entries(moodCounts)
      .map(([mood, count]) => {
        const category = MOOD_CATEGORIES[mood] || 'vibe';
        return {
          name: mood.charAt(0).toUpperCase() + mood.slice(1),
          value: count,
          color: MOOD_COLORS[category],
          category,
        };
      })
      .sort((a, b) => b.value - a.value);

    setMoodData(moodArray);
  }, []);

  const fetchMovies = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      calculateStats(data);
    } catch (err) {
      console.error('Error fetching movies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, calculateStats]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      navigate('/login');
      return;
    }

    fetchMovies();
  }, [user, isAuthenticated, navigate, fetchMovies]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="stats-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-dashboard">
      <div className="stats-header">
        <h1>Your Stats</h1>
        <p className="stats-subtitle">
          Average rating: {avgRating}
        </p>
      </div>

      {totalMovies === 0 ? (
        <div className="stats-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M16 4v16M8 8v12M12 12v8M4 20h16" />
          </svg>
          <h2>No stats yet</h2>
          <p>Start logging movies to see your statistics!</p>
          <button onClick={() => navigate('/')} className="browse-btn">
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="stats-grid">
          {/* Total Watched Counter */}
          <div className="stats-card stats-card-large total-watched-card">
            <h2 className="total-watched-label">Total Watched</h2>
            <div className="total-watched-number">{totalMovies}</div>
            <p className="total-watched-subtitle">movies logged</p>
          </div>

          {/* Top Genres - Centerpiece Pie Chart */}
          <div className="stats-card stats-card-large">
            <h2 className="card-title">Top Genres</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
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
          <div className="stats-card">
            <h2 className="card-title">Ratings Distribution</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ratingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis 
                    dataKey="rating" 
                    stroke="#888888"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#888888"
                    fontSize={12}
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

          {/* Mood Breakdown - Horizontal Bar Chart */}
          <div className="stats-card">
            <h2 className="card-title">Mood Breakdown</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={moodData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis 
                    type="number" 
                    stroke="#888888"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    stroke="#888888"
                    fontSize={12}
                    width={100}
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
  );
}

export default StatsDashboard;
