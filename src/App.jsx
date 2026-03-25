import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { ListProvider } from './context/ListContext';
import { ToastProvider } from './context/ToastContext';
import IgnesLogo from './components/IgnesLogo';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
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
import AboutPage from './pages/AboutPage';
import ChangelogPage from './pages/ChangelogPage';
import BugList from './components/BugList';
import DiscoveryPage from './pages/DiscoveryPage';
import { useState } from 'react';
import './App.css';

console.log('--- APP IS USING THE NEW CODE ---');

const VIBE_MAP = {
  dark: [80, 53],
  comedy: [35],
  funny: [35],
  hilarious: [35],
  scary: [27],
  horror: [27],
  terrifying: [27],
  spooky: [27],
  action: [28],
  adrenaline: [28],
  explosive: [28],
  'sci-fi': [878],
  science: [878],
  space: [878],
  futuristic: [878],
  alien: [878],
  romance: [10749],
  love: [10749],
  romantic: [10749],
  drama: [18],
  emotional: [18],
  sad: [18],
  thriller: [53],
  suspense: [53],
  tense: [53],
  mystery: [9648],
  crime: [80],
  detective: [80],
  fantasy: [14],
  magic: [14],
  adventure: [12],
  epic: [12],
  animation: [16],
  animated: [16],
  family: [10751],
  kids: [10751],
  documentary: [99],
  war: [10752],
  western: [37],
  music: [10402],
  musical: [10402, 35],
  'brain mush': [35, 10751],
  'mind-bending': [878, 9648, 53],
  'cozy': [10751, 16, 35],
  'deep cuts': [18, 99],
  noir: [80, 53],
  euphoric: [35, 10749],
  'sick day': [16, 10751, 35],
};

function parseVibe(input) {
  const lowerInput = input.toLowerCase();
  const genres = new Set();
  const multiWordKeys = ['brain mush', 'mind-bending', 'deep cuts', 'sick day', 'sci-fi'];
  multiWordKeys.forEach((key) => {
    if (lowerInput.includes(key)) {
      VIBE_MAP[key].forEach((id) => genres.add(id));
    }
  });
  Object.keys(VIBE_MAP).forEach((key) => {
    if (key.includes(' ') || key.includes('-')) return;
    if (lowerInput.includes(key)) {
      VIBE_MAP[key].forEach((id) => genres.add(id));
    }
  });
  return Array.from(genres);
}

