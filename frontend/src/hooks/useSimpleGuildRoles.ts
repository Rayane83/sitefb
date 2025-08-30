import { useState, useEffect } from 'react';
import { Role } from '@/lib/types';

export interface GuildRoles {
  roles: string[];
  entreprise: string | null;
  resolvedRole: Role;
  isLoading: boolean;
}

export function useSimpleGuildRoles(guildId: string) {
  const [guildRoles, setGuildRoles] = useState<GuildRoles>({
    roles: [],
    entreprise: null,
    resolvedRole: 'employe' as Role,
    isLoading: true,
  });

  useEffect(() => {
    if (!guildId) return;

    // Mock role data for development
    const mockRoles = {
      roles: ['Patron Flashback Fa', 'Staff', '@everyone'],
      entreprise: 'Flashback Fa',
      resolvedRole: 'patron' as Role,
      isLoading: false,
    };

    setGuildRoles(mockRoles);
  }, [guildId]);

  return guildRoles;
}