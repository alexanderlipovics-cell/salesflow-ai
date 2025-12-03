"""
Domain Layer - Business Logic & Types.
"""

from .goals import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    WeeklyFlowTargets,
    KpiDefinition,
    CompensationPlan,
    RankDefinition,
    BaseVerticalAdapter,
)

__all__ = [
    "VerticalId",
    "GoalKind",
    "GoalInput",
    "GoalBreakdown",
    "DailyFlowConfig",
    "DailyFlowTargets",
    "WeeklyFlowTargets",
    "KpiDefinition",
    "CompensationPlan",
    "RankDefinition",
    "BaseVerticalAdapter",
]

