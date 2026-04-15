-- Oracle request budget controls for free-tier cost protection

CREATE TABLE IF NOT EXISTS public.oracle_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.oracle_usage_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oracle_usage_daily_select_own" ON public.oracle_usage_daily;
CREATE POLICY "oracle_usage_daily_select_own"
  ON public.oracle_usage_daily
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "oracle_usage_daily_insert_own" ON public.oracle_usage_daily;
CREATE POLICY "oracle_usage_daily_insert_own"
  ON public.oracle_usage_daily
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "oracle_usage_daily_update_own" ON public.oracle_usage_daily;
CREATE POLICY "oracle_usage_daily_update_own"
  ON public.oracle_usage_daily
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.oracle_can_consume(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH actor AS (
    SELECT auth.uid() AS auth_user_id
  ),
  usage_row AS (
    SELECT COALESCE(oud.used_count, 0) AS used_count
    FROM public.oracle_usage_daily oud
    WHERE oud.user_id = p_user_id
      AND oud.usage_date = CURRENT_DATE
  ),
  limits AS (
    SELECT 25::INT AS daily_limit
  )
  SELECT jsonb_build_object(
    'allowed', (SELECT auth_user_id FROM actor) = p_user_id AND COALESCE((SELECT used_count FROM usage_row), 0) < (SELECT daily_limit FROM limits),
    'used_count', COALESCE((SELECT used_count FROM usage_row), 0),
    'daily_limit', (SELECT daily_limit FROM limits),
    'remaining', GREATEST((SELECT daily_limit FROM limits) - COALESCE((SELECT used_count FROM usage_row), 0), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.oracle_consume(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_used INT;
  v_limit INT := 25;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to consume budget for this user';
  END IF;

  INSERT INTO public.oracle_usage_daily (user_id, usage_date, used_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    used_count = public.oracle_usage_daily.used_count + 1,
    updated_at = timezone('utc', now())
  RETURNING used_count INTO v_used;

  RETURN jsonb_build_object(
    'used_count', v_used,
    'daily_limit', v_limit,
    'remaining', GREATEST(v_limit - v_used, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.oracle_can_consume(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.oracle_consume(UUID) TO authenticated;
