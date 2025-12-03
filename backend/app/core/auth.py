"""
Authentication & Authorization Module
Sales Flow AI - CHIEF Coaching

Provides:
- User model & authentication
- Role-based access control
- Workspace/tenant isolation
"""

from fastapi import HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Literal
from pydantic import BaseModel, Field
import os

# Security scheme for Swagger UI
security = HTTPBearer(auto_error=False)


# =============================================================================
# USER MODELS
# =============================================================================

class User(BaseModel):
    """User model with workspace context."""
    
    id: str
    email: str
    workspace_id: str = Field(default="default-workspace")
    team_id: Optional[str] = None
    role: Literal["rep", "team_lead", "admin", "partner", "enterprise_admin"] = "rep"
    name: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "user@example.com",
                "workspace_id": "workspace-123",
                "team_id": "team-456",
                "role": "rep",
                "name": "Max Mustermann"
            }
        }


class CurrentUser(User):
    """Alias for backwards compatibility."""
    pass


# =============================================================================
# ROLE PERMISSIONS
# =============================================================================

ROLE_PERMISSIONS = {
    "rep": [
        "view_own_leads",
        "edit_own_leads",
        "view_own_followups",
        "use_ai_chat",
        "view_playbooks"
    ],
    "team_lead": [
        "view_own_leads",
        "edit_own_leads", 
        "view_team_leads",
        "edit_team_leads",
        "delete_leads",
        "view_own_followups",
        "view_team_followups",
        "use_ai_chat",
        "view_playbooks",
        "create_playbooks",
        "manage_team",
        "view_team_analytics"
    ],
    "admin": [
        "view_own_leads",
        "edit_own_leads",
        "view_team_leads", 
        "edit_team_leads",
        "view_all_leads",
        "edit_all_leads",
        "delete_leads",
        "view_own_followups",
        "view_team_followups",
        "view_all_followups",
        "use_ai_chat",
        "view_playbooks",
        "create_playbooks",
        "edit_playbooks",
        "manage_team",
        "view_team_analytics",
        "view_all_analytics",
        "manage_settings",
        "manage_billing",
        "manage_users"
    ],
    "partner": [
        "view_own_leads",
        "view_analytics",
        "manage_referrals"
    ],
    "enterprise_admin": [
        # All admin permissions plus
        "manage_workspaces",
        "view_all_workspaces",
        "configure_sso",
        "manage_api_keys"
    ]
}


def has_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission."""
    role_perms = ROLE_PERMISSIONS.get(user.role, [])
    
    # Enterprise admins inherit all admin permissions
    if user.role == "enterprise_admin":
        role_perms = list(set(role_perms + ROLE_PERMISSIONS.get("admin", [])))
    
    return permission in role_perms


def require_permission(permission: str):
    """Dependency to require a specific permission."""
    async def check_permission(user: User = Depends(get_current_user)):
        if not has_permission(user, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: {permission} required"
            )
        return user
    return check_permission


# =============================================================================
# AUTHENTICATION DEPENDENCIES
# =============================================================================

async def get_current_user(
    authorization: Optional[str] = Header(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    Get current user from authorization header.
    
    Supports both:
    - Header: Authorization: Bearer <token>
    - HTTPBearer security scheme
    
    In production, implement proper JWT validation with Supabase.
    """
    
    token = None
    
    # Try to get token from header
    if authorization and authorization.startswith('Bearer '):
        token = authorization[7:]
    elif credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # TODO: In production, validate JWT with Supabase
    # from app.db.database import supabase
    # user_response = supabase.auth.get_user(token)
    # if user_response.user:
    #     return User(
    #         id=user_response.user.id,
    #         email=user_response.user.email,
    #         workspace_id=user_response.user.user_metadata.get('workspace_id', 'default'),
    #         role=user_response.user.user_metadata.get('role', 'rep')
    #     )
    
    # Development fallback - return mock user
    return User(
        id="00000000-0000-0000-0000-000000000000",
        email="user@example.com",
        workspace_id="default-workspace",
        team_id="default-team",
        role="admin",
        name="Development User"
    )


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    try:
        return await get_current_user(authorization, credentials)
    except HTTPException:
        return None


async def get_current_user_id(
    user: User = Depends(get_current_user)
) -> str:
    """Get the current user's ID."""
    return user.id


async def get_current_workspace(
    user: User = Depends(get_current_user)
) -> str:
    """Get the current user's workspace ID."""
    return user.workspace_id


async def get_current_team(
    user: User = Depends(get_current_user)
) -> Optional[str]:
    """Get the current user's team ID."""
    return user.team_id


# =============================================================================
# ROLE-BASED ACCESS CONTROL DEPENDENCIES
# =============================================================================

async def require_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Require admin role."""
    if user.role not in ["admin", "enterprise_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_team_lead(
    user: User = Depends(get_current_user)
) -> User:
    """Require team lead or higher role."""
    if user.role not in ["team_lead", "admin", "enterprise_admin"]:
        raise HTTPException(status_code=403, detail="Team lead access required")
    return user


async def require_workspace_access(
    workspace_id: str,
    user: User = Depends(get_current_user)
) -> User:
    """Ensure user has access to the specified workspace."""
    if user.role == "enterprise_admin":
        return user  # Enterprise admins can access all workspaces
    
    if user.workspace_id != workspace_id:
        raise HTTPException(
            status_code=403, 
            detail="Access to this workspace denied"
        )
    return user


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Models
    "User",
    "CurrentUser",
    
    # Permissions
    "ROLE_PERMISSIONS",
    "has_permission",
    "require_permission",
    
    # Authentication
    "get_current_user",
    "get_current_user_optional",
    "get_current_user_id",
    "get_current_workspace",
    "get_current_team",
    
    # Role-based access
    "require_admin",
    "require_team_lead",
    "require_workspace_access",
    
    # Security
    "security"
]
