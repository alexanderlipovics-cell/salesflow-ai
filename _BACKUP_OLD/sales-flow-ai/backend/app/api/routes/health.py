"""
Health Check Endpoints
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "sales-flow-ai-backend",
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes."""
    return {"ready": True}

