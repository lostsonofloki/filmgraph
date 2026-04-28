import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSupabase } from '../supabaseClient';
import './LoginPage.css';

/**
 * Login Page Component
 * Features Remember Me checkbox with dynamic storage persistence
 */
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to true (localStorage)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { login } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/profile';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      // Login with rememberMe preference
      // - rememberMe = true → localStorage (persists across browser closes)
      // - rememberMe = false → sessionStorage (cleared when tab closes)
      await login(email, password, rememberMe);

      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (!resetEmail) {
        throw new Error('Please enter your email address');
      }

      const supabase = getSupabase();
      const redirectUrl = `${window.location.origin}/update-password`;

      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      setSuccess(
        'Check your email for the Filmgraph reset link. If you do not see it in a minute, check your spam or promotions folder.',
      );
      setResetEmail('');
      setShowResetForm(false);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to access your movie library</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
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
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {!showResetForm ? (
              <>
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
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                </div>

                {/* Remember Me Checkbox - Deep Ember Theme */}
                <div className="flex items-center gap-2 mb-4">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded accent-amber-500 cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-sm text-zinc-400 cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="button-loading">
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="reset-email" className="form-label">
                    Enter your email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                  <p className="reset-helper-text">
                    Reset emails can land in spam or promotions on first send.
                  </p>
                </div>

                <button
                  type="submit"
                  className="reset-button"
                  disabled={isSubmitting}
                  onClick={handleResetPassword}
                >
                  {isSubmitting ? (
                    <span className="button-loading">
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                      <span className="loading-dot"></span>
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="forgot-password-row">
                  <button
                    type="button"
                    className="back-to-login-btn"
                    onClick={() => {
                      setShowResetForm(false);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    ← Back to Login
                  </button>
                </div>
              </>
            )}
          </form>

          <div className="forgot-password-link-row">
            <button
              type="button"
              className="forgot-password-text-btn"
              onClick={() => setShowResetForm(true)}
            >
              Forgot Password?
            </button>
          </div>

          <p className="login-footer">
            Don't have an account?{' '}
            <Link to="/register" className="login-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
