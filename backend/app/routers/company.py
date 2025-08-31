import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import CompanyConfig, Enterprise
from ..security import require_staff

router = APIRouter(prefix="/api/company/config", tags=["company-config"])

@router.get("/{guild_id}")
async def get_company_config(guild_id: int, entreprise_id: int, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(
        select(CompanyConfig).where(CompanyConfig.guild_id == guild_id, CompanyConfig.entreprise_id == entreprise_id)
    ).scalars().first()
    if not row:
        return {
            "identification": {},
            "salaire": {"pourcentage_ca": 0.1, "modes": ["ca_employe"], "prime_base": 0},
            "parametres": {},
            "grade_rules": []
        }
    return {
        "identification": json.loads(row.identification_json or "{}"),
        "salaire": json.loads(row.salaire_json or "{}"),
        "parametres": json.loads(row.parametres_json or "{}"),
        "grade_rules": json.loads(row.grade_rules_json or "[]"),
    }

@router.post("/{guild_id}")
async def set_company_config(guild_id: int, entreprise_id: int, body: dict, db: Session = Depends(get_db), _=Depends(require_staff)):
    row = db.execute(
        select(CompanyConfig).where(CompanyConfig.guild_id == guild_id, CompanyConfig.entreprise_id == entreprise_id)
    ).scalars().first()
    if not row:
        row = CompanyConfig(guild_id=guild_id, entreprise_id=entreprise_id)
        db.add(row)
    row.identification_json = json.dumps(body.get("identification", {}))
    row.salaire_json = json.dumps(body.get("salaire", {}))
    row.parametres_json = json.dumps(body.get("parametres", {}))
    row.grade_rules_json = json.dumps(body.get("grade_rules", []))
    db.commit()
    return {"status": "ok"}