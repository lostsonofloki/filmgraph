-- Create the profile row server-side instead of from the browser after sign-up.
--
-- With email confirmation on, `auth.signUp()` returns a user but no session, so the
-- client-side upsert that used to follow it ran as `anon` with `auth.uid()` NULL. Either
-- it was rejected — leaving an auth account with no profile row, unrecoverable because
-- `profiles.username` is NOT NULL and nothing creates it lazily — or it succeeded, which
-- would mean `profiles` accepted anonymous writes keyed on the primary key and any id
-- could be overwritten.
--
-- A trigger on `auth.users` runs inside the same transaction as the signup insert, so a
-- failure here rolls the auth user back too: the user sees an error and can retry rather
-- than ending up half-registered.

BEGIN;

CREATE OR REPLACE FUNCTION public.filmgraph_available_username(p_desired TEXT, p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  suffix INTEGER := 1;
BEGIN
  base := regexp_replace(
    lower(COALESCE(NULLIF(btrim(p_desired), ''), split_part(COALESCE(p_email, ''), '@', 1))),
    '[^a-z0-9_]', '', 'g'
  );

  IF base IS NULL OR length(base) < 3 THEN
    base := 'user';
  END IF;
  base := left(base, 24);

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.username) = candidate) LOOP
    IF suffix > 50 THEN
      candidate := left(base, 15) || '_' || substr(md5(random()::text), 1, 8);
    ELSE
      candidate := left(base, 24 - (length(suffix::text) + 1)) || '_' || suffix::text;
    END IF;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.filmgraph_available_username(TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_username TEXT;
  resolved_display_name TEXT;
BEGIN
  resolved_username := public.filmgraph_available_username(
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'username', '')), ''),
    NEW.email
  );
  resolved_display_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), '');

  INSERT INTO public.profiles (id, email, username, display_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    resolved_username,
    COALESCE(resolved_display_name, resolved_username),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- `profiles.email` is what invite-by-email matches on, so it has to follow an address
-- change in auth instead of silently going stale.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id
    AND email IS DISTINCT FROM NEW.email;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_email() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Recover accounts whose browser-side profile insert was rejected. Additive only: rows
-- that already exist are left exactly as they are.
DO $$
DECLARE
  orphan RECORD;
  resolved_username TEXT;
  resolved_display_name TEXT;
BEGIN
  FOR orphan IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    resolved_username := public.filmgraph_available_username(
      NULLIF(btrim(COALESCE(orphan.raw_user_meta_data ->> 'username', '')), ''),
      orphan.email
    );
    resolved_display_name := NULLIF(btrim(COALESCE(orphan.raw_user_meta_data ->> 'display_name', '')), '');

    INSERT INTO public.profiles (id, email, username, display_name, updated_at)
    VALUES (
      orphan.id,
      orphan.email,
      resolved_username,
      COALESCE(resolved_display_name, resolved_username),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

COMMIT;
