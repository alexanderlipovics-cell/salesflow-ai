"""
Health Router
System health and status endpoints
"""
from fastapi import APIRouter
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("/")
async def health_check():
    """
    Basic health check endpoint
    Returns system status and configuration
    """
    openai_configured = bool(os.getenv("OPENAI_API_KEY"))
    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"))
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "services": {
            "openai": "configured" if openai_configured else "not_configured",
            "supabase": "configured" if supabase_configured else "not_configured"
        },
        "version": "1.0.0"
    }

@router.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {"ping": "pong", "timestamp": datetime.utcnow().isoformat() + "Z"}

