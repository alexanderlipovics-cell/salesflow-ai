# ============================================================================
# FILE: app/middleware/workspace_extractor.py
# DESCRIPTION: Extract workspace_id early to avoid multiple body reads
# ============================================================================

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from typing import Callable
import json


class WorkspaceExtractorMiddleware(BaseHTTPMiddleware):
    """
    Extract workspace_id from request and store in request.state
    This allows rate limiting without reading the body multiple times
    
    How it works:
    1. Reads body once
    2. Extracts workspace_id and stores in request.state
    3. Caches body for subsequent reads
    4. Rate limiter can use request.state.workspace_id without reading body
    
    Usage:
        app.add_middleware(WorkspaceExtractorMiddleware)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only process POST/PUT/PATCH with JSON body
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            
            if "application/json" in content_type:
                try:
                    # Read body ONCE
                    body = await request.body()
                    
                    # Parse JSON
                    if body:
                        data = json.loads(body)
                        
                        # Extract workspace_id if present
                        if "workspace_id" in data:
                            request.state.workspace_id = data["workspace_id"]
                        
                        # Also extract user_id if present (useful for user-based rate limiting)
                        if "user_id" in data:
                            request.state.user_id = data["user_id"]
                    
                    # Create receive function with cached body
                    async def receive():
                        return {"type": "http.request", "body": body}
                    
                    request._receive = receive
                    
                except json.JSONDecodeError:
                    # If parsing fails, just continue without workspace_id
                    pass
                except Exception as e:
                    # Log error but don't break the request
                    print(f"WorkspaceExtractor error: {e}")
        
        response = await call_next(request)
        return response

