from fastapi import APIRouter, Depends

from ..core.deps import get_current_user
from ..services.ai_usage_service import AIUsageService


router = APIRouter(prefix="/api/ai-usage", tags=["AI Usage"])


@router.get("/status")
async def get_usage_status(current_user: dict = Depends(get_current_user)):
    service = AIUsageService(current_user["id"])
    return await service.check_limits()

