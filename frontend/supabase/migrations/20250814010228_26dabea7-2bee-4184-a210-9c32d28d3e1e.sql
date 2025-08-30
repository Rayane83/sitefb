-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE discord_config;
ALTER PUBLICATION supabase_realtime ADD TABLE enterprises;

-- Insérer une configuration par défaut
INSERT INTO public.discord_config (id, data) 
VALUES ('default', '{"principalGuildId": "", "principalRoles": {}, "enterprises": {}}');

-- Insérer quelques entreprises de test
INSERT INTO public.enterprises (guild_id, name) VALUES 
('123456789', 'Entreprise Test 1'),
('987654321', 'Entreprise Test 2');