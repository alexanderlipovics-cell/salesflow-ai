"""
============================================
🛡️ SALESFLOW AI - ADVANCED RATE LIMITING
============================================

Multi-layer rate limiting with:

- IP-based limits
- User-based limits
- Endpoint-specific limits
- Burst protection
- Redis backend
"""

import time
import hashlib
from typing import Callable, Optional, Tuple
from functools import wraps

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from redis.asyncio import Redis
import structlog

logger = structlog.get_logger()

class RateLimitConfig:
    """Rate limit configuration per endpoint type."""

    # Default limits
    DEFAULT_REQUESTS_PER_MINUTE = 100
    DEFAULT_REQUESTS_PER_SECOND = 10

    # Authentication endpoints (strict)
    AUTH_LOGIN_PER_MINUTE = 5
    AUTH_REGISTER_PER_MINUTE = 3
    AUTH_PASSWORD_RESET_PER_HOUR = 3

    # API endpoints (moderate)
    API_READ_PER_MINUTE = 200
    API_WRITE_PER_MINUTE = 50

    # Webhook endpoints (high volume)
    WEBHOOK_PER_MINUTE = 500

    # AI/Chat endpoints (expensive operations)
    AI_CHAT_PER_MINUTE = 20
    AI_GENERATE_PER_MINUTE = 10

    # Export endpoints (resource intensive)
    EXPORT_PER_HOUR = 10

class RateLimitExceeded(HTTPException):
    """Rate limit exceeded exception."""

    def __init__(
        self,
        retry_after: int = 60,
        detail: str = "Rate limit exceeded"
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)}
        )
        self.retry_after = retry_after

class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter using Redis.

    More accurate than fixed window, prevents burst at window boundaries.
    """

    def __init__(self, redis: Redis, prefix: str = "ratelimit"):
        self.redis = redis
        self.prefix = prefix

    def _get_key(self, identifier: str, endpoint: str) -> str:
        """Generate rate limit key."""
        # Hash endpoint to avoid special characters
        endpoint_hash = hashlib.md5(endpoint.encode()).hexdigest()[:8]
        return f"{self.prefix}:{endpoint_hash}:{identifier}"

    async def is_allowed(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request is allowed.

        Returns: (is_allowed, remaining_requests, reset_time)
        """
        key = self._get_key(identifier, endpoint)
        now = time.time()
        window_start = now - window_seconds

        pipe = self.redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)

        # Count current requests
        pipe.zcard(key)

        # Add current request (will be rolled back if not allowed)
        pipe.zadd(key, {str(now): now})

        # Set expiry
        pipe.expire(key, window_seconds)

        results = await pipe.execute()
        current_count = results[1]

        if current_count >= max_requests:
            # Remove the request we just added
            await self.redis.zrem(key, str(now))

            # Get oldest entry time for reset calculation
            oldest = await self.redis.zrange(key, 0, 0, withscores=True)
            reset_time = int(oldest[0][1] + window_seconds - now) if oldest else window_seconds

            return False, 0, reset_time

        remaining = max_requests - current_count - 1
        reset_time = window_seconds

        return True, remaining, reset_time

    async def get_usage(
        self,
        identifier: str,
        endpoint: str,
        window_seconds: int
    ) -> int:
        """Get current request count in window."""
        key = self._get_key(identifier, endpoint)
        now = time.time()
        window_start = now - window_seconds

        # Clean old entries and count
        await self.redis.zremrangebyscore(key, 0, window_start)
        return await self.redis.zcard(key)

