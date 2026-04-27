const WIKIPEDIA_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary";
const NYT_TOP_STORIES_URL = "https://api.nytimes.com/svc/topstories/v2/movies.json";

const normalize = (value) => String(value || "").trim().toLowerCase();

export const fetchWikipediaSummary = async (title) => {
  if (!title) return null;
  try {
    const response = await fetch(
      `${WIKIPEDIA_SUMMARY_URL}/${encodeURIComponent(title)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.extract) return null;
    return {
      source: "wikipedia",
      title: data.title || title,
      summary: data.extract,
      url: data.content_urls?.desktop?.page || null,
    };
  } catch (error) {
    console.warn("Wikipedia enrichment failed:", error.message);
    return null;
  }
};

export const fetchNytMovieCoverage = async (title) => {
  const apiKey = import.meta.env.VITE_NYT_API_KEY;
  if (!apiKey || !title) return null;

  try {
    const response = await fetch(`${NYT_TOP_STORIES_URL}?api-key=${apiKey}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const items = Array.isArray(payload?.results) ? payload.results : [];
    const target = normalize(title);

    const best = items.find((item) => {
      const headline = normalize(item?.title);
      return headline.includes(target) || target.includes(headline);
    });

    if (!best) return null;

    return {
      source: "nyt",
      title: best.title || title,
      summary: best.abstract || best.title,
      url: best.url || null,
      byline: best.byline || null,
      publishedAt: best.published_date || null,
    };
  } catch (error) {
    console.warn("NYT enrichment failed:", error.message);
    return null;
  }
};
