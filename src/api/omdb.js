const API_KEY = import.meta.env.VITE_OMDB_API_KEY || '';
const BASE_URL = 'https://www.omdbapi.com';

let hasWarnedAboutKey = false;

// OMDb only feeds the optional Rotten Tomatoes badge, so an absent key must degrade quietly
// rather than break a movie page.
const isConfigured = () => {
  if (API_KEY) return true;
  if (!hasWarnedAboutKey) {
    hasWarnedAboutKey = true;
    console.warn('VITE_OMDB_API_KEY is not configured; Rotten Tomatoes scores are unavailable.');
  }
  return false;
};

/**
 * Request OMDb and return the parsed body, or null for any failure.
 * OMDb answers an outage with an HTML error page, which turns an unchecked response.json() into
 * a SyntaxError that surfaced to the user as "Error searching movies".
 * @param {string} query - Query string, without the api key
 */
const requestOmdb = async (query) => {
  if (!isConfigured()) return null;

  try {
    const response = await fetch(`${BASE_URL}/?apikey=${API_KEY}&${query}`);

    if (!response.ok) {
      console.error(`OMDb request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data?.Response === 'True' ? data : null;
  } catch (error) {
    console.error('OMDb request error:', error.message);
    return null;
  }
};

/**
 * Search for movies by title
 * @param {string} query - Movie title to search for
 * @returns {Promise<Array>} - Array of movie search results
 */
export const searchMovies = async (query) => {
  const data = await requestOmdb(`s=${encodeURIComponent(query)}`);
  return data?.Search || [];
};

/**
 * Get detailed information for a specific movie by IMDB ID
 * @param {string} imdbID - IMDB ID of the movie
 * @returns {Promise<Object>} - Movie details object
 */
export const getMovieDetails = async (imdbID) =>
  requestOmdb(`i=${encodeURIComponent(imdbID)}&plot=full`);

/**
 * Extract Rotten Tomatoes score from movie ratings array
 * @param {Array} ratings - Array of rating objects from OMDb API
 * @returns {string|null} - Rotten Tomatoes score or null if not found
 */
export const getRottenTomatoesScore = (ratings) => {
  if (!ratings || !Array.isArray(ratings)) return null;
  
  const rtRating = ratings.find(rating => rating.Source === 'Rotten Tomatoes');
  return rtRating ? rtRating.Value : null;
};

/**
 * Get Rotten Tomatoes score for a movie by IMDB ID
 * @param {string} imdbID - IMDB ID of the movie
 * @returns {Promise<string|null>} - Rotten Tomatoes score or null
 */
export const getRtScoreByImdbId = async (imdbID) => {
  const details = await getMovieDetails(imdbID);
  return details ? getRottenTomatoesScore(details.Ratings) : null;
};
