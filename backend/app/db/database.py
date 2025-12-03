"""
Database connection management for Sales Flow AI.
Uses Supabase as the primary database.
"""

from supabase import create_client, Client
from app.config import get_settings
from app.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Global Supabase client instance
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """
    Get or create the Supabase client instance.
    Uses singleton pattern for efficiency.
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
        
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
        logger.info("Supabase client initialized")
    
    return _supabase_client


# Alias for backwards compatibility
supabase = get_supabase()

