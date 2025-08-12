import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!botToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing DISCORD_BOT_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { guild_id, user_id } = await req.json().catch(() => ({ guild_id: undefined, user_id: undefined }));
    if (!guild_id || !user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing guild_id or user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch guild member to get role IDs
    const memberRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/members/${user_id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      const txt = await memberRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: `Discord error: ${memberRes.status}`, details: txt }),
        { status: memberRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const member = await memberRes.json();
    const roleIds: string[] = member.roles || [];

    // Fetch guild roles to map id -> name
    const rolesRes = await fetch(`${DISCORD_API}/guilds/${guild_id}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!rolesRes.ok) {
      const txt = await rolesRes.text();
      return new Response(
        JSON.stringify({ ok: false, error: `Discord roles error: ${rolesRes.status}`, details: txt, roles: roleIds }),
        { status: rolesRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allRoles = await rolesRes.json();
    const idToName = new Map<string, string>();
    for (const r of allRoles) {
      if (r?.id && r?.name) idToName.set(String(r.id), String(r.name));
    }

    const rolesByName = roleIds.map((id) => idToName.get(id)).filter(Boolean) as string[];

    return new Response(
      JSON.stringify({ ok: true, roles_ids: roleIds, roles_by_name: rolesByName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("discord-user-roles error", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