// ============================================
// ORACLE OVERLAY
// ============================================
function OracleOverlay({ isOpen, onClose, onOracleSearch }) {
  const [vibeInput, setVibeInput] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    if (vibeInput.trim()) {
      onOracleSearch(vibeInput.trim());
      setVibeInput('');
      onClose();
    }
  };
  const handleQuickMood = (mood) => {
    onOracleSearch(mood);
    onClose();
  };
  const moods = [
    { label: 'Brain Mush', icon: '🥴', desc: 'Light comedies' },
    { label: 'Adrenaline', icon: '🍿', desc: 'High energy' },
    { label: 'Mind-Bending', icon: '🧠', desc: 'Complex sci-fi' },
    { label: 'Sick Day', icon: '🤒', desc: 'Cozy comfort' },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="border-b border-white/5 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🔮</span>
              <div>
                <h2 className="text-xl font-bold text-orange-500">The Oracle</h2>
                <p className="text-xs text-zinc-500">Tell me your vibe</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="mb-6">
            <input
              type="text"
              value={vibeInput}
              onChange={(e) => setVibeInput(e.target.value)}
              placeholder='Tell the Oracle your vibe (e.g., "A dark comedy for a rainy night")'
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-5 py-4 text-lg text-zinc-200 placeholder-zinc-500 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
              autoFocus
            />
            <p className="mt-2 text-xs text-zinc-500">Press Enter to search</p>
          </form>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Quick Start</p>
            <div className="grid grid-cols-2 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() => handleQuickMood(mood.label)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-white/5 bg-zinc-900/50 p-4 text-left transition-all hover:scale-[1.02] hover:border-orange-500/30 hover:bg-zinc-900"
                >
                  <span className="text-2xl">{mood.icon}</span>
                  <span className="font-bold text-sm text-zinc-300">{mood.label}</span>
                  <span className="text-xs text-zinc-500">{mood.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 bg-zinc-900/30 p-4 text-center">
          <button onClick={onClose} className="text-xs font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">Close [Esc]</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HEADER - CONTROLLED INPUT, NAVIGATION ONLY IN SUBMIT
// ============================================
function Header({ onOracleClick }) {
  const { user, isAuthenticated, logout } = useUser();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState('');

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
      setTempSearch('');
      if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-full max-w-7xl items-center justify-between px-6 mx-auto">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2">
          <IgnesLogo size={28} />
          <span className="text-xl font-bold tracking-tighter text-white hover:opacity-80">IGNES</span>
        </Link>

        {/* Right: Nav + Search + Auth (Desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-4">
            <Link to="/discover" className="text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors">Discover</Link>
            <Link to="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Trending</Link>
            <Link to="/library" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Library</Link>
            <Link to="/history" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">History</Link>
          </nav>
          <div className="flex items-center gap-4 ml-auto">
            {/* Desktop Search - CONTROLLED INPUT */}
            <form onSubmit={handleSubmit} className="flex items-center">
              <input
                type="text"
                value={tempSearch}
                onChange={handleChange}
                placeholder="Search movies..."
                className="w-64 bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-md px-4 py-2 focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <button onClick={onOracleClick} className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">✨ Oracle</button>
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="text-xs font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400">{user?.username}</Link>
                <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Logout</button>
              </>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-white bg-zinc-800 px-4 py-1.5 rounded-full hover:bg-zinc-700 transition-colors">Login</Link>
            )}
          </div>
        </div>

        {/* Hamburger Button */}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors" aria-label="Toggle menu">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobileMenuOpen ? (<path d="M18 6L6 18M6 6l12 12" />) : (<path d="M4 6h16M4 12h16M4 18h16" />)}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/5 bg-zinc-950 px-6 py-4">
          <nav className="flex flex-col space-y-4">
            {/* Mobile Search - CONTROLLED INPUT */}
            <form onSubmit={handleSubmit} className="flex items-center w-full">
              <input
                type="text"
                value={tempSearch}
                onChange={handleChange}
                placeholder="Search movies..."
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-md px-4 py-2 focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <Link to="/discover" className="text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors py-2">Discover</Link>
            <Link to="/" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2">Trending</Link>
            <Link to="/library" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2">Library</Link>
            <Link to="/history" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2">History</Link>
            {isAuthenticated ? (
              <div className="border-t border-white/5 pt-4 mt-2">
                <Link to="/profile" className="text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors py-2 block">👤 {user?.username}</Link>
                <button onClick={handleLogout} className="text-left text-sm font-medium text-zinc-400 hover:text-white transition-colors py-2 w-full">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-white bg-zinc-800 px-4 py-2 rounded-full hover:bg-zinc-700 transition-colors text-center">Login</Link>
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
  const { user } = useUser();
  const navigate = useNavigate();
  const [isOracleOpen, setIsOracleOpen] = useState(false);
  const isAuthPage = ['/login', '/register', '/update-password'].includes(location.pathname);

  const handleOracleSearch = (vibe) => {
    const genres = parseVibe(vibe);
    let searchUrl = '/search?';
    const params = new URLSearchParams();
    if (genres.length > 0) {
      params.set('genres', genres.join(','));
      params.set('q', vibe);
    } else {
      params.set('q', vibe);
    }
    searchUrl += params.toString();
    navigate(searchUrl);
    setIsOracleOpen(false);
  };

  return (
    <div className="app">
      {!isAuthPage && <Header onOracleClick={() => setIsOracleOpen(true)} />}
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
          <Route path="/about" element={<AboutPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/admin/bugs" element={<BugList />} />
          <Route path="/discover" element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <OracleOverlay isOpen={isOracleOpen} onClose={() => setIsOracleOpen(false)} onOracleSearch={handleOracleSearch} />
    </div>
  );
}

// ============================================
// APP ROOT
// ============================================
function App() {
  return (
    <Router>
      <UserProvider>
        <ListProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </ListProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
