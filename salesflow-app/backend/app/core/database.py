"""
Sales Flow AI - Database Connection
Stellt Supabase Client und optionale SQLAlchemy Verbindung bereit.
"""

from supabase import create_client, Client
from typing import Generator, Optional
from functools import lru_cache

from app.config import settings


# ===========================================
# SUPABASE CLIENT
# ===========================================

@lru_cache()
def get_supabase_client() -> Client:
    """
    Erstellt und cached den Supabase Client.
    Verwendet den Anon Key für reguläre Anfragen.
    """
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )


@lru_cache()
def get_supabase_admin_client() -> Optional[Client]:
    """
    Erstellt Supabase Client mit Service Role Key.
    Für Admin-Operationen die RLS umgehen.
    """
    if not settings.SUPABASE_SERVICE_KEY:
        return None
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_KEY
    )


# Global Supabase instance
supabase: Client = get_supabase_client()


def get_supabase() -> Client:
    """Dependency für FastAPI - gibt Supabase Client zurück."""
    return supabase


def get_db_connection() -> Client:
    """Alias für get_supabase()."""
    return supabase


# ===========================================
# SQLALCHEMY (Optional - für komplexe Queries)
# ===========================================

_engine = None
_SessionLocal = None


def get_sqlalchemy_engine():
    """
    Erstellt SQLAlchemy Engine für direkte DB-Verbindung.
    Nur wenn DATABASE_URL konfiguriert ist.
    """
    global _engine
    
    if not settings.DATABASE_URL:
        return None
    
    if _engine is None:
        from sqlalchemy import create_engine
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
    
    return _engine


def get_sqlalchemy_session():
    """
    Erstellt SQLAlchemy Session.
    Nur wenn DATABASE_URL konfiguriert ist.
    """
    global _SessionLocal
    
    engine = get_sqlalchemy_engine()
    if not engine:
        return None
    
    if _SessionLocal is None:
        from sqlalchemy.orm import sessionmaker
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    return _SessionLocal()


def get_db() -> Generator:
    """
    FastAPI Dependency für SQLAlchemy Session.
    Schließt Session nach Request automatisch.
    """
    db = get_sqlalchemy_session()
    if db is None:
        yield None
        return
    
    try:
        yield db
    finally:
        db.close()

