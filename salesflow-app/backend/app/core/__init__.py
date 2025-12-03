"""
Sales Flow AI - Core Module
Exportiert zentrale Komponenten für Authentifizierung, Datenbank und Sicherheit.
"""

from app.core.database import get_supabase, supabase
from app.core.auth import (
    get_current_user,
    get_current_user_id,
    get_current_workspace,
    User,
    UserRole
)
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_token
)

__all__ = [
    # Database
    "get_supabase",
    "supabase",
    # Auth
    "get_current_user",
    "get_current_user_id", 
    "get_current_workspace",
    "User",
    "UserRole",
    # Security
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "verify_token",
]

