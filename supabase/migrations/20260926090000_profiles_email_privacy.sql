-- Stop `profiles` from being a world-readable email directory.
--
-- Invite-by-email and invite-by-username resolved a stranger's profile by filtering
-- `profiles` on `email` / `username` from the browser, which only works if every row is
-- readable by everyone. An anon-key request therefore returned every user's email
-- address. The lookup moves behind a SECURITY DEFINER RPC that never returns `email`.
--
-- RLS is row-level and cannot hide a single column, and `username`, `display_name` and
-- `avatar_url` still have to be readable for *other* users: friend cards, list member
-- chips and the PostgREST embeds on `friendships` all read them, and an embed cannot be
-- redirected at a view without breaking the relationship inference. So the row policy
-- stays broad for signed-in users and `email` is hidden with column-level privileges,
-- which is the only mechanism that works per column. Nothing in the app reads
-- `profiles.email`; a user's own address comes from the auth session.

BEGIN;

-- Signup stores the address exactly as typed, so every lookup has to fold case on the
-- column side. Without this index that is a sequential scan.
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.lookup_profile_identity(p_identifier TEXT)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE CASE
          WHEN position('@' IN btrim(p_identifier)) > 0
            THEN lower(p.email) = lower(btrim(p_identifier))
          ELSE lower(p.username) = lower(btrim(p_identifier))
        END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_identity(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_identity(TEXT) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- The live policy set is unknown and has drifted from this repo, and RLS is permissive
-- (policies OR together), so anything left behind would keep the table open. Replace the
-- whole set with an explicit one instead of patching individual names.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nothing for `anon` and no DELETE policy: unauthenticated requests read nothing, and
-- rows go away with the auth user via the existing cascade.

-- Column privileges are all-or-nothing at table level, so the table-level grant has to go
-- first; revoking a single column while a table grant is held is a no-op. Enumerated from
-- the catalog because this schema has drifted and a hardcoded list would error on the
-- first column that is not there.
DO $$
DECLARE
  visible_columns TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO visible_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name <> 'email';

  REVOKE SELECT, INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;

  EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', visible_columns);
  EXECUTE format('GRANT INSERT (%s) ON public.profiles TO authenticated', visible_columns);
  EXECUTE format('GRANT UPDATE (%s) ON public.profiles TO authenticated', visible_columns);
END $$;

-- `email` is now writable only by the SECURITY DEFINER signup trigger, which also closes
-- the squat where a user could set their own row's email to someone else's address and
-- intercept invites sent to it.

COMMIT;
