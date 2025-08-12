-- Ensure DELETE policies and create new configuration tables with safe idempotent blocks

-- 1) DELETE policies for existing tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'archives' AND policyname = 'auth_delete'
  ) THEN
    ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
    CREATE POLICY auth_delete ON public.archives FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dotation_rows' AND policyname = 'auth_delete'
  ) THEN
    ALTER TABLE public.dotation_rows ENABLE ROW LEVEL SECURITY;
    CREATE POLICY auth_delete ON public.dotation_rows FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dotation_reports' AND policyname = 'auth_delete'
  ) THEN
    ALTER TABLE public.dotation_reports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY auth_delete ON public.dotation_reports FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'blanchiment_rows' AND policyname = 'auth_delete'
  ) THEN
    ALTER TABLE public.blanchiment_rows ENABLE ROW LEVEL SECURITY;
    CREATE POLICY auth_delete ON public.blanchiment_rows FOR DELETE USING (true);
  END IF;
END $$;

-- 2) Company configuration tables
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_configs' AND policyname='auth_select'
  ) THEN
    CREATE POLICY auth_select ON public.company_configs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_configs' AND policyname='auth_insert'
  ) THEN
    CREATE POLICY auth_insert ON public.company_configs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_configs' AND policyname='auth_update'
  ) THEN
    CREATE POLICY auth_update ON public.company_configs FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_configs' AND policyname='auth_delete'
  ) THEN
    CREATE POLICY auth_delete ON public.company_configs FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid 
    WHERE t.tgname = 'update_company_configs_updated_at' AND c.relname = 'company_configs'
  ) THEN
    CREATE TRIGGER update_company_configs_updated_at
    BEFORE UPDATE ON public.company_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_prime_tiers' AND policyname='auth_select'
  ) THEN
    CREATE POLICY auth_select ON public.company_prime_tiers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_prime_tiers' AND policyname='auth_insert'
  ) THEN
    CREATE POLICY auth_insert ON public.company_prime_tiers FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_prime_tiers' AND policyname='auth_update'
  ) THEN
    CREATE POLICY auth_update ON public.company_prime_tiers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_prime_tiers' AND policyname='auth_delete'
  ) THEN
    CREATE POLICY auth_delete ON public.company_prime_tiers FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid 
    WHERE t.tgname = 'update_company_prime_tiers_updated_at' AND c.relname = 'company_prime_tiers'
  ) THEN
    CREATE TRIGGER update_company_prime_tiers_updated_at
    BEFORE UPDATE ON public.company_prime_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grade_rules' AND policyname='auth_select'
  ) THEN
    CREATE POLICY auth_select ON public.grade_rules FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grade_rules' AND policyname='auth_insert'
  ) THEN
    CREATE POLICY auth_insert ON public.grade_rules FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grade_rules' AND policyname='auth_update'
  ) THEN
    CREATE POLICY auth_update ON public.grade_rules FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='grade_rules' AND policyname='auth_delete'
  ) THEN
    CREATE POLICY auth_delete ON public.grade_rules FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid 
    WHERE t.tgname = 'update_grade_rules_updated_at' AND c.relname = 'grade_rules'
  ) THEN
    CREATE TRIGGER update_grade_rules_updated_at
    BEFORE UPDATE ON public.grade_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;