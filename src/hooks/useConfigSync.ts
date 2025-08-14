import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { configRepo } from '@/lib/configRepo';
import { useAuth } from './useAuth';

/**
 * Hook pour synchroniser automatiquement la configuration entre sessions
 * Écoute les changements en temps réel via Supabase
 */
export function useConfigSync() {
  const { isAuthenticated } = useAuth();

  const syncConfig = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      // Force la synchronisation depuis Supabase
      const config = await configRepo.get();
      
      // Déclenche un event pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('config-sync', { detail: config }));
    } catch (error) {
      console.error('Erreur de synchronisation config:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Synchronisation initiale
    syncConfig();

    // Écoute les changements en temps réel sur discord_config
    const channel = supabase
      .channel('config-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discord_config'
        },
        () => {
          console.log('Configuration mise à jour, synchronisation...');
          syncConfig();
        }
      )
      .subscribe();

    // Synchronisation périodique toutes les 30 secondes
    const interval = setInterval(syncConfig, 30000);

    // Synchronisation lors du focus de la fenêtre
    const handleFocus = () => syncConfig();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, syncConfig]);

  return { syncConfig };
}