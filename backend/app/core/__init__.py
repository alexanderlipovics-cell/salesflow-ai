"""
Core Module
Sales Flow AI - CHIEF Coaching

Central exports for authentication, database, and security utilities.
"""

# Authentication
from app.core.auth import (
    User,
    CurrentUser,
    get_current_user,
    get_current_user_optional,
    get_current_user_id,
    get_current_workspace,
    get_current_team,
    require_admin,
    require_team_lead,
    require_workspace_access,
    has_permission,
    require_permission,
    ROLE_PERMISSIONS,
    security
)

# Database
from app.core.database import (
    Database,
    db,
    get_db,
    get_db_connection,
    execute_query,
    execute_one,
    execute
)

# Security
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token,
    generate_api_key,
    hash_api_key,
    verify_api_key,
    TokenData
)

__all__ = [
    # Auth
    "User",
    "CurrentUser",
    "get_current_user",
    "get_current_user_optional",
    "get_current_user_id",
    "get_current_workspace",
    "get_current_team",
    "require_admin",
    "require_team_lead",
    "require_workspace_access",
    "has_permission",
    "require_permission",
    "ROLE_PERMISSIONS",
    "security",
    
    # Database
    "Database",
    "db",
    "get_db",
    "get_db_connection",
    "execute_query",
    "execute_one",
    "execute",
    
    # Security
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "verify_token",
    "generate_api_key",
    "hash_api_key",
    "verify_api_key",
    "TokenData"
]
