const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://filmgraph.app';
};

const toAbsoluteUrl = (path = '/') => {
  const base = getOrigin();
  const safePath = String(path || '/').startsWith('/') ? path : `/${path}`;
  return `${base}${safePath}`;
};

export const buildMovieSharePayload = ({ title, year, rating, moods = [], tmdbId }) => {
  const safeTitle = title || 'Untitled movie';
  const moodText = moods.length ? ` | moods: ${moods.slice(0, 3).join(', ')}` : '';
  const ratingText = Number.isFinite(rating) ? ` | rating: ${Number(rating).toFixed(1)}/5` : '';
  const yearText = year ? ` (${year})` : '';
  const url = tmdbId ? toAbsoluteUrl(`/movie/${tmdbId}`) : toAbsoluteUrl('/library');
  const text = `I logged "${safeTitle}"${yearText} on Filmgraph${ratingText}${moodText}.\n${url}`;

  return {
    title: `Filmgraph: ${safeTitle}`,
    text,
    url,
  };
};

export const buildListSharePayload = ({ listId, listName, itemCount = 0 }) => {
  const safeName = listName || 'My Filmgraph list';
  const url = listId ? toAbsoluteUrl(`/library?list=${listId}`) : toAbsoluteUrl('/library');
  const text = `Check out my Filmgraph list "${safeName}" (${itemCount} movies).\n${url}`;

  return {
    title: `Filmgraph List: ${safeName}`,
    text,
    url,
  };
};

export const executeShare = async (payload) => {
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  if (canNativeShare) {
    try {
      await navigator.share(payload);
      return { status: 'shared' };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { status: 'cancelled' };
      }
    }
  }

  const clipboardText = `${payload.text || ''}`.trim() || payload.url || '';
  const canClipboard = typeof navigator !== 'undefined' && navigator.clipboard?.writeText;
  if (canClipboard) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return { status: 'copied' };
    } catch (error) {
      return { status: 'error', error };
    }
  }

  return {
    status: 'error',
    error: new Error('Sharing and clipboard are unavailable in this browser.'),
  };
};
