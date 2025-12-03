"""
Sales Flow AI - Health Check Endpoints
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

from app.core.database import get_supabase
from app.services.cache_service import cache_service
from app.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    services: Dict[str, Any]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    System Health Check.
    Prüft Verbindung zu allen Services.
    """
    services = {
        "api": {"status": "healthy"},
        "database": {"status": "unknown"},
        "cache": {"status": "disabled" if not cache_service.enabled else "unknown"},
        "ai": {"status": "configured" if settings.OPENAI_API_KEY else "not_configured"}
    }
    
    # Check Supabase
    try:
        supabase = get_supabase()
        # Simple query to test connection
        result = supabase.table("leads").select("id").limit(1).execute()
        services["database"]["status"] = "healthy"
    except Exception as e:
        services["database"]["status"] = "unhealthy"
        services["database"]["error"] = str(e)
    
    # Check Redis
    if cache_service.enabled:
        try:
            cache_service.client.ping()
            services["cache"]["status"] = "healthy"
        except Exception as e:
            services["cache"]["status"] = "unhealthy"
            services["cache"]["error"] = str(e)
    
    # Overall status
    unhealthy = [k for k, v in services.items() if v.get("status") == "unhealthy"]
    overall_status = "degraded" if unhealthy else "healthy"
    
    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow().isoformat(),
        services=services
    )


@router.get("/")
async def root():
    """API Root - Basic Info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }

