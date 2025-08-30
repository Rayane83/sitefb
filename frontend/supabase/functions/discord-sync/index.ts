import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken) {
      return new Response(JSON.stringify({ ok: false, error: "Missing DISCORD_BOT_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: "Missing Supabase env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Load config from DB
    const { data: row, error } = await supabase
      .from("discord_config")
      .select("data")
      .eq("id", "default")
      .maybeSingle();
    if (error) throw error;
    const cfg = (row?.data || {}) as any;

    const guildIds: string[] = [];
    if (cfg.principalGuildId) guildIds.push(cfg.principalGuildId);
    if (cfg.dot?.guildId) guildIds.push(cfg.dot.guildId);
    if (cfg.enterprises) {
      for (const name of Object.keys(cfg.enterprises)) {
        const g = cfg.enterprises[name]?.guildId;
        if (g) guildIds.push(g);
      }
    }

    // Fetch guilds info
    const results: any[] = [];
    for (const gid of Array.from(new Set(guildIds))) {
      const res = await fetch(`${DISCORD_API}/guilds/${gid}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (res.ok) {
        const g = await res.json();
        results.push({ id: gid, ok: true, name: g.name, member_count: g.approximate_member_count });
      } else {
        const t = await res.text();
        results.push({ id: gid, ok: false, error: `HTTP ${res.status}`, details: t });
      }
    }

    return new Response(JSON.stringify({ ok: true, guilds: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discord-sync error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
