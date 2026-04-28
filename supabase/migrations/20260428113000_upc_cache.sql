-- UPC lookup cache for faster repeated barcode resolutions

CREATE TABLE IF NOT EXISTS public.upc_cache (
  upc TEXT PRIMARY KEY,
  source_title TEXT,
  tmdb_id INTEGER,
  tmdb_title TEXT,
  tmdb_release_date TEXT,
  tmdb_poster_path TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS upc_cache_updated_at_idx
  ON public.upc_cache (updated_at DESC);

CREATE INDEX IF NOT EXISTS upc_cache_tmdb_id_idx
  ON public.upc_cache (tmdb_id);
