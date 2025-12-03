"""
Database Module - Unified Access
Sales Flow AI - CHIEF Coaching

Provides unified access to all database connections:
- Supabase client (primary)
- Async PostgreSQL pool (asyncpg)
- SQLAlchemy (optional, for migrations)
"""

from typing import Optional, Generator
import os

# =============================================================================
# ASYNCPG (Primary async connection)
# =============================================================================

from app.core.database import (
    get_db,
    get_db_connection,
    db,
    Database,
    execute_query,
    execute_one,
    execute
)

# =============================================================================
# SUPABASE CLIENT
# =============================================================================

from app.db.database import get_supabase, supabase

# =============================================================================
# SQLALCHEMY (For migrations and ORM if needed)
# =============================================================================

try:
    from sqlalchemy import create_engine
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    
    DATABASE_URL = os.getenv('DATABASE_URL', '')
    
    if DATABASE_URL:
        # Convert postgres:// to postgresql:// for SQLAlchemy
        if DATABASE_URL.startswith('postgres://'):
            DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    else:
        engine = None
        SessionLocal = None
    
    # SQLAlchemy Base for ORM models
    Base = declarative_base()
    
    def get_sqlalchemy_db() -> Generator[Session, None, None]:
        """
        Get SQLAlchemy database session.
        
        Usage:
            def my_endpoint(db: Session = Depends(get_sqlalchemy_db)):
                result = db.query(Model).all()
        """
        if SessionLocal is None:
            raise RuntimeError("SQLAlchemy not configured - DATABASE_URL not set")
        
        db_session = SessionLocal()
        try:
            yield db_session
        finally:
            db_session.close()

except ImportError:
    # SQLAlchemy not installed - provide stubs
    Base = None
    engine = None
    SessionLocal = None
    
    def get_sqlalchemy_db():
        raise RuntimeError("SQLAlchemy not installed")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Asyncpg
    "get_db",
    "get_db_connection",
    "db",
    "Database",
    "execute_query",
    "execute_one",
    "execute",
    
    # Supabase
    "get_supabase",
    "supabase",
    
    # SQLAlchemy
    "Base",
    "engine",
    "SessionLocal",
    "get_sqlalchemy_db"
]
