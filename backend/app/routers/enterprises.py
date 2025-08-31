from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
import re
import httpx
import os

from ..database import get_db
from ..models import Enterprise
from ..security import require_staff

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")

router = APIRouter(prefix="/api/enterprises", tags=["enterprises"])

class EnterpriseIn(BaseModel):
    key: str
    name: str
    role_id: Optional[str] = None
    employee_role_id: Optional[str] = None
    enterprise_guild_id: Optional[str] = None

@router.get("/{guild_id}")
async def list_enterprises(guild_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    rows = db.execute(select(Enterprise).where(Enterprise.guild_id == guild_id)).scalars().all()
    return [
        {
            "key": e.key,
            "name": e.name,
            "role_id": e.role_id,
            "employee_role_id": e.employee_role_id,
            "enterprise_guild_id": e.enterprise_guild_id,
        }
        for e in rows
    ]

@router.post("/{guild_id}")
async def upsert_enterprise(guild_id: int, payload: EnterpriseIn, db: Session = Depends(get_db), _=Depends(require_staff)):
    e = db.execute(
        select(Enterprise).where(Enterprise.guild_id == guild_id, Enterprise.key == payload.key)
    ).scalars().first()
    if not e:
        e = Enterprise(guild_id=guild_id, key=payload.key)
        db.add(e)
    e.name = payload.name
    e.role_id = payload.role_id
    e.employee_role_id = payload.employee_role_id
    e.enterprise_guild_id = payload.enterprise_guild_id
    db.commit()
    return {"status": "ok"}

@router.delete("/{guild_id}/{key}")
async def delete_enterprise(guild_id: int, key: str, db: Session = Depends(get_db), _=Depends(require_staff)):
    e = db.execute(
        select(Enterprise).where(Enterprise.guild_id == guild_id, Enterprise.key == key)
    ).scalars().first()
    if not e:
        raise HTTPException(status_code=404, detail="Enterprise not found")
    db.delete(e)
    db.commit()
    return {"status": "deleted"}

@router.get("/extract/{guild_id}")
async def extract_from_roles(guild_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    if not DISCORD_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    async with httpx.AsyncClient(timeout=20.0) as client:
        roles_res = await client.get(
            f"https://discord.com/api/guilds/{guild_id}/roles",
            headers={"Authorization": f"Bot {DISCORD_BOT_TOKEN}"}
        )
        if roles_res.status_code != 200:
            raise HTTPException(status_code=roles_res.status_code, detail="Failed to fetch roles")
        roles = roles_res.json()

    patron_pattern = re.compile(r"^Patron\s+(.+)$", re.IGNORECASE)
    employe_pattern = re.compile(r"^Employ[ée]?\s+(.+)$", re.IGNORECASE)
    patrons = {}
    employes = {}
    for r in roles:
        name = r.get("name", "")
        m = patron_pattern.match(name)
        if m:
            patrons[m.group(1).strip()] = r["id"]
        m2 = employe_pattern.match(name)
        if m2:
            employes[m2.group(1).strip()] = r["id"]

    enterprises = []
    for k, role_id in patrons.items():
        emp_id = employes.get(k)
        enterprises.append({
            "key": k.lower().replace(" ", "-"),
            "name": k,
            "role_id": role_id,
            "employee_role_id": emp_id,
            "enterprise_guild_id": None,
        })
    return {"detected": enterprises}