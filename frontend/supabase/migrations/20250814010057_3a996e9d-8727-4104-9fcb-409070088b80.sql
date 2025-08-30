-- Créer les tables pour la synchronisation de configuration
CREATE TABLE IF NOT EXISTS public.discord_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Créer la table des entreprises
CREATE TABLE IF NOT EXISTS public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS sur les tables
ALTER TABLE public.discord_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

-- Politiques pour discord_config (accessible à tous les utilisateurs authentifiés)
CREATE POLICY "Users can view discord config" 
ON public.discord_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update discord config" 
ON public.discord_config 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Politiques pour enterprises (accessible à tous les utilisateurs authentifiés)
CREATE POLICY "Users can view enterprises" 
ON public.enterprises 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage enterprises" 
ON public.enterprises 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Trigger pour updated_at sur discord_config
CREATE TRIGGER update_discord_config_updated_at
  BEFORE UPDATE ON public.discord_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour updated_at sur enterprises
CREATE TRIGGER update_enterprises_updated_at
  BEFORE UPDATE ON public.enterprises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Activer la réplication en temps réel
ALTER TABLE public.discord_config REPLICA IDENTITY FULL;
ALTER TABLE public.enterprises REPLICA IDENTITY FULL;