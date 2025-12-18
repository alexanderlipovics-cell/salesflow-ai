"""
============================================
🗄️ SALESFLOW AI - DATABASE SESSION MANAGEMENT
============================================

Optimized connection pooling for high concurrency:

- Async SQLAlchemy with asyncpg
- Connection pool management
- Health checks
- Retry logic
- Query timeout handling
"""

import asyncio
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
import os

try:
    from supabase import Client, create_client
except ImportError:  # supabase may not be installed in some environments
    Client = None
    create_client = None
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
)
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool
from sqlalchemy import event, text
from sqlalchemy.exc import SQLAlchemyError, DBAPIError
import structlog

logger = structlog.get_logger()

class DatabaseConfig:
    """Database connection configuration."""

    # Pool settings for production
    POOL_SIZE = 20                    # Base connections
    MAX_OVERFLOW = 30                 # Extra connections on demand
    POOL_TIMEOUT = 30                 # Seconds to wait for connection
    POOL_RECYCLE = 3600              # Recycle connections after 1 hour
    POOL_PRE_PING = True             # Verify connection before use

    # Query settings
    STATEMENT_TIMEOUT_MS = 30000     # 30 second query timeout
    LOCK_TIMEOUT_MS = 10000          # 10 second lock timeout

    # Connection settings
    CONNECT_TIMEOUT = 10             # Connection timeout
    COMMAND_TIMEOUT = 30             # Command timeout

