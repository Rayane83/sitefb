from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
import os
from models import *
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, mongo_url: str, db_name: str):
        self.client = AsyncIOMotorClient(mongo_url)
        self.db: AsyncIOMotorDatabase = self.client[db_name]
    
    async def close(self):
        self.client.close()
    
    # Generic CRUD operations
    async def create_document(self, collection: str, document: dict) -> str:
        """Create a document and return its ID"""
        result = await self.db[collection].insert_one(document)
        return str(result.inserted_id)
    
    async def get_document(self, collection: str, query: dict) -> Optional[dict]:
        """Get a single document"""
        return await self.db[collection].find_one(query)
    
    async def get_documents(self, collection: str, query: dict = {}, limit: int = 1000) -> List[dict]:
        """Get multiple documents"""
        cursor = self.db[collection].find(query).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def update_document(self, collection: str, query: dict, update: dict) -> bool:
        """Update a document"""
        result = await self.db[collection].update_one(query, {"$set": update})
        return result.modified_count > 0
    
    async def delete_document(self, collection: str, query: dict) -> bool:
        """Delete a document"""
        result = await self.db[collection].delete_one(query)
        return result.deleted_count > 0
    
    async def upsert_document(self, collection: str, query: dict, document: dict) -> str:
        """Update or insert a document"""
        result = await self.db[collection].update_one(
            query, 
            {"$set": document}, 
            upsert=True
        )
        return str(result.upserted_id) if result.upserted_id else "updated"

    # User operations
    async def create_user(self, user: User) -> str:
        return await self.create_document("users", user.dict())
    
    async def get_user_by_discord_id(self, discord_id: str) -> Optional[User]:
        doc = await self.get_document("users", {"discord_id": discord_id})
        return User(**doc) if doc else None
    
    async def upsert_user(self, user: User) -> str:
        return await self.upsert_document("users", {"discord_id": user.discord_id}, user.dict())

    # Guild operations
    async def create_guild(self, guild: Guild) -> str:
        return await self.create_document("guilds", guild.dict())
    
    async def get_guild_by_discord_id(self, discord_guild_id: str) -> Optional[Guild]:
        doc = await self.get_document("guilds", {"discord_guild_id": discord_guild_id})
        return Guild(**doc) if doc else None
    
    async def upsert_guild(self, guild: Guild) -> str:
        return await self.upsert_document("guilds", {"discord_guild_id": guild.discord_guild_id}, guild.dict())

    # User Guild Role operations
    async def upsert_user_guild_roles(self, user_role: UserGuildRole) -> str:
        return await self.upsert_document(
            "user_guild_roles", 
            {"user_id": user_role.user_id, "guild_id": user_role.guild_id}, 
            user_role.dict()
        )
    
    async def get_user_guild_roles(self, user_id: str, guild_id: str) -> Optional[UserGuildRole]:
        doc = await self.get_document("user_guild_roles", {"user_id": user_id, "guild_id": guild_id})
        return UserGuildRole(**doc) if doc else None

    # Dashboard operations
    async def upsert_dashboard_summary(self, summary: DashboardSummary) -> str:
        return await self.upsert_document(
            "dashboard_summaries",
            {"guild_id": summary.guild_id, "entreprise": summary.entreprise},
            summary.dict()
        )
    
    async def get_dashboard_summary(self, guild_id: str, entreprise: str) -> Optional[DashboardSummary]:
        doc = await self.get_document("dashboard_summaries", {"guild_id": guild_id, "entreprise": entreprise})
        return DashboardSummary(**doc) if doc else None

    # Dotation operations
    async def save_dotation_data(self, dotation: DotationData) -> str:
        return await self.upsert_document(
            "dotations",
            {"guild_id": dotation.guild_id, "entreprise": dotation.entreprise},
            dotation.dict()
        )
    
    async def get_dotation_data(self, guild_id: str, entreprise: str) -> Optional[DotationData]:
        doc = await self.get_document("dotations", {"guild_id": guild_id, "entreprise": entreprise})
        return DotationData(**doc) if doc else None

    # Archive operations
    async def add_archive_entry(self, entry: ArchiveEntry) -> str:
        return await self.create_document("archives", entry.dict())
    
    async def get_archive_entries(self, guild_id: str, limit: int = 100) -> List[ArchiveEntry]:
        docs = await self.get_documents("archives", {"guild_id": guild_id}, limit)
        return [ArchiveEntry(**doc) for doc in docs]

    # Enterprise operations
    async def create_entreprise(self, entreprise: Entreprise) -> str:
        return await self.create_document("entreprises", entreprise.dict())
    
    async def get_entreprises(self, guild_id: str) -> List[Entreprise]:
        docs = await self.get_documents("entreprises", {"guild_id": guild_id})
        return [Entreprise(**doc) for doc in docs]
    
    async def get_entreprise_by_key(self, guild_id: str, key: str) -> Optional[Entreprise]:
        doc = await self.get_document("entreprises", {"guild_id": guild_id, "key": key})
        return Entreprise(**doc) if doc else None
    
    async def upsert_entreprise(self, entreprise: Entreprise) -> str:
        return await self.upsert_document(
            "entreprises",
            {"guild_id": entreprise.guild_id, "key": entreprise.key},
            entreprise.dict()
        )
    
    async def delete_entreprise(self, guild_id: str, key: str) -> bool:
        return await self.delete_document("entreprises", {"guild_id": guild_id, "key": key})

    # Company Config operations
    async def save_company_config(self, config: CompanyConfig) -> str:
        return await self.upsert_document(
            "company_configs",
            {"guild_id": config.guild_id, "entreprise_id": config.entreprise_id},
            config.dict()
        )
    
    async def get_company_config(self, guild_id: str, entreprise_id: Optional[str] = None) -> Optional[CompanyConfig]:
        query = {"guild_id": guild_id}
        if entreprise_id:
            query["entreprise_id"] = entreprise_id
        doc = await self.get_document("company_configs", query)
        return CompanyConfig(**doc) if doc else None

    # Blanchiment operations
    async def get_blanchiment_state(self, scope: str) -> Optional[BlanchimentState]:
        doc = await self.get_document("blanchiment_states", {"scope": scope})
        return BlanchimentState(**doc) if doc else None
    
    async def save_blanchiment_state(self, state: BlanchimentState) -> str:
        return await self.upsert_document("blanchiment_states", {"scope": state.scope}, state.dict())
    
    async def get_blanchiment_global(self, guild_id: str) -> Optional[BlanchimentGlobal]:
        doc = await self.get_document("blanchiment_global", {"guild_id": guild_id})
        return BlanchimentGlobal(**doc) if doc else None
    
    async def save_blanchiment_global(self, global_config: BlanchimentGlobal) -> str:
        return await self.upsert_document("blanchiment_global", {"guild_id": global_config.guild_id}, global_config.dict())

    # Staff Config operations
    async def save_staff_config(self, config: StaffConfig) -> str:
        return await self.upsert_document("staff_configs", {"guild_id": config.guild_id}, config.dict())
    
    async def get_staff_config(self, guild_id: str) -> Optional[StaffConfig]:
        doc = await self.get_document("staff_configs", {"guild_id": guild_id})
        return StaffConfig(**doc) if doc else None

    # Tax Bracket operations
    async def save_tax_brackets(self, tax_brackets: TaxBracket) -> str:
        return await self.upsert_document(
            "tax_brackets",
            {"guild_id": tax_brackets.guild_id, "entreprise": tax_brackets.entreprise},
            tax_brackets.dict()
        )
    
    async def get_tax_brackets(self, guild_id: str, entreprise: str) -> Optional[TaxBracket]:
        doc = await self.get_document("tax_brackets", {"guild_id": guild_id, "entreprise": entreprise})
        return TaxBracket(**doc) if doc else None

    # Document operations
    async def save_document(self, document: Document) -> str:
        return await self.create_document("documents", document.dict())
    
    async def get_documents_by_entreprise(self, guild_id: str, entreprise: str) -> List[Document]:
        docs = await self.get_documents("documents", {"guild_id": guild_id, "entreprise": entreprise})
        return [Document(**doc) for doc in docs]
    
    async def get_document_by_id(self, document_id: str) -> Optional[Document]:
        doc = await self.get_document("documents", {"id": document_id})
        return Document(**doc) if doc else None

    # Discord Config operations
    async def save_discord_config(self, config: DiscordConfig) -> str:
        return await self.upsert_document("discord_configs", {}, config.dict())
    
    async def get_discord_config(self) -> Optional[DiscordConfig]:
        doc = await self.get_document("discord_configs", {})
        return DiscordConfig(**doc) if doc else None

# Global database instance
db_service: Optional[DatabaseService] = None

def get_database() -> DatabaseService:
    global db_service
    if db_service is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'flashback_enterprise_db')
        db_service = DatabaseService(mongo_url, db_name)
    return db_service

async def init_database():
    """Initialize database connection"""
    global db_service
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'flashback_enterprise_db')
    db_service = DatabaseService(mongo_url, db_name)
    logger.info(f"Database initialized: {db_name}")

async def close_database():
    """Close database connection"""
    global db_service
    if db_service:
        await db_service.close()
        db_service = None
        logger.info("Database connection closed")