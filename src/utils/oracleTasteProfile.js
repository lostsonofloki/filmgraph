export const LOW_RATING_THRESHOLD = 2.5;
export const RECENT_WINDOW_DAYS = 45;
export const RECENCY_WEIGHT_SCALE = 0.35;
export const WEIGHTED_SECTION_LIMITS = {
  lovedTitles: 18,
  avoidTitles: 10,
  topMoods: 6,
  topGenres: 6,
  recentWatched: 8,
  recentToWatch: 8,
  curatedTitles: 16,
};

const normalizeTitle = (value) => String(value || "").trim().toLowerCase();

const pickTopEntries = (counterMap, limit = 5) =>
  [...counterMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);

const parseYearBucket = (yearValue) => {
  const year = Number.parseInt(String(yearValue || ""), 10);
  if (!Number.isFinite(year)) return null;
  return `${Math.floor(year / 10) * 10}s`;
};

const parseDateSafe = (value) => {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const computeRecencyWeight = (createdAt) => {
  const parsedAt = parseDateSafe(createdAt);
  if (!parsedAt) return 0;
  const ageMs = Date.now() - parsedAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 0) return 1;
  const ratio = clamp(1 - ageDays / RECENT_WINDOW_DAYS, 0, 1);
  return Number((ratio * RECENCY_WEIGHT_SCALE).toFixed(3));
};

const pickTopWeightedEntries = (counterMap, limit = 5) =>
  [...counterMap.entries()]
    .sort((a, b) => b[1].score - a[1].score || b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, stats]) => ({
      label,
      score: Number(stats.score.toFixed(3)),
      count: stats.count,
    }));

const pickRecentTitles = (entries = [], limit = 8) =>
  entries
    .filter((entry) => entry?.title)
    .sort((a, b) => (parseDateSafe(b.created_at) || 0) - (parseDateSafe(a.created_at) || 0))
    .slice(0, limit)
    .map((entry) => entry.title);

export const buildUserTasteProfile = (logs = [], recentToWatch = [], listItems = []) => {
  const watched = logs.filter((entry) => entry.watch_status === "watched");
  const highlyRated = watched.filter((entry) => Number(entry.rating || 0) >= 4);
  const lowRated = watched.filter(
    (entry) => Number(entry.rating || 0) > 0 && Number(entry.rating || 0) <= LOW_RATING_THRESHOLD
  );
  const recentWindowIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * RECENT_WINDOW_DAYS).toISOString();
  const recentWatched = watched.filter((entry) => entry.created_at && entry.created_at >= recentWindowIso);

  const moodScores = new Map();
  const genreScores = new Map();
  const decadeCounts = new Map();
  const positiveTitles = [];
  const avoidTitles = [];
  const neutralTitles = [];

  for (const entry of logs) {
    const normalized = normalizeTitle(entry.title);
    if (!normalized) continue;

    const rating = Number(entry.rating || 0);
    if (entry.watch_status === "watched" && rating >= 4 && positiveTitles.length < 25) {
      positiveTitles.push(entry.title);
    }
    if (entry.watch_status === "watched" && rating > 0 && rating <= LOW_RATING_THRESHOLD && avoidTitles.length < 16) {
      avoidTitles.push(entry.title);
    }
    if (entry.watch_status === "watched" && rating > LOW_RATING_THRESHOLD && rating < 4 && neutralTitles.length < 20) {
      neutralTitles.push(entry.title);
    }

    const recencyWeight = computeRecencyWeight(entry.created_at);
    const ratingLift = rating >= 4 ? 0.25 : 0;
    if (Array.isArray(entry.moods)) {
      entry.moods.forEach((mood) => {
        const normalizedMood = normalizeTitle(mood);
        if (!normalizedMood) return;
        const previous = moodScores.get(normalizedMood) || { score: 0, count: 0 };
        moodScores.set(normalizedMood, {
          score: previous.score + 1 + recencyWeight,
          count: previous.count + 1,
        });
      });
    }
    if (Array.isArray(entry.genres)) {
      entry.genres.forEach((genre) => {
        const normalizedGenre = normalizeTitle(genre);
        if (!normalizedGenre) return;
        const previous = genreScores.get(normalizedGenre) || { score: 0, count: 0 };
        genreScores.set(normalizedGenre, {
          score: previous.score + 1 + recencyWeight + ratingLift,
          count: previous.count + 1,
        });
      });
    }

    const decade = parseYearBucket(entry.year);
    if (decade) {
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
    }
  }

  const recentToWatchTitles = recentToWatch.map((entry) => entry.title).filter(Boolean).slice(0, 8);
  const curatedTitles = listItems.map((entry) => entry.title).filter(Boolean).slice(0, 20);

  const topMoods = pickTopWeightedEntries(moodScores, WEIGHTED_SECTION_LIMITS.topMoods);
  const topGenres = pickTopWeightedEntries(genreScores, WEIGHTED_SECTION_LIMITS.topGenres);
  const topDecades = pickTopEntries(decadeCounts, 3);
  const avgRating =
    watched.length > 0
      ? (
          watched.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          Math.max(watched.filter((item) => Number(item.rating || 0) > 0).length, 1)
        ).toFixed(2)
      : null;

  return {
    summary: {
      watchedCount: watched.length,
      recentWatchedCount: recentWatched.length,
      highRatedCount: highlyRated.length,
      lowRatedCount: lowRated.length,
      lowRatingThreshold: LOW_RATING_THRESHOLD,
      avgRating,
      topMoods: topMoods.map((entry) => entry.label),
      topGenres: topGenres.map((entry) => entry.label),
      topDecades,
    },
    weightedSignals: {
      moods: topMoods,
      genres: topGenres,
    },
    ratingBuckets: {
      liked: [...new Set(positiveTitles)].slice(0, WEIGHTED_SECTION_LIMITS.lovedTitles),
      neutral: [...new Set(neutralTitles)].slice(0, 8),
      avoid: [...new Set(avoidTitles)].slice(0, WEIGHTED_SECTION_LIMITS.avoidTitles),
    },
    positiveTitles: [...new Set(positiveTitles)].slice(0, WEIGHTED_SECTION_LIMITS.lovedTitles),
    avoidTitles: [...new Set(avoidTitles)].slice(0, WEIGHTED_SECTION_LIMITS.avoidTitles),
    recentWatchedTitles: [...new Set(pickRecentTitles(recentWatched, WEIGHTED_SECTION_LIMITS.recentWatched))],
    recentToWatchTitles: [...new Set(recentToWatchTitles)],
    curatedTitles: [...new Set(curatedTitles)],
  };
};

