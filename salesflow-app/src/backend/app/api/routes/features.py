"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FEATURES API ROUTES                                                       ║
║  Feature Flags & Plan Management Endpoints                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /features - Get user's feature flags
- GET /features/check/{feature} - Check if feature is enabled
- GET /features/limits - Get plan limits
- GET /features/plans - List available plans
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from ...db.deps import get_current_user, CurrentUser
from ...services.features import (
    FeatureService,
    Feature,
    Plan,
    PLAN_CONFIGS,
)

router = APIRouter(prefix="/features", tags=["features"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class FeatureFlagsResponse(BaseModel):
    """Feature flags response."""
    plan: str
    plan_name: str
    features: Dict[str, bool]
    limits: Dict[str, int]
    is_trial: bool
    trial_ends_at: Optional[str]


class FeatureCheckResponse(BaseModel):
    """Feature check response."""
    feature: str
    enabled: bool
    plan_required: Optional[str]


class LimitCheckResponse(BaseModel):
    """Limit check response."""
    limit_name: str
    allowed: bool
    limit: int
    usage: int
    remaining: int
    unlimited: bool


class PlanInfo(BaseModel):
    """Plan information."""
    id: str
    name: str
    price_monthly: int
    features: List[str]
    limits: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=FeatureFlagsResponse)
async def get_features(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all feature flags for the current user.
    
    Returns plan info, enabled features, and limits.
    """
    service = FeatureService()
    
    flags = await service.get_flags(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    plan_config = PLAN_CONFIGS.get(flags.plan, PLAN_CONFIGS[Plan.FREE])
    
    return FeatureFlagsResponse(
        plan=flags.plan.value,
        plan_name=plan_config["name"],
        features={f.value: enabled for f, enabled in flags.features.items()},
        limits=flags.limits,
        is_trial=flags.is_trial(),
        trial_ends_at=flags.trial_ends_at.isoformat() if flags.trial_ends_at else None,
    )


@router.get("/check/{feature_name}", response_model=FeatureCheckResponse)
async def check_feature(
    feature_name: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Check if a specific feature is enabled.
    
    Returns whether the feature is enabled and which plan is required.
    """
    try:
        feature = Feature(feature_name)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown feature: {feature_name}. Valid features: {[f.value for f in Feature]}"
        )
    
    service = FeatureService()
    
    enabled = await service.has_feature(
        feature=feature,
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    # Find minimum plan required
    plan_required = None
    for plan in [Plan.FREE, Plan.STARTER, Plan.PRO, Plan.TEAM, Plan.ENTERPRISE]:
        if PLAN_CONFIGS[plan]["features"].get(feature, False):
            plan_required = plan.value
            break
    
    return FeatureCheckResponse(
        feature=feature_name,
        enabled=enabled,
        plan_required=plan_required,
    )


@router.get("/limits", response_model=Dict[str, Any])
async def get_limits(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get all plan limits for the current user.
    """
    service = FeatureService()
    
    flags = await service.get_flags(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    return {
        "plan": flags.plan.value,
        "limits": flags.limits,
        "unlimited_features": [
            name for name, value in flags.limits.items() if value == -1
        ],
    }


@router.get("/limits/check/{limit_name}", response_model=LimitCheckResponse)
async def check_limit(
    limit_name: str,
    current_usage: int = Query(..., ge=0, description="Current usage count"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Check if current usage is within a specific limit.
    
    Useful for UI to show warnings before hitting limits.
    """
    service = FeatureService()
    
    result = await service.check_limit(
        limit_name=limit_name,
        current_usage=current_usage,
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    return LimitCheckResponse(
        limit_name=limit_name,
        **result,
    )


@router.get("/plans", response_model=Dict[str, Any])
async def list_plans(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all available plans with their features and pricing.
    """
    plans = []
    
    for plan in [Plan.FREE, Plan.STARTER, Plan.PRO, Plan.TEAM, Plan.ENTERPRISE]:
        config = PLAN_CONFIGS[plan]
        plans.append({
            "id": plan.value,
            "name": config["name"],
            "price_monthly": config["price_monthly"],
            "features": [f.value for f, enabled in config["features"].items() if enabled],
            "limits": config["limits"],
        })
    
    # Get current user's plan
    service = FeatureService()
    current_flags = await service.get_flags(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    return {
        "plans": plans,
        "current_plan": current_flags.plan.value,
    }


@router.get("/features/all", response_model=Dict[str, Any])
async def list_all_features(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all available features with descriptions.
    """
    feature_descriptions = {
        Feature.AUTOPILOT: "Automatische KI-gesteuerte Lead-Kommunikation",
        Feature.SEQUENCES: "Mehrstufige Outreach-Sequenzen",
        Feature.GHOST_BUSTER: "Inaktive Leads reaktivieren",
        Feature.LIVE_ASSIST: "Echtzeit-KI-Unterstützung in Gesprächen",
        Feature.AURA_DASHBOARD: "Erweitertes AURA OS Dashboard",
        Feature.VOICE_FEATURES: "Sprach-Features und Voice-Notes",
        Feature.ADVANCED_ANALYTICS: "Erweiterte Analysen und Reports",
        Feature.VERTICAL_PLAYBOOKS: "Branchenspezifische Playbooks",
        Feature.TEAM_FEATURES: "Team-Management und Kollaboration",
        Feature.TEAM_LEADER_DASHBOARD: "Team-Leader Dashboard",
        Feature.CUSTOM_BRANDING: "Eigenes Branding und Logo",
        Feature.API_ACCESS: "API-Zugang für Integrationen",
        Feature.WHITE_LABEL: "White-Label Lösung",
        Feature.PRIORITY_SUPPORT: "Priorisierter Support",
        Feature.COMPLIANCE_CHECK: "Compliance-Prüfung für Nachrichten",
    }
    
    features = []
    for feature in Feature:
        features.append({
            "id": feature.value,
            "name": feature.name.replace("_", " ").title(),
            "description": feature_descriptions.get(feature, ""),
        })
    
    return {"features": features}

