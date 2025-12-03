"""
Rate Limiting Middleware - Schutz vor API-Missbrauch
"""

import time
from collections import defaultdict
from typing import Dict, Optional, Tuple
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse


class RateLimiter:
    """Token Bucket Rate Limiter."""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.blocked: Dict[str, float] = {}
        
        # Limits
        self.default_limit = 60  # per minute
        self.burst_limit = 10   # per second
        self.hour_limit = 1000
        
        # Endpoint-spezifische Limits
        self.endpoint_limits = {
            "/api/v1/live-assist/query": 30,
            "/api/v1/chat": 20,
            "/api/v1/auth/login": 5,
            "/api/v1/auth/register": 3,
        }
    
    def _get_client_id(self, request: Request) -> str:
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"api:{api_key}"
        
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else "unknown"
        )
        return f"ip:{ip}"
    
    def _clean(self, timestamps: list, window: int) -> list:
        cutoff = time.time() - window
        return [ts for ts in timestamps if ts > cutoff]
    
    def check(self, request: Request) -> Tuple[bool, Optional[dict]]:
        client_id = self._get_client_id(request)
        path = request.url.path
        now = time.time()
        
        # Block check
        if client_id in self.blocked and now < self.blocked[client_id]:
            return False, {"error": "blocked", "retry_after": int(self.blocked[client_id] - now)}
        
        key = f"{client_id}:{path}"
        self.requests[key] = self._clean(self.requests[key], 60)
        
        limit = self.endpoint_limits.get(path, self.default_limit)
        
        if len(self.requests[key]) >= limit:
            return False, {"error": "rate_limit", "limit": limit, "retry_after": 60}
        
        self.requests[key].append(now)
        return True, None


rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next):
    if request.url.path in ["/health", "/", "/docs", "/openapi.json"]:
        return await call_next(request)
    
    allowed, error = rate_limiter.check(request)
    
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Zu viele Anfragen", **error},
            headers={"Retry-After": str(error.get("retry_after", 60))}
        )
    
    return await call_next(request)
