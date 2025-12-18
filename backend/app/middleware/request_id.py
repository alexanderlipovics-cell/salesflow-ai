"""
Request ID Middleware for SalesFlow AI.

Provides request tracking with:
- Unique request IDs
- Correlation ID propagation
- Request logging
- Performance timing
"""
import time
import uuid
from contextvars import ContextVar
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

# Context variable for request ID
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)

logger = logging.getLogger(__name__)


def get_request_id() -> Optional[str]:
    """Get current request ID from context."""
    return request_id_ctx.get()


def get_correlation_id() -> Optional[str]:
    """Get current correlation ID from context."""
    return correlation_id_ctx.get()


class RequestContextFilter(logging.Filter):
    """
    Logging filter that adds request context to log records.
    
    Usage:
        handler = logging.StreamHandler()
        handler.addFilter(RequestContextFilter())
        
        # In format string, use %(request_id)s and %(correlation_id)s
        formatter = logging.Formatter(
            '%(asctime)s [%(request_id)s] %(levelname)s: %(message)s'
        )
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get() or "-"
        record.correlation_id = correlation_id_ctx.get() or "-"
        return True


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request IDs to all requests.
    
    Features:
    - Generates unique request ID if not provided
    - Accepts correlation ID from X-Correlation-ID header
    - Adds request ID to response headers
    - Logs request details with timing
    
    Usage:
        app.add_middleware(RequestIdMiddleware)
    """
    
    def __init__(
        self,
        app,
        header_name: str = "X-Request-ID",
        correlation_header: str = "X-Correlation-ID",
        generate_if_missing: bool = True,
        log_requests: bool = True,
        log_level: int = logging.INFO,
        exclude_paths: Optional[list[str]] = None,
        include_timing: bool = True
    ):
        super().__init__(app)
        self.header_name = header_name
        self.correlation_header = correlation_header
        self.generate_if_missing = generate_if_missing
        self.log_requests = log_requests
        self.log_level = log_level
        self.exclude_paths = exclude_paths or ["/health", "/metrics"]
        self.include_timing = include_timing
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with ID tracking."""
        start_time = time.time()
        
        # Get or generate request ID
        request_id = request.headers.get(self.header_name)
        if not request_id and self.generate_if_missing:
            request_id = str(uuid.uuid4())
        
        # Get correlation ID (for distributed tracing)
        correlation_id = request.headers.get(self.correlation_header) or request_id
        
        # Set context variables
        request_id_token = request_id_ctx.set(request_id)
        correlation_id_token = correlation_id_ctx.set(correlation_id)
        
        # Store in request state for access in handlers
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        
        try:
            # Log request start
            if self.log_requests and not self._should_skip(request.url.path):
                logger.log(
                    self.log_level,
                    f"Request started: {request.method} {request.url.path}",
                    extra={
                        "request_id": request_id,
                        "correlation_id": correlation_id,
                        "method": request.method,
                        "path": request.url.path,
                        "client_ip": self._get_client_ip(request),
                    }
                )
            
            # Process request
            response = await call_next(request)
            
            # Add headers to response
            response.headers[self.header_name] = request_id
            if correlation_id:
                response.headers[self.correlation_header] = correlation_id
            
            # Log request completion
            if self.log_requests and not self._should_skip(request.url.path):
                duration_ms = (time.time() - start_time) * 1000
                
                log_data = {
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                }
                
                if self.include_timing:
                    log_data["duration_ms"] = round(duration_ms, 2)
                    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
                
                # Determine log level based on status
                if response.status_code >= 500:
                    level = logging.ERROR
                elif response.status_code >= 400:
                    level = logging.WARNING
                else:
                    level = self.log_level
                
                logger.log(
                    level,
                    f"Request completed: {request.method} {request.url.path} "
                    f"- {response.status_code} ({duration_ms:.2f}ms)",
                    extra=log_data
                )
            
            return response
            
        except Exception as e:
            # Log exception
            duration_ms = (time.time() - start_time) * 1000
            logger.exception(
                f"Request failed: {request.method} {request.url.path} - {str(e)}",
                extra={
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(e),
                }
            )
            raise
        
        finally:
            # Reset context variables
            request_id_ctx.reset(request_id_token)
            correlation_id_ctx.reset(correlation_id_token)
    
    def _should_skip(self, path: str) -> bool:
        """Check if path should be excluded from logging."""
        return any(path.startswith(excluded) for excluded in self.exclude_paths)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, handling proxies."""
        # Check for forwarded header
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Check for real IP header (nginx)
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct connection
        return request.client.host if request.client else "unknown"


class RequestContextMiddleware:
    """
    Alternative ASGI middleware for request context.
    
    Use this if you need lower-level control or better performance.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        
        # Set context
        token = request_id_ctx.set(request_id)
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            request_id_ctx.reset(token)


def configure_logging_with_request_id(
    level: int = logging.INFO,
    format_string: Optional[str] = None
):
    """
    Configure logging to include request IDs.
    
    Usage:
        configure_logging_with_request_id()
    """
    if format_string is None:
        format_string = (
            "%(asctime)s [%(request_id)s] %(levelname)s "
            "%(name)s: %(message)s"
        )
    
    # Create handler with filter
    handler = logging.StreamHandler()
    handler.addFilter(RequestContextFilter())
    handler.setFormatter(logging.Formatter(format_string))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(handler)