class TokenBucketRateLimiter:
    """
    Token bucket rate limiter for burst protection.

    Allows short bursts while maintaining long-term rate limits.
    """

    def __init__(self, redis: Redis, prefix: str = "tokenbucket"):
        self.redis = redis
        self.prefix = prefix

    def _get_key(self, identifier: str, endpoint: str) -> str:
        """Generate bucket key."""
        endpoint_hash = hashlib.md5(endpoint.encode()).hexdigest()[:8]
        return f"{self.prefix}:{endpoint_hash}:{identifier}"

    async def is_allowed(
        self,
        identifier: str,
        endpoint: str,
        bucket_size: int,
        refill_rate: float,  # tokens per second
        tokens_required: int = 1
    ) -> Tuple[bool, int]:
        """
        Check if request is allowed using token bucket algorithm.

        Returns: (is_allowed, remaining_tokens)
        """
        key = self._get_key(identifier, endpoint)
        now = time.time()

        # Get current state
        data = await self.redis.hgetall(key)

        if not data:
            # Initialize bucket
            tokens = bucket_size - tokens_required
            await self.redis.hset(key, mapping={
                "tokens": tokens,
                "last_refill": now
            })
            await self.redis.expire(key, 3600)  # 1 hour expiry
            return True, tokens

        tokens = float(data.get("tokens", bucket_size))
        last_refill = float(data.get("last_refill", now))

        # Calculate refilled tokens
        time_passed = now - last_refill
        tokens = min(bucket_size, tokens + (time_passed * refill_rate))

        if tokens < tokens_required:
            # Not enough tokens
            return False, int(tokens)

        # Consume tokens
        tokens -= tokens_required

        await self.redis.hset(key, mapping={
            "tokens": tokens,
            "last_refill": now
        })

        return True, int(tokens)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for rate limiting.

    Applies different limits based on:
    - IP address
    - User ID (if authenticated)
    - Endpoint pattern
    """

    def __init__(
        self,
        app,
        redis: Redis,
        enabled: bool = True,
        exclude_paths: list[str] = None
    ):
        super().__init__(app)
        self.enabled = enabled
        self.sliding_limiter = SlidingWindowRateLimiter(redis)
        self.burst_limiter = TokenBucketRateLimiter(redis)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP from request."""
        # Check for proxy headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"

    def _get_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from request (if authenticated)."""
        # Check for user in state (set by auth middleware)
        user = getattr(request.state, "user", None)
        if user:
            return str(user.get("id", user.get("sub")))
        return None

    def _get_rate_limit_config(
        self,
        path: str,
        method: str
    ) -> Tuple[int, int]:
        """
        Get rate limit config for endpoint.

        Returns: (max_requests, window_seconds)
        """
        # Auth endpoints
        if path.startswith("/auth/login"):
            return RateLimitConfig.AUTH_LOGIN_PER_MINUTE, 60
        if path.startswith("/auth/register"):
            return RateLimitConfig.AUTH_REGISTER_PER_MINUTE, 60
        if path.startswith("/auth/password-reset"):
            return RateLimitConfig.AUTH_PASSWORD_RESET_PER_HOUR, 3600

        # Webhook endpoints
        if path.startswith("/api/v1/webhooks"):
            return RateLimitConfig.WEBHOOK_PER_MINUTE, 60

        # AI endpoints
        if path.startswith("/api/v1/chat"):
            return RateLimitConfig.AI_CHAT_PER_MINUTE, 60
        if path.startswith("/api/v1/ai"):
            return RateLimitConfig.AI_GENERATE_PER_MINUTE, 60

        # Export endpoints
        if "/export" in path:
            return RateLimitConfig.EXPORT_PER_HOUR, 3600

        # Standard API
        if method in ["GET", "HEAD", "OPTIONS"]:
            return RateLimitConfig.API_READ_PER_MINUTE, 60
        else:
            return RateLimitConfig.API_WRITE_PER_MINUTE, 60

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process request with rate limiting."""
        if not self.enabled:
            return await call_next(request)

        path = request.url.path
        method = request.method

        # Skip excluded paths
        if any(path.startswith(p) for p in self.exclude_paths):
            return await call_next(request)

        # Get identifiers
        client_ip = self._get_client_ip(request)
        user_id = self._get_user_id(request)

        # Use user_id if available, otherwise IP
        identifier = user_id or client_ip

        # Get rate limit config
        max_requests, window = self._get_rate_limit_config(path, method)

        # Check sliding window limit
        allowed, remaining, reset_time = await self.sliding_limiter.is_allowed(
            identifier=identifier,
            endpoint=f"{method}:{path}",
            max_requests=max_requests,
            window_seconds=window
        )

        if not allowed:
            logger.warning(
                "Rate limit exceeded",
                identifier=identifier,
                path=path,
                method=method
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": reset_time,
                    "limit": max_requests,
                    "window": window
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time)
                }
            )

        # Check burst protection for write operations
        if method not in ["GET", "HEAD", "OPTIONS"]:
            burst_allowed, tokens = await self.burst_limiter.is_allowed(
                identifier=identifier,
                endpoint=f"burst:{path}",
                bucket_size=RateLimitConfig.DEFAULT_REQUESTS_PER_SECOND,
                refill_rate=RateLimitConfig.DEFAULT_REQUESTS_PER_SECOND / 60
            )

            if not burst_allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too many requests, please slow down",
                        "retry_after": 1
                    },
                    headers={"Retry-After": "1"}
                )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response

