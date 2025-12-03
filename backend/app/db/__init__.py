"""
Database helper for Postgres access (advanced search, analytics, etc.).
"""
from typing import Optional

from databases import Database
from fastapi import HTTPException, status

from config import settings

_database: Optional[Database] = None


def _ensure_database() -> Database:
    if not settings.DATABASE_URL:
        raise RuntimeError("DATABASE_URL ist nicht konfiguriert. Bitte .env ergänzen.")

    global _database
    if _database is None:
        _database = Database(settings.DATABASE_URL)
    return _database


async def connect_database() -> None:
    """
    Establish shared connection pool (called on startup).
    """
    if not settings.DATABASE_URL:
        return

    db = _ensure_database()
    if not db.is_connected:
        await db.connect()


async def disconnect_database() -> None:
    """
    Close shared connection pool (called on shutdown).
    """
    global _database
    if _database and _database.is_connected:
        await _database.disconnect()


async def get_db_connection() -> Database:
    """
    FastAPI dependency that ensures an active DB connection.
    """
    try:
        db = _ensure_database()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if not db.is_connected:
        await db.connect()
    return db

