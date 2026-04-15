-- Username foundation for collaborative features
-- Ensures profiles.username is normalized, unique, and queryable.

-- 1) Make sure username column exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2) Normalize existing usernames to lowercase where present
UPDATE public.profiles
SET username = lower(trim(username))
WHERE username IS NOT NULL
  AND username <> lower(trim(username));

-- 3) Backfill missing/blank usernames from email prefix (collision-safe)
DO $$
DECLARE
  rec RECORD;
  base_username TEXT;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR rec IN
    SELECT id, email
    FROM public.profiles
    WHERE username IS NULL OR length(trim(username)) = 0
  LOOP
    base_username := lower(regexp_replace(split_part(coalesce(rec.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
    IF base_username IS NULL OR length(base_username) < 3 THEN
      base_username := 'user';
    END IF;
    IF length(base_username) > 24 THEN
      base_username := left(base_username, 24);
    END IF;

    candidate := base_username;
    suffix := 1;
    WHILE EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = candidate
        AND p.id <> rec.id
    ) LOOP
      candidate := left(base_username, 24 - length(suffix::text) - 1) || '_' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE public.profiles
    SET username = candidate
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 4) Enforce validity
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_chk
  CHECK (username ~ '^[a-z0-9_]{3,24}$');

-- 5) Case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
  ON public.profiles (lower(username));

-- 6) Availability helper RPC
CREATE OR REPLACE FUNCTION public.is_username_available(
  p_username TEXT,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(p.username) = lower(trim(p_username))
      AND (p_exclude_user_id IS NULL OR p.id <> p_exclude_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO authenticated;

