-- 1) Allow DELETE on selected tables (archives, dotation_rows, dotation_reports, blanchiment_rows)
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_delete ON public.archives FOR DELETE USING (true);

ALTER TABLE public.dotation_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_delete ON public.dotation_rows FOR DELETE USING (true);

ALTER TABLE public.dotation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_delete ON public.dotation_reports FOR DELETE USING (true);

ALTER TABLE public.blanchiment_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_delete ON public.blanchiment_rows FOR DELETE USING (true);

-- 2) Company configuration tables
-- Main table to store the full company configuration as JSON (simple and flexible)
CREATE TABLE IF NOT EXISTS public.company_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  entreprise_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, entreprise_key)
);

ALTER TABLE public.company_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS auth_select ON public.company_configs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS auth_insert ON public.company_configs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_update ON public.company_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_delete ON public.company_configs FOR DELETE USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS update_company_configs_updated_at
BEFORE UPDATE ON public.company_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional granular tables for advanced rules (prime tiers and grade rules)
CREATE TABLE IF NOT EXISTS public.company_prime_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  entreprise_key text NOT NULL,
  seuil numeric NOT NULL,
  prime numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_prime_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_select ON public.company_prime_tiers FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS auth_insert ON public.company_prime_tiers FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_update ON public.company_prime_tiers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_delete ON public.company_prime_tiers FOR DELETE USING (true);

CREATE TRIGGER IF NOT EXISTS update_company_prime_tiers_updated_at
BEFORE UPDATE ON public.company_prime_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.grade_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  entreprise_key text NOT NULL,
  grade text NOT NULL,
  role_discord_id text,
  pourcentage_ca numeric NOT NULL DEFAULT 0,
  taux_horaire numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, entreprise_key, grade)
);

ALTER TABLE public.grade_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auth_select ON public.grade_rules FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS auth_insert ON public.grade_rules FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_update ON public.grade_rules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS auth_delete ON public.grade_rules FOR DELETE USING (true);

CREATE TRIGGER IF NOT EXISTS update_grade_rules_updated_at
BEFORE UPDATE ON public.grade_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();