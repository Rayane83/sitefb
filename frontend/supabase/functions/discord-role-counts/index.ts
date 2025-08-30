import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISCORD_API = "https://discord.com/api/v10";

interface CountRequest {
  guildId: string;
  roleIds: string[]; // Discord role IDs to count
}

async function fetchAllMembers(guildId: string, botToken: string) {
  // Paginate over guild members (requires privileged members intent on the bot)
  const members: any[] = [];
  let after: string | undefined = undefined;
  const limit = 1000; // max allowed by Discord

  while (true) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
    url.searchParams.set("limit", String(limit));
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Discord members fetch failed: ${res.status} ${txt}`);
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    members.push(...batch);
    after = batch[batch.length - 1].user?.id;

    // Safety: break if somehow stuck
    if (!after) break;
  }

  return members;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ ok: false, error: "Missing DISCORD_BOT_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CountRequest = await req.json();
    if (!body?.guildId || !Array.isArray(body?.roleIds)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid payload. Expected { guildId, roleIds[] }" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { guildId, roleIds } = body;

    // Fetch all members and count occurrences per roleId
    const members = await fetchAllMembers(guildId, botToken);

    const counts: Record<string, number> = Object.fromEntries(roleIds.map((r) => [r, 0]));

    for (const m of members) {
      const roles: string[] = Array.isArray(m.roles) ? m.roles : [];
      for (const r of roleIds) {
        if (roles.includes(r)) counts[r] = (counts[r] || 0) + 1;
      }
    }

    const payload = {
      ok: true,
      totalMembers: members.length,
      counts,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discord-role-counts error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
