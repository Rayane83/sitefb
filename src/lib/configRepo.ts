// Centralised repository for Discord configuration
// NOTE: This currently uses localStorage as a placeholder.
// Once Supabase is fully connected, replace internals with Supabase tables.

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

export const configRepo = {
  async get(): Promise<DiscordConfig> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },
  async save(cfg: DiscordConfig): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  },
};
