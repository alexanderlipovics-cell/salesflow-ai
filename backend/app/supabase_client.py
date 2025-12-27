"""
Supabase-Client-Factory für das Al Sales Solutions Backend.
"""

from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from .config import get_settings


class SupabaseNotConfiguredError(RuntimeError):
    """Wird geworfen, wenn Supabase-Umgebungsvariablen fehlen."""


_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Liefert einen gecachten Supabase-Client.
    
    WICHTIG: Verwendet nur create_client(url, key) - keine zusätzlichen Parameter!
    Die supabase-py Version 2.3.4 unterstützt KEINE proxy, options oder andere Parameter.
    
    HINWEIS: Proxy-Umgebungsvariablen (HTTP_PROXY, HTTPS_PROXY) werden automatisch
    von httpx (intern von supabase-py verwendet) gelesen. Diese werden in main.py
    deaktiviert, um Proxy-Fehler zu vermeiden.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und "
            "SUPABASE_SERVICE_ROLE_KEY setzen."
        )
    
    # Stelle sicher, dass URL und Key Strings sind
    url = str(settings.supabase_url).strip()
    key = str(settings.supabase_service_role_key).strip()
    
    if not url or not key:
        raise SupabaseNotConfiguredError(
            "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY dürfen nicht leer sein."
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
        # Cache löschen bei Fehler
        _supabase_client = None
        error_msg = str(exc)
        if "proxy" in error_msg or "unexpected keyword" in error_msg:
            raise SupabaseNotConfiguredError(
                f"Supabase client creation failed: {error_msg}. "
                "This usually means the supabase-py library received an unsupported parameter. "
                "Please ensure you're using supabase==2.3.4 and that no proxy environment variables "
                "are interfering. Try setting NO_PROXY=* if needed."
            ) from exc
        raise SupabaseNotConfiguredError(
            f"Failed to create Supabase client: {error_msg}"
        ) from exc
    except Exception as exc:
        # Cache löschen bei Fehler
        _supabase_client = None
        raise SupabaseNotConfiguredError(
            f"Failed to create Supabase client: {str(exc)}"
        ) from exc


def clear_supabase_cache() -> None:
    """Löscht den Supabase-Client-Cache."""
    global _supabase_client
    _supabase_client = None


__all__ = ["get_supabase_client", "SupabaseNotConfiguredError", "clear_supabase_cache"]
