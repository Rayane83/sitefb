import { useState, useEffect, useCallback } from 'react';
import { getUserGuildRoles, resolveRole, getEntrepriseFromRoles } from '@/lib/roles';
import { Role } from '@/lib/types';

export interface GuildRolesState {
  roles: string[];
  currentRole: Role;
  entreprise: string;
  isLoading: boolean;
  error: string | null;
}

export function useGuildRoles(guildId: string) {
  const [state, setState] = useState<GuildRolesState>({
    roles: [],
    currentRole: 'employe',
    entreprise: '',
    isLoading: false,
    error: null,
  });

  const fetchRoles = useCallback(async () => {
    if (!guildId) {
      setState(prev => ({
        ...prev,
        roles: [],
        currentRole: 'employe',
        entreprise: '',
        isLoading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const roles = await getUserGuildRoles(guildId);
      const currentRole = resolveRole(roles);
      const entreprise = getEntrepriseFromRoles(roles);

      setState({
        roles,
        currentRole,
        entreprise,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      setState({
        roles: [],
        currentRole: 'employe',
        entreprise: 'Aucune Entreprise',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur lors du chargement des rôles',
      });
    }
  }, [guildId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const refetch = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    ...state,
    refetch,
  };
}