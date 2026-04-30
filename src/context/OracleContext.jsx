import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "./UserContext";
import { getSupabase } from "../supabaseClient";
import { getHybridRecommendation, BASE_SYSTEM_PROMPT } from "../utils/gemini";
import { canUseOracle, recordOracleUse } from "../utils/oracleBudget";
import { parseOracleIntentWithGroq } from "../utils/groq";
import { buildTasteContextString, buildUserTasteProfile } from "../utils/oracleTasteProfile";
import { resolveOracleQueryConstraints } from "../utils/oracleQueryConstraints";
import {
  buildOracleEventPayload,
  classifyOracleError,
  trackOracleProviderEventSafe,
} from "../utils/oracleAnalytics";
import { isAbortLikeError } from "../utils/oracleReliability";
import { fetchTMDBMovie, fetchWatchProviders } from "../api/tmdb";

const OracleContext = createContext(null);
const ORACLE_QUERY_CONSTRAINTS_ENABLED =
  String(import.meta.env.VITE_FEATURE_ORACLE_QUERY_CONSTRAINTS || "").toLowerCase() === "true";
const ORACLE_GROQ_INTENT_PARSER_ENABLED =
  String(import.meta.env.VITE_FEATURE_ORACLE_GROQ_INTENT_PARSER || "").toLowerCase() === "true";
