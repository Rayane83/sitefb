from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import ArchiveEntry
from ..security import require_staff

router = APIRouter(prefix="/api/archive", tags=["archive"])

@router.get("/{guild_id}")
async def list_archive(guild_id: int, entreprise: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    q = select(ArchiveEntry).where(ArchiveEntry.guild_id == guild_id)
    if entreprise:
        q = q.where(ArchiveEntry.entreprise == entreprise)
    rows = db.execute(q).scalars().all()
    return [
        {
            "id": r.id,
            "date": r.date,
            "type": r.type,
            "employe": r.employe,
            "entreprise": r.entreprise,
            "montant": r.montant,
            "statut": r.statut,
        }
        for r in rows
    ]

@router.post("/{guild_id}")
async def add_archive(guild_id: int, item: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    entry = ArchiveEntry(
        guild_id=guild_id,
        date=item.get("date", ""),
        type=item.get("type", ""),
        employe=item.get("employe"),
        entreprise=item.get("entreprise"),
        montant=float(item.get("montant", 0)),
        statut=item.get("statut", "En attente"),
    )
    db.add(entry)
    db.commit()
    return {"status": "ok", "id": entry.id}