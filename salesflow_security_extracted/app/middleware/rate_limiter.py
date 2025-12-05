"""
Rate Limiting Middleware for SalesFlow AI.

Implements tiered rate limiting with:
- Per-IP and per-user limiting
- Different limits by endpoint category
- Sliding window algorithm
- Redis-compatible interface
"""
import asyncio
from collections import defaultdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Optional
import hashlib
import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RateLimitCategory(str, Enum):
    """Rate limit categories with different thresholds."""
    AUTH = "auth"  # Login, register, password reset
    API = "api"  # General API endpoints
    SEARCH = "search"  # Search/list endpoints
    WRITE = "write"  # Create/update endpoints
    EXPORT = "export"  # Bulk export endpoints
    AI = "ai"  # AI/ML endpoints (Copilot)


# Default rate limits per category (requests, seconds)
DEFAULT_LIMITS = {
    RateLimitCategory.AUTH: (5, 300),  # 5 per 5 minutes
    RateLimitCategory.API: (100, 60),  # 100 per minute
    RateLimitCategory.SEARCH: (30, 60),  # 30 per minute
    RateLimitCategory.WRITE: (20, 60),  # 20 per minute
    RateLimitCategory.EXPORT: (5, 300),  # 5 per 5 minutes
    RateLimitCategory.AI: (10, 60),  # 10 per minute
}


class RateLimitExceeded(Exception):
    """Rate limit has been exceeded."""
    
    def __init__(self, retry_after: int, limit: int, window: int):
        self.retry_after = retry_after
        self.limit = limit
        self.window = window
        super().__init__(f"Rate limit exceeded. Retry after {retry_after} seconds")


class SlidingWindowCounter:
    """
    Sliding window rate limiter using in-memory storage.
    
    In production, replace with Redis implementation.
    """
    
    def __init__(self):
        # {key: [(timestamp, count), ...]}
        self._windows: dict[str, list[tuple[datetime, int]]] = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def is_allowed(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> tuple[bool, int, int]:
        """
        Check if request is allowed and record it.
        
        Returns:
            Tuple of (is_allowed, remaining, retry_after)
        """
        async with self._lock:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            
            # Clean old entries
            self._windows[key] = [
                (ts, count) for ts, count in self._windows[key]
                if ts > window_start
            ]
            
            # Count current requests
            current_count = sum(count for _, count in self._windows[key])
            
            if current_count >= limit:
                # Calculate retry after
                if self._windows[key]:
                    oldest = min(ts for ts, _ in self._windows[key])
                    retry_after = int((oldest + timedelta(seconds=window_seconds) - now).total_seconds())
                    retry_after = max(1, retry_after)
                else:
                    retry_after = window_seconds
                
                return False, 0, retry_after
            
            # Record new request
            self._windows[key].append((now, 1))
            remaining = limit - current_count - 1
            
            return True, remaining, 0
    
    async def get_usage(self, key: str, window_seconds: int) -> int:
        """Get current usage count for a key."""
        async with self._lock:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            
            return sum(
                count for ts, count in self._windows.get(key, [])
                if ts > window_start
            )
    
    async def reset(self, key: str) -> None:
        """Reset rate limit for a key."""
        async with self._lock:
            self._windows.pop(key, None)


# Global rate limiter
rate_limiter = SlidingWindowCounter()


def get_rate_limit_key(
    request: Request,
    user_id: Optional[str] = None
) -> str:
    """
    Generate rate limit key for request.
    
    Uses user_id if authenticated, otherwise IP address.
    """
    if user_id:
        return f"user:{user_id}"
    
    # Get real IP from headers (for proxied requests)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    return f"ip:{ip}"


def get_endpoint_category(path: str, method: str) -> RateLimitCategory:
    """Determine rate limit category from endpoint path."""
    path_lower = path.lower()
    
    # Auth endpoints
    if any(x in path_lower for x in ["/auth/", "/login", "/register", "/password"]):
        return RateLimitCategory.AUTH
    
    # AI endpoints
    if any(x in path_lower for x in ["/copilot", "/ai/", "/generate"]):
        return RateLimitCategory.AI
    
    # Export endpoints
    if "export" in path_lower:
        return RateLimitCategory.EXPORT
    
    # Write operations
    if method in ["POST", "PUT", "PATCH", "DELETE"]:
        return RateLimitCategory.WRITE
    
    # Search/list endpoints
    if method == "GET" and any(x in path_lower for x in ["/search", "?q=", "filter"]):
        return RateLimitCategory.SEARCH
    
    return RateLimitCategory.API


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for FastAPI.
    
    Usage:
        app.add_middleware(RateLimitMiddleware)
    """
    
    def __init__(
        self,
        app,
        default_limit: int = 100,
        default_window: int = 60,
        enabled: bool = True,
        exclude_paths: Optional[list[str]] = None,
        custom_limits: Optional[dict[str, tuple[int, int]]] = None
    ):
        super().__init__(app)
        self.default_limit = default_limit
        self.default_window = default_window
        self.enabled = enabled
        self.exclude_paths = exclude_paths or ["/health", "/metrics", "/docs", "/openapi.json"]
        self.custom_limits = custom_limits or {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        if not self.enabled:
            return await call_next(request)
        
        # Skip excluded paths
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)
        
        # Get rate limit key
        user_id = getattr(request.state, "user_id", None) if hasattr(request, "state") else None
        key = get_rate_limit_key(request, user_id)
        
        # Determine category and limits
        category = get_endpoint_category(path, request.method)
        
        # Check custom limits first
        if path in self.custom_limits:
            limit, window = self.custom_limits[path]
        else:
            limit, window = DEFAULT_LIMITS.get(
                category,
                (self.default_limit, self.default_window)
            )
        
        # Build full key
        full_key = f"{key}:{category.value}"
        
        # Check rate limit
        is_allowed, remaining, retry_after = await rate_limiter.is_allowed(
            full_key, limit, window
        )
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded: {key} on {path} "
                f"(limit: {limit}/{window}s, retry: {retry_after}s)"
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after)
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(window)
        
        return response


class RateLimitDependency:
    """
    Dependency for per-endpoint rate limiting.
    
    Usage:
        @router.post("/expensive-operation")
        async def expensive_op(
            rate_limit: None = Depends(RateLimitDependency(limit=5, window=60))
        ):
            ...
    """
    
    def __init__(
        self,
        limit: int = 10,
        window: int = 60,
        key_func: Optional[Callable] = None
    ):
        self.limit = limit
        self.window = window
        self.key_func = key_func
    
    async def __call__(self, request: Request) -> None:
        """Check rate limit."""
        # Get key
        if self.key_func:
            key = self.key_func(request)
        else:
            user_id = getattr(request.state, "user_id", None) if hasattr(request, "state") else None
            key = get_rate_limit_key(request, user_id)
        
        # Add endpoint to key
        key = f"{key}:{request.url.path}"
        
        is_allowed, remaining, retry_after = await rate_limiter.is_allowed(
            key, self.limit, self.window
        )
        
        if not is_allowed:
            raise RateLimitExceeded(retry_after, self.limit, self.window)


def rate_limit(limit: int = 10, window: int = 60):
    """
    Decorator for rate limiting specific endpoints.
    
    Usage:
        @router.post("/action")
        @rate_limit(limit=5, window=60)
        async def action():
            ...
    """
    dependency = RateLimitDependency(limit=limit, window=window)
    
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            await dependency(request)
            return await func(request, *args, **kwargs)
        return wrapper
    
    return decorator
