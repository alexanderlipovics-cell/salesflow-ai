"""
Sales Flow AI - Authentication
User-Authentifizierung und Autorisierung via Supabase.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

from app.core.database import get_supabase, supabase
from app.core.security import verify_token


# ===========================================
# SECURITY SCHEME
# ===========================================

security = HTTPBearer(auto_error=False)


# ===========================================
# ENUMS & MODELS
# ===========================================

class UserRole(str, Enum):
    """Benutzerrollen im System."""
    REP = "rep"                     # Vertriebsmitarbeiter
    TEAM_LEAD = "team_lead"         # Teamleiter
    ADMIN = "admin"                 # Administrator
    PARTNER = "partner"             # Partner-Account
    ENTERPRISE_ADMIN = "enterprise_admin"  # Enterprise Administrator


class User(BaseModel):
    """Authentifizierter Benutzer."""
    id: str = Field(..., description="User UUID")
    email: str = Field(..., description="E-Mail Adresse")
    workspace_id: Optional[str] = Field(None, description="Workspace UUID")
    team_id: Optional[str] = Field(None, description="Team UUID")
    role: UserRole = Field(default=UserRole.REP, description="Benutzerrolle")
    full_name: Optional[str] = Field(None, description="Vollständiger Name")
    
    class Config:
        use_enum_values = True


# ===========================================
# PERMISSION DEFINITIONS
# ===========================================

ROLE_PERMISSIONS = {
    UserRole.REP: [
        "view_own_leads",
        "edit_own_leads",
        "view_own_followups",
        "use_chief",
        "view_playbooks",
    ],
    UserRole.TEAM_LEAD: [
        "view_own_leads",
        "edit_own_leads",
        "view_team_leads",
        "edit_team_leads",
        "view_own_followups",
        "view_team_followups",
        "use_chief",
        "view_playbooks",
        "create_playbooks",
        "view_team_analytics",
        "manage_team",
    ],
    UserRole.ADMIN: [
        "view_all_leads",
        "edit_all_leads",
        "delete_leads",
        "view_all_followups",
        "use_chief",
        "view_playbooks",
        "create_playbooks",
        "delete_playbooks",
        "view_all_analytics",
        "manage_team",
        "manage_workspace",
        "manage_settings",
    ],
    UserRole.ENTERPRISE_ADMIN: [
        # All admin permissions plus:
        "manage_workspaces",
        "manage_billing",
        "view_enterprise_analytics",
    ],
}


def has_permission(role: UserRole, permission: str) -> bool:
    """Prüft ob Rolle eine bestimmte Berechtigung hat."""
    permissions = ROLE_PERMISSIONS.get(role, [])
    
    # Enterprise Admin hat alle Berechtigungen
    if role == UserRole.ENTERPRISE_ADMIN:
        all_permissions = set()
        for perms in ROLE_PERMISSIONS.values():
            all_permissions.update(perms)
        return permission in all_permissions
    
    return permission in permissions


# ===========================================
# AUTHENTICATION DEPENDENCIES
# ===========================================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    FastAPI Dependency - Extrahiert aktuellen User aus JWT Token.
    
    Validiert Token via Supabase und gibt User-Objekt zurück.
    
    Raises:
        HTTPException 401: Wenn Token fehlt oder ungültig
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentifizierung erforderlich",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        # Verify with Supabase
        response = supabase.auth.get_user(token)
        
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ungültiges Token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        supabase_user = response.user
        
        # Extract user metadata
        metadata = supabase_user.user_metadata or {}
        
        return User(
            id=supabase_user.id,
            email=supabase_user.email,
            workspace_id=metadata.get("workspace_id"),
            team_id=metadata.get("team_id"),
            role=UserRole(metadata.get("role", "rep")),
            full_name=metadata.get("full_name")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token-Validierung fehlgeschlagen: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Wie get_current_user, aber gibt None zurück statt Exception.
    Für optionale Authentifizierung.
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_current_user_id(
    user: User = Depends(get_current_user)
) -> str:
    """Gibt nur die User-ID zurück."""
    return user.id


async def get_current_workspace(
    user: User = Depends(get_current_user)
) -> str:
    """
    Gibt Workspace-ID des Users zurück.
    
    Raises:
        HTTPException 400: Wenn User keinem Workspace zugeordnet
    """
    if not user.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ist keinem Workspace zugeordnet"
        )
    return user.workspace_id


# ===========================================
# ROLE-BASED ACCESS CONTROL
# ===========================================

def require_role(allowed_roles: List[UserRole]):
    """
    Dependency Factory - Prüft ob User eine der erlaubten Rollen hat.
    
    Usage:
        @router.get("/admin")
        async def admin_endpoint(user: User = Depends(require_role([UserRole.ADMIN]))):
            ...
    """
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Zugriff verweigert. Erforderliche Rolle: {', '.join([r.value for r in allowed_roles])}"
            )
        return user
    
    return role_checker


def require_permission(permission: str):
    """
    Dependency Factory - Prüft ob User eine bestimmte Berechtigung hat.
    
    Usage:
        @router.delete("/leads/{id}")
        async def delete_lead(user: User = Depends(require_permission("delete_leads"))):
            ...
    """
    async def permission_checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Berechtigung fehlt: {permission}"
            )
        return user
    
    return permission_checker


# Vordefinierte Role-Guards
require_admin = require_role([UserRole.ADMIN, UserRole.ENTERPRISE_ADMIN])
require_team_lead = require_role([UserRole.TEAM_LEAD, UserRole.ADMIN, UserRole.ENTERPRISE_ADMIN])

