import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useLists } from "../context/ListContext";
import { useToast } from "../context/ToastContext";
import { getSupabase } from "../supabaseClient";
import { getHybridRecommendation, BASE_SYSTEM_PROMPT } from "../utils/gemini";
import { canUseOracle, recordOracleUse } from "../utils/oracleBudget";
import {
  buildOracleEventPayload,
  classifyOracleError,
  trackOracleProviderEventSafe,
} from "../utils/oracleAnalytics";
import { fetchTMDBMovie } from "../api/tmdb";
import { Link } from "react-router-dom";
import LogMovieModal from "../components/LogMovieModal";
import SeoHead from "../components/seo/SeoHead";
import "./DiscoveryPage.css";
import { TOP_STREAMING_PROVIDERS_US } from "../constants/streamingProviders";

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

function DiscoveryPage() {
  const getDiscoveryErrorMessage = (err) => {
    const raw = String(err?.message || "").toLowerCase();
    const statusMatch = raw.match(/\[oracle:[a-z]+:(\d+)\]/i);
    const statusCode = statusMatch ? Number.parseInt(statusMatch[1], 10) : null;

    if (raw.includes("daily oracle limit")) {
      return "Daily Oracle limit reached for free tier. Try again tomorrow.";
    }
    if (statusCode === 429) {
      return "Oracle providers are currently rate limited. Please try again in a moment.";
    }
    if (statusCode === 404 || raw.includes("not found")) {
      return "A recommendation model is currently unavailable. Switching providers failed this time.";
    }
    if (raw.includes("all recommendation providers are unavailable")) {
      return "All recommendation providers are temporarily unavailable. Please try again shortly.";
    }
    if (
      raw.includes("openrouter") &&
      raw.includes("missing vite_openrouter_api_key")
    ) {
      return "OpenRouter fallback is not configured. TMDB fallback was attempted automatically.";
    }
    return (
      err?.message || "The Oracle could not find a match. Try a different mood."
    );
  };

  const { user } = useUser();
  const { lists, addMovieToList, isMovieInList, canEditList } = useLists();
  const toast = useToast();
  const [selectedMood, setSelectedMood] = useState(null);
  const [tempPrompt, setTempPrompt] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [error, setError] = useState("");
  const [rejectedIds, setRejectedIds] = useState([]);
  const [rejectedTitles, setRejectedTitles] = useState([]);

  // Library integration states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedMovieForModal, setSelectedMovieForModal] = useState(null);
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);

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

  useEffect(() => {
    const fetchProviderPreferences = async () => {
      if (!user?.id) return;
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("profiles")
          .select("user_providers")
          .eq("id", user.id)
          .maybeSingle();
        if (Array.isArray(data?.user_providers)) {
          setSelectedProviderIds(data.user_providers);
        }
      } catch (providerErr) {
        console.error("Failed to load provider preferences:", providerErr);
      }
    };
    fetchProviderPreferences();
  }, [user?.id]);

  const toggleProvider = async (providerId) => {
    const next = selectedProviderIds.includes(providerId)
      ? selectedProviderIds.filter((id) => id !== providerId)
      : [...selectedProviderIds, providerId];
    setSelectedProviderIds(next);

    if (!user?.id) return;
    try {
      const supabase = getSupabase();
      await supabase
        .from("profiles")
        .update({ user_providers: next, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    } catch (providerErr) {
      console.error("Failed to save provider preferences:", providerErr);
    }
  };

  /**
   * Optimized History Fetch - Watched + To-Watch + Custom Lists
   * Uses Promise.all for parallel execution (sub-500ms data prep)
   */
  const fetchUserMovieHistory = async () => {
    if (!user?.id) return { allKnownTitles: [], userTasteContext: "" };

    try {
      const supabase = getSupabase();

      // Parallel execution for sub-500ms data prep
      const [watchedResult, recentToWatchResult, listItemsResult] =
        await Promise.all([
          // Top 20 watched titles for profile hydration
          supabase
            .from("movie_logs")
            .select("title, watch_status, rating")
            .eq("user_id", user.id),

          // Last 5 to-watch titles for "intent" context
          supabase
            .from("movie_logs")
            .select("title, created_at")
            .eq("user_id", user.id)
            .eq("watch_status", "to-watch")
            .order("created_at", { ascending: false })
            .limit(5),

          // Bucket 3: Every title from every custom list the user owns
          // Uses a "Join" - selecting titles where the parent list belongs to the user
          supabase
            .from("list_items")
            .select("title, lists!inner(user_id)")
            .eq("lists.user_id", user.id),
        ]);

      const logs = watchedResult.data || [];
      const recentToWatch = recentToWatchResult.data || [];
      const listItems = listItemsResult.data || [];

      // 1. Every title the user has ever touched (for the "Banned" list)
      const allKnownTitles = [
        ...new Set([
          ...logs.map((l) => l.title),
          ...listItems.map((i) => i.title),
        ]),
      ];

      // 2. Build the "Taste Profile"
      // Only send high-rated Watched movies and Custom List entries to the AI
      const positiveWatched = logs
        .filter(
          (l) => l.watch_status === "watched" && (l.rating >= 4 || !l.rating),
        )
        .slice(0, 20)
        .map((l) => l.title);

      const curatedTitles = listItems.map((i) => i.title);
      const recentToWatchTitles = recentToWatch
        .map((m) => m.title)
        .filter(Boolean);

      const tasteProfile = [
        ...new Set([
          ...positiveWatched,
          ...recentToWatchTitles,
          ...curatedTitles,
        ]),
      ];

      // Set deduplication is O(n) - keeps it fast
      const userTasteContext =
        tasteProfile.length > 0
          ? `TopWatched20: ${positiveWatched.join(", ")}\nLastToWatch5: ${recentToWatchTitles.join(", ")}\nCuratedLists: ${curatedTitles.slice(0, 20).join(", ")}`
          : "No history found.";

      console.log(
        `📚 Oracle Memory: ${allKnownTitles.length} titles banned, ${tasteProfile.length} in taste profile`,
      );

      return { allKnownTitles, userTasteContext };
    } catch (err) {
      console.error("Oracle Memory Fetch Error:", err);
      return { allKnownTitles: [], userTasteContext: "" };
    }
  };

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    setTempPrompt(mood.prompt);
  };

  const handleChange = (e) => {
    setTempPrompt(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tempPrompt.trim()) {
      handleDiscover();
    }
  };

  const handleDiscover = async (
    _additionalRejectedIds = [],
    additionalRejectedTitles = [],
    requestSource = "discover",
  ) => {
    if (!tempPrompt.trim()) return;

    setIsDiscovering(true);
    setError("");
    setRecommendations([]);
    setTmdbResults([]);

    let budgetSource = "unknown";
    let orchestrationMeta = null;

    try {
      const budget = await canUseOracle(user?.id);
      budgetSource = budget?.source || "unknown";
      if (!budget.allowed) {
        throw new Error(
          "Daily Oracle limit reached for free tier. Try again tomorrow.",
        );
      }

      // Fetch user's entire movie history in parallel
      const { allKnownTitles, userTasteContext } =
        await fetchUserMovieHistory();

      // Combine session rejections with lifetime library (zero duplicates allowed)
      const allRejectedTitles = [
        ...new Set([
          ...rejectedTitles,
          ...additionalRejectedTitles,
          ...allKnownTitles,
        ]),
      ];

      console.log(
        `🚫 Excluding ${allRejectedTitles.length} known movies from recommendations`,
      );

      const aiResponse = await getHybridRecommendation(tempPrompt, {
        userContext: userTasteContext,
        systemPrompt: BASE_SYSTEM_PROMPT,
        rejectedTitles: allRejectedTitles,
      });
      orchestrationMeta = aiResponse?._meta || null;

      if (
        !aiResponse ||
        !aiResponse.recommendations ||
        aiResponse.recommendations.length === 0
      ) {
        throw new Error("The Oracle is silent. Please try again.");
      }

      if (aiResponse._meta) {
        console.log(
          "🔀 Orchestration:",
          aiResponse._meta.groqUsed ? "Groq + Gemini" : "Gemini-only fallback",
        );
        console.log("🏷️ Genres:", aiResponse._meta.genreIds);
      }

      setRecommendations(aiResponse.recommendations);

      // Fetch TMDB data for ALL movies concurrently
      const tmdbPromises = aiResponse.recommendations.map((rec) =>
        fetchTMDBMovie(rec.title, rec.year?.toString() || ""),
      );

      const tmdbResponses = await Promise.all(tmdbPromises);

      // Keep ALL results (including nulls) to preserve index alignment
      setTmdbResults(tmdbResponses);
      await recordOracleUse(user?.id);

      if (user?.id) {
        const promptType =
          selectedMood?.prompt === tempPrompt ? "mood_preset" : "custom_prompt";
        const eventPayload = buildOracleEventPayload({
          userId: user.id,
          meta: orchestrationMeta,
          success: true,
          budgetSource,
          requestSource,
          promptType,
          recommendationCount: aiResponse.recommendations.length,
          tmdbHitCount: tmdbResponses.filter(Boolean).length,
        });
        trackOracleProviderEventSafe(eventPayload);
      }
    } catch (err) {
      console.error("Discovery error:", err);
      setError(getDiscoveryErrorMessage(err));

      if (user?.id) {
        const promptType =
          selectedMood?.prompt === tempPrompt ? "mood_preset" : "custom_prompt";
        const { errorCode, fallbackReason, provider, statusCode } =
          classifyOracleError(err);
        const eventPayload = buildOracleEventPayload({
          userId: user.id,
          meta: orchestrationMeta || {
            provider,
            modelUsed: statusCode ? `status:${statusCode}` : null,
          },
          success: false,
          fallbackReason,
          errorCode,
          errorMessage: err?.message || "Unknown error",
          budgetSource,
          requestSource,
          promptType,
        });
        trackOracleProviderEventSafe(eventPayload);
      }
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleRejectAndReroll = async () => {
    if (recommendations.length === 0) return;

    // Reject all movies from current batch and reroll
    const allNewRejectedTitles = recommendations.map((rec) => rec.title);
    const allNewRejectedIds = tmdbResults.filter((t) => t).map((t) => t.id);

    setRejectedIds([...rejectedIds, ...allNewRejectedIds]);
    setRejectedTitles([...rejectedTitles, ...allNewRejectedTitles]);

    await handleDiscover(allNewRejectedIds, allNewRejectedTitles, "reroll");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMovieDataForModal = (movie) => {
    if (!movie) return null;
    return {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      overview: movie.overview,
    };
  };

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
              Filtering toward:{" "}
              {TOP_STREAMING_PROVIDERS_US.filter((p) =>
                selectedProviderIds.includes(p.id),
              )
                .map((p) => p.name)
                .join(" · ")}
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
              // Safe matching: use TMDB result at same index (preserved by not filtering)
              const movieTmdb = tmdbResults[index] || null;

              return (
                <div
                  key={`${rec.title}-${rec.year}`}
                  className="recommendation-card animate-in fade-in"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="rec-poster-container">
                    {movieTmdb?.id ? (
                      <Link
                        to={`/movie/${movieTmdb.id}`}
                        className="rec-poster-link"
                      >
                        {movieTmdb?.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movieTmdb.poster_path}`}
                            alt={rec.title}
                            loading="lazy"
                            className="rec-poster"
                          />
                        ) : (
                          <div className="rec-poster-placeholder">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </Link>
                    ) : (
                      <>
                        {movieTmdb?.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movieTmdb.poster_path}`}
                            alt={rec.title}
                            loading="lazy"
                            className="rec-poster"
                          />
                        ) : (
                          <div className="rec-poster-placeholder">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rec-content">
                    <div className="rec-header">
                      {movieTmdb?.id ? (
                        <Link
                          to={`/movie/${movieTmdb.id}`}
                          className="rec-title-link"
                        >
                          {movieTmdb?.title || rec.title}
                        </Link>
                      ) : (
                        <h2 className="rec-title">
                          {movieTmdb?.title || rec.title}
                        </h2>
                      )}
                      <span className="rec-year">
                        {movieTmdb?.release_date?.split("-")[0] || rec.year}
                      </span>
                    </div>

                    <div className="rec-vibe-check">
                      <span className="vibe-label">Vibe Check:</span>
                      <span className="vibe-text">{rec.vibeCheck}</span>
                    </div>

                    <div className="rec-rationale">
                      <h3 className="rationale-title">
                        Why Filmgraph Picked This
                      </h3>
                      <p className="rationale-text">{rec.rationale}</p>
                    </div>

                    <div className="rec-actions">
                      {/* View on TMDB */}
                      {movieTmdb?.id && (
                        <a
                          href={`https://www.themoviedb.org/movie/${movieTmdb.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tmdb-link"
                        >
                          View on TMDB
                        </a>
                      )}

                      {/* Watched Button */}
                      <button
                        onClick={() => {
                          if (movieTmdb) {
                            setSelectedMovieForModal(movieTmdb);
                            setIsLogModalOpen(true);
                          }
                        }}
                        className="lib-action-btn"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Watched
                      </button>

                      {/* Watchlist Button */}
                      <button
                        onClick={async () => {
                          if (!movieTmdb || !user?.id) return;
                          try {
                            const supabase = getSupabase();

                            // Check if already in watchlist
                            const { data: existing } = await supabase
                              .from("movie_logs")
                              .select("id")
                              .eq("user_id", user.id)
                              .eq("tmdb_id", movieTmdb.id)
                              .eq("watch_status", "to-watch")
                              .maybeSingle();

                            if (existing) {
                              toast.info("Already in Watchlist");
                              return;
                            }

                            const { error } = await supabase
                              .from("movie_logs")
                              .insert({
                                user_id: user.id,
                                tmdb_id: movieTmdb.id,
                                title: movieTmdb.title,
                                poster_path: movieTmdb.poster_path,
                                watch_status: "to-watch",
                              });
                            if (error) throw error;
                            toast.success(`Added to Watchlist`);
                          } catch (err) {
                            console.error("Watchlist error:", err);
                            toast.error("Failed to add to watchlist");
                          }
                        }}
                        className="lib-action-btn"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Watchlist
                      </button>

                      {/* Add to List Button */}
                      <div className="relative" style={{ zIndex: 100 }}>
                        <button
                          onClick={() =>
                            setIsListDropdownOpen(!isListDropdownOpen)
                          }
                          className="lib-action-btn"
                          disabled={lists.length === 0}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          Add to List
                        </button>
                        {isListDropdownOpen && lists.length > 0 && (
                          <div
                            className="list-dropdown"
                            style={{
                              right: 0,
                              overflow: "visible",
                              zIndex: 9999,
                            }}
                          >
                            {lists.map((list) => {
                              const isInList = isMovieInList(
                                list.id,
                                movieTmdb?.id,
                              );
                              const isReadOnly = !canEditList(list.id);
                              return (
                                <button
                                  key={list.id}
                                  onClick={async () => {
                                    if (
                                      !movieTmdb?.id ||
                                      isInList ||
                                      isReadOnly
                                    )
                                      return;
                                    try {
                                      await addMovieToList(list.id, {
                                        tmdb_id: movieTmdb.id,
                                        title: movieTmdb.title,
                                        poster_path: movieTmdb.poster_path,
                                      });
                                      toast.success(`Added to ${list.name}`);
                                      setIsListDropdownOpen(false);
                                    } catch (err) {
                                      console.error("Add to list error:", err);
                                      toast.error(
                                        err.message?.includes("duplicate")
                                          ? "Already in this list"
                                          : "Failed to add to list",
                                      );
                                    }
                                  }}
                                  className="list-dropdown-item"
                                  disabled={isInList || isReadOnly}
                                >
                                  {list.name}
                                  {isInList
                                    ? " • Added"
                                    : isReadOnly
                                      ? " • Viewer"
                                      : ""}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Reject & Reroll */}
                      <button
                        className="reject-reroll-btn"
                        onClick={handleRejectAndReroll}
                        disabled={isDiscovering}
                        title="Reject all and get new recommendations"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M23 4v6h-6M20.49 15a9 9 0 0 1-2.82-3.36M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          <path d="M1 4v6h6M3.51 9a9 9 0 0 1 2.82-3.36" />
                        </svg>
                        Reject & Reroll
                      </button>
                    </div>

                    {rejectedTitles.length > 0 && (
                      <div className="rejected-count">
                        <span className="rejected-badge">
                          {rejectedTitles.length}
                        </span>
                        <span className="rejected-text">
                          movies rejected this session
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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

export default DiscoveryPage;
