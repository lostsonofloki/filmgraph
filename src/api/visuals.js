export const fetchFanartAssets = async (tmdbId) => {
  const apiKey = import.meta.env.VITE_FANART_API_KEY;
  if (!apiKey || !tmdbId) return null;

  try {
    const response = await fetch(
      `https://webservice.fanart.tv/v3/movies/${tmdbId}?api_key=${apiKey}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const logos = payload?.hdmovielogo || payload?.movielogo || [];
    const backgrounds = payload?.moviebackground || payload?.moviethumb || [];

    return {
      source: "fanart",
      logo: logos[0]?.url || null,
      backdrop: backgrounds[0]?.url || null,
      logoCount: Array.isArray(logos) ? logos.length : 0,
      backdropCount: Array.isArray(backgrounds) ? backgrounds.length : 0,
    };
  } catch (error) {
    console.warn("Fanart enrichment failed:", error.message);
    return null;
  }
};
