"""
Quota Manager
Handles plan limits and usage tracking for SalesFlow.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)


# Plan configurations (fallback if DB not available)
PLAN_CONFIGS = {
    "free": {
        "leads_limit": 10,
        "vision_credits_limit": 0,
        "voice_minutes_limit": 0,
        "message_improvements_limit": 10,
        "freebies_limit": 0,
        "ai_model": "groq",
        "instagram_dm": False,
        "instagram_auto_reply": False,
        "comment_to_dm": False,
        "whatsapp": False,
        "power_hour": False,
        "voice_output": False,
    },
    "starter": {
        "leads_limit": 100,
        "vision_credits_limit": 0,
        "voice_minutes_limit": 30,
        "message_improvements_limit": 50,
        "freebies_limit": 1,
        "ai_model": "groq",
        "instagram_dm": False,
        "instagram_auto_reply": False,
        "comment_to_dm": False,
        "whatsapp": False,
        "power_hour": False,
        "voice_output": False,
    },
    "builder": {
        "leads_limit": 500,
        "vision_credits_limit": 50,
        "voice_minutes_limit": -1,  # Unlimited
        "message_improvements_limit": -1,
        "freebies_limit": 5,
        "ai_model": "gpt-4o-mini",
        "instagram_dm": True,
        "instagram_auto_reply": False,
        "comment_to_dm": False,
        "whatsapp": False,
        "power_hour": True,
        "voice_output": True,
    },
    "leader": {
        "leads_limit": -1,  # Unlimited
        "vision_credits_limit": -1,
        "voice_minutes_limit": -1,
        "message_improvements_limit": -1,
        "freebies_limit": -1,
        "ai_model": "gpt-4o",
        "instagram_dm": True,
        "instagram_auto_reply": True,
        "comment_to_dm": True,
        "whatsapp": True,
        "power_hour": True,
        "voice_output": True,
    },
}


def get_current_month() -> str:
    """Get current month in YYYY-MM format"""
    return datetime.now(timezone.utc).strftime("%Y-%m")


def get_user_plan(user_id: str) -> str:
    """Get user's current plan tier"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("users").select("plan_tier").eq("id", user_id).execute()
        if result.data:
            return result.data[0].get("plan_tier", "free")
    except Exception as e:
        logger.error(f"Error getting user plan: {e}")
    return "free"


def get_plan_limits(plan_name: str) -> Dict[str, Any]:
    """Get limits for a plan from DB or fallback config"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("plan_limits").select("*").eq("plan_name", plan_name).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"Error getting plan limits from DB: {e}")
    
    # Fallback to hardcoded config
    return PLAN_CONFIGS.get(plan_name, PLAN_CONFIGS["free"])


def get_user_quota(user_id: str) -> Dict[str, int]:
    """Get user's current month usage"""
    month_year = get_current_month()
    
    try:
        supabase = get_supabase_client()
        result = supabase.table("user_quotas").select("*").eq("user_id", user_id).eq("month_year", month_year).execute()
        
        if result.data:
            return result.data[0]
        
        # Create new quota record for this month
        new_quota = {
            "user_id": user_id,
            "month_year": month_year,
            "vision_credits_used": 0,
            "voice_minutes_used": 0,
            "message_improvements_used": 0,
            "ai_requests_count": 0,
            "ai_tokens_used": 0,
        }
        supabase.table("user_quotas").insert(new_quota).execute()
        return new_quota
        
    except Exception as e:
        logger.error(f"Error getting user quota: {e}")
        return {
            "vision_credits_used": 0,
            "voice_minutes_used": 0,
            "message_improvements_used": 0,
        }


