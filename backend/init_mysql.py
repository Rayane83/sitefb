#!/usr/bin/env python3
"""
Script d'initialisation MySQL pour le développement
Utilise SQLite comme alternative simple à MySQL
"""

import asyncio
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from mysql_models import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_sqlite_database():
    """Initialize SQLite database for development (alternative to MySQL)"""
    
    # Use SQLite for development if MySQL not available
    sqlite_url = "sqlite+aiosqlite:///./flashback_enterprise.db"
    
    engine = create_async_engine(sqlite_url, echo=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("SQLite database initialized successfully")
    await engine.dispose()

def init_mysql_database():
    """Initialize MySQL database for production"""
    try:
        mysql_url = os.environ.get('MYSQL_URL', 'mysql://root:password@localhost:3306/flashback_enterprise_db')
        
        # Remove async part for sync initialization
        sync_url = mysql_url.replace("mysql+aiomysql://", "mysql+pymysql://")
        if not sync_url.startswith("mysql+pymysql://"):
            sync_url = sync_url.replace("mysql://", "mysql+pymysql://")
        
        engine = create_engine(sync_url, echo=True)
        Base.metadata.create_all(engine)
        
        logger.info("MySQL database initialized successfully")
        engine.dispose()
        
    except Exception as e:
        logger.error(f"MySQL initialization failed: {e}")
        logger.info("Falling back to SQLite...")
        asyncio.run(init_sqlite_database())

if __name__ == "__main__":
    init_mysql_database()