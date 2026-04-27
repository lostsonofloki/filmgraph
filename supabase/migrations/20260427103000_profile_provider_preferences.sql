-- Store per-user streaming provider preferences for Oracle filtering.
alter table public.profiles
  add column if not exists user_providers jsonb not null default '[]'::jsonb;

-- Backfill any null rows from older environments.
update public.profiles
set user_providers = '[]'::jsonb
where user_providers is null;

-- Guardrail: value must always be a JSON array.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_providers_is_array'
  ) then
    alter table public.profiles
      add constraint profiles_user_providers_is_array
      check (jsonb_typeof(user_providers) = 'array');
  end if;
end $$;
