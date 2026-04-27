alter table public.oracle_provider_events
  add column if not exists selected_provider_ids jsonb not null default '[]'::jsonb,
  add column if not exists provider_filtered_out_count integer not null default 0,
  add column if not exists provider_match_count integer not null default 0;
