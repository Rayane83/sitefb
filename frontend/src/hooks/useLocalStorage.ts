import { useState, useEffect } from "react";
import { unifiedStorage } from "@/lib/unifiedStorage";

// Hook obsolète - utilisez useUnifiedStorage à la place
// Maintenu pour compatibilité uniquement
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Chargement initial avec fallback localStorage pour migration
  useEffect(() => {
    const loadValue = async () => {
      try {
        // Essayer d'abord le système unifié
        const value = await unifiedStorage.get<T>({
          scope: 'global',
          key: `legacy_${key}`
        });
        
        if (value !== null) {
          setStoredValue(value);
          return;
        }

        // Fallback vers localStorage pour migration
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          setStoredValue(parsed);
          // Migrer vers le système unifié
          await unifiedStorage.set({
            scope: 'global',
            key: `legacy_${key}`
          }, parsed);
          // Nettoyer l'ancien localStorage
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Error loading ${key}:`, error);
        setStoredValue(initialValue);
      }
    };

    loadValue();
  }, [key, initialValue]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await unifiedStorage.set({
        scope: 'global',
        key: `legacy_${key}`
      }, valueToStore);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const removeValue = async () => {
    try {
      await unifiedStorage.remove({
        scope: 'global',
        key: `legacy_${key}`
      });
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}