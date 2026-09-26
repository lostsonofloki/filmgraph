// Mood ids as written to `movie_logs.moods` by the log modal and the older MoodChip palette.
// A value outside this list can never match a row, so it would empty the shelf while the mood
// <select> — populated only from moods present in the library — shows no sign of a filter.
export const LIBRARY_MOOD_IDS = [
  'bittersweet',
  'uplifting',
  'bleak',
  'romantic',
  'feel-good',
  'nostalgic',
  'heart-wrenching',
  'inspiring',
  'atmospheric',
  'dark',
  'tense',
  'gory',
  'eerie',
  'claustrophobic',
  'campy',
  'dread',
  'jump-scary',
  'adrenaline-fueled',
  'hilarious',
  'epic',
  'swoon-worthy',
  'stylized',
  'satirical',
  'mindbending',
  'psychological',
  'technological',
  'profound',
  'political',
  'cerebral',
  'heartwarming',
  'tearjerker',
  'gritty',
  'neon',
  'whimsical',
  'challenging',
  'philosophical',
  'slowburn',
  'complex',
];

const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const byLongestFirst = (a, b) => b.length - a.length;

const alternation = (values) => values.slice().sort(byLongestFirst).map(escapeForRegExp).join('|');

const MOOD_ALTERNATION = alternation(LIBRARY_MOOD_IDS);

// An explicit cue is required so an ordinary title word ("The Dark Knight") cannot become a
// filter that hides most of the shelf.
const MOOD_HINTS = [
  new RegExp(`\\b(?:mood|vibe)\\s*(?:[:=]\\s*|\\s)(${MOOD_ALTERNATION})\\b`, 'i'),
  new RegExp(`\\b(${MOOD_ALTERNATION})\\s+(?:mood|vibe)\\b`, 'i'),
];

// Every alternation is wrapped: an unwrapped group only anchors its first and last branch, which
// is how "The Gold Rush" used to match "old" and re-sort the shelf.
const SORT_HINTS = [
  {
    pattern: /\b(?:highest(?:\s+rated)?|top\s+rated|best\s+rated|rating\s+high)\b/i,
    sortBy: 'rating_high',
  },
  { pattern: /\b(?:oldest|earliest|old)\b/i, sortBy: 'date_oldest' },
  { pattern: /\b(?:newest|latest|(?:most\s+)?recent)\b/i, sortBy: 'date_newest' },
];

const STATUS_BY_PHRASE = {
  watched: 'watched',
  seen: 'watched',
  rewatched: 'watched',
  unwatched: 'to-watch',
  watchlist: 'to-watch',
  'to-watch': 'to-watch',
  'to watch': 'to-watch',
  'want to watch': 'to-watch',
};

const STATUS_ALTERNATION = alternation(Object.keys(STATUS_BY_PHRASE));

// "watched" and "seen" are ordinary title words ("Unseen"), so on their own they only count when
// they are the whole query or an explicit cue introduces them. The compound phrases are never
// titles, so those may appear anywhere.
const STATUS_HINTS = [
  new RegExp(`^(${STATUS_ALTERNATION})$`, 'i'),
  new RegExp(`\\b(?:status|shelf|only|show)\\s*(?:[:=]\\s*|\\s)(${STATUS_ALTERNATION})\\b`, 'i'),
  /\b(unwatched|watchlist|to-watch|to watch|want to watch|rewatched)\b/i,
];

// Longest unit first: "min" would otherwise match inside "minutes" and leave "utes" behind to be
// searched for as a title.
const RUNTIME_HINT = /\b(?:under|below|less than)\s*(\d{2,3})\s*(?:minutes|mins|min)?/i;

const firstMatch = (patterns, text) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
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
  const sortHint = SORT_HINTS.find((hint) => hint.pattern.test(lowered));
  const sortMatch = sortHint ? lowered.match(sortHint.pattern) : null;
  const statusMatch = firstMatch(STATUS_HINTS, lowered);
  const runtimeMatch = lowered.match(RUNTIME_HINT);
  const moodMatch = firstMatch(MOOD_HINTS, lowered);

  // Only the fragments that were actually recognised are removed, so nothing recognisable is
  // left behind to be used as a title search.
  const searchText = [runtimeMatch?.[0], sortMatch?.[0], statusMatch?.[0], moodMatch?.[0]]
    .filter(Boolean)
    .reduce((remaining, fragment) => remaining.replace(fragment, ' '), lowered)
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalizedText: lowered,
    sortBy: sortHint?.sortBy || null,
    status: statusMatch ? STATUS_BY_PHRASE[statusMatch[1]] || null : null,
    maxRuntime: runtimeMatch ? Number.parseInt(runtimeMatch[1], 10) : null,
    mood: moodMatch?.[1] || null,
    searchText,
  };
};
