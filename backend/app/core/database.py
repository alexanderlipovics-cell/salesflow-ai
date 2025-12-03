"""
Database Connection Module
Sales Flow AI - CHIEF Coaching

Provides:
- Async PostgreSQL connection pool (asyncpg)
- Connection management
- Database utilities
"""

import os
import asyncpg
from contextlib import asynccontextmanager
from typing import Optional, AsyncGenerator
from app.utils.logger import get_logger

logger = get_logger(__name__)


class Database:
    """Database connection manager using asyncpg."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._connected = False
    
    async def connect(self) -> None:
        """Create connection pool."""
        if self._connected and self.pool:
            return
            
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            logger.warning("DATABASE_URL not set - database features disabled")
            return
        
        try:
            self.pool = await asyncpg.create_pool(
                database_url,
                min_size=2,
                max_size=10,
                command_timeout=60
            )
            self._connected = True
            logger.info("Database pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            self._connected = False
    
    async def disconnect(self) -> None:
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            self.pool = None
            self._connected = False
            logger.info("Database pool closed")
    
    @asynccontextmanager
    async def acquire(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Acquire connection from pool."""
        if not self.pool:
            await self.connect()
        
        if not self.pool:
            raise RuntimeError("Database connection not available")
        
        async with self.pool.acquire() as connection:
            yield connection
    
    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._connected and self.pool is not None


# Global database instance
db = Database()


@asynccontextmanager
async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Get database connection from pool.
    
    Usage:
        async with get_db() as conn:
            result = await conn.fetch("SELECT * FROM leads")
    """
    async with db.acquire() as connection:
        yield connection


async def get_db_connection() -> Optional[asyncpg.Pool]:
    """
    Get the database connection pool directly.
    
    Returns:
        The asyncpg connection pool or None if not connected.
        
    Usage:
        pool = await get_db_connection()
        if pool:
            async with pool.acquire() as conn:
                result = await conn.fetch("SELECT 1")
    """
    if not db.is_connected:
        await db.connect()
    return db.pool


async def execute_query(query: str, *args) -> list:
    """
    Execute a query and return results.
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        List of records
    """
    async with get_db() as conn:
        return await conn.fetch(query, *args)


async def execute_one(query: str, *args) -> Optional[asyncpg.Record]:
    """
    Execute a query and return single result.
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        Single record or None
    """
    async with get_db() as conn:
        return await conn.fetchrow(query, *args)


async def execute(query: str, *args) -> str:
    """
    Execute a query without returning results.
    
    Args:
        query: SQL query string
        *args: Query parameters
        
    Returns:
        Status string from database
    """
    async with get_db() as conn:
        return await conn.execute(query, *args)


# =============================================================================
# SUPABASE CLIENT
# =============================================================================

_supabase_client = None

def get_supabase():
    """
    Get Supabase client instance.
    
    Returns:
        Supabase client or None if not configured.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    try:
        from app.config import get_settings
        from supabase import create_client
        
        settings = get_settings()
        
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )
            logger.info("Supabase client initialized via get_supabase()")
            return _supabase_client
        else:
            logger.warning("Supabase credentials not configured")
            return None
            
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")
        return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "Database",
    "db",
    "get_db",
    "get_db_connection",
    "get_supabase",
    "execute_query",
    "execute_one",
    "execute"
]
