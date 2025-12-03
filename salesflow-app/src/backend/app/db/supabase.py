"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SUPABASE CLIENT                                                           ║
║  Zentrale Supabase-Instanz für DB-Zugriff                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.db.supabase import supabase_client
    
    # Query
    result = supabase_client.table("leads").select("*").execute()
    
    # Insert
    result = supabase_client.table("leads").insert({"name": "Test"}).execute()
"""

from typing import Optional
from supabase import create_client, Client
from functools import lru_cache

from ..core.config import settings


@lru_cache()
def get_supabase() -> Client:
    """
    Erstellt und cached den Supabase Client.
    
    Nutzt den Service Role Key wenn verfügbar (für Admin-Operationen),
    sonst den Anon Key.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    
    return create_client(
        settings.SUPABASE_URL,
        key,
    )


# Singleton für einfachen Import
supabase_client = get_supabase()


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Lädt User-Daten aus Supabase."""
    try:
        result = supabase_client.table("profiles").select("*").eq("id", user_id).single().execute()
        return result.data
    except Exception:
        return None


async def get_company_by_id(company_id: str) -> Optional[dict]:
    """Lädt Company-Daten aus Supabase."""
    try:
        result = supabase_client.table("companies").select("*").eq("id", company_id).single().execute()
        return result.data
    except Exception:
        return None

