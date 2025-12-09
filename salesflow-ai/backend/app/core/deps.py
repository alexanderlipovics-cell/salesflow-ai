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
    
    WICHTIG: Verwendet nur create_client(url, key) - keine zusätzlichen Parameter!
    Die supabase-py Version 2.3.4 unterstützt KEINE proxy, options oder andere Parameter.
    
    HINWEIS: Proxy-Umgebungsvariablen (HTTP_PROXY, HTTPS_PROXY) werden automatisch
    von httpx (intern von supabase-py verwendet) gelesen. Diese werden in main.py
    deaktiviert, um Proxy-Fehler zu vermeiden.
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
    
    # Stelle sicher, dass URL und Key Strings sind (keine None-Werte)
    url = str(url).strip()
    key = str(key).strip()
    
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must not be empty"
        )
    
    try:
        # KRITISCH: Nur URL und Key übergeben - KEINE zusätzlichen Parameter!
        # Die installierte supabase Version (2.3.4) unterstützt KEINE proxy, options, oder andere Parameter
        # Signatur: create_client(url: str, key: str) -> Client
        # 
        # EXPLIZIT: Keine kwargs, keine options, kein proxy, kein http_client
        # Die Supabase-Bibliothek verwendet intern httpx, das automatisch Proxy-Umgebungsvariablen
        # lesen könnte. Falls das ein Problem ist, müssen die Proxy-Umgebungsvariablen
        # deaktiviert werden (NO_PROXY=* oder explizite Proxy-Deaktivierung).
        _supabase_client = create_client(url, key)
        return _supabase_client
    except TypeError as exc:
        # Spezifischer Fehler für falsche Parameter
        error_msg = str(exc)
        if "proxy" in error_msg or "unexpected keyword" in error_msg:
            # Cache löschen, falls vorhanden
            _supabase_client = None
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Supabase client creation failed: {error_msg}. "
                    "This usually means the supabase-py library received an unsupported parameter. "
                    "Please ensure you're using supabase==2.3.4 and that no proxy environment variables "
                    "are interfering. Try setting NO_PROXY=* if needed."
                )
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Supabase client: {error_msg}"
        ) from exc
    except Exception as exc:
        # Cache löschen bei Fehler
        _supabase_client = None
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

    org_id = x_org_id
    user_id = x_user_id

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Es wurde kein User-Kontext übergeben (Header X-User-Id fehlt).",
        )

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
        "name": x_user_name or "Unbekannter Nutzer",
    }


__all__ = ["get_supabase", "get_current_user"]


