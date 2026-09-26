const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const REQUEST_TIMEOUT_MS = 12000;
// 502/504 come from the CDN in front of TMDB and are as transient as the documented 429/5xx pair.
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

// Genre mappings for TMDB
export const GENRES = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

/**
 * Raised when TMDB could not be reached or answered with something unusable. Distinct from an
 * empty result set: "we could not ask" must not be reported to the user as "it does not exist".
 */
export class TmdbRequestError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "TmdbRequestError";
    this.status = status;
    this.cause = cause;
  }
}

export const isTmdbRequestError = (error) => error?.name === "TmdbRequestError";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Without an AbortController a hung connection leaves an Oracle or import spinner running forever.
const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Perform one TMDB request, retrying transient statuses.
 * @throws {TmdbRequestError} for a missing key, transport failure, HTTP error, or unreadable body.
 */
const requestTmdb = async (path, params = {}, attempts = 3) => {
  if (!API_KEY) {
    throw new TmdbRequestError("TMDB API key missing");
  }

  const query = new URLSearchParams({ api_key: API_KEY, ...params });
  const url = `${BASE_URL}${path}?${query}`;
  let lastStatus = null;
  let lastStatusText = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchWithTimeout(url);
    } catch (error) {
      throw new TmdbRequestError(
        error?.name === "AbortError"
          ? "TMDB request timed out"
          : "Could not reach TMDB",
        { cause: error },
      );
    }

    if (response.ok) {
      try {
        return await response.json();
      } catch (error) {
        throw new TmdbRequestError("TMDB sent an unreadable response", {
          status: response.status,
          cause: error,
        });
      }
    }

    lastStatus = response.status;
    lastStatusText = response.statusText;

    if (!RETRYABLE_STATUSES.includes(response.status) || attempt === attempts) {
      break;
    }

    await sleep(200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
  }

  throw new TmdbRequestError(
    `TMDB API error: ${lastStatus} ${lastStatusText}`.trim(),
    { status: lastStatus },
  );
};

// Several pages render straight off these results and have no error branch, so the long-standing
// soft shape is kept for them: a transport failure still looks like an empty shelf. Callers that
// can tell the user something useful should use the `*Strict` variant and catch TmdbRequestError.
const softly = async (context, run, fallback) => {
  try {
    return await run();
  } catch (error) {
    console.error(`${context}:`, error.message);
    return fallback;
  }
};

const resultsOf = (data) => (Array.isArray(data?.results) ? data.results : []);

/**
 * Discover movies with filters
 * @param {string} genreId - TMDB genre ID
 * @param {string} sortBy - Sort option (popularity.desc, vote_average.desc, primary_release_date.desc)
 * @param {string} year - Release year
 * @param {string} withOriginalLanguage - Filter by original language (e.g., 'ja' for Japanese anime)
 * @returns {Promise<Array>} - Array of movies
 * @throws {TmdbRequestError}
 */
export const discoverMoviesStrict = async (
  genreId = "",
  sortBy = "popularity.desc",
  year = "",
  withOriginalLanguage = "",
) => {
  const params = { sort_by: sortBy, include_adult: "false" };
  if (genreId) params.with_genres = genreId;
  if (year) params.primary_release_year = year;
  if (withOriginalLanguage) params.with_original_language = withOriginalLanguage;

  return resultsOf(await requestTmdb("/discover/movie", params));
};

export const discoverMovies = async (...args) =>
  softly("Error discovering movies", () => discoverMoviesStrict(...args), []);

/**
 * Discover anime movies (Animation genre + Japanese language)
 * @param {string} sortBy - Sort option
 * @param {string} year - Release year
 * @returns {Promise<Array>} - Array of anime movies
 */
export const discoverAnime = async (sortBy = "popularity.desc", year = "") => {
  return discoverMovies("16", sortBy, year, "ja");
};

/**
 * Get trending movies
 * @param {string} timeWindow - 'day' or 'week'
 * @returns {Promise<Array>} - Array of trending movies
 * @throws {TmdbRequestError}
 */
export const getTrendingMoviesStrict = async (timeWindow = "week") =>
  resultsOf(
    await requestTmdb(`/trending/movie/${timeWindow}`, {
      include_adult: "false",
    }),
  );

export const getTrendingMovies = async (timeWindow = "week") =>
  softly(
    "Error fetching trending movies",
    () => getTrendingMoviesStrict(timeWindow),
    [],
  );

/**
 * Get movie details by TMDB ID
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Object>} - Movie details
 * @throws {TmdbRequestError}
 */
