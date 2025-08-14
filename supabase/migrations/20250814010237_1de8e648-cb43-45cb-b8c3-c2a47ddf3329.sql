-- Ajouter les tables à la publication realtime pour la synchronisation
ALTER PUBLICATION supabase_realtime ADD TABLE discord_config;
ALTER PUBLICATION supabase_realtime ADD TABLE enterprises;