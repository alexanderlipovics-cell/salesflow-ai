"""
Usage Router
Provides endpoints for checking user quotas and plan limits.
"""

from fastapi import APIRouter, Depends
from app.core.security import get_current_user_dict
from app.core.quota_manager import (
    get_user_usage_summary,
    check_quota,
    check_feature,
    check_leads_limit,
    check_freebies_limit,
    get_plan_limits,
)

router = APIRouter(prefix="/api/usage", tags=["usage"])


def _extract_user_id(user) -> str:
    if isinstance(user, dict):
        return str(user.get("sub") or user.get("user_id") or user.get("id"))
    return str(user)


@router.get("")
async def get_usage(current_user: dict = Depends(get_current_user_dict)):
    """Get current user's usage summary"""
    user_id = _extract_user_id(current_user)
    return get_user_usage_summary(user_id)


@router.get("/plans")
async def get_plans():
    """Get all available plans"""
    from app.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    result = supabase.table("plan_limits").select("*").eq("is_active", True).order("sort_order").execute()
    return {"plans": result.data or []}


@router.get("/check/{feature}")
async def check_feature_access(feature: str, current_user: dict = Depends(get_current_user_dict)):
    """Check if user has access to a specific feature"""
    user_id = _extract_user_id(current_user)
    return check_feature(user_id, feature)

