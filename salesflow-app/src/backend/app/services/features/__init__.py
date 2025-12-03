"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FEATURE FLAGS MODULE                                                      ║
║  Multi-Tenancy Feature Control & Plan Management                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.services.features import FeatureService, check_feature
    
    # Check if feature is enabled
    if await check_feature(user_id, "autopilot"):
        # Feature is enabled
        pass
    
    # Get all flags
    flags = await FeatureService.get_flags(user_id)
"""

from .feature_service import (
    FeatureService,
    Plan,
    Feature,
    check_feature,
    get_plan_limits,
    PLAN_CONFIGS,
)

__all__ = [
    "FeatureService",
    "Plan",
    "Feature",
    "check_feature",
    "get_plan_limits",
    "PLAN_CONFIGS",
]

