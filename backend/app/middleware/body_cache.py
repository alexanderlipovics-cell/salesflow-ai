# ============================================================================
# FILE: app/middleware/body_cache.py
# DESCRIPTION: Body Caching Middleware to fix "Body already read" error
# ============================================================================

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable


class BodyCacheMiddleware(BaseHTTPMiddleware):
    """
    Middleware to cache request body for multiple reads
    
    Problem: Request.body() can only be called once in Starlette/FastAPI
    Solution: Cache the body on first read, return cached version on subsequent reads
    
    Usage:
        app.add_middleware(BodyCacheMiddleware)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only cache body for POST/PUT/PATCH requests
        if request.method in ["POST", "PUT", "PATCH"]:
            # Read body once
            body = await request.body()
            
            # Track if body has been sent
            body_sent = False
            
            # Create a custom receive function that returns cached body
            async def receive():
                nonlocal body_sent
                if not body_sent:
                    body_sent = True
                    return {"type": "http.request", "body": body, "more_body": False}
                else:
                    # Return disconnect message for subsequent calls
                    return {"type": "http.disconnect"}
            
            # Replace request's receive with our cached version
            request._receive = receive
        
        response = await call_next(request)
        return response
