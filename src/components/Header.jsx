import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import IgnesLogo from './IgnesLogo';
import './Header.css';

/**
 * Header Component
 * Clean navigation layout with branding on left, user controls on right
 */
function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useUser();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState('');

  const isActive = (path) => location.pathname === path;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Trim whitespace from search query
    const cleanQuery = tempSearch.trim();
    
    // Reject empty queries - prevent searching whitespace
    if (!cleanQuery) {
      setTempSearch('');
      return;
    }
    
    navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
    setTempSearch('');
    setIsSearchVisible(false);
    setIsMobileMenuOpen(false);
  };

  const closeSearch = () => {
    setIsSearchVisible(false);
    setTempSearch('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* LEFT: Branding & Core Nav */}
        <div className="header-left">
          {/* Mobile: Toggle between Logo and Search */}
          <div className="mobile-logo-search">
            {!isSearchVisible ? (
              <Link to="/" className="logo-link" onClick={closeSearch}>
                <IgnesLogo size={28} />
                <span className="logo-text">IGNES</span>
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="mobile-search-form">
                <input
                  type="text"
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  placeholder="Search movies..."
                  autoFocus
                  className="mobile-search-input"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="close-search-btn"
                  aria-label="Close search"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Desktop: Always show Logo + Nav */}
          <Link to="/" className="desktop-logo" onClick={closeSearch}>
            <IgnesLogo size={28} />
            <span className="logo-text">IGNES</span>
          </Link>

          <nav className="desktop-nav">
            <Link to="/discover" className={`nav-link discover ${isActive('/discover') ? 'active' : ''}`}>Discover</Link>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Trending</Link>
            <Link to="/library" className={`nav-link ${isActive('/library') ? 'active' : ''}`}>Library</Link>
            <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>History</Link>
          </nav>
        </div>

        {/* RIGHT: Search & User Controls */}
        <div className="header-right">
          {/* Mobile: Search Icon + Hamburger */}
          <div className="mobile-controls">
            {!isSearchVisible && (
              <button
                onClick={() => setIsSearchVisible(true)}
                className="mobile-search-btn"
                aria-label="Search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-menu-btn"
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop: Search + Auth */}
          <div className="desktop-controls">
            <form onSubmit={handleSubmit} className="desktop-search-form">
              <input
                type="text"
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                placeholder="Search movies..."
                className="desktop-search-input"
              />
            </form>
            {isAuthenticated ? (
              <div className="user-controls">
                <Link to="/profile" className="username-link">{user?.username}</Link>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="login-btn">Login</Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <nav className="mobile-nav">
            <Link to="/discover" className={`mobile-nav-link discover ${isActive('/discover') ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Discover</Link>
            <Link to="/" className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Trending</Link>
            <Link to="/library" className={`mobile-nav-link ${isActive('/library') ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Library</Link>
            <Link to="/history" className={`mobile-nav-link ${isActive('/history') ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>History</Link>

            {isAuthenticated ? (
              <div className="mobile-auth">
                <Link to="/profile" className="mobile-username" onClick={() => setIsMobileMenuOpen(false)}>👤 {user?.username}</Link>
                <button onClick={handleLogout} className="mobile-logout">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="mobile-login-btn" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
