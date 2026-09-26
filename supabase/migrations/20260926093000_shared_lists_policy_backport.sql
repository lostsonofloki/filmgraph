-- Backport the production fix for the recursive shared-list policies, and add the UPDATE
-- policy `list_members` never had.
--
-- `20260414120000_phase_6_17_shared_lists.sql` still ships `list_members_select_peer`,
-- which queries `list_members` from a policy *on* `list_members`, and `lists_select_member`,
-- which reaches into it from `lists`. Postgres answers `42P17 infinite recursion detected
-- in policy` and every list request 500s. Production was repaired by hand with
-- `list_owned_by_user` / `user_is_member_of_list` / `user_can_edit_shared_list` (CHANGELOG
-- v1.9.4) but the repo kept the broken version, so `supabase db push` or any fresh, staging
-- or restored database reinstalls the recursion. This file is the missing backport.
--
-- Separately, that migration defined SELECT, INSERT and DELETE for `list_members` and no
-- UPDATE. With RLS on, an UPDATE matches zero rows, which is why changing a collaborator's
-- role always failed and why `inviteListMember`'s upsert errored for an existing member
-- instead of being the no-op it is written as.
--
-- Safe to re-apply to a database that already has the helpers: the policies that depend on
-- them are dropped first so the functions can be replaced whatever signature they
-- currently have, and the full policy set is recreated afterwards.

BEGIN;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('lists', 'list_members', 'list_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- CREATE OR REPLACE cannot rename an input parameter, and the hand-applied production
-- helpers may not use these names, so drop by resolved signature first. No CASCADE: if
-- something outside the three tables above still depends on a helper the whole script
-- aborts with a clear message rather than quietly deleting that dependency.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('list_owned_by_user', 'user_is_member_of_list', 'user_can_edit_shared_list')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', fn.signature);
  END LOOP;
END $$;

-- SECURITY DEFINER is the whole point: these run as the owner, so reading `list_members`
-- from a policy on `list_members` does not re-enter RLS.
CREATE OR REPLACE FUNCTION public.list_owned_by_user(p_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_list_id IS NOT NULL
     AND p_user_id IS NOT NULL
     AND (
       EXISTS (
         SELECT 1 FROM public.lists l
         WHERE l.id = p_list_id AND l.user_id = p_user_id
       )
       OR EXISTS (
         SELECT 1 FROM public.list_members m
         WHERE m.list_id = p_list_id AND m.user_id = p_user_id AND m.role = 'owner'
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.user_is_member_of_list(p_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_list_id IS NOT NULL
     AND p_user_id IS NOT NULL
     AND (
       EXISTS (
         SELECT 1 FROM public.list_members m
         WHERE m.list_id = p_list_id AND m.user_id = p_user_id
       )
       OR EXISTS (
         SELECT 1 FROM public.lists l
         WHERE l.id = p_list_id AND l.user_id = p_user_id
       )
     );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_shared_list(p_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_list_id IS NOT NULL
     AND p_user_id IS NOT NULL
     AND (
       EXISTS (
         SELECT 1 FROM public.list_members m
         WHERE m.list_id = p_list_id
           AND m.user_id = p_user_id
           AND m.role IN ('owner', 'editor')
       )
       OR EXISTS (
         SELECT 1 FROM public.lists l
         WHERE l.id = p_list_id AND l.user_id = p_user_id
       )
     );
$$;

REVOKE ALL ON FUNCTION public.list_owned_by_user(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_is_member_of_list(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_edit_shared_list(UUID, UUID) FROM PUBLIC;

-- The policies below are evaluated as the calling role, so `authenticated` needs EXECUTE.
GRANT EXECUTE ON FUNCTION public.list_owned_by_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_member_of_list(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit_shared_list(UUID, UUID) TO authenticated;

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lists_select_member" ON public.lists
  FOR SELECT
  TO authenticated
  USING (public.user_is_member_of_list(id, auth.uid()));

CREATE POLICY "lists_insert_owner" ON public.lists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lists_update_owner_row" ON public.lists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lists_delete_owner_row" ON public.lists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "list_members_select_peer" ON public.list_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.user_is_member_of_list(list_id, auth.uid()));

CREATE POLICY "list_members_insert_owner" ON public.list_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.list_owned_by_user(list_id, auth.uid()));

CREATE POLICY "list_members_update_owner" ON public.list_members
  FOR UPDATE
  TO authenticated
  USING (public.list_owned_by_user(list_id, auth.uid()))
  WITH CHECK (
    public.list_owned_by_user(list_id, auth.uid())
    AND role IN ('owner', 'editor', 'viewer')
  );

CREATE POLICY "list_members_delete_self_or_owner" ON public.list_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.list_owned_by_user(list_id, auth.uid()));

CREATE POLICY "list_items_select_member" ON public.list_items
  FOR SELECT
  TO authenticated
  USING (public.user_is_member_of_list(list_id, auth.uid()));

CREATE POLICY "list_items_insert_editor" ON public.list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_edit_shared_list(list_id, auth.uid()));

CREATE POLICY "list_items_update_editor" ON public.list_items
  FOR UPDATE
  TO authenticated
  USING (public.user_can_edit_shared_list(list_id, auth.uid()))
  WITH CHECK (public.user_can_edit_shared_list(list_id, auth.uid()));

CREATE POLICY "list_items_delete_editor" ON public.list_items
  FOR DELETE
  TO authenticated
  USING (public.user_can_edit_shared_list(list_id, auth.uid()));

COMMIT;
