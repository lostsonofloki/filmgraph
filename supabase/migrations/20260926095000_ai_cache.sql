-- Define `ai_cache`, which the Oracle has always written to but no migration ever created.
--
-- Both sides of that code depend on a constraint nothing in the repo declares: the read used
-- `.single()` and the write `onConflict: 'user_id,cache_type'`. If the unique index is absent
-- the upsert fails with `42P10` and the read fails with PGRST116 once a second row exists —
-- and both failures were swallowed, so the cache could have been dead for a long time
-- without anyone noticing.
--
-- One row per (user_id, cache_type) is kept deliberately: the recommendation set is keyed on
-- the user's moods and library/banish counts via `cache_key`, and the client now compares
-- that column on read, so a changed mood misses the cache and the fresh result replaces the
-- stale row. Widening the key to include `cache_key` instead would need the pre-existing
-- unique constraint dropped, which is riskier for no user-visible gain.
--
-- Written to be re-appliable to the live database: the table and index use IF NOT EXISTS and
-- nothing outside `ai_cache` — a derived cache, not user data — is touched.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_type TEXT NOT NULL,
  cache_key TEXT NOT NULL DEFAULT '',
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_cache ADD COLUMN IF NOT EXISTS cache_key TEXT;
UPDATE public.ai_cache SET cache_key = '' WHERE cache_key IS NULL;
ALTER TABLE public.ai_cache ALTER COLUMN cache_key SET DEFAULT '';
ALTER TABLE public.ai_cache ALTER COLUMN cache_key SET NOT NULL;

-- A unique index cannot be created over existing duplicates, and duplicates are exactly what
-- a missing constraint plus a swallowed upsert error would have produced. Newest row per key
-- wins; the discarded rows are expired AI suggestions.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, cache_type
      ORDER BY created_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.ai_cache
)
DELETE FROM public.ai_cache c
USING ranked r
WHERE c.ctid = r.ctid
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ai_cache_user_id_cache_type_uidx
  ON public.ai_cache (user_id, cache_type);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_cache'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ai_cache', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "ai_cache_select_own" ON public.ai_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ai_cache_insert_own" ON public.ai_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- The Oracle upserts, so the conflicting row has to pass an UPDATE policy too.
CREATE POLICY "ai_cache_update_own" ON public.ai_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_cache_delete_own" ON public.ai_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
