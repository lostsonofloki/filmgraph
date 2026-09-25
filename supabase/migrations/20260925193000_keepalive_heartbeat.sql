-- Keep-alive heartbeat used to stop Supabase from auto-pausing the Free plan project.
--
-- Supabase pauses Free plan projects after ~7 days of low *database* activity. Only
-- traffic that actually reaches Postgres resets that window: a PostgREST table read
-- counts, whereas /auth/v1/health answers 200 without touching the database and will
-- happily report "alive" right up until the project pauses.
--
-- This table exists purely as a guaranteed-safe ping target. It holds no user data, so
-- the scheduled ping can read it with the publishable anon key and no service-role
-- secret has to live in CI. Pinging an application table instead couples the keep-alive
-- to whatever RLS policies that table happens to have.

CREATE TABLE IF NOT EXISTS public.keepalive_heartbeat (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT,
  ping_count BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT keepalive_heartbeat_single_row CHECK (id = 1)
);

INSERT INTO public.keepalive_heartbeat (id, source, ping_count)
VALUES (1, 'migration', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.keepalive_heartbeat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "keepalive_heartbeat_select_public" ON public.keepalive_heartbeat;
CREATE POLICY "keepalive_heartbeat_select_public"
  ON public.keepalive_heartbeat
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy: with RLS enabled, writes are reachable only by
-- service_role, which bypasses RLS.

-- Recording the ping is optional bookkeeping that makes "when was this last pinged?"
-- answerable from the dashboard. It also upgrades the ping from a read to a write, which
-- is unambiguously user database activity.
CREATE OR REPLACE FUNCTION public.record_keepalive_ping(ping_source TEXT DEFAULT NULL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recorded_at TIMESTAMPTZ;
BEGIN
  INSERT INTO public.keepalive_heartbeat AS h (id, pinged_at, source, ping_count)
  VALUES (1, NOW(), LEFT(COALESCE(ping_source, 'unknown'), 64), 1)
  ON CONFLICT (id) DO UPDATE
    SET pinged_at = NOW(),
        source = LEFT(COALESCE(ping_source, 'unknown'), 64),
        ping_count = h.ping_count + 1
  RETURNING h.pinged_at INTO recorded_at;

  RETURN recorded_at;
END;
$$;

-- Deliberately not granted to anon/authenticated: an anon-callable writer would let
-- anyone churn the row. The scheduled job only needs it when a service-role key is set.
REVOKE ALL ON FUNCTION public.record_keepalive_ping(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_keepalive_ping(TEXT) TO service_role;