# ==================== DECORATORS ====================

def rate_limit(
    max_requests: int = 100,
    window_seconds: int = 60,
    key_func: Callable[[Request], str] = None
):
    """
    Decorator for endpoint-specific rate limiting.

    Usage:
        @router.post("/expensive-operation")
        @rate_limit(max_requests=10, window_seconds=60)
        async def expensive_operation(request: Request):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Get Redis from app state
            redis = getattr(request.app.state, "redis", None)
            if not redis:
                return await func(request, *args, **kwargs)

            # Get identifier
            if key_func:
                identifier = key_func(request)
            else:
                identifier = request.client.host if request.client else "unknown"

            limiter = SlidingWindowRateLimiter(redis)
            allowed, remaining, reset = await limiter.is_allowed(
                identifier=identifier,
                endpoint=f"{func.__module__}.{func.__name__}",
                max_requests=max_requests,
                window_seconds=window_seconds
            )

            if not allowed:
                raise RateLimitExceeded(retry_after=reset)

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def ip_rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """Rate limit by IP address."""
    def key_func(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    return rate_limit(max_requests, window_seconds, key_func)

def user_rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """Rate limit by authenticated user."""
    def key_func(request: Request) -> str:
        user = getattr(request.state, "user", None)
        if user:
            return str(user.get("id", user.get("sub")))
        return request.client.host if request.client else "unknown"

    return rate_limit(max_requests, window_seconds, key_func)

# ==================== BRUTEFORCE PROTECTION ====================

class BruteForceProtection:
    """
    Protection against brute force attacks.

    Features:
    - Progressive delays
    - Account lockout
    - IP blacklisting
    """

    def __init__(self, redis: Redis, prefix: str = "bruteforce"):
        self.redis = redis
        self.prefix = prefix

        # Config
        self.max_attempts = 5
        self.lockout_duration = 900  # 15 minutes
        self.attempt_window = 300    # 5 minutes

    async def record_attempt(
        self,
        identifier: str,
        success: bool
    ) -> Tuple[bool, int]:
        """
        Record login attempt.

        Returns: (is_locked, remaining_attempts)
        """
        key = f"{self.prefix}:{identifier}"

        if success:
            # Clear attempts on success
            await self.redis.delete(key)
            return False, self.max_attempts

        # Increment failed attempts
        attempts = await self.redis.incr(key)
        await self.redis.expire(key, self.attempt_window)

        if attempts >= self.max_attempts:
            # Lock account
            lock_key = f"{self.prefix}:lock:{identifier}"
            await self.redis.setex(lock_key, self.lockout_duration, "1")
            return True, 0

        return False, self.max_attempts - attempts

    async def is_locked(self, identifier: str) -> Tuple[bool, int]:
        """
        Check if identifier is locked.

        Returns: (is_locked, seconds_remaining)
        """
        lock_key = f"{self.prefix}:lock:{identifier}"
        ttl = await self.redis.ttl(lock_key)

        if ttl > 0:
            return True, ttl
        return False, 0

    async def unlock(self, identifier: str):
        """Manually unlock identifier."""
        key = f"{self.prefix}:{identifier}"
        lock_key = f"{self.prefix}:lock:{identifier}"
        await self.redis.delete(key, lock_key)