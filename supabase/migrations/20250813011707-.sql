-- Add enterprise_guild_id to enterprises for linking to the company's actual Discord server
ALTER TABLE public.enterprises
ADD COLUMN IF NOT EXISTS enterprise_guild_id text;

-- Helpful index for lookups/counting by enterprise server id
CREATE INDEX IF NOT EXISTS idx_enterprises_enterprise_guild_id
  ON public.enterprises (enterprise_guild_id);
