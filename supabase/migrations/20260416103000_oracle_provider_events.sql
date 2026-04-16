-- Oracle provider telemetry for Phase 7.1 analytics dashboard

CREATE TABLE IF NOT EXISTS public.oracle_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model_used TEXT,
  groq_used BOOLEAN NOT NULL DEFAULT false,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  fallback_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  budget_source TEXT,
  request_source TEXT,
  prompt_type TEXT,
  recommendation_count INTEGER,
  tmdb_hit_count INTEGER,
  tmdb_hit_rate NUMERIC(5,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_oracle_provider_events_user_created
  ON public.oracle_provider_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oracle_provider_events_provider_created
  ON public.oracle_provider_events (provider, created_at DESC);

ALTER TABLE public.oracle_provider_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oracle_provider_events_insert_own" ON public.oracle_provider_events;
CREATE POLICY "oracle_provider_events_insert_own"
  ON public.oracle_provider_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "oracle_provider_events_select_admin" ON public.oracle_provider_events;
CREATE POLICY "oracle_provider_events_select_admin"
  ON public.oracle_provider_events
  FOR SELECT
  USING ((auth.jwt() ->> 'email') = 'sonofloke@gmail.com');
