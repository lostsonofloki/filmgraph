const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Genre mappings for TMDB
export const GENRES = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

/**
 * Discover movies with filters
 * @param {string} genreId - TMDB genre ID
 * @param {string} sortBy - Sort option (popularity.desc, vote_average.desc, primary_release_date.desc)
 * @param {string} year - Release year
 * @param {string} withOriginalLanguage - Filter by original language (e.g., 'ja' for Japanese anime)
 * @returns {Promise<Array>} - Array of movies
 */
export const discoverMovies = async (genreId = '', sortBy = 'popularity.desc', year = '', withOriginalLanguage = '') => {
  try {
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sortBy}`;

    if (genreId) {
      url += `&with_genres=${genreId}`;
    }

    if (year) {
      url += `&primary_release_year=${year}`;
    }

    if (withOriginalLanguage) {
      url += `&with_original_language=${withOriginalLanguage}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.results) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error('Error discovering movies:', error);
    return [];
  }
};

/**
 * Discover anime movies (Animation genre + Japanese language)
 * @param {string} sortBy - Sort option
 * @param {string} year - Release year
 * @returns {Promise<Array>} - Array of anime movies
 */
export const discoverAnime = async (sortBy = 'popularity.desc', year = '') => {
  return discoverMovies('16', sortBy, year, 'ja');
};

/**
 * Get trending movies
 * @param {string} timeWindow - 'day' or 'week'
 * @returns {Promise<Array>} - Array of trending movies
 */
export const getTrendingMovies = async (timeWindow = 'week') => {
  try {
    const response = await fetch(
      `${BASE_URL}/trending/movie/${timeWindow}?api_key=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.results) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
};

/**
 * Get movie details by TMDB ID
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Object>} - Movie details
 */
export const getMovieDetails = async (tmdbId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits,videos,recommendations,similar`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

/**
 * Search movies by title
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of movies
 */
export const searchMovies = async (query) => {
  try {
    const response = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    
    if (data.results) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};

/**
 * Get movie recommendations based on movie ID
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Array>} - Array of recommended movies
 */
export const getRecommendations = async (tmdbId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${tmdbId}/recommendations?api_key=${API_KEY}`
    );
    const data = await response.json();
    
    if (data.results) {
      return data.results;
    }
    return [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

/**
 * Get backdrop image URL
 * @param {string} path - Backdrop path from TMDB
 * @param {string} size - Image size (w300, w780, w1280, original)
 * @returns {string} - Full image URL
 */
export const getBackdropUrl = (path, size = 'w1280') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get poster image URL
 * @param {string} path - Poster path from TMDB
 * @param {string} size - Image size (w92, w154, w185, w342, w500, w780, original)
 * @returns {string} - Full image URL
 */
export const getPosterUrl = (path, size = 'w500') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

/**
 * Get profile image URL for cast members
 * @param {string} path - Profile path from TMDB
 * @param {string} size - Image size (w45, w185, h632, original)
 * @returns {string} - Full image URL
 */
export const getProfileUrl = (path, size = 'w185') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};
