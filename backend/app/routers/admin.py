import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from ..database import get_db
from ..models import DiscordConfig
from ..security import require_superadmin

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/discord-config")
async def get_discord_config(db: Session = Depends(get_db), _=Depends(require_superadmin)):
    row = db.execute(select(DiscordConfig)).scalars().first()
    if not row:
        return {"client_id": "", "principal_guild_id": "", "config": {}}
    return {
        "client_id": row.client_id,
        "principal_guild_id": row.principal_guild_id,
        "config": json.loads(row.config_json or "{}"),
    }

@router.post("/discord-config")
async def set_discord_config(body: dict, db: Session = Depends(get_db), _=Depends(require_superadmin)):
    row = db.execute(select(DiscordConfig)).scalars().first()
    if not row:
        row = DiscordConfig(client_id=str(body.get("client_id", "")), principal_guild_id=str(body.get("principal_guild_id", "")))
        db.add(row)
    row.client_id = str(body.get("client_id", ""))
    row.principal_guild_id = str(body.get("principal_guild_id", ""))
    cfg = body.get("config", {})
    row.config_json = json.dumps(cfg)
    db.commit()
    return {"status": "ok"}

@router.get("/guild-roles/{guild_id}")
async def guild_roles(guild_id: str, _=Depends(require_superadmin)):
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            f"https://discord.com/api/guilds/{guild_id}/roles",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail="Failed to fetch guild roles")
        return res.json()