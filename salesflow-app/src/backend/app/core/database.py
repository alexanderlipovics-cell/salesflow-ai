"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DATABASE MODULE - Database Connection & Session Management                ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Generator, Optional
from contextlib import contextmanager

from ..db.supabase import get_supabase, supabase_client


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE DEPENDENCY
# ═══════════════════════════════════════════════════════════════════════════

def get_db():
    """
    FastAPI Dependency for database access.
    
    Returns the Supabase client for database operations.
    """
    return supabase_client


@contextmanager
def get_db_context():
    """
    Context manager for database access outside of FastAPI.
    """
    client = supabase_client
    try:
        yield client
    finally:
        pass  # Supabase client doesn't need explicit cleanup


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def execute_query(table: str, query: dict) -> list:
    """
    Execute a simple query against a Supabase table.
    
    Args:
        table: Table name
        query: Query parameters (select, filters, etc.)
    
    Returns:
        List of matching records
    """
    result = supabase_client.table(table).select("*")
    
    # Apply filters if provided
    for key, value in query.items():
        if key != "select":
            result = result.eq(key, value)
    
    return result.execute().data or []


def insert_record(table: str, data: dict) -> Optional[dict]:
    """
    Insert a record into a Supabase table.
    
    Args:
        table: Table name
        data: Record data
    
    Returns:
        Inserted record or None
    """
    result = supabase_client.table(table).insert(data).execute()
    return result.data[0] if result.data else None


def update_record(table: str, id: str, data: dict) -> Optional[dict]:
    """
    Update a record in a Supabase table.
    
    Args:
        table: Table name
        id: Record ID
        data: Updated data
    
    Returns:
        Updated record or None
    """
    result = supabase_client.table(table).update(data).eq("id", id).execute()
    return result.data[0] if result.data else None


def delete_record(table: str, id: str) -> bool:
    """
    Delete a record from a Supabase table.
    
    Args:
        table: Table name
        id: Record ID
    
    Returns:
        True if deleted, False otherwise
    """
    result = supabase_client.table(table).delete().eq("id", id).execute()
    return len(result.data) > 0 if result.data else False

