import { useState, useEffect, useCallback } from 'react';
import { unifiedStorage, type StorageKey } from '@/lib/unifiedStorage';

/**
 * Hook pour utiliser le stockage unifié avec une interface similaire à useState
 */
export function useUnifiedStorage<T>(storageKey: StorageKey, initialValue?: T) {
  const [value, setValue] = useState<T | null>(initialValue || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la valeur initiale
  useEffect(() => {
    const loadValue = async () => {
      try {
        setLoading(true);
        setError(null);
        const stored = await unifiedStorage.get<T>(storageKey);
        setValue(stored || initialValue || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
        setValue(initialValue || null);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [JSON.stringify(storageKey), initialValue]);

  // Fonction pour sauvegarder
  const save = useCallback(async (newValue: T) => {
    try {
      setError(null);
      const success = await unifiedStorage.set(storageKey, newValue);
      if (success) {
        setValue(newValue);
      } else {
        setError('Échec de la sauvegarde');
      }
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMsg);
      return false;
    }
  }, [JSON.stringify(storageKey)]);

  // Fonction pour supprimer
  const remove = useCallback(async () => {
    try {
      setError(null);
      const success = await unifiedStorage.remove(storageKey);
      if (success) {
        setValue(initialValue || null);
      } else {
        setError('Échec de la suppression');
      }
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de suppression';
      setError(errorMsg);
      return false;
    }
  }, [JSON.stringify(storageKey), initialValue]);

  return {
    value,
    loading,
    error,
    save,
    remove,
    setValue: save
  };
}

/**
 * Hook spécialisé pour les configurations d'entreprise
 */
export function useCompanyStorage<T>(
  guildId: string,
  entrepriseKey: string,
  key: string,
  initialValue?: T
) {
  return useUnifiedStorage<T>(
    {
      scope: 'enterprise',
      guildId,
      entrepriseKey,
      key
    },
    initialValue
  );
}

/**
 * Hook spécialisé pour les données utilisateur
 */
export function useUserStorage<T>(
  userId: string,
  key: string,
  initialValue?: T
) {
  return useUnifiedStorage<T>(
    {
      scope: 'user',
      userId,
      key
    },
    initialValue
  );
}

/**
 * Hook spécialisé pour les données de guilde
 */
export function useGuildStorage<T>(
  guildId: string,
  key: string,
  initialValue?: T
) {
  return useUnifiedStorage<T>(
    {
      scope: 'guild',
      guildId,
      key
    },
    initialValue
  );
}

/**
 * Hook spécialisé pour les données globales
 */
export function useGlobalStorage<T>(
  key: string,
  initialValue?: T
) {
  return useUnifiedStorage<T>(
    {
      scope: 'global',
      key
    },
    initialValue
  );
}