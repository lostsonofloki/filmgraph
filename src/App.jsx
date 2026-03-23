import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
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
import './App.css';

function Header() {
  const { user, isAuthenticated, logout } = useUser();

  const handleLogout = async () => {
    await logout();
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

        {/* Center: Search */}
        <div className="header-center">
          <GlobalSearch />
        </div>

        {/* Right: Navigation */}
        <div className="header-right">
          <Link to="/" className="nav-link">Trending</Link>
          <Link to="/library" className="nav-link">My Library</Link>
          <Link to="/history" className="nav-link">History</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="nav-link nav-username">
                {user?.username}
              </Link>
              <button onClick={handleLogout} className="nav-logout">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Header />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<TrendingMovies />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/actor/:id" element={<ActorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
