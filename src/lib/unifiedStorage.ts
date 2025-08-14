/**
 * Système de stockage unifié pour toutes les sessions
 * Utilise Supabase comme source de vérité avec cache localStorage intelligent
 */

import { supabase } from "@/integrations/supabase/client";

export type StorageScope = 'global' | 'guild' | 'enterprise' | 'user';

export interface StorageKey {
  scope: StorageScope;
  guildId?: string;
  entrepriseKey?: string;
  userId?: string;
  key: string;
}

class UnifiedStorage {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_PREFIX = 'unified_storage_';

  /**
   * Génère une clé unique pour le stockage
   */
  private generateKey(storageKey: StorageKey): string {
    const parts = [storageKey.scope, storageKey.key];
    if (storageKey.guildId) parts.push(`guild:${storageKey.guildId}`);
    if (storageKey.entrepriseKey) parts.push(`ent:${storageKey.entrepriseKey}`);
    if (storageKey.userId) parts.push(`user:${storageKey.userId}`);
    return parts.join('|');
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  private async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  /**
   * Récupère les données du cache localStorage
   */
  private getCachedData<T>(key: string): T | null {
    try {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
      
      // Fallback localStorage pour les données critiques
      const localKey = `${this.CACHE_PREFIX}${key}`;
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.DEFAULT_TTL) {
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Error reading cached data:', error);
    }
    return null;
  }

  /**
   * Met en cache les données
   */
  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      this.cache.set(key, { data, timestamp: Date.now(), ttl });
      
      // Sauvegarde localStorage pour persistance
      const localKey = `${this.CACHE_PREFIX}${key}`;
      const payload = { data, timestamp: Date.now() };
      localStorage.setItem(localKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('Error caching data:', error);
    }
  }

  /**
   * Récupère une valeur du stockage unifié
   */
  async get<T>(storageKey: StorageKey): Promise<T | null> {
    const cacheKey = this.generateKey(storageKey);
    
    // Vérifier le cache d'abord
    const cached = this.getCachedData<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Si non authentifié, retourner null
    if (!(await this.isAuthenticated())) {
      return null;
    }

    try {
      // Construire la requête avec des filtres
      let query = (supabase as any)
        .from('app_storage')
        .select('data')
        .eq('scope', storageKey.scope)
        .eq('key', storageKey.key);

      // Ajouter les filtres conditionnels
      if (storageKey.guildId) {
        query = query.eq('guild_id', storageKey.guildId);
      } else {
        query = query.is('guild_id', null);
      }

      if (storageKey.entrepriseKey) {
        query = query.eq('entreprise_key', storageKey.entrepriseKey);
      } else {
        query = query.is('entreprise_key', null);
      }

      if (storageKey.userId) {
        query = query.eq('user_id', storageKey.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.warn('Unified storage error:', error);
        return null;
      }

      const result = data?.data || null;
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('Storage get error:', error);
      return null;
    }
  }

  /**
   * Sauvegarde une valeur dans le stockage unifié
   */
  async set<T>(storageKey: StorageKey, data: T): Promise<boolean> {
    const cacheKey = this.generateKey(storageKey);

    // Mettre à jour le cache immédiatement pour une UX fluide
    this.setCachedData(cacheKey, data);

    // Si non authentifié, sauvegarder seulement en cache
    if (!(await this.isAuthenticated())) {
      console.warn('Not authenticated, data saved to cache only');
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const payload = {
        scope: storageKey.scope,
        guild_id: storageKey.guildId || null,
        entreprise_key: storageKey.entrepriseKey || null,
        user_id: storageKey.userId || userId || null,
        key: storageKey.key,
        data: data
      };

      const { error } = await (supabase as any)
        .from('app_storage')
        .upsert(payload, { 
          onConflict: 'scope,guild_id,entreprise_key,user_id,key'
        });

      if (error) {
        console.error('Unified storage save error:', error);
        return false;
      }

      // Déclencher un événement pour la synchronisation temps réel
      window.dispatchEvent(new CustomEvent('unified-storage-update', { 
        detail: { storageKey, data, cacheKey } 
      }));

      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Supprime une valeur du stockage unifié
   */
  async remove(storageKey: StorageKey): Promise<boolean> {
    const cacheKey = this.generateKey(storageKey);

    // Supprimer du cache
    this.cache.delete(cacheKey);
    localStorage.removeItem(`${this.CACHE_PREFIX}${cacheKey}`);

    if (!(await this.isAuthenticated())) {
      return true;
    }

    try {
      let query = (supabase as any)
        .from('app_storage')
        .delete()
        .eq('scope', storageKey.scope)
        .eq('key', storageKey.key);

      if (storageKey.guildId) {
        query = query.eq('guild_id', storageKey.guildId);
      } else {
        query = query.is('guild_id', null);
      }

      if (storageKey.entrepriseKey) {
        query = query.eq('entreprise_key', storageKey.entrepriseKey);
      } else {
        query = query.is('entreprise_key', null);
      }

      if (storageKey.userId) {
        query = query.eq('user_id', storageKey.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { error } = await query;
      
      if (error) {
        console.error('Unified storage delete error:', error);
        return false;
      }

      window.dispatchEvent(new CustomEvent('unified-storage-remove', { 
        detail: { storageKey, cacheKey } 
      }));

      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * Nettoie le cache expiré
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vide tout le cache (utile lors de la déconnexion)
   */
  clearAllCache(): void {
    this.cache.clear();
    // Nettoyer localStorage aussi
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Instance singleton
export const unifiedStorage = new UnifiedStorage();

// Nettoyage automatique du cache toutes les 10 minutes
setInterval(() => {
  unifiedStorage.clearExpiredCache();
}, 10 * 60 * 1000);

// Nettoyage lors de la déconnexion
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    unifiedStorage.clearAllCache();
  }
});