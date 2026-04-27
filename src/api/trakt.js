const TRAKT_API_URL = "https://api.trakt.tv/search/movie";

export const fetchTraktMatch = async (title, year) => {
  const clientId = import.meta.env.VITE_TRAKT_CLIENT_ID;
  if (!clientId || !title) return null;

  try {
    const query = new URLSearchParams({
      query: title,
      ...(year ? { years: String(year) } : {}),
    });
    const response = await fetch(`${TRAKT_API_URL}?${query.toString()}`, {
      headers: {
        Accept: "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.movie) return null;

    return {
      source: "trakt",
      title: first.movie.title,
      year: first.movie.year,
      ids: first.movie.ids || {},
    };
  } catch (error) {
    console.warn("Trakt enrichment failed:", error.message);
    return null;
  }
};
