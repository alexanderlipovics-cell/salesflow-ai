from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["stubs"])


@router.get("/follow-ups")
async def get_followups_stub():
    return []


@router.get("/activities")
async def get_activities_stub():
    return []


@router.get("/finance/stats")
async def get_finance_stats_stub():
    return {}


@router.get("/analytics/charts")
async def get_analytics_charts_stub():
    return {}

