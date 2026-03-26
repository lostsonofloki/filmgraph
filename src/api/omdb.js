const API_KEY = 'f5fbbed8';
const BASE_URL = 'https://www.omdbapi.com';

/**
 * Search for movies by title
 * @param {string} query - Movie title to search for
 * @returns {Promise<Array>} - Array of movie search results
 */
export const searchMovies = async (query) => {
  try {
    const response = await fetch(`${BASE_URL}/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data.Response === 'True') {
      return data.Search;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

/**
 * Get detailed information for a specific movie by IMDB ID
 * @param {string} imdbID - IMDB ID of the movie
 * @returns {Promise<Object>} - Movie details object
 */
export const getMovieDetails = async (imdbID) => {
  try {
    const response = await fetch(`${BASE_URL}/?apikey=${API_KEY}&i=${imdbID}&plot=full`);
    const data = await response.json();
    
    if (data.Response === 'True') {
      return data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

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
  try {
    const details = await getMovieDetails(imdbID);
    if (details) {
      return getRottenTomatoesScore(details.Ratings);
    }
    return null;
  } catch (error) {
    console.error('Error fetching RT score:', error);
    return null;
  }
};