const ORACLE_TASTE_RPC_ENABLED =
  String(import.meta.env.VITE_FEATURE_ORACLE_TASTE_RPC || "").toLowerCase() === "true";

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
  const [rejectedTitles, setRejectedTitles] = useState([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState([]);
  const [historyCache, setHistoryCache] = useState({
    fingerprint: "",
    logs: [],
    recentToWatch: [],
    listItems: [],
  });
  const activeRequestRef = useRef({
    requestId: 0,
    controller: null,
  });
  const queryConstraintsCacheRef = useRef(new Map());
  const historyFetchCacheRef = useRef({ key: "", expiresAt: 0, value: null });

  const beginOracleRequest = useCallback(() => {
    if (activeRequestRef.current.controller) {
      activeRequestRef.current.controller.abort("superseded");
    }
    const controller = new AbortController();
    const requestId = activeRequestRef.current.requestId + 1;
    activeRequestRef.current = { requestId, controller };
    return { requestId, signal: controller.signal };
  }, []);

  const isCurrentRequest = useCallback(
    (requestId) => activeRequestRef.current.requestId === requestId,
    []
  );

  useEffect(
    () => () => {
      if (activeRequestRef.current.controller) {
        activeRequestRef.current.controller.abort("unmount");
      }
    },
    []
  );

  const memoizedTasteProfile = useMemo(
    () => buildUserTasteProfile(historyCache.logs, historyCache.recentToWatch, historyCache.listItems),
    [historyCache.listItems, historyCache.logs, historyCache.recentToWatch]
  );
  const memoizedTasteContext = useMemo(() => buildTasteContextString(memoizedTasteProfile), [memoizedTasteProfile]);

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
    const cacheKey = `${user.id}:${ORACLE_TASTE_RPC_ENABLED ? "rpc" : "local"}`;
    const now = Date.now();
    if (historyFetchCacheRef.current.key === cacheKey && historyFetchCacheRef.current.expiresAt > now) {
      return historyFetchCacheRef.current.value;
    }

    try {
      const supabase = getSupabase();
      const [logTitlesResult, listItemsResult, tasteProfileRpcResult] = await Promise.all([
        supabase.from("movie_logs").select("title").eq("user_id", user.id),
        supabase.from("list_items").select("title, lists!inner(user_id)").eq("lists.user_id", user.id),
        ORACLE_TASTE_RPC_ENABLED
          ? supabase.rpc("get_oracle_taste_profile", { p_user_id: user.id })
          : Promise.resolve({ data: null, error: null }),
      ]);

      const listItems = listItemsResult.data || [];
      const allKnownTitles = [
        ...new Set([...(logTitlesResult.data || []).map((l) => l.title), ...listItems.map((i) => i.title)]),
      ];
      if (tasteProfileRpcResult.error) {
        throw tasteProfileRpcResult.error;
      }
      const rpcPayload = tasteProfileRpcResult.data;
      if (rpcPayload?.contextString && typeof rpcPayload.contextString === "string") {
        const value = { allKnownTitles, userTasteContext: rpcPayload.contextString };
        historyFetchCacheRef.current = { key: cacheKey, expiresAt: Date.now() + 10000, value };
        return value;
      }
      if (rpcPayload?.summary) {
        const value = {
          allKnownTitles,
          userTasteContext: buildTasteContextString(rpcPayload),
        };
        historyFetchCacheRef.current = { key: cacheKey, expiresAt: Date.now() + 10000, value };
        return value;
      }
      if (ORACLE_TASTE_RPC_ENABLED) {
        throw new Error("Oracle taste profile RPC returned empty payload.");
      }
    } catch (rpcHistoryErr) {
      console.warn("Oracle taste profile RPC unavailable; falling back to local builder.", rpcHistoryErr);
    }

    try {
      const supabase = getSupabase();
      const [watchedResult, recentToWatchResult, listItemsResult] = await Promise.all([
        supabase
          .from("movie_logs")
          .select("title, watch_status, rating, moods, genres, year, created_at")
          .eq("user_id", user.id),
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
      const historyFingerprint = JSON.stringify({
        logs: logs.map(
          (entry) =>
            `${entry.title || ""}|${entry.rating || ""}|${entry.watch_status || ""}|${entry.created_at || ""}`
        ),
        recentToWatch: recentToWatch.map((entry) => `${entry.title || ""}|${entry.created_at || ""}`),
        listItems: listItems.map((entry) => String(entry.title || "")),
      });

      const allKnownTitles = [...new Set([...logs.map((l) => l.title), ...listItems.map((i) => i.title)])];
      if (historyFingerprint === historyCache.fingerprint) {
        const value = { allKnownTitles, userTasteContext: memoizedTasteContext };
        historyFetchCacheRef.current = { key: cacheKey, expiresAt: Date.now() + 10000, value };
        return value;
      }
      const tasteProfile = buildUserTasteProfile(logs, recentToWatch, listItems);
      const userTasteContext = buildTasteContextString(tasteProfile);
      setHistoryCache({
        fingerprint: historyFingerprint,
        logs,
        recentToWatch,
        listItems,
      });

      const value = { allKnownTitles, userTasteContext };
      historyFetchCacheRef.current = { key: cacheKey, expiresAt: Date.now() + 10000, value };
      return value;
    } catch (historyErr) {
      console.error("Oracle Memory Fetch Error:", historyErr);
      return { allKnownTitles: [], userTasteContext: "" };
    }
  }, [historyCache.fingerprint, memoizedTasteContext, user?.id]);

  const getResolvedQueryConstraints = useCallback(async (prompt) => {
    if (!ORACLE_QUERY_CONSTRAINTS_ENABLED) return null;
    const normalizedPrompt = String(prompt || "").trim().toLowerCase();
    if (queryConstraintsCacheRef.current.has(normalizedPrompt)) {
      return queryConstraintsCacheRef.current.get(normalizedPrompt);
    }
    const resolved = await resolveOracleQueryConstraints(prompt, {
      constraintsEnabled: ORACLE_QUERY_CONSTRAINTS_ENABLED,
      groqIntentEnabled: ORACLE_GROQ_INTENT_PARSER_ENABLED,
      groqIntentParser: parseOracleIntentWithGroq,
    });
    queryConstraintsCacheRef.current.set(normalizedPrompt, resolved);
    return resolved;
  }, []);

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
      const { requestId, signal } = beginOracleRequest();

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
        const queryConstraints = await getResolvedQueryConstraints(tempPrompt);

        const aiResponse = await getHybridRecommendation(tempPrompt, {
          userContext: userTasteContext,
          systemPrompt: BASE_SYSTEM_PROMPT,
          rejectedTitles: allRejectedTitles,
          queryConstraints,
          signal,
        });
        if (!isCurrentRequest(requestId)) return;
        orchestrationMeta = aiResponse?._meta || null;
        if (!aiResponse?.recommendations?.length) {
          throw new Error("The Oracle is silent. Please try again.");
        }

        const { mappedTmdb, providerResponses } = await enrichRecommendationsWithTmdb(aiResponse.recommendations);
        if (!isCurrentRequest(requestId)) return;
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
        if (isAbortLikeError(discoverErr) || !isCurrentRequest(requestId)) {
          return;
        }
        console.error("Discovery error:", discoverErr);
        setError(getDiscoveryErrorMessage(discoverErr));

        if (user?.id) {
          const promptType = selectedMood?.prompt === tempPrompt ? "mood_preset" : "custom_prompt";
          const { errorCode, fallbackReason, provider, statusCode, failureBucket, failureStage } =
            classifyOracleError(discoverErr);
          trackOracleProviderEventSafe(
            buildOracleEventPayload({
              userId: user.id,
              meta: orchestrationMeta || { provider, modelUsed: statusCode ? `status:${statusCode}` : null },
              success: false,
              fallbackReason,
              errorCode,
              failureBucket,
              failureStage,
              errorMessage: discoverErr?.message || "Unknown error",
              budgetSource,
              requestSource,
              promptType,
            })
          );
        }
      } finally {
        if (isCurrentRequest(requestId)) {
          setIsDiscovering(false);
        }
      }
    },
    [
      enrichRecommendationsWithTmdb,
      fetchUserMovieHistory,
      getResolvedQueryConstraints,
      rejectedTitles,
      selectedMood?.prompt,
      tempPrompt,
      user?.id,
      beginOracleRequest,
      isCurrentRequest,
    ]
  );

  const handleRerollAll = useCallback(async () => {
    if (recommendations.length === 0) return;
    const allNewRejectedTitles = recommendations.map((rec) => rec.title);
    const allNewRejectedIds = tmdbResults.filter(Boolean).map((t) => t.id);
    setRejectedTitles((prev) => [...prev, ...allNewRejectedTitles]);
    await handleDiscover(allNewRejectedIds, allNewRejectedTitles, "reroll_all");
  }, [handleDiscover, recommendations, tmdbResults]);

  const handleRerollByTmdbId = useCallback(
    async (tmdbId, fallbackTitle = "", fallbackYear = "") => {
      const { requestId, signal } = beginOracleRequest();
      const fallbackKey = toKey(fallbackTitle, fallbackYear);
      const targetIndex = tmdbResults.findIndex((movie) => movie?.id === tmdbId);
      const byKeyIndex =
        targetIndex >= 0
          ? targetIndex
          : recommendations.findIndex((rec) => toKey(rec.title, rec.year) === fallbackKey);
      if (byKeyIndex < 0) return;

      const currentRec = recommendations[byKeyIndex];
      const rejectedTitle = currentRec?.title || fallbackTitle;
      const { allKnownTitles, userTasteContext } = await fetchUserMovieHistory();
      const currentTitles = recommendations.map((rec) => rec.title);
      const excludedTitles = [
        ...new Set([...rejectedTitles, ...allKnownTitles, ...currentTitles, rejectedTitle].filter(Boolean)),
      ];
      const queryConstraints = await getResolvedQueryConstraints(tempPrompt);

      setIsDiscovering(true);
      setError("");
      try {
        const aiResponse = await getHybridRecommendation(tempPrompt, {
          userContext: userTasteContext,
          systemPrompt: BASE_SYSTEM_PROMPT,
          rejectedTitles: excludedTitles,
          queryConstraints,
          signal,
        });
        if (!isCurrentRequest(requestId)) return;
        const nextRec = (aiResponse?.recommendations || []).find(
          (candidate) => !excludedTitles.includes(candidate.title)
        );
        if (!nextRec) {
          throw new Error("No replacement recommendation available. Try reroll all.");
        }

        const nextMovie = await fetchTMDBMovie(nextRec.title, nextRec.year?.toString() || "");
        const nextProviders = nextMovie?.id ? await fetchWatchProviders(nextMovie.id) : null;
        if (!isCurrentRequest(requestId)) return;
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
      } catch (rerollErr) {
        if (isAbortLikeError(rerollErr) || !isCurrentRequest(requestId)) {
          return;
        }
        console.error("Oracle targeted reroll failed:", rerollErr);
        setError(getDiscoveryErrorMessage(rerollErr));
      } finally {
        if (isCurrentRequest(requestId)) {
          setIsDiscovering(false);
        }
      }
    },
    [
      fetchUserMovieHistory,
      getResolvedQueryConstraints,
      recommendations,
      rejectedTitles,
      selectedProviderIds,
      tempPrompt,
      tmdbResults,
      beginOracleRequest,
      isCurrentRequest,
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
      toggleProvider,
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
