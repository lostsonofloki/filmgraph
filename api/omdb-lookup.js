/* global fetch, process, console, AbortController, URLSearchParams, setTimeout, clearTimeout */

const OMDB_URL = "https://www.omdbapi.com/";
const OMDB_TIMEOUT_MS = 10000;
// IMDb ids are "tt" plus seven to nine digits today; the ceiling keeps an unbounded string out of
// the upstream query.
const IMDB_ID_PATTERN = /^tt\d{6,12}$/i;
const TITLE_MAX_LENGTH = 200;
const ALLOWED_PLOTS = ["short", "full"];

// This key shipped inside the browser bundle of every release up to now, so it is already public
// and holding it here as a last resort exposes nothing new. It exists only so the Rotten Tomatoes
// badge keeps working until OMDB_API_KEY is set in Vercel; the key must be rotated at
// https://www.omdbapi.com/apikey.aspx and this fallback deleted.
const COMPROMISED_FALLBACK_KEY = "f5fbbed8";
const API_KEY = process.env.OMDB_API_KEY || COMPROMISED_FALLBACK_KEY;

if (!process.env.OMDB_API_KEY) {
  console.warn(
    "[omdb-lookup] OMDB_API_KEY is not set; falling back to the compromised key that shipped in the client bundle. Rotate the key and configure OMDB_API_KEY.",
  );
}

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OMDB_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

// A repeated `?i=tt1&i=tt2` arrives as an array, which must not be coerced into one query value.
const readParam = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Translate the caller's query into the upstream query, or null when it is unusable.
 * Only the two shapes src/api/omdb.js needs are accepted: lookup by IMDb id, or title search.
 */
const buildUpstreamQuery = (query) => {
  const imdbId = readParam(query?.i);
  const title = readParam(query?.s);

  if (Boolean(imdbId) === Boolean(title)) return null;

  if (imdbId) {
    if (!IMDB_ID_PATTERN.test(imdbId)) return null;
    const params = new URLSearchParams({ apikey: API_KEY, i: imdbId.toLowerCase() });
    const plot = readParam(query?.plot).toLowerCase();
    if (ALLOWED_PLOTS.includes(plot)) params.set("plot", plot);
    return params;
  }

  if (title.length > TITLE_MAX_LENGTH) return null;
  return new URLSearchParams({ apikey: API_KEY, s: title });
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const params = buildUpstreamQuery(req.query);
  if (!params) {
    res.status(400).json({ error: "Provide either an IMDb id (i) or a title (s)." });
    return;
  }

  try {
    const response = await fetchWithTimeout(`${OMDB_URL}?${params}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`[omdb-lookup] upstream responded ${response.status} ${response.statusText}`);
      res.status(502).json({ error: "OMDb lookup failed." });
      return;
    }

    // OMDb answers an outage with an HTML error page, so the parse is part of the try.
    const payload = await response.json();
    res.status(200).json(payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      console.error("[omdb-lookup] upstream request timed out");
      res.status(504).json({ error: "OMDb lookup timed out." });
      return;
    }
    console.error("[omdb-lookup] proxy failed:", error?.message);
    res.status(502).json({ error: "OMDb lookup failed." });
  }
}
