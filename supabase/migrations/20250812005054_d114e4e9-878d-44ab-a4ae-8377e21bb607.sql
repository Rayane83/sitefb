-- Create table for Discord configuration
create table if not exists public.discord_config (
  id text primary key default 'default'::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.discord_config enable row level security;

-- Policies for authenticated users only
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'discord_config' and policyname = 'Allow authenticated read discord_config'
  ) then
    create policy "Allow authenticated read discord_config"
    on public.discord_config
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'discord_config' and policyname = 'Allow authenticated insert discord_config'
  ) then
    create policy "Allow authenticated insert discord_config"
    on public.discord_config
    for insert
    to authenticated
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'discord_config' and policyname = 'Allow authenticated update discord_config'
  ) then
    create policy "Allow authenticated update discord_config"
    on public.discord_config
    for update
    to authenticated
    using (true)
    with check (true);
  end if;
end
$$;

-- Ensure timestamp trigger function exists (idempotent)
create or replace function public.update_updated_at_column()
 returns trigger
 language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Create trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'trg_discord_config_updated_at'
      AND n.nspname = 'public'
      AND c.relname = 'discord_config'
  ) THEN
    CREATE TRIGGER trg_discord_config_updated_at
    BEFORE UPDATE ON public.discord_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Seed default row
insert into public.discord_config (id, data)
values ('default', '{}'::jsonb)
on conflict (id) do nothing;