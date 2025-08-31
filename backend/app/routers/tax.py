import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import TaxBracket
from ..security import require_staff

router = APIRouter(prefix="/api/tax", tags=["tax"])

class Bracket(BaseModel):
    min: float
    max: Optional[float] = None
    rate: float  # 0..1

class Wealth(BaseModel):
    threshold: float
    rate: float

class TaxConfig(BaseModel):
    brackets: List[Bracket]
    wealth: Optional[Wealth] = None

@router.get("/brackets/{guild_id}")
async def get_tax(guild_id: int, entreprise: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(
        select(TaxBracket).where(TaxBracket.guild_id == guild_id, TaxBracket.entreprise == (entreprise or None))
    ).scalars().first()
    if not row:
        return {"brackets": [], "wealth": None}
    return {
        "brackets": json.loads(row.brackets_json or "[]"),
        "wealth": json.loads(row.wealth_json or "null"),
    }

@router.post("/brackets/{guild_id}")
async def set_tax(guild_id: int, cfg: TaxConfig, entreprise: Optional[str] = None, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(
        select(TaxBracket).where(TaxBracket.guild_id == guild_id, TaxBracket.entreprise == (entreprise or None))
    ).scalars().first()
    if not row:
        row = TaxBracket(guild_id=guild_id, entreprise=entreprise)
        db.add(row)
    row.brackets_json = json.dumps([b.dict() for b in cfg.brackets])
    row.wealth_json = json.dumps(cfg.wealth.dict()) if cfg.wealth else None
    db.commit()
    return {"status": "ok"}

# utility compute (could be used by dashboard later)
def compute_tax(amount: float, brackets: List[Dict[str, Any]], wealth: Optional[Dict[str, Any]] = None) -> float:
    tax = 0.0
    remaining = amount
    last_max = 0.0
    for b in sorted(brackets, key=lambda x: x.get('min', 0)):
        bmin = float(b.get('min', 0))
        bmax = b.get('max')
        rate = float(b.get('rate', 0))
        if remaining <= 0:
            break
        if bmax is None:
            base = max(0.0, amount - bmin)
        else:
            base = max(0.0, min(amount, float(bmax)) - bmin)
        tax += base * rate
    if wealth and amount > float(wealth.get('threshold', 0)):
        tax += (amount - float(wealth['threshold'])) * float(wealth.get('rate', 0))
    return round(tax, 2)