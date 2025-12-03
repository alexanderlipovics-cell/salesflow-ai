"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DATABASE DEPENDENCIES                                                     ║
║  FastAPI Dependencies für Auth und DB-Zugriff                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.db.deps import get_db, get_current_user, CurrentUser
    
    @router.get("/protected")
    async def protected_route(
        db = Depends(get_db),
        current_user: CurrentUser = Depends(get_current_user),
    ):
        ...
"""

from typing import Optional, Annotated
from dataclasses import dataclass
from fastapi import Depends, HTTPException, Header
from supabase import Client

from .supabase import get_supabase

# Re-export for convenience
__all__ = ["get_supabase", "get_db", "get_current_user", "get_current_user_optional", "CurrentUser"]


# ═══════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class CurrentUser:
    """Aktueller authentifizierter User."""
    id: str
    email: Optional[str] = None
    name: Optional[str] = None  # Voller Name oder Vorname
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    vertical_id: Optional[str] = None
    skill_level: str = "advanced"  # starter, rookie, advanced, pro
    role: str = "user"


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_db() -> Client:
    """
    Dependency: Gibt den Supabase Client zurück.
    
    Usage:
        @router.get("/items")
        async def get_items(db: Client = Depends(get_db)):
            result = db.table("items").select("*").execute()
            return result.data
    """
    return get_supabase()


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    db: Client = Depends(get_db),
) -> CurrentUser:
    """
    Dependency: Extrahiert und validiert den aktuellen User aus dem JWT.
    
    Erwartet Header: Authorization: Bearer <jwt_token>
    
    Usage:
        @router.get("/me")
        async def get_me(current_user: CurrentUser = Depends(get_current_user)):
            return {"user_id": current_user.id}
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
        )
    
    token = parts[1]
    
    try:
        # Verifiziere JWT mit Supabase
        user_response = db.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        supabase_user = user_response.user
        
        # Lade zusätzliche Profile-Daten
        profile_data = {}
        try:
            profile = db.table("profiles").select("*").eq("id", supabase_user.id).single().execute()
            profile_data = profile.data or {}
        except Exception:
            pass  # Kein Profile vorhanden - OK
        
        # Name aus Profile extrahieren (Priorität: full_name > first_name > email)
        full_name = profile_data.get("full_name")
        first_name = profile_data.get("first_name")
        last_name = profile_data.get("last_name")
        
        # Wenn kein full_name aber first/last vorhanden, zusammenbauen
        if not full_name and first_name:
            full_name = f"{first_name} {last_name or ''}".strip()
        
        # Fallback auf Email-Prefix wenn kein Name
        display_name = full_name or first_name
        if not display_name and supabase_user.email:
            display_name = supabase_user.email.split('@')[0]
        
        return CurrentUser(
            id=supabase_user.id,
            email=supabase_user.email,
            name=display_name,
            first_name=first_name,
            last_name=last_name,
            company_id=profile_data.get("company_id"),
            company_name=profile_data.get("company_name"),
            vertical_id=profile_data.get("vertical_id"),
            skill_level=profile_data.get("skill_level", "advanced"),
            role=profile_data.get("role", "user"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Token validation failed: {str(e)}",
        )


async def get_current_user_optional(
    authorization: Annotated[Optional[str], Header()] = None,
    db: Client = Depends(get_db),
) -> Optional[CurrentUser]:
    """
    Optionale Version von get_current_user.
    
    Gibt None zurück wenn kein Token vorhanden, statt 401.
    Nützlich für Endpoints die sowohl auth als auch anonym funktionieren.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization, db)
    except HTTPException:
        return None

