"""
Database Dependencies for FastAPI
==================================

Zentrale Dependency-Datei für alle DB-bezogenen FastAPI Dependencies.
"""

from .session import (
    get_db,
    get_db_client,
    get_supabase_client,
    get_session,
    get_readonly_session,
)

# Alias für Kompatibilität
# get_async_db wird oft verwendet, aber sollte get_session sein
get_async_db = get_session

__all__ = [
    "get_db",
    "get_db_client",
    "get_supabase_client",
    "get_session",
    "get_readonly_session",
    "get_async_db",  # Alias für get_session
]

