import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { isUsernameAvailable, isValidUsername, normalizeUsername } from '../api/usernames';
import './RegisterPage.css';

/**
 * Register Page Component
 * Allows users to sign up with email and password
 */
function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email || !username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError('Username must be 3-24 chars: lowercase letters, numbers, underscore.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check if Supabase is configured
    if (!supabase) {
      setError('Supabase is not configured. Check console for details.');
      console.error('Supabase client is null - check .env file and restart dev server');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Attempting sign up with email:', email);

      const { data: available, error: usernameCheckError } = await isUsernameAvailable(normalizedUsername);
      if (usernameCheckError) {
        throw usernameCheckError;
      }
      if (!available) {
        setError('That username is already taken.');
        return;
      }
      
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: normalizedUsername,
          },
        },
      });

      console.log('Sign up response:', { data, error: signUpError });

      if (signUpError) {
        console.error('Supabase sign up error:', signUpError);
        
        // Provide helpful error messages based on error type
        if (signUpError.message.includes('Invalid API key')) {
          setError('Invalid Supabase API key. Check your .env file and restart the dev server. Open console for details.');
        } else if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists');
        } else if (signUpError.message.includes('Invalid email')) {
          setError('Please enter a valid email address');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          username: normalizedUsername,
          display_name: normalizedUsername,
          updated_at: new Date().toISOString(),
        });
        if (profileError) {
          throw profileError;
        }
        setSuccess(
          'Account created! Please check your email to confirm your account. If you do not see it in a minute, check your spam or promotions folder.',
        );
        setEmail('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">Create your account</h1>
            <p className="register-subtitle">Start logging your favorite movies</p>
          </div>

          <form className="register-form" onSubmit={handleSignUp}>
            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <circle cx="12" cy="16" r="0.5" fill="currentColor" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
              />
              <p className="signup-helper-text">
                Confirmation emails can land in spam or promotions on first send.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="register-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="button-loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="register-footer">
            Already have an account?{' '}
            <a href="/login" className="register-link">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