export const getMovieDetailsStrict = async (tmdbId) =>
  requestTmdb(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos,recommendations,similar",
  });

export const getMovieDetails = async (tmdbId) =>
  softly(
    "Error fetching movie details",
    () => getMovieDetailsStrict(tmdbId),
    null,
  );

/**
 * Search movies by title
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of movies
 * @throws {TmdbRequestError}
 */
export const searchMoviesStrict = async (query) =>
  resultsOf(
    await requestTmdb("/search/movie", { query, include_adult: "false" }),
  );

export const searchMovies = async (query) =>
  softly("Error searching movies", () => searchMoviesStrict(query), []);

/**
 * Search movies AND people via TMDB /search/multi
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of results with media_type property ('movie' or 'person')
 * @throws {TmdbRequestError}
 */
export const searchMultiStrict = async (query) => {
  const results = resultsOf(
    await requestTmdb("/search/multi", { query, include_adult: "false" }),
  );

  // Filter to only movies and people (exclude TV for now)
  return results.filter(
    (result) => result.media_type === "movie" || result.media_type === "person",
  );
};

export const searchMulti = async (query) =>
  softly("Error searching multi", () => searchMultiStrict(query), []);

/**
 * Get movie recommendations based on movie ID
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Array>} - Array of recommended movies
 * @throws {TmdbRequestError}
 */
export const getRecommendationsStrict = async (tmdbId) =>
  resultsOf(
    await requestTmdb(`/movie/${tmdbId}/recommendations`, {
      include_adult: "false",
    }),
  );

export const getRecommendations = async (tmdbId) =>
  softly(
    "Error fetching recommendations",
    () => getRecommendationsStrict(tmdbId),
    [],
  );

/**
 * Get backdrop image URL
 * @param {string} path - Backdrop path from TMDB
 * @param {string} size - Image size (w300, w780, w1280, original)
 * @returns {string} - Full image URL
 */
export const getBackdropUrl = (path, size = "w1280") => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get poster image URL
 * @param {string} path - Poster path from TMDB
 * @param {string} size - Image size (w92, w154, w185, w342, w500, w780, original)
 * @returns {string} - Full image URL
 */
export const getPosterUrl = (path, size = "w500") => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get profile image URL for cast members
 * @param {string} path - Profile path from TMDB
 * @param {string} size - Image size (w45, w185, h632, original)
 * @returns {string} - Full image URL
 */
export const getProfileUrl = (path, size = "w185") => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get watch providers for a movie (US region)
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Object|null>} - Watch provider data with flatrate, rent, buy arrays
 */
export const fetchWatchProviders = async (tmdbId) =>
  softly(
    "Error fetching watch providers",
    async () => {
      const data = await requestTmdb(`/movie/${tmdbId}/watch/providers`);
      // Return US region data if available
      return data?.results?.US || null;
    },
    null,
  );

const toMovieSummary = (movie) => ({
  id: movie.id,
  title: movie.title,
  release_date: movie.release_date,
  poster_path: movie.poster_path,
  backdrop_path: movie.backdrop_path,
  overview: movie.overview,
  vote_average: movie.vote_average,
});

/**
 * Fetch movie details from TMDB by title and year
 * @param {string} title - Movie title
 * @param {string} year - Release year (optional)
 * @returns {Promise<Object|null>} - Movie data, or null when TMDB has no such film
 * @throws {TmdbRequestError} when TMDB could not be asked
 */
export const fetchTMDBMovieStrict = async (title, year = "") => {
  const search = async (searchYear) => {
    const params = { query: title };
    if (searchYear && searchYear !== "N/A") {
      params.primary_release_year = searchYear;
    }

    const movie = resultsOf(await requestTmdb("/search/movie", params))[0];
    return movie ? toMovieSummary(movie) : null;
  };

  // Attempt 1: Title + Year (The "Precise" way)
  const precise = await search(year);
  if (precise) return precise;

  // Attempt 2: Title Only (The "Fuzzy" fallback). Without a year the first attempt already was
  // the title-only search, so repeating it would only spend a second request.
  if (!year || year === "N/A") return null;

  console.log(
    `⚠️ No match for "${title}" with year ${year}. Trying title only...`,
  );
  return search(null);
};

export const fetchTMDBMovie = async (title, year = "") =>
  softly(
    `Error fetching TMDB data for "${title}"`,
    () => fetchTMDBMovieStrict(title, year),
    null,
  );
