"""Goals Domain - Goal Engine & Daily Flow Targets."""

from app.domain.goals.models import (
    GoalType,
    GoalStatus,
    DailyFlowConfig,
    WeeklyTargets,
    DailyTargets,
    DailyFlowTargets,
    GoalCalculationInput,
    GoalCalculationResult,
    UserGoal,
    DISCLAIMER_TEXT,
    DEFAULT_DAILY_FLOW_CONFIG,
)
from app.domain.goals.engine import (
    GoalEngine,
    calculate_goal,
    format_target_summary,
)

__all__ = [
    "GoalType",
    "GoalStatus",
    "DailyFlowConfig",
    "WeeklyTargets",
    "DailyTargets",
    "DailyFlowTargets",
    "GoalCalculationInput",
    "GoalCalculationResult",
    "UserGoal",
    "GoalEngine",
    "calculate_goal",
    "format_target_summary",
    "DISCLAIMER_TEXT",
    "DEFAULT_DAILY_FLOW_CONFIG",
]

