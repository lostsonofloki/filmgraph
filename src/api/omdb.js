// The OMDb key must never reach the browser: Vite inlines every VITE_ variable into the bundle,
// so it lives in api/omdb-lookup.js and this module only talks to that proxy. The proxy only
// exists on Vercel, so under plain `vite dev` the request 404s and the Rotten Tomatoes badge is
// omitted, exactly as it is when the key is unset.
const PROXY_URL = '/api/omdb-lookup';

/**
 * Request the OMDb proxy and return the parsed body, or null for any failure.
 * OMDb answers an outage with an HTML error page, which turns an unchecked response.json() into
 * a SyntaxError that surfaced to the user as "Error searching movies".
 * @param {Object} params - Query parameters for the proxy
 */
const requestOmdb = async (params) => {
  try {
    const response = await fetch(`${PROXY_URL}?${new URLSearchParams(params)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(`OMDb request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data?.Response === 'True' ? data : null;
  } catch (error) {
    console.warn('OMDb request error:', error.message);
    return null;
  }
};

/**
 * Search for movies by title
 * @param {string} query - Movie title to search for
 * @returns {Promise<Array>} - Array of movie search results
 */
export const searchMovies = async (query) => {
  const data = await requestOmdb({ s: query });
  return data?.Search || [];
};

/**
 * Get detailed information for a specific movie by IMDB ID
 * @param {string} imdbID - IMDB ID of the movie
 * @returns {Promise<Object>} - Movie details object
 */
export const getMovieDetails = async (imdbID) => requestOmdb({ i: imdbID, plot: 'full' });

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
