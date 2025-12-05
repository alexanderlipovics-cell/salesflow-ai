"""
SalesFlow AI Main Application.

Configures FastAPI with all security middleware and settings.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import get_settings, validate_startup_security
from app.core.exceptions import SalesFlowException
from app.middleware.rate_limiter import RateLimitMiddleware, RateLimitExceeded
from app.middleware.security_headers import (
    SecurityHeadersMiddleware,
    SecurityHeadersConfig,
    get_production_config,
    get_development_config,
)
from app.middleware.request_id import (
    RequestIdMiddleware,
    configure_logging_with_request_id,
)

# Configure logging with request ID support
configure_logging_with_request_id(level=logging.INFO)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting SalesFlow AI...")
    
    # Validate security configuration
    security_status = validate_startup_security()
    if security_status["status"] == "error":
        logger.error(f"Security validation failed: {security_status['error']}")
        raise RuntimeError(f"Security configuration error: {security_status['error']}")
    
    if security_status["status"] == "warning":
        for warning in security_status.get("warnings", []):
            logger.warning(f"Security warning: {warning}")
    
    for check in security_status.get("checks_passed", []):
        logger.info(f"Security check passed: {check}")
    
    logger.info("SalesFlow AI started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SalesFlow AI...")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()
    
    # Create FastAPI app
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # ============= Middleware Stack =============
    # Order matters! Last added = first executed
    
    # 1. Request ID (outermost - runs first)
    app.add_middleware(
        RequestIdMiddleware,
        log_requests=True,
        include_timing=True,
        exclude_paths=["/health", "/metrics"],
    )
    
    # 2. Trusted Host (security)
    if settings.ENVIRONMENT == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.ALLOWED_HOSTS,
        )
    
    # 3. CORS
    if settings.CORS_ALLOWED_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ALLOWED_ORIGINS,
            allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
            allow_methods=settings.CORS_ALLOWED_METHODS,
            allow_headers=settings.CORS_ALLOWED_HEADERS,
            expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
        )
    
    # 4. Security Headers
    headers_config = (
        get_production_config()
        if settings.ENVIRONMENT == "production"
        else get_development_config()
    )
    app.add_middleware(
        SecurityHeadersMiddleware,
        config=headers_config,
    )
    
    # 5. Rate Limiting
    if settings.RATE_LIMIT_ENABLED:
        app.add_middleware(
            RateLimitMiddleware,
            default_limit=settings.RATE_LIMIT_DEFAULT_REQUESTS,
            default_window=settings.RATE_LIMIT_DEFAULT_WINDOW_SECONDS,
            exclude_paths=["/health", "/metrics", "/docs", "/openapi.json"],
        )
    
    # ============= Exception Handlers =============
    
    @app.exception_handler(SalesFlowException)
    async def salesflow_exception_handler(
        request: Request,
        exc: SalesFlowException
    ) -> JSONResponse:
        """Handle application-specific exceptions."""
        logger.warning(
            f"Application error: {exc.code.value} - {exc.message}",
            extra={
                "error_code": exc.code.value,
                "details": exc.details,
            }
        )
        return JSONResponse(
            status_code=exc.get_status_code(),
            content=exc.to_dict(),
        )
    
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_exception_handler(
        request: Request,
        exc: RateLimitExceeded
    ) -> JSONResponse:
        """Handle rate limit exceptions."""
        logger.warning(
            f"Rate limit exceeded: {request.url.path}",
            extra={
                "retry_after": exc.retry_after,
                "limit": exc.limit,
            }
        )
        return JSONResponse(
            status_code=429,
            content={
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
                "retry_after": exc.retry_after,
            },
            headers={"Retry-After": str(exc.retry_after)},
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """Handle unexpected exceptions."""
        logger.exception(f"Unexpected error: {str(exc)}")
        
        # Don't expose internal errors in production
        if settings.ENVIRONMENT == "production":
            message = "An internal error occurred"
        else:
            message = str(exc)
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": message,
            },
        )
    
    # ============= Health Check =============
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
        }
    
    # ============= Include Routers =============
    
    # Import and include routers here
    # from app.routers import leads, contacts, deals, autopilot, copilot
    # app.include_router(leads.router, prefix="/api/v1")
    # app.include_router(contacts.router, prefix="/api/v1")
    # app.include_router(deals.router, prefix="/api/v1")
    # app.include_router(autopilot.router, prefix="/api/v1")
    # app.include_router(copilot.router, prefix="/api/v1")
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
