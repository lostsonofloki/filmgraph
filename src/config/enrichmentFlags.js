const isEnabled = (value) => String(value || "").toLowerCase() === "true";

export const ENRICHMENT_FLAGS = {
  editorial: isEnabled(import.meta.env.VITE_FEATURE_EDITORIAL_ENRICHMENT),
  visuals: isEnabled(import.meta.env.VITE_FEATURE_VISUAL_ENRICHMENT),
  trakt: isEnabled(import.meta.env.VITE_FEATURE_TRAKT_ENRICHMENT),
};
