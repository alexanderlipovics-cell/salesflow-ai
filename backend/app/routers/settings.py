from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user
from ..core.deps import get_supabase
from ..supabase_client import SupabaseNotConfiguredError

router = APIRouter(prefix="/settings", tags=["settings"])


def _ensure_supabase():
    try:
        return get_supabase()
    except SupabaseNotConfiguredError as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _extract_user_id(current_user: Any) -> str:
    if isinstance(current_user, dict):
        return str(
            current_user.get("user_id")
            or current_user.get("id")
            or current_user.get("sub")
        )
    if hasattr(current_user, "id"):
        return str(current_user["id"])
    return str(current_user)


class UserSettingsUpdate(BaseModel):
    vertical: Optional[str] = None
    plan: Optional[str] = None
    mlm_company: Optional[str] = None
    current_rank: Optional[str] = None
    personal_volume_monthly: Optional[float] = None
    team_volume_monthly: Optional[float] = None
    features_enabled: Optional[List[str]] = None


def _ensure_user_settings(supabase, user_id: str) -> dict:
    """Hole Settings oder lege sie mit Defaults an."""
    existing = (
        supabase.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if existing.data:
        return existing.data

    defaults = {
        "user_id": user_id,
        "vertical": "network_marketing",
        "plan": "free",
        "features_enabled": [],
        "created_at": datetime.now().isoformat(),
    }
    created = supabase.table("user_settings").insert(defaults).execute()
    return created.data[0] if created.data else defaults


@router.get("/me")
async def get_user_settings(current_user=Depends(get_current_user)):
    """Liefert die User Settings (Vertical, Plan, Feature-Flags)."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)
    settings = _ensure_user_settings(supabase, user_id)
    return settings


@router.patch("/me")
async def update_user_settings(
    payload: UserSettingsUpdate, current_user=Depends(get_current_user)
):
    """Aktualisiere Vertical/Plan oder Volumenwerte."""
    supabase = _ensure_supabase()
    user_id = _extract_user_id(current_user)
    _ensure_user_settings(supabase, user_id)

    update_data = {
        key: value
        for key, value in payload.model_dump().items()
        if value is not None
    }
    update_data["updated_at"] = datetime.now().isoformat()

    if not update_data:
        current = (
            supabase.table("user_settings")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return current.data or {}

    supabase.table("user_settings").update(update_data).eq("user_id", user_id).execute()

    refreshed = (
        supabase.table("user_settings")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return refreshed.data or {}


# ============================================================================
# COMPANY KNOWLEDGE ENDPOINTS
# ============================================================================

@router.get("/company-knowledge")
async def get_company_knowledge(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Holt alle Company Knowledge Einträge für den aktuellen User."""
    user_id = _extract_user_id(current_user)
    
    try:
        result = supabase.table("company_knowledge").select("*").eq(
            "user_id", user_id
        ).eq("is_active", True).order("created_at", desc=True).execute()
        
        return result.data or []
    except Exception as e:
        # Tabelle existiert vielleicht noch nicht
        return []


@router.post("/company-knowledge")
async def add_company_knowledge(
    request: dict,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Fügt einen neuen Company Knowledge Eintrag hinzu."""
    user_id = _extract_user_id(current_user)
    
    try:
        result = supabase.table("company_knowledge").insert({
            "user_id": user_id,
            "title": request.get("title", "Untitled"),
            "content": request.get("content", ""),
            "category": request.get("category", "general")
        }).execute()
        
        return result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding knowledge: {str(e)}")


@router.put("/company-knowledge/{knowledge_id}")
async def update_company_knowledge(
    knowledge_id: str,
    request: dict,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Aktualisiert einen Company Knowledge Eintrag."""
    user_id = _extract_user_id(current_user)
    
    try:
        update_data = {
            key: value
            for key, value in request.items()
            if value is not None and key in ["title", "content", "category", "is_active"]
        }
        update_data["updated_at"] = datetime.now().isoformat()
        
        result = supabase.table("company_knowledge").update(update_data).eq(
            "id", knowledge_id
        ).eq("user_id", user_id).execute()
        
        return result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating knowledge: {str(e)}")


@router.delete("/company-knowledge/{knowledge_id}")
async def delete_company_knowledge(
    knowledge_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Löscht einen Company Knowledge Eintrag (soft delete: is_active = false)."""
    user_id = _extract_user_id(current_user)
    
    try:
        result = supabase.table("company_knowledge").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", knowledge_id).eq("user_id", user_id).execute()
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting knowledge: {str(e)}")

