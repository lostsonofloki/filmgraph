const SORT_HINTS = [
  { pattern: /\bhighest|top rated|best rated|rating high\b/i, sortBy: 'rating_high' },
  { pattern: /\boldest|earliest|old\b/i, sortBy: 'date_oldest' },
  { pattern: /\bnewest|recent|latest\b/i, sortBy: 'date_newest' },
];

const STATUS_HINTS = [
  { pattern: /\bunwatched|to-watch|want to watch|watchlist\b/i, status: 'to-watch' },
  { pattern: /\bwatched|seen\b/i, status: 'watched' },
];

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
