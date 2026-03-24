import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Logo from './components/Logo';
import IgnesLogo from './components/IgnesLogo';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalSearch from './components/GlobalSearch';
import SearchPage from './pages/SearchPage';
import TrendingMovies from './pages/TrendingMovies';
import MovieDetail from './pages/MovieDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LibraryPage from './pages/LibraryPage';
import ProfilePage from './pages/ProfilePage';
import WatchHistory from './pages/WatchHistory';
import ActorPage from './pages/ActorPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import { useState } from 'react';
import './App.css';

function Header() {
  const { user, isAuthenticated, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // PROOF OF LIFE ALERT
  if (typeof window !== 'undefined') {
    window.alert('IGNES HEADER DEPLOYED');
  }

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left: Ignes Logo */}
        <div className="header-left">
          <Link to="/" className="logo">
            <IgnesLogo size={40} showText={true} />
          </Link>
        </div>

        {/* Center: Search (Desktop) */}
        <div className="header-center">
          <GlobalSearch />
        </div>

        {/* Right: Search Icon (Mobile) + Hamburger */}
        <div className="header-right">
          {/* Mobile Search Toggle */}
          <button className="search-toggle-btn" onClick={toggleSearch} aria-label="Toggle search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          {/* Hamburger Menu Button */}
          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Search Bar (Expands) */}
        <div className={`mobile-search-bar ${isSearchOpen ? 'search-open' : ''}`}>
          <GlobalSearch />
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      <div className={`mobile-menu ${isMenuOpen ? 'menu-open' : ''}`}>
        <div className="mobile-menu-content">
          <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Trending</Link>
          <Link to="/library" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>My Library</Link>
          <Link to="/history" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>History</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                {user?.username}
              </Link>
              <button onClick={handleLogout} className="mobile-logout-btn">Logout</button>
            </>
          ) : (
            <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const location = useLocation();
  
  // Hide header on auth pages
  const isAuthPage = ['/login', '/register', '/update-password'].includes(location.pathname);

  return (
    <div className="app">
      {!isAuthPage && <Header />}

      <main className="app-main">
        <Routes>
          <Route path="/" element={<TrendingMovies />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/actor/:id" element={<ActorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/history" element={<WatchHistory />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}

export default App;
