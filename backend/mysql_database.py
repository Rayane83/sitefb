from sqlalchemy import create_engine, select, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from typing import Optional, List, Dict, Any
import os
import logging
from mysql_models import *

logger = logging.getLogger(__name__)

class MySQLDatabaseService:
    def __init__(self, mysql_url: str):
        # Create async engine for MySQL
        self.async_engine = create_async_engine(
            mysql_url.replace("mysql://", "mysql+aiomysql://"),
            echo=False,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        self.async_session = async_sessionmaker(
            self.async_engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
    
    async def init_database(self):
        """Initialize database tables"""
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("MySQL database tables initialized")
    
    async def close(self):
        """Close database connections"""
        await self.async_engine.dispose()
    
    # Generic CRUD operations
    async def create_record(self, model_class, **kwargs):
        """Create a new record"""
        async with self.async_session() as session:
            record = model_class(**kwargs)
            session.add(record)
            await session.commit()
            await session.refresh(record)
            return record
    
    async def get_record(self, model_class, **filters):
        """Get a single record"""
        async with self.async_session() as session:
            query = select(model_class)
            for key, value in filters.items():
                query = query.where(getattr(model_class, key) == value)
            result = await session.execute(query)
            return result.scalar_one_or_none()
    
    async def get_records(self, model_class, limit: int = 1000, **filters) -> List:
        """Get multiple records"""
        async with self.async_session() as session:
            query = select(model_class).limit(limit)
            for key, value in filters.items():
                query = query.where(getattr(model_class, key) == value)
            result = await session.execute(query)
            return result.scalars().all()
    
    async def update_record(self, model_class, record_id: str, **updates):
        """Update a record"""
        async with self.async_session() as session:
            record = await session.get(model_class, record_id)
            if record:
                for key, value in updates.items():
                    setattr(record, key, value)
                await session.commit()
                return record
            return None
    
    async def delete_record(self, model_class, record_id: str):
        """Delete a record"""
        async with self.async_session() as session:
            record = await session.get(model_class, record_id)
            if record:
                await session.delete(record)
                await session.commit()
                return True
            return False
    
    async def upsert_record(self, model_class, filters: dict, updates: dict):
        """Update or insert a record"""
        async with self.async_session() as session:
            # Try to find existing record
            query = select(model_class)
            for key, value in filters.items():
                query = query.where(getattr(model_class, key) == value)
            result = await session.execute(query)
            record = result.scalar_one_or_none()
            
            if record:
                # Update existing record
                for key, value in updates.items():
                    setattr(record, key, value)
            else:
                # Create new record
                record_data = {**filters, **updates}
                record = model_class(**record_data)
                session.add(record)
            
            await session.commit()
            await session.refresh(record)
            return record

    # User operations
    async def create_user(self, user_data: dict):
        return await self.create_record(UserModel, **user_data)
    
    async def get_user_by_discord_id(self, discord_id: str):
        return await self.get_record(UserModel, discord_id=discord_id)
    
    async def upsert_user(self, user_data: dict):
        return await self.upsert_record(
            UserModel, 
            {"discord_id": user_data["discord_id"]}, 
            user_data
        )

    # Guild operations
    async def create_guild(self, guild_data: dict):
        return await self.create_record(GuildModel, **guild_data)
    
    async def get_guild_by_discord_id(self, discord_guild_id: str):
        return await self.get_record(GuildModel, discord_guild_id=discord_guild_id)
    
    async def upsert_guild(self, guild_data: dict):
        return await self.upsert_record(
            GuildModel,
            {"discord_guild_id": guild_data["discord_guild_id"]},
            guild_data
        )

    # User Guild Role operations
    async def upsert_user_guild_roles(self, role_data: dict):
        return await self.upsert_record(
            UserGuildRoleModel,
            {"user_id": role_data["user_id"], "guild_id": role_data["guild_id"]},
            role_data
        )
    
    async def get_user_guild_roles(self, user_id: str, guild_id: str):
        return await self.get_record(UserGuildRoleModel, user_id=user_id, guild_id=guild_id)

    # Dashboard operations
    async def upsert_dashboard_summary(self, summary_data: dict):
        return await self.upsert_record(
            DashboardSummaryModel,
            {"guild_id": summary_data["guild_id"], "entreprise": summary_data["entreprise"]},
            summary_data
        )
    
    async def get_dashboard_summary(self, guild_id: str, entreprise: str):
        return await self.get_record(DashboardSummaryModel, guild_id=guild_id, entreprise=entreprise)

    # Dotation operations
    async def save_dotation_data(self, dotation_data: dict, rows_data: List[dict]):
        """Save dotation data with rows"""
        async with self.async_session() as session:
            # Upsert dotation data
            dotation = await self.upsert_record(
                DotationDataModel,
                {"guild_id": dotation_data["guild_id"], "entreprise": dotation_data["entreprise"]},
                dotation_data
            )
            
            # Delete existing rows
            existing_rows = await self.get_records(DotationRowModel, dotation_data_id=dotation.id)
            for row in existing_rows:
                await session.delete(row)
            
            # Add new rows
            for row_data in rows_data:
                row_data["dotation_data_id"] = dotation.id
                row = DotationRowModel(**row_data)
                session.add(row)
            
            await session.commit()
            return dotation
    
    async def get_dotation_data(self, guild_id: str, entreprise: str):
        """Get dotation data with rows"""
        async with self.async_session() as session:
            dotation = await self.get_record(DotationDataModel, guild_id=guild_id, entreprise=entreprise)
            if dotation:
                rows = await self.get_records(DotationRowModel, dotation_data_id=dotation.id)
                return dotation, rows
            return None, []

    # Archive operations
    async def add_archive_entry(self, entry_data: dict):
        return await self.create_record(ArchiveEntryModel, **entry_data)
    
    async def get_archive_entries(self, guild_id: str, limit: int = 100):
        return await self.get_records(ArchiveEntryModel, limit=limit, guild_id=guild_id)

    # Enterprise operations
    async def create_entreprise(self, entreprise_data: dict):
        return await self.create_record(EnterpriseModel, **entreprise_data)
    
    async def get_entreprises(self, guild_id: str):
        return await self.get_records(EnterpriseModel, guild_id=guild_id)
    
    async def get_entreprise_by_key(self, guild_id: str, key: str):
        return await self.get_record(EnterpriseModel, guild_id=guild_id, key=key)
    
    async def upsert_entreprise(self, entreprise_data: dict):
        return await self.upsert_record(
            EnterpriseModel,
            {"guild_id": entreprise_data["guild_id"], "key": entreprise_data["key"]},
            entreprise_data
        )
    
    async def delete_entreprise(self, guild_id: str, key: str):
        async with self.async_session() as session:
            enterprise = await self.get_record(EnterpriseModel, guild_id=guild_id, key=key)
            if enterprise:
                await session.delete(enterprise)
                await session.commit()
                return True
            return False

    # Company Config operations
    async def save_company_config(self, config_data: dict):
        return await self.upsert_record(
            CompanyConfigModel,
            {"guild_id": config_data["guild_id"], "entreprise_id": config_data.get("entreprise_id")},
            config_data
        )
    
    async def get_company_config(self, guild_id: str, entreprise_id: Optional[str] = None):
        filters = {"guild_id": guild_id}
        if entreprise_id:
            filters["entreprise_id"] = entreprise_id
        return await self.get_record(CompanyConfigModel, **filters)

    # Blanchiment operations
    async def get_blanchiment_state(self, scope: str):
        return await self.get_record(BlanchimentStateModel, scope=scope)
    
    async def save_blanchiment_state(self, state_data: dict):
        return await self.upsert_record(
            BlanchimentStateModel,
            {"scope": state_data["scope"]},
            state_data
        )
    
    async def get_blanchiment_global(self, guild_id: str):
        return await self.get_record(BlanchimentGlobalModel, guild_id=guild_id)
    
    async def save_blanchiment_global(self, config_data: dict):
        return await self.upsert_record(
            BlanchimentGlobalModel,
            {"guild_id": config_data["guild_id"]},
            config_data
        )

    # Staff Config operations
    async def save_staff_config(self, config_data: dict):
        return await self.upsert_record(
            StaffConfigModel,
            {"guild_id": config_data["guild_id"]},
            config_data
        )
    
    async def get_staff_config(self, guild_id: str):
        return await self.get_record(StaffConfigModel, guild_id=guild_id)

    # Tax Bracket operations
    async def save_tax_brackets(self, brackets_data: dict):
        return await self.upsert_record(
            TaxBracketModel,
            {"guild_id": brackets_data["guild_id"], "entreprise": brackets_data["entreprise"]},
            brackets_data
        )
    
    async def get_tax_brackets(self, guild_id: str, entreprise: str):
        return await self.get_record(TaxBracketModel, guild_id=guild_id, entreprise=entreprise)

    # Document operations
    async def save_document(self, document_data: dict):
        return await self.create_record(DocumentModel, **document_data)
    
    async def get_documents_by_entreprise(self, guild_id: str, entreprise: str):
        return await self.get_records(DocumentModel, guild_id=guild_id, entreprise=entreprise)
    
    async def get_document_by_id(self, document_id: str):
        return await self.get_record(DocumentModel, id=document_id)

    # Discord Config operations
    async def save_discord_config(self, config_data: dict):
        return await self.upsert_record(DiscordConfigModel, {}, config_data)
    
    async def get_discord_config(self):
        records = await self.get_records(DiscordConfigModel, limit=1)
        return records[0] if records else None

# Global database instance
db_service: Optional[MySQLDatabaseService] = None

def get_database() -> MySQLDatabaseService:
    global db_service
    if db_service is None:
        mysql_url = os.environ.get('MYSQL_URL', 'mysql://root:password@localhost:3306/flashback_enterprise_db')
        db_service = MySQLDatabaseService(mysql_url)
    return db_service

async def init_database():
    """Initialize database connection and tables"""
    global db_service
    mysql_url = os.environ.get('MYSQL_URL', 'mysql://root:password@localhost:3306/flashback_enterprise_db')
    db_service = MySQLDatabaseService(mysql_url)
    await db_service.init_database()
    logger.info("MySQL database initialized")

async def close_database():
    """Close database connection"""
    global db_service
    if db_service:
        await db_service.close()
        db_service = None
        logger.info("MySQL database connection closed")