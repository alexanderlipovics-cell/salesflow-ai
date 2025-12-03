# backend/app/domain/verticals/__init__.py
"""Vertical Plan Adapter System - Multi-Vertical Support."""

from .types import (
    VerticalId,
    GoalKind,
    GoalInput,
    UnitBreakdown,
    ActivityTargets,
    ConversionRates,
    GoalBreakdown,
)
from .adapters import (
    VerticalPlanAdapter,
    NetworkMarketingAdapter,
    RealEstateAdapter,
    get_adapter,
    get_all_adapters,
)

__all__ = [
    # Types
    "VerticalId",
    "GoalKind",
    "GoalInput",
    "UnitBreakdown",
    "ActivityTargets",
    "ConversionRates",
    "GoalBreakdown",
    # Adapters
    "VerticalPlanAdapter",
    "NetworkMarketingAdapter",
    "RealEstateAdapter",
    "get_adapter",
    "get_all_adapters",
]

