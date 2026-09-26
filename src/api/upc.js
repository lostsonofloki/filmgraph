import { searchMoviesStrict } from './tmdb';

const UPC_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup';
const UPC_LOOKUP_TIMEOUT_MS = 12000;

// Noise that appears in disc titles inside either round or square brackets.
const PACKAGING_NOISE = String.raw`blu[-\s]?ray|dvd|digital|ultra\s*hd|4k|uhd`;
const PAREN_NOISE = new RegExp(String.raw`\([^)]*(?:${PACKAGING_NOISE})[^)]*\)`, 'gi');
const BRACKET_NOISE = new RegExp(String.raw`\[[^\]]*(?:${PACKAGING_NOISE})[^\]]*\]`, 'gi');
const EDITION_MARKERS = /\b(collector'?s?\s*edition|special\s*edition|steelbook|combo\s*pack)\b/gi;
const YEAR_IN_TITLE = /\b(1[89]\d{2}|20\d{2})\b/;

const normalizeUpc = (upc) => String(upc || '').replace(/[^\d]/g, '');

const normalizeForComparison = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenize = (value) => normalizeForComparison(value).split(' ').filter(Boolean);

const stripPackaging = (source) =>
  source
    .replace(PAREN_NOISE, '')
    .replace(BRACKET_NOISE, '')
    .replace(EDITION_MARKERS, '')
    .replace(/[:|/]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const buildSearchTitleCandidates = (rawTitle) => {
  const source = String(rawTitle || '').trim();
  if (!source) return [];

  const cleaned = stripPackaging(source);
  const beforeBracket = source.split(/[([]/)[0].trim();
  // Only a spaced dash separates a title from packaging text; splitting on a bare dash truncated
  // "X-Men", "Ant-Man" and "WALL-E" down to a one-word query.
  const beforeSpacedDash = source.split(/\s+[-–—]\s+/)[0].trim();

  const baselineTokens = tokenize(cleaned);
  const minTokens = Math.max(1, Math.ceil(baselineTokens.length / 2));

  // A trimmed candidate that has thrown away most of the scanned title matches almost anything,
  // which is how a scan of "X-Men: Days of Future Past" could be saved as "X".
  const keepsEnoughOfTitle = (candidate) =>
    candidate === source ||
    (candidate.length >= 2 && tokenize(candidate).length >= minTokens);

  return [...new Set([source, cleaned, beforeBracket, beforeSpacedDash])]
    .filter(Boolean)
    .filter(keepsEnoughOfTitle);
};

/**
 * A wrong film written into the collection is worse than no film at all, so a result only counts
 * when its own title is mostly made of words from the scanned title.
 */
const isPlausibleMatch = (movieTitle, baselineTokens) => {
  const titleTokens = tokenize(movieTitle);
  if (titleTokens.length === 0) return false;
  if (titleTokens.length === 1 && baselineTokens.length > 2) return false;

  const shared = titleTokens.filter((token) => baselineTokens.includes(token)).length;
  return shared / titleTokens.length >= 0.6;
};

const chooseBestTmdbMatch = async (titleCandidates, scannedTitle) => {
  const baselineTokens = tokenize(stripPackaging(scannedTitle));
  const scannedYear = scannedTitle.match(YEAR_IN_TITLE)?.[1] || null;

  for (const candidate of titleCandidates) {
    const tmdbResults = await searchMoviesStrict(candidate);
    if (tmdbResults.length === 0) continue;

    const normalizedCandidate = normalizeForComparison(candidate);
    const exact = tmdbResults.find(
      (movie) => normalizeForComparison(movie.title) === normalizedCandidate,
    );
    const sameYear = scannedYear
      ? tmdbResults.find((movie) => String(movie.release_date || '').startsWith(scannedYear))
      : null;
    const best = exact || sameYear || tmdbResults[0];

    if (best && isPlausibleMatch(best.title, baselineTokens)) return best;
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

  // The disc itself was identified, so a TMDB problem must not throw: the scan can still be saved
  // with manual movie context.
  let tmdbMovie = null;
  let tmdbError = null;
  try {
    tmdbMovie = await chooseBestTmdbMatch(titleCandidates, item.title);
  } catch (error) {
    console.error('TMDB match failed during UPC lookup:', error.message);
    tmdbError = error.message;
  }

  return {
    upc: cleanUpc,
    sourceTitle: item.title,
    tmdbError,
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
