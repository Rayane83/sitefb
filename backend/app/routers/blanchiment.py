import json
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import BlanchimentState, BlanchimentGlobal
from ..security import require_staff

router = APIRouter(prefix="/api/blanchiment", tags=["blanchiment"])

@router.get("/state/{scope}")
async def get_state(scope: str, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(BlanchimentState).where(BlanchimentState.scope == scope)).scalars().first()
    if not row:
        return {"enabled": False, "use_global": True, "perc_entreprise": 0, "perc_groupe": 0}
    return {
        "enabled": row.enabled,
        "use_global": row.use_global,
        "perc_entreprise": row.perc_entreprise,
        "perc_groupe": row.perc_groupe,
    }

@router.post("/state/{scope}")
async def set_state(scope: str, item: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(BlanchimentState).where(BlanchimentState.scope == scope)).scalars().first()
    if not row:
        row = BlanchimentState(scope=scope)
        db.add(row)
    row.enabled = bool(item.get("enabled", False))
    row.use_global = bool(item.get("use_global", True))
    row.perc_entreprise = float(item.get("perc_entreprise", 0))
    row.perc_groupe = float(item.get("perc_groupe", 0))
    db.commit()
    return {"status": "ok"}

@router.get("/global/{guild_id}")
async def get_global(guild_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(BlanchimentGlobal).where(BlanchimentGlobal.guild_id == guild_id)).scalars().first()
    if not row:
        return {"perc_entreprise": 0, "perc_groupe": 0}
    return {"perc_entreprise": row.perc_entreprise, "perc_groupe": row.perc_groupe}

@router.post("/global/{guild_id}")
async def set_global(guild_id: int, item: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(BlanchimentGlobal).where(BlanchimentGlobal.guild_id == guild_id)).scalars().first()
    if not row:
        row = BlanchimentGlobal(guild_id=guild_id)
        db.add(row)
    row.perc_entreprise = float(item.get("perc_entreprise", 0))
    row.perc_groupe = float(item.get("perc_groupe", 0))
    db.commit()
    return {"status": "ok"}