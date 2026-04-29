import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUser } from "./UserContext";
import { getSupabase } from "../supabaseClient";
import { getHybridRecommendation, BASE_SYSTEM_PROMPT } from "../utils/gemini";
import { canUseOracle, recordOracleUse } from "../utils/oracleBudget";
import {
  buildOracleEventPayload,
  classifyOracleError,
  trackOracleProviderEventSafe,
} from "../utils/oracleAnalytics";
import { fetchTMDBMovie, fetchWatchProviders } from "../api/tmdb";

const OracleContext = createContext(null);

const toKey = (title, year) => `${String(title || "").trim().toLowerCase()}::${String(year || "").trim()}`;

const mapMatchedProviderLogos = (providers, selectedProviderIds) => {
  if (!Array.isArray(selectedProviderIds) || selectedProviderIds.length === 0) return [];
  if (!providers) return [];

  const sourcePool =
    Array.isArray(providers.flatrate) && providers.flatrate.length > 0
      ? providers.flatrate
      : [...(providers.rent || []), ...(providers.buy || [])];

  const seen = new Set();
  return sourcePool
    .filter((provider) => selectedProviderIds.includes(provider.provider_id))
    .filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    })
    .map((provider) => ({
      provider_id: provider.provider_id,
      provider_name: provider.provider_name,
      logo_path: provider.logo_path,
    }));
};

function getDiscoveryErrorMessage(err) {
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
  if (raw.includes("openrouter") && raw.includes("missing vite_openrouter_api_key")) {
    return "OpenRouter fallback is not configured. TMDB fallback was attempted automatically.";
  }
  return err?.message || "The Oracle could not find a match. Try a different mood.";
}