def increment_quota(user_id: str, quota_type: str, amount: int = 1) -> bool:
    """Increment a quota counter"""
    month_year = get_current_month()
    
    try:
        supabase = get_supabase_client()
        
        # Ensure quota record exists
        get_user_quota(user_id)
        
        # Get current value
        result = supabase.table("user_quotas").select(quota_type).eq("user_id", user_id).eq("month_year", month_year).execute()
        
        if result.data:
            current = result.data[0].get(quota_type, 0)
            supabase.table("user_quotas").update({
                quota_type: current + amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).eq("month_year", month_year).execute()
            return True
            
    except Exception as e:
        logger.error(f"Error incrementing quota: {e}")
    
    return False


def check_quota(user_id: str, quota_type: str, amount: int = 1) -> Dict[str, Any]:
    """
    Check if user has enough quota for an action.
    
    Returns:
        {
            "allowed": True/False,
            "current": 5,
            "limit": 50,
            "remaining": 45,
            "upgrade_required": False
        }
    """
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    quota = get_user_quota(user_id)
    
    # Map quota_type to limit field
    limit_map = {
        "vision_credits_used": "vision_credits_limit",
        "voice_minutes_used": "voice_minutes_limit",
        "message_improvements_used": "message_improvements_limit",
    }
    
    limit_field = limit_map.get(quota_type, quota_type.replace("_used", "_limit"))
    limit = limits.get(limit_field, 0)
    current = quota.get(quota_type, 0)
    
    # -1 means unlimited
    if limit == -1:
        return {
            "allowed": True,
            "current": current,
            "limit": -1,
            "remaining": -1,
            "upgrade_required": False
        }
    
    remaining = limit - current
    allowed = remaining >= amount
    
    return {
        "allowed": allowed,
        "current": current,
        "limit": limit,
        "remaining": max(0, remaining),
        "upgrade_required": not allowed
    }


def check_feature(user_id: str, feature: str) -> Dict[str, Any]:
    """
    Check if user has access to a feature.
    
    Features: instagram_dm, instagram_auto_reply, comment_to_dm, whatsapp, power_hour, voice_output
    """
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    
    has_feature = limits.get(feature, False)
    
    return {
        "allowed": has_feature,
        "feature": feature,
        "plan": plan,
        "upgrade_required": not has_feature
    }


def check_leads_limit(user_id: str) -> Dict[str, Any]:
    """Check if user can create more leads"""
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    leads_limit = limits.get("leads_limit", 10)
    
    # -1 means unlimited
    if leads_limit == -1:
        return {"allowed": True, "current": 0, "limit": -1, "remaining": -1}
    
    try:
        supabase = get_supabase_client()
        result = supabase.table("leads").select("id", count="exact").eq("user_id", user_id).execute()
        current = result.count or 0
        
        return {
            "allowed": current < leads_limit,
            "current": current,
            "limit": leads_limit,
            "remaining": max(0, leads_limit - current),
            "upgrade_required": current >= leads_limit
        }
    except Exception as e:
        logger.error(f"Error checking leads limit: {e}")
        return {"allowed": True, "current": 0, "limit": leads_limit, "remaining": leads_limit}


def check_freebies_limit(user_id: str) -> Dict[str, Any]:
    """Check if user can create more freebies"""
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    freebies_limit = limits.get("freebies_limit", 0)
    
    if freebies_limit == -1:
        return {"allowed": True, "current": 0, "limit": -1, "remaining": -1}
    
    try:
        supabase = get_supabase_client()
        result = supabase.table("freebies").select("id", count="exact").eq("user_id", user_id).execute()
        current = result.count or 0
        
        return {
            "allowed": current < freebies_limit,
            "current": current,
            "limit": freebies_limit,
            "remaining": max(0, freebies_limit - current),
            "upgrade_required": current >= freebies_limit
        }
    except Exception as e:
        logger.error(f"Error checking freebies limit: {e}")
        return {"allowed": True, "current": 0, "limit": freebies_limit, "remaining": freebies_limit}


def get_ai_model_for_user(user_id: str) -> str:
    """Get the AI model tier for a user based on their plan"""
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    return limits.get("ai_model", "groq")


def get_user_usage_summary(user_id: str) -> Dict[str, Any]:
    """Get complete usage summary for a user"""
    plan = get_user_plan(user_id)
    limits = get_plan_limits(plan)
    quota = get_user_quota(user_id)
    leads_check = check_leads_limit(user_id)
    freebies_check = check_freebies_limit(user_id)
    
    return {
        "plan": plan,
        "plan_display_name": limits.get("display_name", plan.title()),
        "limits": {
            "leads": {"used": leads_check["current"], "limit": leads_check["limit"]},
            "vision_credits": {"used": quota.get("vision_credits_used", 0), "limit": limits.get("vision_credits_limit", 0)},
            "voice_minutes": {"used": quota.get("voice_minutes_used", 0), "limit": limits.get("voice_minutes_limit", 0)},
            "message_improvements": {"used": quota.get("message_improvements_used", 0), "limit": limits.get("message_improvements_limit", 0)},
            "freebies": {"used": freebies_check["current"], "limit": freebies_check["limit"]},
        },
        "features": {
            "instagram_dm": limits.get("instagram_dm", False),
            "instagram_auto_reply": limits.get("instagram_auto_reply", False),
            "comment_to_dm": limits.get("comment_to_dm", False),
            "whatsapp": limits.get("whatsapp", False),
            "power_hour": limits.get("power_hour", False),
            "voice_output": limits.get("voice_output", False),
        },
        "ai_model": limits.get("ai_model", "groq"),
    }

