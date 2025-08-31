import os
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request
from jose import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALG = "HS256"
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
STAFF_ROLE_ID = os.getenv("STAFF_ROLE_ID", "1404608105723068547")  # default to provided

async def get_current_discord_id(request: Request) -> str:
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return str(payload.get("discord_id"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

async def require_staff(request: Request, guild_id: str, discord_id: str = Depends(get_current_discord_id)):
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    async with httpx.AsyncClient(timeout=15.0) as client:
        member_res = await client.get(
            f"https://discord.com/api/guilds/{guild_id}/members/{discord_id}",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
        )
        if member_res.status_code != 200:
            raise HTTPException(status_code=403, detail="Not a guild member")
        member = member_res.json()
        role_ids = set(member.get("roles", []))
        if STAFF_ROLE_ID not in role_ids:
            raise HTTPException(status_code=403, detail="Staff role required")
    return True