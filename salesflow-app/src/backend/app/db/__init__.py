"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - DATABASE                                                  ║
║  Supabase Client und Dependencies                                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .supabase import get_supabase, supabase_client
from .deps import get_db, get_current_user, CurrentUser

__all__ = [
    "get_supabase",
    "supabase_client",
    "get_db",
    "get_current_user",
    "CurrentUser",
]