export function OracleProvider({ children }) {
  const { user } = useUser();
  const [selectedMood, setSelectedMood] = useState(null);
  const [tempPrompt, setTempPrompt] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [tmdbResults, setTmdbResults] = useState([]);
  const [providerResults, setProviderResults] = useState([]);
  const [error, setError] = useState("");
  const [rejectedIds, setRejectedIds] = useState([]);
  const [rejectedTitles, setRejectedTitles] = useState([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);

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

  const fetchUserMovieHistory = useCallback(async () => {
    if (!user?.id) return { allKnownTitles: [], userTasteContext: "" };

    try {
      const supabase = getSupabase();
      const [watchedResult, recentToWatchResult, listItemsResult] = await Promise.all([
        supabase.from("movie_logs").select("title, watch_status, rating").eq("user_id", user.id),
        supabase
          .from("movie_logs")
          .select("title, created_at")
          .eq("user_id", user.id)
          .eq("watch_status", "to-watch")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("list_items").select("title, lists!inner(user_id)").eq("lists.user_id", user.id),
      ]);

      const logs = watchedResult.data || [];
      const recentToWatch = recentToWatchResult.data || [];
      const listItems = listItemsResult.data || [];

      const allKnownTitles = [...new Set([...logs.map((l) => l.title), ...listItems.map((i) => i.title)])];

      const positiveWatched = logs
        .filter((l) => l.watch_status === "watched" && (l.rating >= 4 || !l.rating))
        .slice(0, 20)
        .map((l) => l.title);
      const curatedTitles = listItems.map((i) => i.title);
      const recentToWatchTitles = recentToWatch.map((m) => m.title).filter(Boolean);

      const tasteProfile = [...new Set([...positiveWatched, ...recentToWatchTitles, ...curatedTitles])];
      const userTasteContext =
        tasteProfile.length > 0
          ? `TopWatched20: ${positiveWatched.join(", ")}\nLastToWatch5: ${recentToWatchTitles.join(", ")}\nCuratedLists: ${curatedTitles
              .slice(0, 20)
              .join(", ")}`
          : "No history found.";

      return { allKnownTitles, userTasteContext };
    } catch (historyErr) {
      console.error("Oracle Memory Fetch Error:", historyErr);
      return { allKnownTitles: [], userTasteContext: "" };
    }
  }, [user?.id]);

  const enrichRecommendationsWithTmdb = useCallback(
    async (recs) => {
      const tmdbResponses = await Promise.all(
        recs.map((rec) => fetchTMDBMovie(rec.title, rec.year?.toString() || ""))
      );
      const providerResponses = await Promise.all(
        tmdbResponses.map((movie) => (movie?.id ? fetchWatchProviders(movie.id) : Promise.resolve(null)))
      );

      const mappedTmdb = tmdbResponses.map((movie, index) => {
        if (!movie) return null;
        return {
          ...movie,
          provider_logos: mapMatchedProviderLogos(providerResponses[index], selectedProviderIds),
        };
      });

      return { mappedTmdb, providerResponses };
    },
    [selectedProviderIds]
  );

  const handleDiscover = useCallback(
    async (_additionalRejectedIds = [], additionalRejectedTitles = [], requestSource = "discover") => {
      if (!tempPrompt.trim()) return;

      setIsDiscovering(true);
      setError("");
      setRecommendations([]);
      setTmdbResults([]);
      setProviderResults([]);

      let budgetSource = "unknown";
      let orchestrationMeta = null;

      try {
        const budget = await canUseOracle(user?.id);
        budgetSource = budget?.source || "unknown";
        if (!budget.allowed) {
          throw new Error("Daily Oracle limit reached for free tier. Try again tomorrow.");
        }

        const { allKnownTitles, userTasteContext } = await fetchUserMovieHistory();
        const allRejectedTitles = [
          ...new Set([...rejectedTitles, ...additionalRejectedTitles, ...allKnownTitles]),
        ];

        const aiResponse = await getHybridRecommendation(tempPrompt, {
          userContext: userTasteContext,
          systemPrompt: BASE_SYSTEM_PROMPT,
          rejectedTitles: allRejectedTitles,
        });
        orchestrationMeta = aiResponse?._meta || null;
        if (!aiResponse?.recommendations?.length) {
          throw new Error("The Oracle is silent. Please try again.");
        }

        const { mappedTmdb, providerResponses } = await enrichRecommendationsWithTmdb(aiResponse.recommendations);
        setRecommendations(aiResponse.recommendations);
        setTmdbResults(mappedTmdb);
        setProviderResults(providerResponses);

        await recordOracleUse(user?.id);
        if (user?.id) {
          const promptType = selectedMood?.prompt === tempPrompt ? "mood_preset" : "custom_prompt";
          trackOracleProviderEventSafe(
            buildOracleEventPayload({
              userId: user.id,
              meta: orchestrationMeta,
              success: true,
              budgetSource,
              requestSource,
              promptType,
              recommendationCount: aiResponse.recommendations.length,
              tmdbHitCount: mappedTmdb.filter(Boolean).length,
            })
          );
        }
      } catch (discoverErr) {
        console.error("Discovery error:", discoverErr);
        setError(getDiscoveryErrorMessage(discoverErr));

        if (user?.id) {
          const promptType = selectedMood?.prompt === tempPrompt ? "mood_preset" : "custom_prompt";
          const { errorCode, fallbackReason, provider, statusCode } = classifyOracleError(discoverErr);
          trackOracleProviderEventSafe(
            buildOracleEventPayload({
              userId: user.id,
              meta: orchestrationMeta || { provider, modelUsed: statusCode ? `status:${statusCode}` : null },
              success: false,
              fallbackReason,
              errorCode,
              errorMessage: discoverErr?.message || "Unknown error",
              budgetSource,
              requestSource,
              promptType,
            })
          );
        }
      } finally {
        setIsDiscovering(false);
      }
    },
    [
      enrichRecommendationsWithTmdb,
      fetchUserMovieHistory,
      rejectedTitles,
      selectedMood?.prompt,
      tempPrompt,
      user?.id,
    ]
  );

  const handleRerollAll = useCallback(async () => {
    if (recommendations.length === 0) return;
    const allNewRejectedTitles = recommendations.map((rec) => rec.title);
    const allNewRejectedIds = tmdbResults.filter(Boolean).map((t) => t.id);
    setRejectedIds((prev) => [...prev, ...allNewRejectedIds]);
    setRejectedTitles((prev) => [...prev, ...allNewRejectedTitles]);
    await handleDiscover(allNewRejectedIds, allNewRejectedTitles, "reroll_all");
  }, [handleDiscover, recommendations, tmdbResults]);

  const handleRerollByTmdbId = useCallback(
    async (tmdbId, fallbackTitle = "", fallbackYear = "") => {
      const fallbackKey = toKey(fallbackTitle, fallbackYear);
      const targetIndex = tmdbResults.findIndex((movie) => movie?.id === tmdbId);
      const byKeyIndex =
        targetIndex >= 0
          ? targetIndex
          : recommendations.findIndex((rec) => toKey(rec.title, rec.year) === fallbackKey);
      if (byKeyIndex < 0) return;

      const currentRec = recommendations[byKeyIndex];
      const currentMovie = tmdbResults[byKeyIndex];
      const rejectedTitle = currentRec?.title || fallbackTitle;
      const rejectedId = currentMovie?.id || tmdbId || null;

      const { allKnownTitles, userTasteContext } = await fetchUserMovieHistory();
      const currentTitles = recommendations.map((rec) => rec.title);
      const excludedTitles = [
        ...new Set([...rejectedTitles, ...allKnownTitles, ...currentTitles, rejectedTitle].filter(Boolean)),
      ];

      setIsDiscovering(true);
      setError("");
      try {
        const aiResponse = await getHybridRecommendation(tempPrompt, {
          userContext: userTasteContext,
          systemPrompt: BASE_SYSTEM_PROMPT,
          rejectedTitles: excludedTitles,
        });
        const nextRec = (aiResponse?.recommendations || []).find(
          (candidate) => !excludedTitles.includes(candidate.title)
        );
        if (!nextRec) {
          throw new Error("No replacement recommendation available. Try reroll all.");
        }

        const nextMovie = await fetchTMDBMovie(nextRec.title, nextRec.year?.toString() || "");
        const nextProviders = nextMovie?.id ? await fetchWatchProviders(nextMovie.id) : null;
        const enrichedNextMovie = nextMovie
          ? {
              ...nextMovie,
              provider_logos: mapMatchedProviderLogos(nextProviders, selectedProviderIds),
            }
          : null;

        setRecommendations((prev) => prev.map((rec, idx) => (idx === byKeyIndex ? nextRec : rec)));
        setTmdbResults((prev) => prev.map((movie, idx) => (idx === byKeyIndex ? enrichedNextMovie : movie)));
        setProviderResults((prev) =>
          prev.map((providers, idx) => (idx === byKeyIndex ? nextProviders : providers))
        );
        setRejectedTitles((prev) => [...prev, rejectedTitle].filter(Boolean));
        if (rejectedId) {
          setRejectedIds((prev) => [...prev, rejectedId]);
        }
      } catch (rerollErr) {
        console.error("Oracle targeted reroll failed:", rerollErr);
        setError(getDiscoveryErrorMessage(rerollErr));
      } finally {
        setIsDiscovering(false);
      }
    },
    [
      fetchUserMovieHistory,
      recommendations,
      rejectedTitles,
      selectedProviderIds,
      tempPrompt,
      tmdbResults,
    ]
  );

  const value = useMemo(
    () => ({
      selectedMood,
      setSelectedMood,
      tempPrompt,
      setTempPrompt,
      isDiscovering,
      recommendations,
      tmdbResults,
      providerResults,
      error,
      rejectedTitles,
      selectedProviderIds,
      toggleProvider,
      handleDiscover,
      handleRerollAll,
      handleRerollByTmdbId,
    }),
    [
      error,
      handleDiscover,
      handleRerollAll,
      handleRerollByTmdbId,
      isDiscovering,
      providerResults,
      recommendations,
      rejectedTitles,
      selectedMood,
      selectedProviderIds,
      tempPrompt,
      tmdbResults,
    ]
  );

  return <OracleContext.Provider value={value}>{children}</OracleContext.Provider>;
}

export function useOracle() {
  const context = useContext(OracleContext);
  if (!context) {
    throw new Error("useOracle must be used within an OracleProvider");
  }
  return context;
}
