"""
SalesFlow AI - Authentication Dependencies
FastAPI dependencies for securing endpoints
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import ExpiredSignatureError
from typing import Optional
from functools import wraps
import hashlib

from app.core.auth import decode_access_token
from app.schemas.auth import TokenPayload, UserRole, UserInDB
from app.db.supabase import get_supabase_client


# HTTP Bearer scheme for token extraction
security = HTTPBearer(auto_error=False)


async def get_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> TokenPayload:
    """
    Extract and validate JWT token from Authorization header.
    
    Raises:
        HTTPException 401: If token is missing, invalid, or expired
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    try:
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if token is blacklisted
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        supabase = get_supabase_client()
        
        blacklist_result = supabase.table("token_blacklist").select("id").eq(
            "token_hash", token_hash
        ).execute()
        
        if blacklist_result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    payload: TokenPayload = Depends(get_token_payload)
) -> UserInDB:
    """
    Get current authenticated user from database.
    
    Raises:
        HTTPException 401: If user not found or inactive
    """
    supabase = get_supabase_client()
    
    result = supabase.table("users").select("*").eq("id", payload.sub).execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_data = result.data[0]
    
    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )
    
    return UserInDB(**user_data)


async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user)
) -> UserInDB:
    """
    Ensure current user is active.
    Alias for get_current_user with explicit active check.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_admin_user(
    current_user: UserInDB = Depends(get_current_user)
) -> UserInDB:
    """
    Ensure current user has admin role.
    
    Raises:
        HTTPException 403: If user is not an admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


def require_role(allowed_roles: list[UserRole]):
    """
    Decorator factory for role-based access control.
    
    Usage:
        @router.get("/admin-only")
        @require_role([UserRole.ADMIN])
        async def admin_endpoint(current_user: UserInDB = Depends(get_current_user)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs (injected by Depends)
            current_user = kwargs.get("current_user")
            if current_user and current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Required role: {', '.join([r.value for r in allowed_roles])}"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class RateLimiter:
    """
    Simple in-memory rate limiter for login attempts.
    In production, use Redis for distributed rate limiting.
    """
    
    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, list[float]] = {}
    
    async def check_rate_limit(self, key: str) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            key: Identifier for rate limiting (e.g., IP address or email)
            
        Returns:
            True if within limit, False if exceeded
        """
        import time
        current_time = time.time()
        
        if key not in self._attempts:
            self._attempts[key] = []
        
        # Remove old attempts outside the window
        self._attempts[key] = [
            t for t in self._attempts[key]
            if current_time - t < self.window_seconds
        ]
        
        if len(self._attempts[key]) >= self.max_attempts:
            return False
        
        self._attempts[key].append(current_time)
        return True
    
    def get_remaining_attempts(self, key: str) -> int:
        """Get remaining attempts for a key."""
        import time
        current_time = time.time()
        
        if key not in self._attempts:
            return self.max_attempts
        
        valid_attempts = [
            t for t in self._attempts[key]
            if current_time - t < self.window_seconds
        ]
        
        return max(0, self.max_attempts - len(valid_attempts))
    
    def reset(self, key: str):
        """Reset rate limit for a key (e.g., after successful login)."""
        if key in self._attempts:
            del self._attempts[key]


# Global rate limiter instance
login_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)