class DatabaseSessionManager:
    """
    Manages database connections with connection pooling.

    Features:
    - Async connection pool
    - Automatic reconnection
    - Health monitoring
    - Graceful shutdown
    """

    def __init__(self):
        self._engine: Optional[AsyncEngine] = None
        self._sessionmaker: Optional[async_sessionmaker] = None
        self._initialized = False

    def init(
        self,
        database_url: str,
        echo: bool = False,
        pool_size: int = DatabaseConfig.POOL_SIZE,
        max_overflow: int = DatabaseConfig.MAX_OVERFLOW,
    ):
        """Initialize database engine and session maker."""

        # Convert postgres:// to postgresql+asyncpg://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace(
                "postgres://", "postgresql+asyncpg://", 1
            )
        elif database_url.startswith("postgresql://"):
            database_url = database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )

        # Create engine with optimized pool settings
        self._engine = create_async_engine(
            database_url,
            echo=echo,
            poolclass=AsyncAdaptedQueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=DatabaseConfig.POOL_TIMEOUT,
            pool_recycle=DatabaseConfig.POOL_RECYCLE,
            pool_pre_ping=DatabaseConfig.POOL_PRE_PING,
            connect_args={
                "timeout": DatabaseConfig.CONNECT_TIMEOUT,
                "command_timeout": DatabaseConfig.COMMAND_TIMEOUT,
                "server_settings": {
                    "statement_timeout": str(DatabaseConfig.STATEMENT_TIMEOUT_MS),
                    "lock_timeout": str(DatabaseConfig.LOCK_TIMEOUT_MS),
                    "idle_in_transaction_session_timeout": "60000",  # 60s
                },
            },
        )

        # Create session maker
        self._sessionmaker = async_sessionmaker(
            bind=self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        # Register event listeners
        self._register_events()

        self._initialized = True
        _set_async_engine()  # Export async_engine for event handlers
        logger.info(
            "Database initialized",
            pool_size=pool_size,
            max_overflow=max_overflow
        )

    def _register_events(self):
        """Register SQLAlchemy event listeners."""

        @event.listens_for(self._engine.sync_engine, "connect")
        def on_connect(dbapi_conn, connection_record):
            """Log new connections."""
            logger.debug("New database connection established")

        @event.listens_for(self._engine.sync_engine, "checkout")
        def on_checkout(dbapi_conn, connection_record, connection_proxy):
            """Log connection checkout from pool."""
            logger.debug("Connection checked out from pool")

        @event.listens_for(self._engine.sync_engine, "checkin")
        def on_checkin(dbapi_conn, connection_record):
            """Log connection return to pool."""
            logger.debug("Connection returned to pool")

    async def close(self):
        """Close all connections and dispose engine."""
        if self._engine:
            await self._engine.dispose()
            logger.info("Database connections closed")
        self._initialized = False

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session from pool.

        Usage:
            async with db.session() as session:
                result = await session.execute(query)
        """
        if not self._initialized:
            raise RuntimeError("Database not initialized")

        session = self._sessionmaker()
        try:
            yield session
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Database error", error=str(e))
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def readonly_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get read-only session (uses replica if available).

        Optimized for read operations with autocommit.
        """
        if not self._initialized:
            raise RuntimeError("Database not initialized")

        session = self._sessionmaker()
        try:
            # Set session to read-only mode
            await session.execute(text("SET TRANSACTION READ ONLY"))
            yield session
        finally:
            await session.close()

    async def health_check(self) -> dict:
        """
        Check database health.

        Returns connection pool status and query latency.
        """
        import time

        try:
            start = time.perf_counter()

            async with self.session() as session:
                result = await session.execute(text("SELECT 1"))
                result.scalar()

            latency = (time.perf_counter() - start) * 1000  # ms

            pool = self._engine.pool

            return {
                "status": "healthy",
                "latency_ms": round(latency, 2),
                "pool": {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "invalid": pool.invalidated(),
                }
            }
        except Exception as e:
            logger.error("Database health check failed", error=str(e))
            return {
                "status": "unhealthy",
                "error": str(e)
            }

    async def execute_with_retry(
        self,
        query,
        params: dict = None,
        max_retries: int = 3,
        retry_delay: float = 0.5
    ):
        """
        Execute query with automatic retry on transient errors.

        Handles connection errors and deadlocks.
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                async with self.session() as session:
                    result = await session.execute(query, params or {})
                    return result
            except DBAPIError as e:
                last_error = e

                # Check if error is retryable
                if e.connection_invalidated or "deadlock" in str(e).lower():
                    logger.warning(
                        "Retrying database query",
                        attempt=attempt + 1,
                        max_retries=max_retries,
                        error=str(e)
                    )
                    await asyncio.sleep(retry_delay * (attempt + 1))
                    continue

                raise

        raise last_error

    @property
    def engine(self) -> AsyncEngine:
        """Get underlying engine."""
        if not self._engine:
            raise RuntimeError("Database not initialized")
        return self._engine

# ==================== SINGLETON ====================

db = DatabaseSessionManager()

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database session.

    Usage:
        @router.get("/items")
        async def get_items(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with db.session() as session:
        yield session

async def get_readonly_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for read-only session.

    Use for GET requests that don't modify data.
    """
    async with db.readonly_session() as session:
        yield session

# ==================== TRANSACTION HELPERS ====================

@asynccontextmanager
async def transaction(session: AsyncSession):
    """
    Context manager for explicit transaction control.

    Usage:
        async with transaction(session):
            await session.execute(...)
            await session.execute(...)
    """
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise

async def bulk_insert(
    session: AsyncSession,
    model,
    items: list[dict],
    batch_size: int = 1000
):
    """
    Efficiently insert large number of records.

    Uses bulk insert with batching.
    """
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        await session.execute(
            model.__table__.insert(),
            batch
        )
    await session.commit()

# ==================== QUERY HELPERS ====================

class QueryOptimizer:
    """
    Helper class for optimized queries.
    """

    @staticmethod
    def paginate(query, page: int = 1, page_size: int = 20):
        """Add pagination to query."""
        offset = (page - 1) * page_size
        return query.offset(offset).limit(page_size)

    @staticmethod
    def with_count(query):
        """Add count subquery."""
        from sqlalchemy import func, select
        return select(func.count()).select_from(query.subquery())

# ==================== LIFECYCLE HOOKS ====================

async def init_database(database_url: str, echo: bool = False):
    """Initialize database connection."""
    db.init(database_url, echo=echo)

    # Verify connection
    health = await db.health_check()
    if health["status"] != "healthy":
        raise RuntimeError(f"Database connection failed: {health.get('error')}")

    logger.info("Database connection verified", latency_ms=health.get("latency_ms"))

async def close_database():
    """Close database connections."""
    await db.close()


# ============== SYNC PLACEHOLDER DEPENDENCY (FastAPI compatibility) ==============
def get_db():
    """
    Database session dependency for FastAPI.
    Placeholder stub; replace with real DB session if needed.
    """
    try:
        db_session = None  # TODO: wire up real session if required
        yield db_session
    finally:
        # Close/cleanup goes here when a real session is used
        pass


# ==================== SUPABASE CLIENT (STUB) ====================
_supabase_client: Optional["Client"] = None


def _create_supabase_client() -> Optional["Client"]:
    """Create Supabase client from env if available."""
    if create_client is None:
        return None
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if url and key:
        try:
            # KRITISCH: Nur URL und Key übergeben - KEINE zusätzlichen Parameter!
            # Signatur: create_client(url: str, key: str) -> Client
            return create_client(url, key)
        except Exception:
            return None
    return None


def get_supabase_client() -> Optional["Client"]:
    """Get or create Supabase client (singleton stub)."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = _create_supabase_client()
    return _supabase_client


async def get_db_client():
    """
    Async-compatible getter for DB/Supabase client.
    Currently returns the Supabase client stub (or None).
    """
    return get_supabase_client()


# Alias for compatibility
supabase = get_supabase_client

# Export async_engine for event handlers
async_engine = None  # Will be set when db.init() is called

def _set_async_engine():
    """Set async_engine when database is initialized."""
    global async_engine
    if db._engine:
        async_engine = db._engine