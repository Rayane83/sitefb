// Centralised repository for Discord configuration
// NOTE: Uses Supabase when authenticated; falls back to localStorage otherwise.

import { supabase } from "@/integrations/supabase/client";

export type DiscordRoleMap = {
  staff?: string;
  patron?: string;
  coPatron?: string;
};

export type EnterpriseRoleMap = {
  [enterpriseName: string]: {
    roleId?: string; // role in principal guild
    guildId?: string; // enterprise-specific guild id
    employeeRoleId?: string; // employee role in enterprise guild
  };
};

export type DotGuildConfig = {
  guildId?: string;
  roles?: {
    staff?: string;
    dot?: string;
  };
};

export type SuperadminConfig = {
  userIds: string[]; // discord user ids
};

export type DiscordConfig = {
  // App-level identifiers (token/secret should NOT be stored in frontend)
  clientId?: string;
  // clientSecret and botToken must be stored via Supabase Secrets / Edge Function only

  principalGuildId?: string;
  principalRoles?: DiscordRoleMap;
  enterprises?: EnterpriseRoleMap;

  dot?: DotGuildConfig;

  superadmins?: SuperadminConfig;
};

const STORAGE_KEY = 'discord:config:v1';

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export const configRepo = {
  async get(): Promise<DiscordConfig> {
    try {
      // Try Supabase first if authenticated
      const session = await getSession();
      if (session) {
        const { data, error } = await supabase
          .from('discord_config')
          .select('data')
          .eq('id', 'default')
          .maybeSingle();
        if (error) throw error;
        return (data?.data as DiscordConfig) || {};
      }
    } catch (e) {
      // ignore and fallback
      console.warn('configRepo.get supabase fallback:', e);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },
  async save(cfg: DiscordConfig): Promise<void> {
    try {
      const session = await getSession();
      if (session) {
        const { error } = await supabase
          .from('discord_config')
          .upsert({ id: 'default', data: cfg }, { onConflict: 'id' });
        if (error) throw error;
        return;
      }
    } catch (e) {
      console.warn('configRepo.save supabase fallback:', e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  },
};
