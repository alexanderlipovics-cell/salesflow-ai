"""
Supabase Client
"""

from supabase import create_client, Client
from functools import lru_cache
from app.config.settings import settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
    )


def get_supabase_admin_client() -> Client:
    """Get Supabase client with service role key."""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


# Default client
supabase = get_supabase_client()

