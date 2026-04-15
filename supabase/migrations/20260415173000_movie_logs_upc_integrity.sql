-- Barcode integrity foundation for anti-double-buy checks

ALTER TABLE public.movie_logs
  ADD COLUMN IF NOT EXISTS source_upc TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS movie_logs_user_upc_unique
  ON public.movie_logs (user_id, source_upc)
  WHERE source_upc IS NOT NULL AND source_upc <> '';
