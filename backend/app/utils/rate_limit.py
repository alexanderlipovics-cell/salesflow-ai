"""Rate limiting utilities."""

from __future__ import annotations

from typing import Any, Callable, TypeVar

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

settings = get_settings()

F = TypeVar("F", bound=Callable[..., Any])


def get_rate_limit_key(request: Request) -> str:
    """Build a rate-limit key based on workspace or client IP."""

    workspace_id = getattr(request.state, "workspace_id", None)
    if not workspace_id:
        workspace_id = request.headers.get("x-workspace-id") or request.query_params.get(
            "workspace_id"
        )
    if workspace_id:
        return f"workspace:{workspace_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key)


def rate_limit(limit_value: str) -> Callable[[F], F]:
    """Wrap slowapi limiter to allow runtime disabling via settings."""

    if not settings.RATE_LIMIT_ENABLED:

        def decorator(func: F) -> F:
            return func

        return decorator

    return limiter.limit(limit_value)


# ============================================================================
# FILE: app/utils/rate_limit.py
# DESCRIPTION: Rate limiting utility (FIXED - no body reading!)
# ============================================================================

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key from request
    
    ⚠️ IMPORTANT: Do NOT read request.body() here!
    This would consume the body and cause "Body already read" error
    
    Instead, use request.state.workspace_id which is set by
    WorkspaceExtractorMiddleware earlier in the request lifecycle.
    
    Returns:
        Rate limit key (IP address or workspace_id)
    """
    # Option 1: Use workspace_id from request.state (set by middleware)
    if hasattr(request.state, "workspace_id") and request.state.workspace_id:
        return f"workspace:{request.state.workspace_id}"
    
    # Option 2: Use user_id from request.state (set by middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"
    
    # Fallback: Use IP address
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/minute", "1000/hour"],
    enabled=True,  # Set to False to disable rate limiting
)

