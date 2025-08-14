-- Nettoyer et optimiser la configuration Supabase pour la synchronisation temps réel

-- 1. S'assurer que toutes les tables importantes ont REPLICA IDENTITY FULL
ALTER TABLE public.discord_config REPLICA IDENTITY FULL;
ALTER TABLE public.enterprises REPLICA IDENTITY FULL;
ALTER TABLE public.dotation_reports REPLICA IDENTITY FULL;
ALTER TABLE public.dotation_rows REPLICA IDENTITY FULL;
ALTER TABLE public.archives REPLICA IDENTITY FULL;
ALTER TABLE public.tax_brackets REPLICA IDENTITY FULL;
ALTER TABLE public.blanchiment_rows REPLICA IDENTITY FULL;
ALTER TABLE public.blanchiment_settings REPLICA IDENTITY FULL;
ALTER TABLE public.blanchiment_global REPLICA IDENTITY FULL;
ALTER TABLE public.company_configs REPLICA IDENTITY FULL;
ALTER TABLE public.grade_rules REPLICA IDENTITY FULL;
ALTER TABLE public.wealth_brackets REPLICA IDENTITY FULL;
ALTER TABLE public.company_prime_tiers REPLICA IDENTITY FULL;

-- 2. Ajouter toutes les tables à la publication realtime pour synchronisation complète
ALTER PUBLICATION supabase_realtime ADD TABLE public.discord_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enterprises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dotation_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dotation_rows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.archives;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tax_brackets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blanchiment_rows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blanchiment_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blanchiment_global;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wealth_brackets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_prime_tiers;

-- 3. Créer des index pour optimiser les performances de synchronisation
CREATE INDEX IF NOT EXISTS idx_dotation_reports_guild_entreprise ON public.dotation_reports(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_dotation_rows_report_id ON public.dotation_rows(report_id);
CREATE INDEX IF NOT EXISTS idx_archives_guild_entreprise ON public.archives(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_enterprises_guild_id ON public.enterprises(guild_id);
CREATE INDEX IF NOT EXISTS idx_tax_brackets_guild_entreprise ON public.tax_brackets(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_blanchiment_rows_guild_entreprise ON public.blanchiment_rows(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_blanchiment_settings_guild_entreprise ON public.blanchiment_settings(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_company_configs_guild_entreprise ON public.company_configs(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_grade_rules_guild_entreprise ON public.grade_rules(guild_id, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_wealth_brackets_guild_entreprise ON public.wealth_brackets(guild_id, entreprise_key);

-- 4. Optimiser les triggers updated_at existants
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter les triggers updated_at manquants
DO $$
BEGIN
    -- Vérifier et créer les triggers updated_at pour toutes les tables avec cette colonne
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_archives_updated_at') THEN
        CREATE TRIGGER update_archives_updated_at
            BEFORE UPDATE ON public.archives
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blanchiment_global_updated_at') THEN
        CREATE TRIGGER update_blanchiment_global_updated_at
            BEFORE UPDATE ON public.blanchiment_global
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blanchiment_rows_updated_at') THEN
        CREATE TRIGGER update_blanchiment_rows_updated_at
            BEFORE UPDATE ON public.blanchiment_rows
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blanchiment_settings_updated_at') THEN
        CREATE TRIGGER update_blanchiment_settings_updated_at
            BEFORE UPDATE ON public.blanchiment_settings
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_configs_updated_at') THEN
        CREATE TRIGGER update_company_configs_updated_at
            BEFORE UPDATE ON public.company_configs
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_prime_tiers_updated_at') THEN
        CREATE TRIGGER update_company_prime_tiers_updated_at
            BEFORE UPDATE ON public.company_prime_tiers
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_discord_config_updated_at') THEN
        CREATE TRIGGER update_discord_config_updated_at
            BEFORE UPDATE ON public.discord_config
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dotation_reports_updated_at') THEN
        CREATE TRIGGER update_dotation_reports_updated_at
            BEFORE UPDATE ON public.dotation_reports
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_enterprises_updated_at') THEN
        CREATE TRIGGER update_enterprises_updated_at
            BEFORE UPDATE ON public.enterprises
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_grade_rules_updated_at') THEN
        CREATE TRIGGER update_grade_rules_updated_at
            BEFORE UPDATE ON public.grade_rules
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tax_brackets_updated_at') THEN
        CREATE TRIGGER update_tax_brackets_updated_at
            BEFORE UPDATE ON public.tax_brackets
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wealth_brackets_updated_at') THEN
        CREATE TRIGGER update_wealth_brackets_updated_at
            BEFORE UPDATE ON public.wealth_brackets
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;