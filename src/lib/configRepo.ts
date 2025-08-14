// Centralised repository for Discord configuration
// NOTE: Uses unified storage system

import { unifiedStorage } from './unifiedStorage';

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

export const configRepo = {
  async get(): Promise<DiscordConfig> {
    try {
      const config = await unifiedStorage.get<DiscordConfig>({
        scope: 'global',
        key: 'discord_config'
      });
      return config || {};
    } catch (e) {
      console.warn('configRepo.get error:', e);
      return {};
    }
  },
  
  async save(cfg: DiscordConfig): Promise<void> {
    try {
      await unifiedStorage.set({
        scope: 'global',
        key: 'discord_config'
      }, cfg);
    } catch (e) {
      console.warn('configRepo.save error:', e);
      throw e;
    }
  },
};
