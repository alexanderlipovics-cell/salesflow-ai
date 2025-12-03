"""
FastAPI-Dependencies (Supabase-Client & User-Kontext) für das Backend.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Header, HTTPException
from supabase import Client

from ..config import get_settings
from ..supabase_client import SupabaseNotConfiguredError, get_supabase_client


def get_supabase() -> Client:
    """
    Liefert einen Supabase-Client und mapped Konfigurationsfehler auf HTTP-Fehler.
    """

    try:
        return get_supabase_client()
    except SupabaseNotConfiguredError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def get_current_user(
    x_org_id: Optional[str] = Header(default=None, alias="X-Org-Id"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
    x_user_name: Optional[str] = Header(default=None, alias="X-User-Name"),
) -> Dict[str, Any]:
    """
    Sehr vereinfachter User-Context.
    In Produktion sollten diese Werte definitiv über ein echtes Auth-System kommen.
    """

    settings = get_settings()
    org_id = x_org_id or settings.default_org_id
    user_id = x_user_id or settings.default_user_id

    if not org_id:
        raise HTTPException(
            status_code=400,
            detail="Es wurde kein Org-Kontext übergeben (Header X-Org-Id fehlt).",
        )

    return {
        "org_id": org_id,
        "team_member_id": user_id,
        "user_id": user_id,
        "role": x_user_role or "owner",
        "name": x_user_name or settings.default_user_name,
    }


__all__ = ["get_supabase", "get_current_user"]


