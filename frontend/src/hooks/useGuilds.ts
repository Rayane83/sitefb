import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Guild } from '@/lib/types';

export function useGuilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGuilds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const guildIds = new Set<string>();

      // Load from discord_config
      const { data: discordConfig } = await supabase
        .from('discord_config')
        .select('data')
        .eq('id', 'default')
        .maybeSingle();

      const config = (discordConfig?.data as any) || {};
      
      // Add principal guild
      if (config.principalGuildId) {
        guildIds.add(config.principalGuildId);
      }
      
      // Add DOT guild
      if (config.dot?.guildId) {
        guildIds.add(config.dot.guildId);
      }
      
      // Add enterprise guilds
      if (config.enterprises) {
        Object.values(config.enterprises as any).forEach((enterprise: any) => {
          if (enterprise?.guildId) {
            guildIds.add(enterprise.guildId);
          }
        });
      }

      // Load from enterprises table
      const { data: enterprises } = await supabase
        .from('enterprises')
        .select('guild_id, name')
        .order('name', { ascending: true });

      enterprises?.forEach((enterprise: any) => {
        if (enterprise.guild_id) {
          guildIds.add(enterprise.guild_id);
        }
      });

      const guildList = Array.from(guildIds).map((id) => ({
        id,
        name: id, // Could be enhanced to fetch actual guild names
        icon: '',
      })) as Guild[];

      setGuilds(guildList);

      // Auto-select guild
      const defaultGuildId = '1404608015230832742';
      const targetGuildId = (config.principalGuildId as string) || defaultGuildId || guildList[0]?.id || '';
      
      if (targetGuildId && (!selectedGuildId || !guildIds.has(selectedGuildId))) {
        setSelectedGuildId(targetGuildId);
        updateURLGuild(targetGuildId);
      }
    } catch (err) {
      console.error('Error loading guilds:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des guildes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedGuildId]);

  const updateURLGuild = useCallback((guildId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('guild', guildId);
    window.history.pushState({}, '', url.toString());
  }, []);

  const selectGuild = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
    updateURLGuild(guildId);
  }, [updateURLGuild]);

  useEffect(() => {
    loadGuilds();
  }, [loadGuilds]);

  return {
    guilds,
    selectedGuildId,
    isLoading,
    error,
    selectGuild,
    refetch: loadGuilds,
  };
}