export const buildTasteContextString = (profile) => {
  const summary = profile?.summary || {};
  const weightedSignals = profile?.weightedSignals || {};
  const moodSignalLine =
    (weightedSignals.moods || [])
      .map((entry) => `${entry.label}(${entry.score.toFixed(2)})`)
      .join(", ") || "none";
  const genreSignalLine =
    (weightedSignals.genres || [])
      .map((entry) => `${entry.label}(${entry.score.toFixed(2)})`)
      .join(", ") || "none";
  const likedTitles = (profile?.ratingBuckets?.liked || []).slice(0, WEIGHTED_SECTION_LIMITS.lovedTitles);
  const avoidTitles = (profile?.ratingBuckets?.avoid || []).slice(0, WEIGHTED_SECTION_LIMITS.avoidTitles);
  const neutralTitles = (profile?.ratingBuckets?.neutral || []).slice(0, 8);
  const recentWatchedTitles = (profile?.recentWatchedTitles || []).slice(0, WEIGHTED_SECTION_LIMITS.recentWatched);
  const recentToWatchTitles = (profile?.recentToWatchTitles || []).slice(0, WEIGHTED_SECTION_LIMITS.recentToWatch);
  const curatedTitles = (profile?.curatedTitles || []).slice(0, WEIGHTED_SECTION_LIMITS.curatedTitles);

  const lines = [
    `TasteStats: watched=${summary.watchedCount || 0}, recent45d=${summary.recentWatchedCount || 0}, avgRating=${summary.avgRating || "N/A"}`,
    `TopMoods: ${(summary.topMoods || []).slice(0, WEIGHTED_SECTION_LIMITS.topMoods).join(", ") || "none"}`,
    `TopGenres: ${(summary.topGenres || []).slice(0, WEIGHTED_SECTION_LIMITS.topGenres).join(", ") || "none"}`,
    `MoodAffinityWeighted: ${moodSignalLine}`,
    `GenreAffinityWeighted: ${genreSignalLine}`,
    `PreferredDecades: ${(summary.topDecades || []).join(", ") || "none"}`,
    `LovedTitles: ${likedTitles.join(", ") || "none"}`,
    `AvoidSimilarTo: ${avoidTitles.join(", ") || "none"}`,
    `NeutralTitles: ${neutralTitles.join(", ") || "none"}`,
    `RecentWatched: ${recentWatchedTitles.join(", ") || "none"}`,
    `RecentToWatch: ${recentToWatchTitles.join(", ") || "none"}`,
    `CuratedLists: ${curatedTitles.join(", ") || "none"}`,
  ];
  return lines.join("\n");
};
