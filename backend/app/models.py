from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    discord_id = Column(String(32), unique=True, nullable=False, index=True)
    username = Column(String(64))
    global_name = Column(String(64))
    email = Column(String(120))
    avatar = Column(String(128))
    verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

class Guild(Base):
    __tablename__ = "guilds"
    id = Column(Integer, primary_key=True, autoincrement=True)
    discord_guild_id = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(128))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GuildRole(Base):
    __tablename__ = "guild_roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id", ondelete="CASCADE"), nullable=False)
    discord_role_id = Column(String(32), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(Integer, default=0)
    position = Column(Integer, default=0)
    permissions = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint('guild_id', 'discord_role_id', name='uq_guild_role'),)

class UserGuildMembership(Base):
    __tablename__ = "user_guild_memberships"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    guild_id = Column(Integer, ForeignKey("guilds.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("guild_roles.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint('user_id', 'role_id', name='uq_user_role'),)

# Domain tables (initial set)
class Enterprise(Base):
    __tablename__ = "enterprises"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    key = Column(String(64), nullable=False)
    name = Column(String(128), nullable=False)
    role_id = Column(String(32))
    employee_role_id = Column(String(32))
    enterprise_guild_id = Column(String(32))

class DotationData(Base):
    __tablename__ = "dotation_data"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    entreprise = Column(String(128), nullable=False)
    solde_actuel = Column(Float, default=0.0)
    expenses = Column(Float, default=0.0)
    withdrawals = Column(Float, default=0.0)
    commissions = Column(Float, default=0.0)
    inter_invoices = Column(Float, default=0.0)

class DotationRow(Base):
    __tablename__ = "dotation_rows"
    id = Column(Integer, primary_key=True, autoincrement=True)
    dotation_data_id = Column(Integer, ForeignKey("dotation_data.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    run = Column(Float, default=0.0)
    facture = Column(Float, default=0.0)
    vente = Column(Float, default=0.0)
    ca_total = Column(Float, default=0.0)
    salaire = Column(Float, default=0.0)
    prime = Column(Float, default=0.0)

class DashboardSummary(Base):
    __tablename__ = "dashboard_summaries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    entreprise = Column(String(128), nullable=False)
    ca_brut = Column(Float, default=0.0)
    depenses = Column(Float, default=0.0)
    benefice = Column(Float, default=0.0)
    taux_imposition = Column(Float, default=0.0)
    montant_impots = Column(Float, default=0.0)
    employee_count = Column(Integer, default=0)

class ArchiveEntry(Base):
    __tablename__ = "archive_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    date = Column(String(32), nullable=False)
    type = Column(String(64), nullable=False)
    employe = Column(String(128))
    entreprise = Column(String(128))
    montant = Column(Float, default=0.0)
    statut = Column(String(32), default="En attente")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    entreprise = Column(String(128), nullable=False)
    filename = Column(String(256), nullable=False)
    content_type = Column(String(64), nullable=False)
    size = Column(Integer, nullable=False)
    file_data_base64 = Column(Text, nullable=False)
    uploaded_by = Column(String(32))
    document_type = Column(String(64))

class StaffConfig(Base):
    __tablename__ = "staff_configs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    paliers_json = Column(Text)

class TaxBracket(Base):
    __tablename__ = "tax_brackets"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    entreprise = Column(String(128))
    brackets_json = Column(Text)
    wealth_json = Column(Text)

class CompanyConfig(Base):
    __tablename__ = "company_configs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    entreprise_id = Column(Integer, ForeignKey("enterprises.id"))
    identification_json = Column(Text)
    salaire_json = Column(Text)
    parametres_json = Column(Text)
    grade_rules_json = Column(Text)

class BlanchimentState(Base):
    __tablename__ = "blanchiment_states"
    id = Column(Integer, primary_key=True, autoincrement=True)
    scope = Column(String(64), nullable=False)  # global|guild|enterprise-id
    enabled = Column(Boolean, default=False)
    use_global = Column(Boolean, default=True)
    perc_entreprise = Column(Float, default=0.0)
    perc_groupe = Column(Float, default=0.0)

class BlanchimentGlobal(Base):
    __tablename__ = "blanchiment_global"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    perc_entreprise = Column(Float, default=0.0)
    perc_groupe = Column(Float, default=0.0)

class DiscordConfig(Base):
    __tablename__ = "discord_configs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(String(64), nullable=False)
    principal_guild_id = Column(String(32), nullable=False)
    config_json = Column(Text)