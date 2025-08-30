import { useState, useEffect } from 'react';

export interface Guild {
  id: string;
  name: string;
  icon?: string;
}

export function useSimpleGuilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock guilds for development
    const mockGuilds: Guild[] = [
      {
        id: 'guild_123',
        name: 'Flashback Fa',
        icon: 'https://cdn.discordapp.com/icons/123456789/icon.png'
      },
      {
        id: 'guild_456', 
        name: 'Test Server',
        icon: 'https://cdn.discordapp.com/icons/456789123/icon.png'
      }
    ];

    setGuilds(mockGuilds);
    setSelectedGuildId(mockGuilds[0]?.id || '');
    setIsLoading(false);
  }, []);

  const selectGuild = (guildId: string) => {
    setSelectedGuildId(guildId);
  };

  return {
    guilds,
    selectedGuildId,
    isLoading,
    selectGuild,
  };
}