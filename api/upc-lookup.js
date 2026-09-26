/* global fetch, process, console, AbortController, setTimeout, clearTimeout */

const UPC_LOOKUP_URL = "https://api.upcitemdb.com/prod/trial/lookup";
const UPC_LOOKUP_TIMEOUT_MS = 12000;
const UPC_MIN_LENGTH = 8;
// GTIN-14 is the longest real barcode; without a ceiling a caller could push tens of thousands
// of digits straight into the upstream query string.
const UPC_MAX_LENGTH = 14;
const UPC_CACHE_TTL_HOURS = Number(process.env.UPC_CACHE_TTL_HOURS || 24 * 14);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// `upc_cache` is readable with the public key but only writable with the service role, because the
// anon key ships in the browser bundle and a poisoned payload is served straight back into a scan.
const SUPABASE_READ_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_WRITE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const normalizeUpc = (upc) => String(upc || "").replace(/[^\d]/g, "");
const canReadCache = Boolean(SUPABASE_URL && SUPABASE_READ_KEY);
const canWriteCache = Boolean(SUPABASE_URL && SUPABASE_WRITE_KEY);

if (!canWriteCache) {
  console.warn(
    "[upc-lookup] SUPABASE_SERVICE_ROLE_KEY is not set; UPC responses will not be cached and every scan will hit the upstream trial endpoint.",
  );
}

const cacheHeaders = (apiKey) => ({
  apikey: apiKey,
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPC_LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const isStaleTimestamp = (value) => {
  if (!value || !Number.isFinite(UPC_CACHE_TTL_HOURS) || UPC_CACHE_TTL_HOURS <= 0) {
    return false;
  }
  const updatedAtMs = new Date(value).getTime();
  if (!Number.isFinite(updatedAtMs)) return false;
  const maxAgeMs = UPC_CACHE_TTL_HOURS * 60 * 60 * 1000;
  return Date.now() - updatedAtMs > maxAgeMs;
};

const readCachedUpc = async (cleanUpc) => {
  if (!canReadCache) return null;

  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/upc_cache?upc=eq.${encodeURIComponent(cleanUpc)}&select=payload_json,updated_at&limit=1`,
      {
        headers: cacheHeaders(SUPABASE_READ_KEY),
      },
    );

    if (!response.ok) return null;
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.payload_json) return null;

    return {
      payload: row.payload_json,
      stale: isStaleTimestamp(row.updated_at),
    };
  } catch {
    return null;
  }
};

const writeCachedUpc = async (cleanUpc, payload) => {
  if (!canWriteCache) return;

  const firstItem = payload?.items?.[0] || null;
  const sourceTitle = firstItem?.title || null;

  const cacheRow = {
    upc: cleanUpc,
    source_title: sourceTitle,
    tmdb_id: null,
    tmdb_title: null,
    tmdb_release_date: null,
    tmdb_poster_path: null,
    payload_json: payload,
    updated_at: new Date().toISOString(),
  };

  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/upc_cache?on_conflict=upc`,
      {
        method: "POST",
        headers: {
          ...cacheHeaders(SUPABASE_WRITE_KEY),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(cacheRow),
      },
    );

    // A rejected write used to be indistinguishable from a stored one, so a permanently empty
    // cache looked healthy while every scan went to the rate-limited trial endpoint.
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[upc-lookup] cache write rejected (${response.status}) for ${cleanUpc}: ${detail}`,
      );
    }
  } catch (error) {
    // Cache writes are optional; never block lookup response.
    console.warn(`[upc-lookup] cache write failed for ${cleanUpc}:`, error?.message);
  }
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawUpc = req.query?.upc;
  // A repeated `?upc=1&upc=2` arrives as an array, and `String(['1','2'])` normalises to "12",
  // so two unrelated lookups would collide on a single cache key.
  if (typeof rawUpc !== "string") {
    res.status(400).json({ error: "Enter a valid UPC before lookup." });
    return;
  }

  const cleanUpc = normalizeUpc(rawUpc);
  if (cleanUpc.length < UPC_MIN_LENGTH || cleanUpc.length > UPC_MAX_LENGTH) {
    res.status(400).json({ error: "Enter a valid UPC before lookup." });
    return;
  }

  try {
    const cachedEntry = await readCachedUpc(cleanUpc);
    if (cachedEntry && !cachedEntry.stale) {
      res.status(200).json({ ...cachedEntry.payload, cache_hit: true, cache_stale: false });
      return;
    }

    const response = await fetchWithTimeout(
      `${UPC_LOOKUP_URL}?upc=${encodeURIComponent(cleanUpc)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      if (cachedEntry?.payload) {
        res.status(200).json({ ...cachedEntry.payload, cache_hit: true, cache_stale: true });
        return;
      }
      res.status(response.status).json({ error: `UPC lookup failed (${response.status}).` });
      return;
    }

    const payload = await response.json();
    await writeCachedUpc(cleanUpc, payload);
    res.status(200).json({ ...payload, cache_hit: false, cache_stale: false });
  } catch (error) {
    if (error?.name === "AbortError") {
      const cachedEntry = await readCachedUpc(cleanUpc);
      if (cachedEntry?.payload) {
        res.status(200).json({ ...cachedEntry.payload, cache_hit: true, cache_stale: true });
        return;
      }
      res.status(504).json({ error: "UPC lookup timed out. Please try again." });
      return;
    }
    res.status(502).json({ error: "UPC lookup proxy failed." });
  }
}
