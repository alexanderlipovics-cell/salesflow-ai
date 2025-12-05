"""
Supabase-Client-Factory für das Sales Flow AI Backend.
"""

from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from .config import get_settings


class SupabaseNotConfiguredError(RuntimeError):
    """Wird geworfen, wenn Supabase-Umgebungsvariablen fehlen."""


_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Liefert einen gecachten Supabase-Client."""
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und "
            "SUPABASE_SERVICE_ROLE_KEY setzen."
        )
    _supabase_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_client


def clear_supabase_cache() -> None:
    """Löscht den Supabase-Client-Cache."""
    global _supabase_client
    _supabase_client = None


__all__ = ["get_supabase_client", "SupabaseNotConfiguredError", "clear_supabase_cache"]
