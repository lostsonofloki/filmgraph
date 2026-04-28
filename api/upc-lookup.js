const UPC_LOOKUP_URL = "https://api.upcitemdb.com/prod/trial/lookup";
const UPC_LOOKUP_TIMEOUT_MS = 12000;

const normalizeUpc = (upc) => String(upc || "").replace(/[^\d]/g, "");

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPC_LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export default async function handler(req, res) {
  const cleanUpc = normalizeUpc(req.query?.upc || "");
  if (!cleanUpc || cleanUpc.length < 8) {
    res.status(400).json({ error: "Enter a valid UPC before lookup." });
    return;
  }

  try {
    const response = await fetchWithTimeout(
      `${UPC_LOOKUP_URL}?upc=${encodeURIComponent(cleanUpc)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      res.status(response.status).json({ error: `UPC lookup failed (${response.status}).` });
      return;
    }

    const payload = await response.json();
    res.status(200).json(payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      res.status(504).json({ error: "UPC lookup timed out. Please try again." });
      return;
    }
    res.status(502).json({ error: "UPC lookup proxy failed." });
  }
}
