from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..database import get_db
from ..models import DotationData, DotationRow

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary/{guild_id}")
async def summary(guild_id: int, entreprise: str, db: Session = Depends(get_db)):
    data = db.execute(
        select(DotationData).where(DotationData.guild_id == guild_id, DotationData.entreprise == entreprise)
    ).scalars().first()

    ca_brut = depenses = benefice = taux = impots = 0.0
    employee_count = 0

    if data:
        agg = db.execute(
            select(
                func.coalesce(func.sum(DotationRow.ca_total), 0),
                func.coalesce(func.count(DotationRow.id), 0),
            ).where(DotationRow.dotation_data_id == data.id)
        ).first()
        ca_brut = float(agg[0] or 0)
        employee_count = int(agg[1] or 0)
        depenses = float((data.expenses or 0) + (data.withdrawals or 0) + (data.commissions or 0) + (data.inter_invoices or 0))
        benefice = round(ca_brut - depenses, 2)
        # Simple bracket until tax config exists
        if benefice <= 0:
            taux = 0.0
        elif benefice < 10000:
            taux = 0.1
        elif benefice < 50000:
            taux = 0.2
        else:
            taux = 0.3
        impots = round(benefice * taux, 2)

    return {
        "entreprise": entreprise,
        "ca_brut": round(ca_brut, 2),
        "depenses": round(depenses, 2),
        "benefice": round(benefice, 2),
        "taux_imposition": round(taux * 100, 2),
        "montant_impots": impots,
        "employee_count": employee_count,
    }

@router.get("/employee-count/{guild_id}")
async def employee_count(guild_id: int, entreprise: str, db: Session = Depends(get_db)):
    data = db.execute(
        select(DotationData).where(DotationData.guild_id == guild_id, DotationData.entreprise == entreprise)
    ).scalars().first()
    if not data:
        return {"employee_count": 0}
    count = db.execute(
        select(func.count(DotationRow.id)).where(DotationRow.dotation_data_id == data.id)
    ).scalar_one()
    return {"employee_count": int(count)}