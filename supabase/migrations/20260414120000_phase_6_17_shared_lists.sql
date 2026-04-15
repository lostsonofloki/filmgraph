-- Phase 6.17 — Collaborative shared lists (Filmgraph)
-- Run this in the Supabase SQL Editor as a single script.
--
-- IMPORTANT: Filmgraph already uses `lists` and `list_items`. Do NOT run a fresh
-- `CREATE TABLE lists` from generic blueprints — it will fail. This migration only
-- ADDS `list_members`, backfills owners, extends `list_items`, and enables RLS.

-- ---------------------------------------------------------------------------
-- 1) Membership / permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.list_members (
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, user_id)
);

CREATE INDEX IF NOT EXISTS list_members_user_id_idx ON public.list_members(user_id);

-- ---------------------------------------------------------------------------
-- 2) Backfill: each existing list owner becomes an `owner` member
-- ---------------------------------------------------------------------------
INSERT INTO public.list_members (list_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.lists
ON CONFLICT (list_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Who added each row (collaborative attribution)
-- ---------------------------------------------------------------------------
ALTER TABLE public.list_items
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4) One movie per list (matches app logic; fails if duplicate rows exist)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS list_items_list_id_tmdb_id_uidx
  ON public.list_items (list_id, tmdb_id);

-- ---------------------------------------------------------------------------
-- 5) Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- lists
DROP POLICY IF EXISTS "lists_select_member" ON public.lists;
CREATE POLICY "lists_select_member" ON public.lists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.list_members lm
      WHERE lm.list_id = lists.id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lists_insert_owner" ON public.lists;
CREATE POLICY "lists_insert_owner" ON public.lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lists_update_owner_row" ON public.lists;
CREATE POLICY "lists_update_owner_row" ON public.lists
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lists_delete_owner_row" ON public.lists;
CREATE POLICY "lists_delete_owner_row" ON public.lists
  FOR DELETE USING (user_id = auth.uid());

-- list_members
DROP POLICY IF EXISTS "list_members_select_peer" ON public.list_members;
CREATE POLICY "list_members_select_peer" ON public.list_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.list_members me
      WHERE me.list_id = list_members.list_id AND me.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "list_members_insert" ON public.list_members;
CREATE POLICY "list_members_insert" ON public.list_members
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      (
        user_id = auth.uid()
        AND role = 'owner'
        AND EXISTS (
          SELECT 1 FROM public.lists l
          WHERE l.id = list_id AND l.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.list_members me
        WHERE me.list_id = list_members.list_id
          AND me.user_id = auth.uid()
          AND me.role = 'owner'
      )
    )
  );

DROP POLICY IF EXISTS "list_members_delete_self_or_owner" ON public.list_members;
CREATE POLICY "list_members_delete_self_or_owner" ON public.list_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.list_members me
      WHERE me.list_id = list_members.list_id
        AND me.user_id = auth.uid()
        AND me.role = 'owner'
    )
  );

-- list_items
DROP POLICY IF EXISTS "list_items_select_member" ON public.list_items;
CREATE POLICY "list_items_select_member" ON public.list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.list_members lm
      WHERE lm.list_id = list_items.list_id AND lm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "list_items_insert_editor" ON public.list_items;
CREATE POLICY "list_items_insert_editor" ON public.list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.list_members lm
      WHERE lm.list_id = list_items.list_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "list_items_update_editor" ON public.list_items;
CREATE POLICY "list_items_update_editor" ON public.list_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.list_members lm
      WHERE lm.list_id = list_items.list_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "list_items_delete_editor" ON public.list_items;
CREATE POLICY "list_items_delete_editor" ON public.list_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.list_members lm
      WHERE lm.list_id = list_items.list_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'editor')
    )
  );
