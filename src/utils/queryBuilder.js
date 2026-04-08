/**
 * Parse a string like "> 2000", "<= 8", "2015" into { operator, value }
 * Supported operators: >, >=, <, <=, = (implicit)
 */
export function parseOperator(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  const match = trimmed.match(/^([><]=?)?\s*(.+)$/);
  if (!match) return null;

  const rawOp = match[1] || '=';
  const rawValue = match[2].trim();

  const opMap = {
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
    '=': 'eq',
  };

  const operator = opMap[rawOp] || 'eq';
  const value = isNaN(rawValue) ? rawValue : Number(rawValue);

  return { operator, value };
}

/**
 * Apply a parsed operator to a Supabase query for a given column.
 */
function applyOperator(query, column, parsed) {
  if (!parsed) return query;

  const { operator, value } = parsed;

  switch (operator) {
    case 'gt':
      return query.gt(column, value);
    case 'gte':
      return query.gte(column, value);
    case 'lt':
      return query.lt(column, value);
    case 'lte':
      return query.lte(column, value);
    case 'eq':
    default:
      return query.eq(column, value);
  }
}

/**
 * Build a dynamic Supabase query from filter state.
 * Mutates the query chain in place and returns it.
 *
 * @param {PostgrestFilterBuilder} query - The Supabase query builder instance
 * @param {Object} filters - Current filter state
 * @param {number[]} filters.genres - Array of genre IDs
 * @param {string} filters.releaseYear - e.g. "> 2000", "2015"
 * @param {string} filters.mood - Single mood string
 * @param {string} filters.minRating - e.g. ">= 4", "> 3.5"
 * @param {string} filters.searchTerm - Fuzzy search across text fields
 */
export function buildMovieQuery(query, filters) {
  const { genres, releaseYear, mood, minRating, searchTerm } = filters;

  // Genres: use .contains for array overlap (match any selected genre)
  if (genres && genres.length > 0) {
    query.contains('genres', genres);
  }

  // Release Year: parse operator and apply to 'year' column
  if (releaseYear) {
    const parsed = parseOperator(releaseYear);
    if (parsed) {
      applyOperator(query, 'year', parsed);
    }
  }

  // Mood: use .contains to check if the mood exists in the moods array
  if (mood) {
    query.contains('moods', [mood]);
  }

  // Min Rating: parse operator and apply to 'rating' column
  if (minRating) {
    const parsed = parseOperator(minRating);
    if (parsed) {
      applyOperator(query, 'rating', parsed);
    }
  }

  // Search Term: fuzzy match against title and review
  if (searchTerm) {
    const term = `%${searchTerm}%`;
    query.or(
      `title.ilike.${term},review.ilike.${term}`
    );
  }

  return query;
}
