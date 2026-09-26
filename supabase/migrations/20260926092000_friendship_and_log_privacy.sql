-- Make "accepted friend" a database fact, and stop a sender accepting their own request.
--
-- `acceptRequest` updated `friendships` by id only. Under the usual
-- `auth.uid() = sender_id OR auth.uid() = receiver_id` UPDATE policy the *sender* could
-- flip their own pending request to `accepted`, and because the `movie_logs` SELECT policy
-- had been widened so friends could compare libraries, that self-acceptance handed them
-- the target's entire library.
--
-- Friend libraries now come from one SECURITY DEFINER reader that checks the friendship
-- itself, so `movie_logs` goes back to owner-only rows. That also means `review` — private
-- notes — is no longer reachable by anyone else, while the Compatibility Report keeps the
-- six fields it actually renders.

BEGIN;

CREATE OR REPLACE FUNCTION public.users_are_friends(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_a IS NOT NULL
     AND p_user_b IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.friendships f
       WHERE f.status = 'accepted'
         AND (
           (f.sender_id = p_user_a AND f.receiver_id = p_user_b)
           OR (f.sender_id = p_user_b AND f.receiver_id = p_user_a)
         )
     );
$$;

REVOKE ALL ON FUNCTION public.users_are_friends(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_are_friends(UUID, UUID) TO authenticated;

-- JSONB rather than a typed row set: `genres` and the generated `poster_path` have drifted
-- between environments, and a declared RETURNS TABLE would fail to create wherever the
-- types do not match. `review` is deliberately absent.
CREATE OR REPLACE FUNCTION public.get_friend_movie_logs(p_friend_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  logs JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to compare libraries.' USING ERRCODE = '42501';
  END IF;

  IF p_friend_id IS DISTINCT FROM auth.uid()
     AND NOT public.users_are_friends(auth.uid(), p_friend_id) THEN
    RAISE EXCEPTION 'You can only compare libraries with accepted friends.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tmdb_id', ml.tmdb_id,
        'title', ml.title,
        'poster_path', ml.poster_path,
        'rating', ml.rating,
        'genres', ml.genres,
        'watch_status', ml.watch_status
      )
    ),
    '[]'::jsonb
  )
  INTO logs
  FROM public.movie_logs ml
  WHERE ml.user_id = p_friend_id;

  RETURN logs;
END;
$$;

REVOKE ALL ON FUNCTION public.get_friend_movie_logs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friend_movie_logs(UUID) TO authenticated;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS is permissive, so a leftover `FOR ALL` policy would keep granting the sender an
-- UPDATE no matter what is added alongside it. Replace the whole set.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.friendships', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "friendships_select_participant" ON public.friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "friendships_insert_sender" ON public.friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id IS DISTINCT FROM receiver_id
    AND status = 'pending'
  );

CREATE POLICY "friendships_update_receiver" ON public.friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND status IN ('pending', 'accepted'));

-- Decline, cancel and unfriend are all deletes, and either side may do them.
CREATE POLICY "friendships_delete_participant" ON public.friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

ALTER TABLE public.movie_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'movie_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.movie_logs', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "movie_logs_select_own" ON public.movie_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "movie_logs_insert_own" ON public.movie_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "movie_logs_update_own" ON public.movie_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "movie_logs_delete_own" ON public.movie_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
