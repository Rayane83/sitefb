from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from enum import Enum

class Role(str, Enum):
    STAFF = "staff"
    PATRON = "patron"
    CO_PATRON = "co-patron"
    DOT = "dot"
    EMPLOYE = "employe"

# User and Guild models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_id: str
    name: str
    avatar: Optional[str] = None
    discriminator: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Guild(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_guild_id: str
    name: str
    icon: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserGuildRole(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    guild_id: str
    roles: List[str]
    entreprise: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Financial models
class Bracket(BaseModel):
    min: float
    max: float
    taux: float
    sal_min_emp: float
    sal_max_emp: float
    sal_min_pat: float
    sal_max_pat: float
    pr_min_emp: float
    pr_max_emp: float
    pr_min_pat: float
    pr_max_pat: float

class Wealth(BaseModel):
    min: float
    max: float
    taux: float

# Dotation models
class DotationRow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    run: float
    facture: float
    vente: float
    ca_total: float
    salaire: float
    prime: float

class DotationData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    entreprise: str
    rows: List[DotationRow]
    solde_actuel: float
    expenses: Optional[float] = 0
    withdrawals: Optional[float] = 0
    commissions: Optional[float] = 0
    inter_invoices: Optional[float] = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Dashboard models
class DashboardSummary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    entreprise: str
    ca_brut: float
    depenses: Optional[float] = 0
    depenses_deductibles: Optional[float] = 0
    benefice: float
    taux_imposition: float
    montant_impots: float
    employee_count: Optional[int] = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Enterprise models
class Entreprise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    key: str
    name: str
    role_id: Optional[str] = None
    employee_role_id: Optional[str] = None
    enterprise_guild_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Blanchiment models
class BlanchimentState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scope: str  # guild_id or enterprise key
    enabled: bool = False
    use_global: bool = True
    perc_entreprise: Optional[float] = 15
    perc_groupe: Optional[float] = 80
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BlanchimentGlobal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    perc_entreprise: float = 15
    perc_groupe: float = 80
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Company Configuration models
class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    discord_role: str
    grade: Optional[str] = None

class TierConfig(BaseModel):
    seuil: float
    bonus: float

class CalculParam(BaseModel):
    label: str
    actif: bool = True
    poids: float = 1
    cumulatif: bool = False
    paliers: List[TierConfig] = []

class GradeRule(BaseModel):
    grade: str
    role_discord_id: Optional[str] = None
    pourcentage_ca: float
    taux_horaire: float

class PrimeTier(BaseModel):
    seuil: float
    prime: float

class SalaryConfig(BaseModel):
    pourcentage_ca: float = 5
    modes: Dict[str, bool] = {
        "caEmploye": True,
        "heuresService": False,
        "additionner": False
    }
    prime_base: Dict[str, Any] = {
        "active": False,
        "montant": 0
    }
    paliers_primes: List[PrimeTier] = []

class CompanyConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    entreprise_id: Optional[str] = None
    identification: Dict[str, str] = {
        "label": "Entreprise",
        "type": "Société",
        "description": ""
    }
    salaire: SalaryConfig = Field(default_factory=SalaryConfig)
    parametres: Dict[str, CalculParam] = {}
    grade_rules: List[GradeRule] = []
    error_tiers: List[TierConfig] = []
    role_discord: str = ""
    employees: List[Employee] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Archive models
class ArchiveEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    date: str
    type: str
    employe: Optional[str] = None
    entreprise: Optional[str] = None
    montant: float
    statut: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Document models
class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    entreprise: str
    filename: str
    content_type: str
    size: int
    file_data: str  # base64 encoded
    uploaded_by: str
    document_type: str  # "facture" or "diplome"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Staff Configuration models
class StaffConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    paliers: List[Bracket]
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Tax models
class TaxBracket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    entreprise: str
    brackets: List[Bracket]
    wealth: List[Wealth]
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response models
class StatusCheckCreate(BaseModel):
    client_name: str

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# API Response models
class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    message: Optional[str] = None
    error: Optional[str] = None

class EmployeeCountResponse(BaseModel):
    count: int

# Discord Configuration models
class DiscordRoleMap(BaseModel):
    staff: Optional[str] = None
    patron: Optional[str] = None
    co_patron: Optional[str] = None

class EnterpriseRoleMap(BaseModel):
    role_id: Optional[str] = None
    guild_id: Optional[str] = None
    employee_role_id: Optional[str] = None

class DotGuildConfig(BaseModel):
    guild_id: Optional[str] = None
    roles: Optional[Dict[str, str]] = {}

class SuperadminConfig(BaseModel):
    user_ids: List[str] = []

class DiscordConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: Optional[str] = None
    principal_guild_id: Optional[str] = None
    principal_roles: Optional[DiscordRoleMap] = None
    enterprises: Optional[Dict[str, EnterpriseRoleMap]] = {}
    dot: Optional[DotGuildConfig] = None
    superadmins: Optional[SuperadminConfig] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)