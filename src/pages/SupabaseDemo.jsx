import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import './SupabaseDemo.css';

/**
 * Supabase Demo Page
 * Shows how to insert movie logs into the database
 */
function SupabaseDemo() {
  const { user } = useUser();
  const [isInserting, setIsInserting] = useState(false);
  const [insertResult, setInsertResult] = useState(null);
  const [logs, setLogs] = useState([]);

  // Test movie data
  const testMovie = {
    title: 'The Shawshank Redemption',
    year: 1994,
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    tmdbId: 278,
    rating: 5,
    moods: ['inspired', 'thoughtful'],
    review: 'An incredible masterpiece about hope and friendship.',
  };

  /**
   * Insert a movie log into Supabase
   */
  const insertMovieLog = async () => {
    if (!user) {
      setInsertResult({ error: 'You must be logged in to log movies' });
      return;
    }

    setIsInserting(true);
    setInsertResult(null);

    try {
      const { data, error } = await supabase.from('movie_logs').insert({
        user_id: user.id,
        title: testMovie.title,
        year: testMovie.year,
        poster: testMovie.poster,
        tmdb_id: testMovie.tmdbId,
        rating: testMovie.rating,
        moods: testMovie.moods,
        review: testMovie.review,
      }).select();

      if (error) {
        throw error;
      }

      setInsertResult({ success: true, data });
      console.log('Movie logged successfully:', data);
    } catch (err) {
      setInsertResult({ error: err.message });
      console.error('Error inserting movie log:', err);
    } finally {
      setIsInserting(false);
    }
  };

  /**
   * Fetch user's movie logs
   */
  const fetchMovieLogs = async () => {
    if (!user) {
      setInsertResult({ error: 'You must be logged in to view logs' });
      return;
    }

    setIsInserting(true);

    try {
      const { data, error } = await supabase
        .from('movie_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLogs(data || []);
      setInsertResult({ success: true, message: `Fetched ${data.length} movie logs` });
    } catch (err) {
      setInsertResult({ error: err.message });
    } finally {
      setIsInserting(false);
    }
  };

  /**
   * Delete a movie log
   */
  const deleteMovieLog = async (id) => {
    try {
      const { error } = await supabase
        .from('movie_logs')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setLogs(logs.filter(log => log.id !== id));
    } catch (err) {
      console.error('Error deleting movie log:', err);
    }
  };

  return (
    <div className="supabase-demo">
      <h1>Supabase Integration Demo</h1>
      <p className="demo-subtitle">Learn how to use Supabase for authentication and database operations</p>

      {/* Authentication Status */}
      <section className="demo-section">
        <h2>Authentication Status</h2>
        <div className="demo-card">
          {user ? (
            <div className="auth-status authenticated">
              <div className="status-indicator success"></div>
              <div>
                <strong>Logged in as:</strong> {user.username}
                <br />
                <small>Email: {user.email}</small>
                <br />
                <small>User ID: {user.id}</small>
              </div>
            </div>
          ) : (
            <div className="auth-status not-authenticated">
              <div className="status-indicator error"></div>
              <div>
                <strong>Not logged in</strong>
                <br />
                <small>Please log in to test database operations</small>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Insert Movie Log */}
      <section className="demo-section">
        <h2>Insert Movie Log</h2>
        <div className="demo-card">
          <h3>Test Data</h3>
          <pre className="test-data">{JSON.stringify(testMovie, null, 2)}</pre>
          
          <button 
            className="action-button" 
            onClick={insertMovieLog}
            disabled={isInserting || !user}
          >
            {isInserting ? 'Inserting...' : 'Insert Movie Log'}
          </button>
          
          {!user && (
            <p className="hint">You must be logged in to insert data</p>
          )}

          {insertResult && (
            <div className={`result-message ${insertResult.error ? 'error' : 'success'}`}>
              {insertResult.error ? (
                <strong>Error:</strong>
              ) : (
                <strong>Success:</strong>
              )}{' '}
              {insertResult.error || insertResult.message || 'Movie logged successfully!'}
            </div>
          )}
        </div>
      </section>

      {/* Fetch Movie Logs */}
      <section className="demo-section">
        <h2>Your Movie Logs</h2>
        <button 
          className="action-button" 
          onClick={fetchMovieLogs}
          disabled={isInserting || !user}
        >
          {isInserting ? 'Loading...' : 'Fetch My Logs'}
        </button>

        {logs.length > 0 ? (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.id} className="log-card">
                <div className="log-info">
                  <h4>{log.title}</h4>
                  <p>{log.year} • Rating: {log.rating}/5</p>
                  {log.moods && log.moods.length > 0 && (
                    <p className="log-moods">Moods: {log.moods.join(', ')}</p>
                  )}
                  {log.review && <p className="log-review">{log.review}</p>}
                  <small className="log-date">
                    Logged: {new Date(log.created_at).toLocaleDateString()}
                  </small>
                </div>
                <button 
                  className="delete-button"
                  onClick={() => deleteMovieLog(log.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No movie logs yet. Click "Fetch My Logs" to load your data.</p>
        )}
      </section>

      {/* SQL Schema Reference */}
      <section className="demo-section">
        <h2>Database Schema</h2>
        <div className="demo-card code-example">
          <h3>Required Supabase Table: movie_logs</h3>
          <pre>{`-- Create the movie_logs table
CREATE TABLE movie_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER,
  poster TEXT,
  tmdb_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  moods TEXT[],
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE movie_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON movie_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to view their own logs
CREATE POLICY "Users can view their own logs"
  ON movie_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own logs
CREATE POLICY "Users can delete their own logs"
  ON movie_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policy for users to update their own logs
CREATE POLICY "Users can update their own logs"
  ON movie_logs
  FOR UPDATE
  USING (auth.uid() = user_id);`}</pre>
        </div>
      </section>

      {/* Code Example */}
      <section className="demo-section">
        <h2>Code Example</h2>
        <div className="demo-card code-example">
          <h3>How to insert data:</h3>
          <pre>{`import { supabase } from './supabaseClient';

// Insert a movie log
const logMovie = async (movieData, userId) => {
  const { data, error } = await supabase
    .from('movie_logs')
    .insert({
      user_id: userId,
      title: movieData.title,
      year: movieData.year,
      poster: movieData.poster,
      tmdb_id: movieData.tmdbId,
      rating: movieData.rating,
      moods: movieData.moods,
      review: movieData.review,
    })
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
};

// Fetch user's movie logs
const fetchLogs = async (userId) => {
  const { data, error } = await supabase
    .from('movie_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return data;
};`}</pre>
        </div>
      </section>
    </div>
  );
}

export default SupabaseDemo;
