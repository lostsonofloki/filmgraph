const SORT_HINTS = [
  { pattern: /\bhighest|top rated|best rated|rating high\b/i, sortBy: 'rating_high' },
  { pattern: /\boldest|earliest|old\b/i, sortBy: 'date_oldest' },
  { pattern: /\bnewest|recent|latest\b/i, sortBy: 'date_newest' },
];

const STATUS_HINTS = [
  { pattern: /\bunwatched|to-watch|want to watch|watchlist\b/i, status: 'to-watch' },
  { pattern: /\bwatched|seen\b/i, status: 'watched' },
];

const ORACLE_GENRE_HINTS = [
  { pattern: /\bhorror\b/i, id: 27, name: 'horror' },
  { pattern: /\bthriller\b/i, id: 53, name: 'thriller' },
  { pattern: /\bcomedy\b/i, id: 35, name: 'comedy' },
  { pattern: /\bdrama\b/i, id: 18, name: 'drama' },
  { pattern: /\bromance|romantic\b/i, id: 10749, name: 'romance' },
  { pattern: /\bscience fiction|sci[- ]?fi\b/i, id: 878, name: 'science fiction' },
  { pattern: /\banimation|animated\b/i, id: 16, name: 'animation' },
  { pattern: /\bcrime\b/i, id: 80, name: 'crime' },
  { pattern: /\bdocumentary\b/i, id: 99, name: 'documentary' },
  { pattern: /\bfantasy\b/i, id: 14, name: 'fantasy' },
  { pattern: /\bmystery\b/i, id: 9648, name: 'mystery' },
  { pattern: /\baction\b/i, id: 28, name: 'action' },
];

const getYearBounds = (text) => {
  const betweenMatch = text.match(/\bbetween\s+(19\d{2}|20\d{2})\s+(?:and|to)\s+(19\d{2}|20\d{2})\b/i);
  if (betweenMatch) {
    const a = Number.parseInt(betweenMatch[1], 10);
    const b = Number.parseInt(betweenMatch[2], 10);
    return {
      yearMin: Math.min(a, b),
      yearMax: Math.max(a, b),
    };
  }

  const beforeMatch = text.match(/\b(?:pre[-\s]?|before|older than)\s*(19\d{2}|20\d{2})(?:s)?\b/i);
  if (beforeMatch) {
    const year = Number.parseInt(beforeMatch[1], 10);
    return { yearMin: null, yearMax: year - 1 };
  }

  const afterMatch = text.match(/\b(?:after|post|since)\s+(19\d{2}|20\d{2})(?:s)?\b/i);
  if (afterMatch) {
    const year = Number.parseInt(afterMatch[1], 10);
    return { yearMin: year + 1, yearMax: null };
  }

  const decadeMatch = text.match(/\b(19\d0|20\d0)s\b/i);
  if (decadeMatch) {
    const start = Number.parseInt(decadeMatch[1], 10);
    return { yearMin: start, yearMax: start + 9 };
  }

  return { yearMin: null, yearMax: null };
};

export const parseLibraryQuery = (input = '') => {
  const text = String(input || '').trim();
  if (!text) {
    return {
      normalizedText: '',
      sortBy: null,
      status: null,
      maxRuntime: null,
      mood: null,
      searchText: '',
    };
  }

  const lowered = text.toLowerCase();
  const sortMatch = SORT_HINTS.find((hint) => hint.pattern.test(lowered));
  const statusMatch = STATUS_HINTS.find((hint) => hint.pattern.test(lowered));
  const runtimeMatch = lowered.match(/(?:under|below|less than)\s*(\d{2,3})\s*(?:min|mins|minutes)?/i);
  const moodMatch = lowered.match(/\b(dark|comedy|thriller|cozy|noir|mind-bending|euphoric)\b/i);

  const strippedSearch = lowered
    .replace(/(?:under|below|less than)\s*\d{2,3}\s*(?:min|mins|minutes)?/gi, '')
    .replace(/\b(watched|seen|unwatched|to-watch|want to watch|watchlist)\b/gi, '')
    .replace(/\b(highest|top rated|best rated|rating high|oldest|earliest|newest|recent|latest)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalizedText: lowered,
    sortBy: sortMatch?.sortBy || null,
    status: statusMatch?.status || null,
    maxRuntime: runtimeMatch ? Number.parseInt(runtimeMatch[1], 10) : null,
    mood: moodMatch?.[1] || null,
    searchText: strippedSearch,
  };
};

export const parseOracleQueryConstraints = (input = '') => {
  const text = String(input || '').trim();
  const normalizedText = text.toLowerCase();
  if (!normalizedText) {
    return {
      normalizedText: '',
      yearMin: null,
      yearMax: null,
      watchStatus: null,
      genreIds: [],
      genreNames: [],
      hasConstraints: false,
      strippedPrompt: '',
    };
  }

  const { yearMin, yearMax } = getYearBounds(normalizedText);
  const statusMatch = STATUS_HINTS.find((hint) => hint.pattern.test(normalizedText));
  const genreMatches = ORACLE_GENRE_HINTS.filter((hint) => hint.pattern.test(normalizedText));
  const genreIds = [...new Set(genreMatches.map((item) => item.id))];
  const genreNames = [...new Set(genreMatches.map((item) => item.name))];

  const strippedPrompt = normalizedText
    .replace(/\bbetween\s+(19\d{2}|20\d{2})\s+(?:and|to)\s+(19\d{2}|20\d{2})\b/gi, '')
    .replace(/\b(?:pre[-\s]?|before|older than|after|post|since)\s*(19\d{2}|20\d{2})(?:s)?\b/gi, '')
    .replace(/\b(19\d0|20\d0)s\b/gi, '')
    .replace(/\b(unwatched|to-watch|want to watch|watchlist|watched|seen)\b/gi, '')
    .replace(/\b(horror|thriller|comedy|drama|romance|romantic|science fiction|sci[- ]?fi|animation|animated|crime|documentary|fantasy|mystery|action)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const hasConstraints = Boolean(
    statusMatch?.status || Number.isFinite(yearMin) || Number.isFinite(yearMax) || genreIds.length > 0,
  );

  return {
    normalizedText,
    yearMin: Number.isFinite(yearMin) ? yearMin : null,
    yearMax: Number.isFinite(yearMax) ? yearMax : null,
    watchStatus: statusMatch?.status || null,
    genreIds,
    genreNames,
    hasConstraints,
    strippedPrompt,
  };
};
