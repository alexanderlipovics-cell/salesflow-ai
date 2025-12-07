"""
FastAPI-Dependencies (Supabase-Client & User-Kontext) für das Backend.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from supabase import Client, create_client

from ..config import get_settings

# Lade .env Datei aus dem backend/ Verzeichnis
backend_dir = Path(__file__).parent.parent.parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

# Singleton für Supabase Client
_supabase_client: Optional[Client] = None


async def get_supabase() -> Client:
    """
    Liefert einen optimierten Supabase-Client mit Connection Pooling.
    Lädt Umgebungsvariablen direkt aus .env Datei.
    """
    global _supabase_client
    
    # Wenn Client bereits erstellt wurde, gib ihn zurück
    if _supabase_client is not None:
        return _supabase_client
    
    # Lade Umgebungsvariablen
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables or .env file"
        )
    
    try:
        # Erstelle Supabase Client - nur mit url und key, keine zusätzlichen Optionen
        # Die installierte supabase Version unterstützt keine proxy oder andere Optionen
        _supabase_client = create_client(url, key)
        return _supabase_client
    except TypeError as exc:
        # Spezifischer Fehler für falsche Parameter
        if "proxy" in str(exc) or "unexpected keyword" in str(exc):
            raise HTTPException(
                status_code=500,
                detail=f"Supabase client creation failed: {str(exc)}. Please ensure you're using the correct supabase library version."
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Supabase client: {str(exc)}"
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Supabase client: {str(exc)}"
        ) from exc


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


