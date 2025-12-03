"""API Schemas."""

from app.api.schemas.goals import (
    GoalCalculateRequest,
    GoalCalculateResponse,
    GoalSaveRequest,
    GoalSaveResponse,
    DailyTargetsResponse,
)
from app.api.schemas.compensation import (
    CompanyListResponse,
    CompensationPlanResponse,
    RankListResponse,
)

__all__ = [
    "GoalCalculateRequest",
    "GoalCalculateResponse",
    "GoalSaveRequest",
    "GoalSaveResponse",
    "DailyTargetsResponse",
    "CompanyListResponse",
    "CompensationPlanResponse",
    "RankListResponse",
]

