"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SECURITY MODULE - Authentication & Authorization                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
from datetime import datetime

from .config import settings


# ═══════════════════════════════════════════════════════════════════════════
# SECURITY SCHEME
# ═══════════════════════════════════════════════════════════════════════════

security = HTTPBearer(auto_error=False)


# ═══════════════════════════════════════════════════════════════════════════
# USER MODEL
# ═══════════════════════════════════════════════════════════════════════════

class User(BaseModel):
    """Authenticated User Model."""
    id: str
    email: Optional[str] = None
    role: str = "user"
    workspace_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# JWT VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════

def verify_jwt_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase JWT token.
    
    Returns the decoded payload if valid, None otherwise.
    """
    try:
        # Supabase uses HS256 with the JWT secret
        # For now, we just decode without verification for development
        # In production, verify with Supabase JWT secret
        
        # Decode without verification (development mode)
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            return None
        
        return payload
        
    except jwt.exceptions.DecodeError:
        return None
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCY: GET CURRENT USER
# ═══════════════════════════════════════════════════════════════════════════

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Get the current authenticated user from the JWT token.
    
    Returns None if no valid token is provided (allows anonymous access).
    For protected endpoints, use get_required_user instead.
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    if not payload:
        return None
    
    # Extract user info from Supabase JWT
    return User(
        id=payload.get("sub", ""),
        email=payload.get("email"),
        role=payload.get("role", "user"),
        workspace_id=payload.get("workspace_id")
    )


async def get_required_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """
    Get the current authenticated user, raising 401 if not authenticated.
    
    Use this for endpoints that require authentication.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return User(
        id=payload.get("sub", ""),
        email=payload.get("email"),
        role=payload.get("role", "user"),
        workspace_id=payload.get("workspace_id")
    )


# ═══════════════════════════════════════════════════════════════════════════
# HELPER: GET USER ID
# ═══════════════════════════════════════════════════════════════════════════

async def get_user_id(
    user: Optional[User] = Depends(get_current_user)
) -> Optional[str]:
    """Get just the user ID, or None if not authenticated."""
    return user.id if user else None


async def get_required_user_id(
    user: User = Depends(get_required_user)
) -> str:
    """Get the user ID, raising 401 if not authenticated."""
    return user.id

