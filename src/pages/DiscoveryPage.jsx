import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../context/UserContext";
import { useLists } from "../context/ListContext";
import { useToast } from "../context/ToastContext";
import { getSupabase } from "../supabaseClient";
import LogMovieModal from "../components/LogMovieModal";
import SeoHead from "../components/seo/SeoHead";
import "./DiscoveryPage.css";
import { TOP_STREAMING_PROVIDERS_US } from "../constants/streamingProviders";
import ResultCard from "../components/Oracle/ResultCard";
import { OracleProvider, useOracle } from "../context/OracleContext";

const MOOD_PRESETS = [
  {
    id: "cozy",
    label: "Cozy",
    icon: "🕯️",
    prompt: "A comforting, warm film for a quiet night in",
  },
  {
    id: "adrenaline",
    label: "Adrenaline",
    icon: "🔥",
    prompt: "High-octane action that keeps me on the edge of my seat",
  },
  {
    id: "mind-bending",
    label: "Mind-Bending",
    icon: "🧠",
    prompt: "Something that twists reality and makes me think",
  },
  {
    id: "deep-cuts",
    label: "Deep Cuts",
    icon: "💎",
    prompt: "Obscure gems that most people have never seen",
  },
  {
    id: "noir",
    label: "Noir",
    icon: "🌑",
    prompt: "Dark, atmospheric crime with moral ambiguity",
  },
  {
    id: "euphoric",
    label: "Euphoric",
    icon: "✨",
    prompt: "Uplifting cinema that leaves me feeling alive",
  },
];

