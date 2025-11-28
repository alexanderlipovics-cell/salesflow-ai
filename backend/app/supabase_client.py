"""
Supabase-Client-Factory für das Sales Flow AI Backend.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


class SupabaseNotConfiguredError(RuntimeError):
    """Wird geworfen, wenn Supabase-Umgebungsvariablen fehlen."""


@lru_cache
def get_supabase_client() -> Client:
    """Liefert einen gecachten Supabase-Client."""

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise SupabaseNotConfiguredError(
            "Supabase ist nicht konfiguriert. Bitte SUPABASE_URL und "
            "SUPABASE_SERVICE_ROLE_KEY setzen."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


__all__ = ["get_supabase_client", "SupabaseNotConfiguredError"]
