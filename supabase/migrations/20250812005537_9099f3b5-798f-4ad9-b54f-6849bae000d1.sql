-- 1) Tables de base pour l’app (idempotent)

-- Entreprises (par guilde)
create table if not exists public.enterprises (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  key text not null,
  name text not null,
  role_id text,
  employee_role_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, key)
);

-- Paliers d’imposition/salaires (configuration Staff)
create table if not exists public.tax_brackets (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text not null,
  min numeric not null,
  max numeric,
  taux numeric not null,
  sal_min_emp numeric,
  sal_max_emp numeric,
  sal_min_pat numeric,
  sal_max_pat numeric,
  pr_min_emp numeric,
  pr_max_emp numeric,
  pr_min_pat numeric,
  pr_max_pat numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Impôt sur la richesse (paliers)
create table if not exists public.wealth_brackets (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text not null,
  min numeric not null,
  max numeric,
  taux numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configuration Blanchiment par entreprise
create table if not exists public.blanchiment_settings (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text not null,
  enabled boolean not null default false,
  use_global boolean not null default true,
  perc_entreprise numeric,
  perc_groupe numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guild_id, entreprise_key)
);

-- Pourcentages globaux Blanchiment par guilde
create table if not exists public.blanchiment_global (
  guild_id text primary key,
  perc_entreprise numeric,
  perc_groupe numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lignes de suivi Blanchiment
create table if not exists public.blanchiment_rows (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text not null,
  statut text,
  date_recu date,
  date_rendu date,
  duree integer,
  groupe text,
  employe text,
  donneur_id text,
  recep_id text,
  somme numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Archives génériques (payload JSON)
create table if not exists public.archives (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text,
  type text,
  payload jsonb,
  statut text,
  date timestamptz,
  montant numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rapports de dotations + lignes détaillées
create table if not exists public.dotation_reports (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  entreprise_key text not null,
  solde_actuel numeric not null default 0,
  totals jsonb,
  employees_count integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dotation_rows (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.dotation_reports(id) on delete cascade,
  name text not null,
  run numeric not null default 0,
  facture numeric not null default 0,
  vente numeric not null default 0,
  ca_total numeric not null default 0,
  salaire numeric not null default 0,
  prime numeric not null default 0
);

-- 2) Index utiles
create index if not exists idx_enterprises_guild_key on public.enterprises(guild_id, key);
create index if not exists idx_tax_brackets_scope on public.tax_brackets(guild_id, entreprise_key);
create index if not exists idx_wealth_brackets_scope on public.wealth_brackets(guild_id, entreprise_key);
create index if not exists idx_blanchiment_settings_scope on public.blanchiment_settings(guild_id, entreprise_key);
create index if not exists idx_blanchiment_rows_scope on public.blanchiment_rows(guild_id, entreprise_key);
create index if not exists idx_archives_scope on public.archives(guild_id, entreprise_key);
create index if not exists idx_dotation_reports_scope on public.dotation_reports(guild_id, entreprise_key);

-- 3) Activer RLS + Policies (authentifiés uniquement)
alter table public.enterprises enable row level security;
alter table public.tax_brackets enable row level security;
alter table public.wealth_brackets enable row level security;
alter table public.blanchiment_settings enable row level security;
alter table public.blanchiment_global enable row level security;
alter table public.blanchiment_rows enable row level security;
alter table public.archives enable row level security;
alter table public.dotation_reports enable row level security;
alter table public.dotation_rows enable row level security;

-- Helper to create simple auth policies idempotently
create or replace function public._ensure_simple_policies(_table regclass)
returns void
language plpgsql
set search_path = public
as $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies where tablename = relname and schemaname = nspname and policyname = 'auth_select'
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.oid = _table
  ) then
    execute format('create policy auth_select on %s for select to authenticated using (true);', _table);
  end if;
  -- INSERT
  if not exists (
    select 1 from pg_policies where tablename = relname and schemaname = nspname and policyname = 'auth_insert'
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.oid = _table
  ) then
    execute format('create policy auth_insert on %s for insert to authenticated with check (true);', _table);
  end if;
  -- UPDATE
  if not exists (
    select 1 from pg_policies where tablename = relname and schemaname = nspname and policyname = 'auth_update'
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.oid = _table
  ) then
    execute format('create policy auth_update on %s for update to authenticated using (true) with check (true);', _table);
  end if;
end;$$;

select public._ensure_simple_policies('public.enterprises');
select public._ensure_simple_policies('public.tax_brackets');
select public._ensure_simple_policies('public.wealth_brackets');
select public._ensure_simple_policies('public.blanchiment_settings');
select public._ensure_simple_policies('public.blanchiment_global');
select public._ensure_simple_policies('public.blanchiment_rows');
select public._ensure_simple_policies('public.archives');
select public._ensure_simple_policies('public.dotation_reports');
select public._ensure_simple_policies('public.dotation_rows');

-- 4) Triggers updated_at pour toutes les tables
DO $$
DECLARE r record; BEGIN
  for r in select schemaname, tablename from pg_tables where schemaname='public' and tablename in (
    'enterprises','tax_brackets','wealth_brackets','blanchiment_settings','blanchiment_global','blanchiment_rows','archives','dotation_reports'
  ) loop
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.update_updated_at_column();', r.tablename, r.tablename);
    exception when duplicate_object then continue;
  end loop;
END $$;

-- 5) Seed entreprises de l’utilisateur
insert into public.enterprises (guild_id, key, name, role_id, employee_role_id)
values 
  ('1404609471958749266','bennys','Bennys','1404608309218115615','1404609881553764383'),
  ('1404609724435009657','cayo-cigare','Cayo Cigare','1404608418853031966','1404609759692460052')
on conflict (guild_id, key) do update set
  name = excluded.name,
  role_id = excluded.role_id,
  employee_role_id = excluded.employee_role_id;

-- 6) Mettre à jour la configuration Discord (hors secrets)
update public.discord_config
set data = jsonb_build_object(
  'clientId', '1402231031804723210',
  'principalGuildId', '1404608015230832742',
  'principalRoles', jsonb_build_object(
    'staff','1404608105723068547',
    'patron','1404608186421350400',
    'coPatron','1404608269556645968'
  ),
  'enterprises', jsonb_build_object(
    'Bennys', jsonb_build_object(
      'roleId','1404608309218115615',
      'guildId','1404609471958749266',
      'employeeRoleId','1404609881553764383'
    ),
    'Cayo Cigare', jsonb_build_object(
      'roleId','1404608418853031966',
      'guildId','1404609724435009657',
      'employeeRoleId','1404609759692460052'
    )
  ),
  'dot', jsonb_build_object(
    'guildId','1404609091372056606',
    'roles', jsonb_build_object(
      'staff','1404609124255400096',
      'dot','1404609170367451196'
    )
  ),
  'superadmins', jsonb_build_object(
    'userIds', jsonb_build_array('462716512252329996')
  )
)
where id='default';