"""
SALES FLOW AI - Auth Helper (Compatibility Layer)
Helper function for Speed Hunter that works with existing auth system
"""
from fastapi import Header, HTTPException, status
from typing import Optional
from app.core.auth import get_current_user, User

async def get_current_user_id(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id", convert_underscores=False),
    current_user: Optional[User] = None,
) -> str:
    """
    Get current user ID from JWT token or X-User-Id header (temporary fallback).
    
    Priority:
    1. JWT token (via get_current_user) - PRODUCTION
    2. X-User-Id header - DEVELOPMENT/TESTING ONLY
    
    Args:
        x_user_id: Optional user ID from header (for testing)
        current_user: Optional authenticated user from JWT
        
    Returns:
        User ID as string
        
    Raises:
        HTTPException: If no user ID can be determined
    """
    # Try JWT first (production)
    if current_user:
        return current_user.id
    
    # Fallback to header (development/testing)
    if x_user_id:
        return x_user_id
    
    # No auth found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authentication. Provide JWT token or X-User-Id header (dev only).",
    )

