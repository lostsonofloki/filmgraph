-- ============================================================
-- SHARED LISTS SCHEMA — Phase 1
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add is_shared column to existing lists table
ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 2. Create list_members join table
CREATE TABLE IF NOT EXISTS list_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'viewer', 'editor')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

-- 3. Create list_entries table (replaces list_items for shared lists)
--    list_items stays for personal lists; list_entries adds attribution
CREATE TABLE IF NOT EXISTS list_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, tmdb_id)
);

-- 4. Enable RLS
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — list_members
-- ============================================================

-- Users can view memberships of lists they belong to
CREATE POLICY "Users can view list_members if they are a member"
  ON list_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    list_id IN (
      SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves as members (only when creating a list)
CREATE POLICY "Users can insert into list_members when creating"
  ON list_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only owners can add/remove members
CREATE POLICY "Owners can manage list_members"
  ON list_members
  FOR ALL
  USING (
    list_id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- RLS POLICIES — list_entries
-- ============================================================

-- Members can view entries of their shared lists
CREATE POLICY "Members can view list_entries"
  ON list_entries
  FOR SELECT
  USING (
    list_id IN (
      SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
  );

-- Editors and owners can add entries
CREATE POLICY "Editors/owners can insert list_entries"
  ON list_entries
  FOR INSERT
  WITH CHECK (
    list_id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Editors and owners can delete entries
CREATE POLICY "Editors/owners can delete list_entries"
  ON list_entries
  FOR DELETE
  USING (
    list_id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ============================================================
-- RLS POLICIES — lists (update for shared access)
-- ============================================================

-- Allow users to view shared lists they're a member of
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;
CREATE POLICY "Users can view their own and shared lists"
  ON lists
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    id IN (
      SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
  );

-- Allow editors/owners to update shared list metadata
DROP POLICY IF EXISTS "Users can update their own lists" ON lists;
CREATE POLICY "Users can update their own and shared lists"
  ON lists
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    id IN (
      SELECT list_id FROM list_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Allow owners to delete lists
DROP POLICY IF EXISTS "Users can delete their own lists" ON lists;
CREATE POLICY "Owners can delete their lists"
  ON lists
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION: Seed existing personal lists with owner membership
-- ============================================================
INSERT INTO list_members (list_id, user_id, role)
SELECT id, user_id, 'owner'
FROM lists
WHERE is_shared = false
ON CONFLICT (list_id, user_id) DO NOTHING;
