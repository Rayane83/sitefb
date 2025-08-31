import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import StaffConfig
from ..security import require_staff

router = APIRouter(prefix="/api/staff/config", tags=["staff-config"])

@router.get("/{guild_id}")
async def get_staff_config(guild_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(StaffConfig).where(StaffConfig.guild_id == guild_id)).scalars().first()
    if not row:
        return {"paliers": []}
    return {"paliers": json.loads(row.paliers_json or "[]")}

@router.post("/{guild_id}")
async def set_staff_config(guild_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(select(StaffConfig).where(StaffConfig.guild_id == guild_id)).scalars().first()
    if not row:
        row = StaffConfig(guild_id=guild_id)
        db.add(row)
    row.paliers_json = json.dumps(body.get("paliers", []))
    db.commit()
    return {"status": "ok"}