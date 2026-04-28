import { searchMovies } from './tmdb';

const UPC_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup';
const UPC_LOOKUP_TIMEOUT_MS = 12000;

const normalizeUpc = (upc) => String(upc || '').replace(/[^\d]/g, '');

const buildSearchTitleCandidates = (rawTitle) => {
  const source = String(rawTitle || '').trim();
  if (!source) return [];

  const cleaned = source
    // Remove common physical/digital packaging noise.
    .replace(/\((?:[^)]*blu[-\s]?ray[^)]*|[^)]*dvd[^)]*|[^)]*digital[^)]*|[^)]*ultra\s*hd[^)]*|[^)]*4k[^)]*)\)/gi, '')
    // Remove trailing edition markers.
    .replace(/\b(collector'?s?\s*edition|special\s*edition|steelbook|combo\s*pack)\b/gi, '')
    // Normalize separators.
    .replace(/[:|/]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const beforeParen = source.split('(')[0].trim();
  const beforeDash = source.split('-')[0].trim();

  return [...new Set([source, cleaned, beforeParen, beforeDash].filter(Boolean))];
};

const normalizeForComparison = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const chooseBestTmdbMatch = async (titleCandidates) => {
  for (const candidate of titleCandidates) {
    const tmdbResults = await searchMovies(candidate);
    if (!Array.isArray(tmdbResults) || tmdbResults.length === 0) continue;

    const normalizedCandidate = normalizeForComparison(candidate);
    const exact = tmdbResults.find(
      (movie) => normalizeForComparison(movie.title) === normalizedCandidate,
    );
    const best = exact || tmdbResults[0];
    if (best) return best;
  }
  return null;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPC_LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchUpcData = async (cleanUpc) => {
  const serverProxyUrl = `/api/upc-lookup?upc=${encodeURIComponent(cleanUpc)}`;
  const directUrl = `${UPC_LOOKUP_URL}?upc=${encodeURIComponent(cleanUpc)}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;

  // First try same-origin server proxy to avoid mobile CORS restrictions.
  try {
    const proxiedResponse = await fetchWithTimeout(serverProxyUrl);
    if (proxiedResponse.ok) {
      return await proxiedResponse.json();
    }
  } catch (_serverProxyErr) {
    // Fall through to direct/fallback routes.
  }

  // Next try direct call.
  try {
    const response = await fetchWithTimeout(directUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (_directErr) {
    // Fall through to proxy fallback.
  }

  // Fallback for mobile-webview CORS / fetch restrictions.
  const proxied = await fetchWithTimeout(proxyUrl);
  if (!proxied.ok) {
    throw new Error(`UPC lookup failed (${proxied.status}).`);
  }
  return await proxied.json();
};

export const lookupMovieByUpc = async (upc) => {
  const cleanUpc = normalizeUpc(upc);
  if (!cleanUpc || cleanUpc.length < 8) {
    throw new Error('Enter a valid UPC before lookup.');
  }

  let data;
  try {
    data = await fetchUpcData(cleanUpc);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('UPC lookup timed out. Please try again.');
    }
    if (String(error?.message || '').toLowerCase().includes('failed to fetch')) {
      throw new Error('UPC lookup network/CORS blocked on this device. Try again or type UPC manually.');
    }
    throw error;
  }
  const item = data?.items?.[0];
  if (!item?.title) {
    throw new Error('No title found for that UPC.');
  }

  const titleCandidates = buildSearchTitleCandidates(item.title);
  const tmdbMovie = await chooseBestTmdbMatch(titleCandidates);

  return {
    upc: cleanUpc,
    sourceTitle: item.title,
    tmdbMovie: tmdbMovie
      ? {
          id: tmdbMovie.id,
          title: tmdbMovie.title,
          release_date: tmdbMovie.release_date,
          poster_path: tmdbMovie.poster_path,
          overview: tmdbMovie.overview,
        }
      : null,
  };
};
