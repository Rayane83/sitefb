from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import delete, select

from ..database import get_db
from ..models import DotationData, DotationRow
from ..security import require_staff

router = APIRouter(prefix="/api/dotation", tags=["dotation"])

class PrimePalier(BaseModel):
    min: float
    prime: float

class DotationRowIn(BaseModel):
    name: str
    run: float = 0
    facture: float = 0
    vente: float = 0

class DotationConfig(BaseModel):
    salaire_pourcentage: float = Field(0.1, ge=0, le=1)
    prime_paliers: List[PrimePalier] = Field(default_factory=list)

class DotationPayload(BaseModel):
    entreprise: str
    rows: List[DotationRowIn]
    config: DotationConfig
    solde_actuel: Optional[float] = 0
    expenses: Optional[float] = 0
    withdrawals: Optional[float] = 0
    commissions: Optional[float] = 0
    inter_invoices: Optional[float] = 0

@router.get("/{guild_id}")
async def get_dotation(guild_id: int, entreprise: str, db: Session = Depends(get_db), _=Depends(require_staff)):
    data = db.execute(
        select(DotationData).where(DotationData.guild_id == guild_id, DotationData.entreprise == entreprise)
    ).scalars().first()
    if not data:
        return {"entreprise": entreprise, "rows": [], "meta": None}
    rows = db.execute(select(DotationRow).where(DotationRow.dotation_data_id == data.id)).scalars().all()
    return {
        "entreprise": entreprise,
        "meta": {
            "solde_actuel": data.solde_actuel,
            "expenses": data.expenses,
            "withdrawals": data.withdrawals,
            "commissions": data.commissions,
            "inter_invoices": data.inter_invoices,
        },
        "rows": [
            {
                "id": r.id,
                "name": r.name,
                "run": r.run,
                "facture": r.facture,
                "vente": r.vente,
                "ca_total": r.ca_total,
                "salaire": r.salaire,
                "prime": r.prime,
            }
            for r in rows
        ],
    }

@router.post("/{guild_id}")
async def save_dotation(guild_id: int, payload: DotationPayload, db: Session = Depends(get_db), _=Depends(require_staff)):
    # Upsert DotationData for this entreprise
    data = db.execute(
        select(DotationData).where(DotationData.guild_id == guild_id, DotationData.entreprise == payload.entreprise)
    ).scalars().first()
    if not data:
        data = DotationData(guild_id=guild_id, entreprise=payload.entreprise)
        db.add(data)
        db.flush()

    # Update meta
    data.solde_actuel = payload.solde_actuel or 0
    data.expenses = payload.expenses or 0
    data.withdrawals = payload.withdrawals or 0
    data.commissions = payload.commissions or 0
    data.inter_invoices = payload.inter_invoices or 0
    db.commit()

    # Clear existing rows for this data id
    db.execute(delete(DotationRow).where(DotationRow.dotation_data_id == data.id))

    total_ca = 0.0
    total_salaire = 0.0
    total_prime = 0.0

    # Determine prime function: highest matching palier
    def compute_prime(ca: float) -> float:
        eligible = [p.prime for p in payload.config.prime_paliers if ca >= p.min]
        return max(eligible) if eligible else 0.0

    # Insert rows
    for row in payload.rows:
        ca_total = float(row.run) + float(row.facture) + float(row.vente)
        salaire = round(ca_total * float(payload.config.salaire_pourcentage), 2)
        prime = float(compute_prime(ca_total))

        db.add(
            DotationRow(
                dotation_data_id=data.id,
                name=row.name,
                run=row.run,
                facture=row.facture,
                vente=row.vente,
                ca_total=ca_total,
                salaire=salaire,
                prime=prime,
            )
        )
        total_ca += ca_total
        total_salaire += salaire
        total_prime += prime

    db.commit()

    return {
        "status": "ok",
        "totals": {
            "ca_total": round(total_ca, 2),
            "salaire": round(total_salaire, 2),
            "prime": round(total_prime, 2),
        },
    }