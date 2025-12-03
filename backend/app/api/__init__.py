from fastapi import APIRouter

from .analytics_demo import router as analytics_demo_router
from .analytics import router as analytics_router

router = APIRouter()
router.include_router(analytics_demo_router)
router.include_router(analytics_router)
