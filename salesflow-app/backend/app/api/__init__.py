"""
Sales Flow AI - API Router
Alle API-Endpunkte.
"""

from fastapi import APIRouter

from app.api import health, leads, followups, ai, objection_brain

# Main API Router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_router.include_router(followups.router, prefix="/follow-ups", tags=["Follow-ups"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(objection_brain.router, prefix="/objection-brain", tags=["Objection Brain"])

