"""API v1 package."""

from fastapi import APIRouter

from . import coaching

router = APIRouter()
router.include_router(coaching.router, prefix="/coaching", tags=["coaching"])

__all__ = ["router", "coaching"]


