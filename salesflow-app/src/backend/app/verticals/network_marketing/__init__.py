"""
Network Marketing Vertical - Adapter & Compensation Plans.
"""

from .adapter import NetworkMarketingAdapter, network_marketing_adapter
from .comp_plans import (
    get_compensation_plan,
    list_available_plans,
    ALL_COMPENSATION_PLANS,
    ZINZINO_DE_PLAN,
    PM_INTERNATIONAL_DE_PLAN,
    LR_HEALTH_DE_PLAN,
    RINGANA_DE_PLAN,
)

__all__ = [
    # Adapter
    "NetworkMarketingAdapter",
    "network_marketing_adapter",
    # Plan Access
    "get_compensation_plan",
    "list_available_plans",
    "ALL_COMPENSATION_PLANS",
    # Individual Plans
    "ZINZINO_DE_PLAN",
    "PM_INTERNATIONAL_DE_PLAN",
    "LR_HEALTH_DE_PLAN",
    "RINGANA_DE_PLAN",
]