function DiscoveryContent() {
  const { user } = useUser();
  const { lists, addMovieToList, isMovieInList, canEditList } = useLists();
  const toast = useToast();
  const {
    selectedMood,
    setSelectedMood,
    tempPrompt,
    setTempPrompt,
    isDiscovering,
    recommendations,
    tmdbResults,
    error,
    rejectedTitles,
    selectedProviderIds,
    toggleProvider,
    handleDiscover,
    handleRerollAll,
    handleRerollByTmdbId,
  } = useOracle();

  // Library integration states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedMovieForModal, setSelectedMovieForModal] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const watchlistInFlightRef = useRef(new Set());
  const watchlistKnownIdsRef = useRef(new Set());
  const discoverRequestStartRef = useRef(null);
  const rerollOneRequestStartRef = useRef(null);
  const perfDebugEnabled =
    String(import.meta.env.VITE_FEATURE_ORACLE_PERF_DEBUG || "").toLowerCase() === "true";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleMoodSelect = useCallback((mood) => {
    setSelectedMood(mood);
    setTempPrompt(mood.prompt);
  }, [setSelectedMood, setTempPrompt]);

  const handleChange = useCallback((e) => {
    setTempPrompt(e.target.value);
  }, [setTempPrompt]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (tempPrompt.trim()) {
      discoverRequestStartRef.current = performance.now();
      handleDiscover();
    }
  }, [handleDiscover, tempPrompt]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const getMovieDataForModal = useCallback((movie) => {
    if (!movie) return null;
    return {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      overview: movie.overview,
    };
  }, []);

  const selectedProviderNamesText = useMemo(() => {
    if (!selectedProviderIds.length) return "";
    return TOP_STREAMING_PROVIDERS_US.filter((p) => selectedProviderIds.includes(p.id))
      .map((p) => p.name)
      .join(" · ");
  }, [selectedProviderIds]);

  const handleOpenWatchedModal = useCallback((movie) => {
    setSelectedMovieForModal(movie);
    setIsLogModalOpen(true);
  }, []);

  const handleAddToWatchlist = useCallback(
    async (movie) => {
      if (!movie || !user?.id || !movie.id) return;
      if (watchlistInFlightRef.current.has(movie.id)) return;
      if (watchlistKnownIdsRef.current.has(movie.id)) {
        toast.info("Already in Watchlist");
        return;
      }

      watchlistInFlightRef.current.add(movie.id);
      try {
        const supabase = getSupabase();
        const { data: existing } = await supabase
          .from("movie_logs")
          .select("id")
          .eq("user_id", user.id)
          .eq("tmdb_id", movie.id)
          .eq("watch_status", "to-watch")
          .maybeSingle();
        if (existing) {
          watchlistKnownIdsRef.current.add(movie.id);
          toast.info("Already in Watchlist");
          return;
        }
        const { error: insertError } = await supabase.from("movie_logs").insert({
          user_id: user.id,
          tmdb_id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          watch_status: "to-watch",
        });
        if (insertError) throw insertError;
        watchlistKnownIdsRef.current.add(movie.id);
        toast.success("Added to Watchlist");
      } catch (watchErr) {
        console.error("Watchlist error:", watchErr);
        toast.error("Failed to add to watchlist");
      } finally {
        watchlistInFlightRef.current.delete(movie.id);
      }
    },
    [toast, user?.id]
  );

  const handleRerollOne = useCallback(
    (tmdbId, title, year) => {
      rerollOneRequestStartRef.current = performance.now();
      onRerollByTmdbId(tmdbId, title, year);
    },
    [onRerollByTmdbId]
  );

  useEffect(() => {
    if (!perfDebugEnabled) return;
    if (!isDiscovering && recommendations.length > 0 && discoverRequestStartRef.current) {
      const durationMs = Math.round(performance.now() - discoverRequestStartRef.current);
      console.log(`[OraclePerf] discover->firstCards ${durationMs}ms (${recommendations.length} cards)`);
      discoverRequestStartRef.current = null;
    }
  }, [isDiscovering, perfDebugEnabled, recommendations.length]);

  useEffect(() => {
    if (!perfDebugEnabled) return;
    if (!isDiscovering && rerollOneRequestStartRef.current) {
      const durationMs = Math.round(performance.now() - rerollOneRequestStartRef.current);
      console.log(`[OraclePerf] rerollOne ${durationMs}ms`);
      rerollOneRequestStartRef.current = null;
    }
  }, [isDiscovering, perfDebugEnabled]);

  return (
    <div className="discovery-page">
      <SeoHead
        title="Oracle Discovery"
        description="Use Filmgraph Oracle to get vibe-based movie recommendations with provider-aware filtering and rationale."
        pathname="/discover"
      />
      <div className="discovery-container">
        {!isOnline && (
          <div className="error" style={{ marginBottom: "12px" }}>
            Offline mode: Oracle requests may be limited until your connection
            returns.
          </div>
        )}
        <div className="oracle-hero">
          <div className="discovery-header">
            <div className="oracle-icon">🔮</div>
            <h1>Oracle</h1>
            <p className="oracle-tagline">
              AI-powered film discovery for the discerning viewer
            </p>
          </div>
        </div>

        <div className="mood-bubbles">
          {MOOD_PRESETS.map((mood) => (
            <button
              key={mood.id}
              className={`mood-bubble ${selectedMood?.id === mood.id ? "active" : ""}`}
              onClick={() => handleMoodSelect(mood)}
            >
              <span className="mood-icon">{mood.icon}</span>
              <span className="mood-label">{mood.label}</span>
            </button>
          ))}
        </div>

        <div className="prompt-section">
          <label className="prompt-label">My Streaming Services:</label>
          <div className="provider-chip-group">
            {TOP_STREAMING_PROVIDERS_US.map((provider) => {
              const active = selectedProviderIds.includes(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => toggleProvider(provider.id)}
                  className={`provider-chip ${active ? "active" : ""}`}
                >
                  <span className="provider-chip-label">
                    {provider.name}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedProviderIds.length > 0 && (
            <p className="provider-filtering-note">
              Filtering toward: {selectedProviderNamesText}
            </p>
          )}
          <label className="prompt-label">Or describe your vibe:</label>
          <form onSubmit={handleSubmit} className="prompt-input-wrapper">
            <textarea
              value={tempPrompt}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'A sci-fi film that explores loneliness with stunning visuals'"
              className="prompt-input"
              rows={3}
              disabled={isDiscovering}
            />
            <button
              type="submit"
              className="discover-btn"
              disabled={isDiscovering || !tempPrompt.trim()}
            >
              {isDiscovering ? (
                <>
                  <span className="loading-spinner"></span>
                  Consulting...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Discover
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommendations-list">
            {recommendations.map((rec, index) => {
              const movieTmdb = tmdbResults[index] || null;
              return (
                <ResultCard
                  key={`${rec.title}-${rec.year}-${movieTmdb?.id || "na"}`}
                  rec={rec}
                  movieTmdb={movieTmdb}
                  index={index}
                  isDiscovering={isDiscovering}
                  lists={lists}
                  canEditList={canEditList}
                  isMovieInList={isMovieInList}
                  addMovieToList={addMovieToList}
                  toast={toast}
                  onOpenWatchedModal={handleOpenWatchedModal}
                  onAddToWatchlist={handleAddToWatchlist}
                  onRerollOne={handleRerollOne}
                  onRerollAll={handleRerollAll}
                />
              );
            })}
          </div>
        )}

        {!recommendations.length && !isDiscovering && !error && (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p>Select a mood or describe your vibe to begin</p>
          </div>
        )}
      </div>

      {/* Log Movie Modal */}
      {isLogModalOpen && selectedMovieForModal && (
        <LogMovieModal
          movie={getMovieDataForModal(selectedMovieForModal)}
          onClose={() => {
            setIsLogModalOpen(false);
            setSelectedMovieForModal(null);
          }}
          onSaved={() => {
            setIsLogModalOpen(false);
            setSelectedMovieForModal(null);
            toast.success(
              `"${selectedMovieForModal.title}" logged successfully!`,
            );
          }}
        />
      )}
    </div>
  );
}

function DiscoveryPage() {
  return (
    <OracleProvider>
      <DiscoveryContent />
    </OracleProvider>
  );
}

export default DiscoveryPage;
