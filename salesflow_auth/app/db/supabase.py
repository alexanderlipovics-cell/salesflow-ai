"""
SalesFlow AI - Supabase Database Client
Database connection and client management
"""

import os
from supabase import create_client, Client
from typing import Optional
from functools import lru_cache


# Environment variables for Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for backend
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Singleton client instance
_supabase_client: Optional[Client] = None


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses service role key for full database access.
    
    Returns:
        Supabase client instance
        
    Raises:
        ValueError: If environment variables are not set
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set"
            )
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    return _supabase_client


def get_supabase_anon_client() -> Client:
    """
    Get Supabase client with anon key (for RLS-protected operations).
    
    Returns:
        Supabase client instance with anon key
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set"
        )
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


async def check_database_connection() -> bool:
    """
    Health check for database connection.
    
    Returns:
        True if connection is successful
    """
    try:
        client = get_supabase_client()
        # Simple query to verify connection
        client.table("users").select("id").limit(1).execute()
        return True
    except Exception:
        return False
