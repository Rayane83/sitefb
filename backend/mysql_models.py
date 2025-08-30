from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid

Base = declarative_base()

class Role(str, Enum):
    STAFF = "staff"
    PATRON = "patron"
    CO_PATRON = "co-patron"
    DOT = "dot"
    EMPLOYE = "employe"

# SQLAlchemy Models for MySQL
class UserModel(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    discord_id = Column(String(50), unique=True, index=True)
    name = Column(String(255))
    avatar = Column(String(500))
    discriminator = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    guild_roles = relationship("UserGuildRoleModel", back_populates="user")

class GuildModel(Base):
    __tablename__ = "guilds"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    discord_guild_id = Column(String(50), unique=True, index=True)
    name = Column(String(255))
    icon = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_roles = relationship("UserGuildRoleModel", back_populates="guild")
    enterprises = relationship("EnterpriseModel", back_populates="guild")
    dotations = relationship("DotationDataModel", back_populates="guild")
    dashboard_summaries = relationship("DashboardSummaryModel", back_populates="guild")

class UserGuildRoleModel(Base):
    __tablename__ = "user_guild_roles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"))
    guild_id = Column(String(36), ForeignKey("guilds.id"))
    roles = Column(JSON)  # Store as JSON array
    entreprise = Column(String(255))
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("UserModel", back_populates="guild_roles")
    guild = relationship("GuildModel", back_populates="user_roles")

class EnterpriseModel(Base):
    __tablename__ = "enterprises"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(36), ForeignKey("guilds.id"))
    key = Column(String(100), index=True)
    name = Column(String(255))
    role_id = Column(String(50))
    employee_role_id = Column(String(50))
    enterprise_guild_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    guild = relationship("GuildModel", back_populates="enterprises")

class DotationRowModel(Base):
    __tablename__ = "dotation_rows"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dotation_data_id = Column(String(36), ForeignKey("dotation_data.id"))
    name = Column(String(255))
    run = Column(Float, default=0)
    facture = Column(Float, default=0)
    vente = Column(Float, default=0)
    ca_total = Column(Float, default=0)
    salaire = Column(Float, default=0)
    prime = Column(Float, default=0)
    
    # Relationships
    dotation_data = relationship("DotationDataModel", back_populates="rows")

class DotationDataModel(Base):
    __tablename__ = "dotation_data"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(36), ForeignKey("guilds.id"))
    entreprise = Column(String(255))
    solde_actuel = Column(Float, default=0)
    expenses = Column(Float, default=0)
    withdrawals = Column(Float, default=0)
    commissions = Column(Float, default=0)
    inter_invoices = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    guild = relationship("GuildModel", back_populates="dotations")
    rows = relationship("DotationRowModel", back_populates="dotation_data", cascade="all, delete-orphan")

class DashboardSummaryModel(Base):
    __tablename__ = "dashboard_summaries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(36), ForeignKey("guilds.id"))
    entreprise = Column(String(255))
    ca_brut = Column(Float, default=0)
    depenses = Column(Float, default=0)
    depenses_deductibles = Column(Float, default=0)
    benefice = Column(Float, default=0)
    taux_imposition = Column(Float, default=0)
    montant_impots = Column(Float, default=0)
    employee_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    guild = relationship("GuildModel", back_populates="dashboard_summaries")

class ArchiveEntryModel(Base):
    __tablename__ = "archive_entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50))
    date = Column(String(20))
    type = Column(String(100))
    employe = Column(String(255))
    entreprise = Column(String(255))
    montant = Column(Float, default=0)
    statut = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

class BlanchimentStateModel(Base):
    __tablename__ = "blanchiment_states"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scope = Column(String(255), unique=True, index=True)
    enabled = Column(Boolean, default=False)
    use_global = Column(Boolean, default=True)
    perc_entreprise = Column(Float, default=15)
    perc_groupe = Column(Float, default=80)
    updated_at = Column(DateTime, default=datetime.utcnow)

class BlanchimentGlobalModel(Base):
    __tablename__ = "blanchiment_global"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50), unique=True, index=True)
    perc_entreprise = Column(Float, default=15)
    perc_groupe = Column(Float, default=80)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DocumentModel(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50))
    entreprise = Column(String(255))
    filename = Column(String(500))
    content_type = Column(String(100))
    size = Column(Integer)
    file_data = Column(Text)  # Base64 encoded file
    uploaded_by = Column(String(255))
    document_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

class StaffConfigModel(Base):
    __tablename__ = "staff_configs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50), unique=True, index=True)
    paliers = Column(JSON)  # Store brackets as JSON
    updated_at = Column(DateTime, default=datetime.utcnow)

class TaxBracketModel(Base):
    __tablename__ = "tax_brackets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50))
    entreprise = Column(String(255))
    brackets = Column(JSON)  # Store brackets as JSON
    wealth = Column(JSON)    # Store wealth brackets as JSON
    updated_at = Column(DateTime, default=datetime.utcnow)

class CompanyConfigModel(Base):
    __tablename__ = "company_configs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    guild_id = Column(String(50))
    entreprise_id = Column(String(50))
    identification = Column(JSON)
    salaire = Column(JSON)
    parametres = Column(JSON)
    grade_rules = Column(JSON)
    error_tiers = Column(JSON)
    role_discord = Column(String(50))
    employees = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class DiscordConfigModel(Base):
    __tablename__ = "discord_configs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(50))
    principal_guild_id = Column(String(50))
    principal_roles = Column(JSON)
    enterprises = Column(JSON)
    dot = Column(JSON)
    superadmins = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Pydantic models remain the same for API responses
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

# Continue with other Pydantic models as needed...
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

class Entreprise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guild_id: str
    key: str
    name: str
    role_id: Optional[str] = None
    employee_role_id: Optional[str] = None
    enterprise_guild_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

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