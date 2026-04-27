import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import { ListProvider } from "./context/ListContext";
import { ToastProvider } from "./context/ToastContext";
import { Analytics } from "@vercel/analytics/react";
import FilmgraphLogo from "./components/FilmgraphLogo";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import SearchPage from "./pages/SearchPage";
import TrendingMovies from "./pages/TrendingMovies";
import MovieDetail from "./pages/MovieDetail";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LibraryPage from "./pages/LibraryPage";
import ProfilePage from "./pages/ProfilePage";
import WatchHistory from "./pages/WatchHistory";
import ActorPage from "./pages/ActorPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import AboutPage from "./pages/AboutPage";
import ChangelogPage from "./pages/ChangelogPage";
import BugList from "./components/BugList";
import DiscoveryPage from "./pages/DiscoveryPage";
import MatchmakerPage from "./pages/MatchmakerPage";
import SynergyDashboard from "./pages/SynergyDashboard";
import OracleAnalyticsPage from "./pages/OracleAnalyticsPage";
import { useState, useEffect } from "react";
import { flushQueuedMovieLogs } from "./utils/offlineQueue";
import { useInstallPrompt } from "./pwa/useInstallPrompt";
import "./App.css";

// ============================================
// HEADER - SOLID SEARCH SYSTEM (NO MORE BUGS)
// ============================================
function Header() {
  const { user, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [tempSearch, setTempSearch] = useState("");

  const handleLogout = async () => {
    await logout();
    setIsMobileMenuOpen(false);
  };

  // handleChange - ONLY updates local text. NO navigation.
  const handleChange = (e) => {
    setTempSearch(e.target.value);
  };

  // handleSubmit - ONLY place navigation happens
  const handleSubmit = (e) => {
    e.preventDefault();
    if (tempSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(tempSearch.trim())}`);
      setTempSearch("");
      setIsSearchVisible(false);
    }
  };

  const closeSearch = () => {
    setIsSearchVisible(false);
    setTempSearch("");
  };

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-full max-w-7xl items-center justify-between px-6 mx-auto">
        {/* LEFT: Logo OR Search Input */}
        <div className="flex items-center gap-2 flex-1">
          {/* Mobile: Toggle between Logo and Search */}
          <div className="md:hidden flex items-center flex-1">
            {!isSearchVisible ? (
              <Link to="/" className="flex items-center gap-2">
                <FilmgraphLogo size={28} />
                <span className="text-xl font-bold tracking-tighter text-white hover:opacity-80 ml-2">
                  FILMGRAPH
                </span>
              </Link>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 flex-1"
              >
                <input
                  type="text"
                  value={tempSearch}
                  onChange={handleChange}
                  placeholder="Search..."
                  autoFocus
                  className="w-full bg-zinc-900 text-zinc-200 border border-amber-500 rounded-md px-4 py-2 focus:outline-none focus:border-amber-600"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors p-1"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          {/* Desktop: Always show Logo */}
          <Link to="/" className="hidden md:flex items-center gap-2">
            <FilmgraphLogo size={28} />
            <span className="text-xl font-bold tracking-tighter text-white hover:opacity-80">
              FILMGRAPH
            </span>
          </Link>
        </div>

        {/* RIGHT: Search Icon + Hamburger (Mobile) / Nav + Search + Auth (Desktop) */}
        <div className="flex items-center gap-2">
          {/* Mobile: Search Icon + Hamburger */}
          <div className="md:hidden flex items-center">
            {!isSearchVisible && (
              <button
                onClick={() => setIsSearchVisible(true)}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Search"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop: Nav + Search + Auth */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-4">
              <Link
                to="/discover"
                className="text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
              >
                Discover
              </Link>
              <Link
                to="/"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Trending
              </Link>
              <Link
                to="/library"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Library
              </Link>
              <Link
                to="/history"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                History
              </Link>
            </nav>
            <div className="flex items-center gap-4 ml-auto">
              <form onSubmit={handleSubmit} className="flex items-center">
                <input
                  type="text"
                  value={tempSearch}
                  onChange={handleChange}
                  placeholder="Search..."
                  className="w-64 bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-md px-4 py-2 focus:outline-none focus:border-amber-500"
                />
                <button type="submit" className="hidden">
                  Search
                </button>
              </form>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400"
                  >
                    {user?.username}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-semibold text-white bg-zinc-800 px-4 py-1.5 rounded-full hover:bg-zinc-700 transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-zinc-950 px-6 py-4">
          <nav className="flex flex-col space-y-4">
            <Link
              to="/discover"
              className="text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors py-2"
            >
              Discover
            </Link>
            <Link
              to="/"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2"
            >
              Trending
            </Link>
            <Link
              to="/library"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2"
            >
              Library
            </Link>
            <Link
              to="/history"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2"
            >
              History
            </Link>
            {isAuthenticated ? (
              <div className="border-t border-white/5 pt-4 mt-2">
                <Link
                  to="/profile"
                  className="text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors py-2 block"
                >
                  👤 {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2 w-full"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-white bg-zinc-800 px-4 py-2 rounded-full hover:bg-zinc-700 transition-colors text-center"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

// ============================================
// APP CONTENT
// ============================================
function AppContent() {
  const location = useLocation();
  const isAuthPage = ["/login", "/register", "/update-password"].includes(
    location.pathname,
  );
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();

  return (
    <div className="app">
      {!isAuthPage && <Header />}
      {!isAuthPage && isInstallable && !isInstalled && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="rounded-lg border border-orange-500/30 bg-zinc-900/95 p-3 text-sm text-zinc-200">
            <div className="flex items-center justify-between gap-3">
              <p>
                Install Filmgraph for a faster app-like experience and better
                offline access.
              </p>
              <button
                type="button"
                onClick={promptInstall}
                className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-orange-400"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="app-main">
        <div className="main-content">
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/admin/bugs" element={<BugList />} />
            <Route
              path="/admin/oracle-analytics"
              element={<OracleAnalyticsPage />}
            />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <DiscoveryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matchmaker"
              element={
                <ProtectedRoute>
                  <MatchmakerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matchmaker/:friendId"
              element={
                <ProtectedRoute>
                  <SynergyDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ============================================
// APP ROOT
// ============================================
function App() {
  useEffect(() => {
    const flushPendingLogs = async () => {
      try {
        await flushQueuedMovieLogs();
      } catch (_error) {
        // Ignore; queue will retry on next online event.
      }
    };

    window.addEventListener("online", flushPendingLogs);
    flushPendingLogs();
    return () => window.removeEventListener("online", flushPendingLogs);
  }, []);

  return (
    <Router>
      <UserProvider>
        <ListProvider>
          <ToastProvider>
            <AppContent />
            <Analytics />
          </ToastProvider>
        </ListProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
