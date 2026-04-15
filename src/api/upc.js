import { searchMovies } from './tmdb';

const UPC_LOOKUP_URL = 'https://api.upcitemdb.com/prod/trial/lookup';

const normalizeUpc = (upc) => String(upc || '').replace(/[^\d]/g, '');

export const lookupMovieByUpc = async (upc) => {
  const cleanUpc = normalizeUpc(upc);
  if (!cleanUpc || cleanUpc.length < 8) {
    throw new Error('Enter a valid UPC before lookup.');
  }

  const response = await fetch(`${UPC_LOOKUP_URL}?upc=${encodeURIComponent(cleanUpc)}`);
  if (!response.ok) {
    throw new Error(`UPC lookup failed (${response.status}).`);
  }

  const data = await response.json();
  const item = data?.items?.[0];
  if (!item?.title) {
    throw new Error('No title found for that UPC.');
  }

  const tmdbResults = await searchMovies(item.title);
  const tmdbMovie = (tmdbResults || [])[0];

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
