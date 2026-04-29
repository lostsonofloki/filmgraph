-- Phase 7.8 pre-launch hardening:
-- Ensure list_members cannot contain duplicate membership rows.

-- 1) Defensive cleanup for legacy environments that might have drifted.
WITH ranked AS (
  SELECT
    ctid,
    list_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY list_id, user_id
      ORDER BY joined_at ASC, ctid ASC
    ) AS rn
  FROM public.list_members
)
DELETE FROM public.list_members lm
USING ranked r
WHERE lm.ctid = r.ctid
  AND r.rn > 1;

-- 2) Idempotent uniqueness guard for race-condition inserts.
CREATE UNIQUE INDEX IF NOT EXISTS list_members_list_id_user_id_uidx
  ON public.list_members (list_id, user_id);
