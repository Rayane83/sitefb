-- Table de stockage unifié pour toutes les sessions
CREATE TABLE IF NOT EXISTS public.app_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'guild', 'enterprise', 'user')),
    guild_id TEXT,
    entreprise_key TEXT,
    user_id UUID,
    key TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique pour éviter les doublons
    CONSTRAINT app_storage_unique_key UNIQUE (scope, guild_id, entreprise_key, user_id, key)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_app_storage_scope_guild ON public.app_storage(scope, guild_id);
CREATE INDEX IF NOT EXISTS idx_app_storage_scope_enterprise ON public.app_storage(scope, entreprise_key);
CREATE INDEX IF NOT EXISTS idx_app_storage_scope_user ON public.app_storage(scope, user_id);
CREATE INDEX IF NOT EXISTS idx_app_storage_key ON public.app_storage(key);

-- RLS pour sécuriser l'accès
ALTER TABLE public.app_storage ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'accès aux utilisateurs authentifiés selon le scope
CREATE POLICY "Users can manage their own data" ON public.app_storage
    FOR ALL USING (
        CASE 
            WHEN scope = 'user' THEN user_id = auth.uid()
            WHEN scope = 'global' THEN true
            WHEN scope = 'guild' THEN true  -- TODO: restreindre selon les rôles Discord
            WHEN scope = 'enterprise' THEN true  -- TODO: restreindre selon l'appartenance à l'entreprise
            ELSE false
        END
    );

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_app_storage_updated_at
    BEFORE UPDATE ON public.app_storage
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter à la publication realtime pour synchronisation temps réel
ALTER TABLE public.app_storage REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_storage;