"""
Goal Domain - Types, Adapters & Service für Goal-Berechnung.
"""

from .types import (
    VerticalId,
    GoalKind,
    GoalInput,
    GoalBreakdown,
    DailyFlowConfig,
    DailyFlowTargets,
    WeeklyFlowTargets,
    KpiDefinition,
    RankRequirement,
    RankDefinition,
    CompensationPlan,
)

from .vertical_adapter import BaseVerticalAdapter
from .service import GoalCalculationService, get_goal_service

# Adapters
from .adapters.network_marketing import NetworkMarketingAdapter
from .adapters.real_estate import RealEstateAdapter
from .adapters.coaching import CoachingAdapter

__all__ = [
    # Enums
    "VerticalId",
    "GoalKind",
    # Input Types
    "GoalInput",
    "DailyFlowConfig",
    # Output Types
    "GoalBreakdown",
    "DailyFlowTargets",
    "WeeklyFlowTargets",
    # KPI
    "KpiDefinition",
    # Compensation Plan
    "RankRequirement",
    "RankDefinition",
    "CompensationPlan",
    # Adapter Base
    "BaseVerticalAdapter",
    # Concrete Adapters
    "NetworkMarketingAdapter",
    "RealEstateAdapter",
    "CoachingAdapter",
    # Service
    "GoalCalculationService",
    "get_goal_service",
]

