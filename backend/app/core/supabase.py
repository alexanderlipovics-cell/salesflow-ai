"""
SALES FLOW AI - Supabase Client Helper
Centralized Supabase client with singleton pattern
"""
from supabase import create_client, Client
from typing import Optional
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Get or create Supabase client (singleton pattern)
    
    Returns:
        Supabase Client instance
        
    Raises:
        ValueError: If Supabase credentials are not configured
    """
    global _supabase_client
    
    if _supabase_client is None:
        if not settings.SUPABASE_URL:
            raise ValueError("SUPABASE_URL not configured in .env")
        
        supabase_key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        if not supabase_key:
            raise ValueError("SUPABASE_SERVICE_KEY or SUPABASE_KEY not configured in .env")
        
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            supabase_key,
        )
    
    return _supabase_client

