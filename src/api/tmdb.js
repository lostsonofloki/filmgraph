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
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sortBy}&include_adult=false`;

    if (genreId) {
      url += `&with_genres=${genreId}`;
    }

    if (year) {
      url += `&primary_release_year=${year}`;
    }

    if (withOriginalLanguage) {
      url += `&with_original_language=${withOriginalLanguage}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
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
      `${BASE_URL}/trending/movie/${timeWindow}?api_key=${API_KEY}&include_adult=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
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
      `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits,videos,recommendations,similar`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
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
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

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
 * Search movies AND people via TMDB /search/multi
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of results with media_type property ('movie' or 'person')
 */
export const searchMulti = async (query) => {
  try {
    const response = await fetch(
      `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.results) {
      // Filter to only movies and people (exclude TV for now)
      return data.results.filter(
        result => result.media_type === 'movie' || result.media_type === 'person'
      );
    }
    return [];
  } catch (error) {
    console.error('Error searching multi:', error);
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
      `${BASE_URL}/movie/${tmdbId}/recommendations?api_key=${API_KEY}&include_adult=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
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

/**
 * Get watch providers for a movie (US region)
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<Object|null>} - Watch provider data with flatrate, rent, buy arrays
 */
export const fetchWatchProviders = async (tmdbId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${tmdbId}/watch/providers?api_key=${API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();

    // Return US region data if available
    return data?.results?.US || null;
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return null;
  }
};

/**
 * Fetch movie details from TMDB by title and year
 * @param {string} title - Movie title
 * @param {string} year - Release year (optional)
 * @returns {Promise<Object|null>} - Movie data with poster_path and release_date
 */
export const fetchTMDBMovie = async (title, year = '') => {
  const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    console.error('TMDB API key missing');
    return null;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchWithRetry = async (url, attempts = 3) => {
    let lastResponse = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetch(url);
      lastResponse = response;
      if (response.ok) return response;
      if (![429, 500, 503].includes(response.status) || attempt === attempts) {
        return response;
      }
      const delayMs = 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
      await sleep(delayMs);
    }
    return lastResponse;
  };

  // Helper to run the actual fetch
  const search = async (searchYear) => {
    const searchQuery = encodeURIComponent(title);
    const yearParam = searchYear && searchYear !== 'N/A' ? `&primary_release_year=${searchYear}` : '';
    
    const response = await fetchWithRetry(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        return {
          id: movie.id,
          title: movie.title,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          overview: movie.overview,
          vote_average: movie.vote_average,
        };
      }
    }
    return null;
  };

  try {
    // Attempt 1: Title + Year (The "Precise" way)
    let movie = await search(year);

    // Attempt 2: Title Only (The "Fuzzy" fallback)
    if (!movie) {
      console.log(`⚠️ No match for "${title}" with year ${year}. Trying title only...`);
      movie = await search(null);
    }

    return movie;
  } catch (error) {
    console.error(`Error fetching TMDB data for "${title}":`, error.message);
    return null;
  }
};
