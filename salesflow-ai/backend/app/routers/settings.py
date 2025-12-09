from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user
from ..core.deps import get_supabase

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

