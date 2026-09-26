-- Close the open write path on `upc_cache`.
--
-- `20260428113000_upc_cache.sql` created the table without enabling RLS, and Supabase grants
-- `anon` and `authenticated` full DML on `public` tables by default. The anon key ships in
-- the browser bundle, so anyone could overwrite `payload_json` for any barcode, and
-- `api/upc-lookup.js` hands a cache hit straight back to `lookupMovieByUpc`: a scanned disc
-- would resolve to whatever film the attacker chose and get logged as owned.
--
-- Reads stay open — the payload is upstream barcode metadata, not user data, and the proxy
-- reads it with whichever key it has. Writes are left to `service_role`, which bypasses RLS.
--
-- REQUIRES `SUPABASE_SERVICE_ROLE_KEY` IN THE DEPLOYMENT ENVIRONMENT. `api/upc-lookup.js`
-- falls back to the anon key and swallows cache write failures, so if that variable is not
-- set the cache silently stops filling after this migration and every scan goes to the
-- rate-limited upstream trial endpoint. See SUPABASE_MIGRATION_NOTES.md.

BEGIN;

ALTER TABLE public.upc_cache ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'upc_cache'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.upc_cache', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "upc_cache_select_public" ON public.upc_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Belt and braces: without the table grant a rejected write returns a plain permission
-- error instead of an RLS no-op, which is far easier to spot in the proxy logs.
REVOKE INSERT, UPDATE, DELETE ON public.upc_cache FROM PUBLIC, anon, authenticated;

COMMIT;
