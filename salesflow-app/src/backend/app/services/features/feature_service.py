"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FEATURE SERVICE                                                           ║
║  Feature Flags & Plan-based Access Control                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Manages:
- Feature flags per company/user
- Plan-based limits
- Usage tracking
- Upgrade prompts
"""

import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

from ...db.supabase import get_supabase

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class Plan(str, Enum):
    """Available subscription plans."""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class Feature(str, Enum):
    """Available features that can be toggled."""
    
    # Core Features
    AUTOPILOT = "autopilot"
    SEQUENCES = "sequences"
    GHOST_BUSTER = "ghost_buster"
    LIVE_ASSIST = "live_assist"
    
    # Advanced Features
    AURA_DASHBOARD = "aura_dashboard"
    VOICE_FEATURES = "voice_features"
    ADVANCED_ANALYTICS = "advanced_analytics"
    VERTICAL_PLAYBOOKS = "vertical_playbooks"
    
    # Team Features
    TEAM_FEATURES = "team_features"
    TEAM_LEADER_DASHBOARD = "team_leader_dashboard"
    
    # Enterprise Features
    CUSTOM_BRANDING = "custom_branding"
    API_ACCESS = "api_access"
    WHITE_LABEL = "white_label"
    PRIORITY_SUPPORT = "priority_support"
    
    # Compliance
    COMPLIANCE_CHECK = "compliance_check"


# ═══════════════════════════════════════════════════════════════════════════════
# PLAN CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

PLAN_CONFIGS = {
    Plan.FREE: {
        "name": "Free",
        "price_monthly": 0,
        "features": {
            Feature.GHOST_BUSTER: True,
            Feature.COMPLIANCE_CHECK: True,
        },
        "limits": {
            "leads_limit": 100,
            "ai_calls_limit": 100,
            "team_members_limit": 1,
        },
    },
    Plan.STARTER: {
        "name": "Starter",
        "price_monthly": 49,
        "features": {
            Feature.GHOST_BUSTER: True,
            Feature.COMPLIANCE_CHECK: True,
            Feature.SEQUENCES: True,
            Feature.VOICE_FEATURES: True,
        },
        "limits": {
            "leads_limit": 500,
            "ai_calls_limit": 1000,
            "team_members_limit": 1,
        },
    },
    Plan.PRO: {
        "name": "Pro",
        "price_monthly": 149,
        "features": {
            Feature.GHOST_BUSTER: True,
            Feature.COMPLIANCE_CHECK: True,
            Feature.SEQUENCES: True,
            Feature.VOICE_FEATURES: True,
            Feature.AUTOPILOT: True,
            Feature.LIVE_ASSIST: True,
            Feature.AURA_DASHBOARD: True,
            Feature.ADVANCED_ANALYTICS: True,
            Feature.VERTICAL_PLAYBOOKS: True,
        },
        "limits": {
            "leads_limit": 2000,
            "ai_calls_limit": 5000,
            "team_members_limit": 1,
        },
    },
    Plan.TEAM: {
        "name": "Team",
        "price_monthly": 990,
        "features": {
            Feature.GHOST_BUSTER: True,
            Feature.COMPLIANCE_CHECK: True,
            Feature.SEQUENCES: True,
            Feature.VOICE_FEATURES: True,
            Feature.AUTOPILOT: True,
            Feature.LIVE_ASSIST: True,
            Feature.AURA_DASHBOARD: True,
            Feature.ADVANCED_ANALYTICS: True,
            Feature.VERTICAL_PLAYBOOKS: True,
            Feature.TEAM_FEATURES: True,
            Feature.TEAM_LEADER_DASHBOARD: True,
        },
        "limits": {
            "leads_limit": 10000,
            "ai_calls_limit": 25000,
            "team_members_limit": 10,
        },
    },
    Plan.ENTERPRISE: {
        "name": "Enterprise",
        "price_monthly": 2400,
        "features": {
            Feature.GHOST_BUSTER: True,
            Feature.COMPLIANCE_CHECK: True,
            Feature.SEQUENCES: True,
            Feature.VOICE_FEATURES: True,
            Feature.AUTOPILOT: True,
            Feature.LIVE_ASSIST: True,
            Feature.AURA_DASHBOARD: True,
            Feature.ADVANCED_ANALYTICS: True,
            Feature.VERTICAL_PLAYBOOKS: True,
            Feature.TEAM_FEATURES: True,
            Feature.TEAM_LEADER_DASHBOARD: True,
            Feature.CUSTOM_BRANDING: True,
            Feature.API_ACCESS: True,
            Feature.WHITE_LABEL: True,
            Feature.PRIORITY_SUPPORT: True,
        },
        "limits": {
            "leads_limit": -1,  # Unlimited
            "ai_calls_limit": -1,
            "team_members_limit": -1,
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class FeatureFlags:
    """Feature flags for a user/company."""
    plan: Plan
    features: Dict[Feature, bool]
    limits: Dict[str, int]
    company_id: Optional[str] = None
    user_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    
    def has_feature(self, feature: Feature) -> bool:
        """Check if a feature is enabled."""
        return self.features.get(feature, False)
    
    def get_limit(self, limit_name: str) -> int:
        """Get a limit value (-1 = unlimited)."""
        return self.limits.get(limit_name, 0)
    
    def is_unlimited(self, limit_name: str) -> bool:
        """Check if a limit is unlimited."""
        return self.limits.get(limit_name, 0) == -1
    
    def is_trial(self) -> bool:
        """Check if user is on trial."""
        if self.trial_ends_at is None:
            return False
        return datetime.utcnow() < self.trial_ends_at


# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class FeatureService:
    """
    Service for managing feature flags and plan access.
    
    Features:
    - Check if user has access to a feature
    - Get plan limits
    - Track usage against limits
    - Handle trial periods
    """
    
    def __init__(self, supabase=None):
        self.db = supabase or get_supabase()
    
    # ─────────────────────────────────────────────────────────────────────────
    # GET FLAGS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_flags(
        self,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
    ) -> FeatureFlags:
        """
        Get feature flags for a user or company.
        
        Resolution order:
        1. User-specific flags
        2. Company flags
        3. Plan defaults
        4. Free tier defaults
        """
        flags_data = None
        
        # Try user-specific flags
        if user_id:
            result = self.db.table("feature_flags").select("*").eq(
                "user_id", user_id
            ).limit(1).execute()
            
            if result.data:
                flags_data = result.data[0]
        
        # Try company flags
        if not flags_data and company_id:
            result = self.db.table("feature_flags").select("*").eq(
                "company_id", company_id
            ).is_("user_id", "null").limit(1).execute()
            
            if result.data:
                flags_data = result.data[0]
        
        # Get company_id from user profile if not provided
        if not flags_data and user_id and not company_id:
            profile = self.db.table("profiles").select("company_id").eq(
                "id", user_id
            ).single().execute()
            
            if profile.data and profile.data.get("company_id"):
                company_id = profile.data["company_id"]
                
                # Try company flags again
                result = self.db.table("feature_flags").select("*").eq(
                    "company_id", company_id
                ).is_("user_id", "null").limit(1).execute()
                
                if result.data:
                    flags_data = result.data[0]
        
        # Build FeatureFlags object
        if flags_data:
            plan = Plan(flags_data.get("plan_name", "free"))
            custom_flags = flags_data.get("flags", {})
            
            # Merge plan defaults with custom flags
            plan_config = PLAN_CONFIGS.get(plan, PLAN_CONFIGS[Plan.FREE])
            
            features = {}
            for feature in Feature:
                # Custom flag takes precedence
                if feature.value in custom_flags:
                    features[feature] = custom_flags[feature.value]
                else:
                    features[feature] = plan_config["features"].get(feature, False)
            
            # Parse limits
            limits = {
                "leads_limit": custom_flags.get("leads_limit", plan_config["limits"]["leads_limit"]),
                "ai_calls_limit": custom_flags.get("ai_calls_limit", plan_config["limits"]["ai_calls_limit"]),
                "team_members_limit": custom_flags.get("team_members_limit", plan_config["limits"]["team_members_limit"]),
            }
            
            # Parse trial end
            trial_ends_at = None
            if flags_data.get("trial_ends_at"):
                try:
                    trial_ends_at = datetime.fromisoformat(
                        flags_data["trial_ends_at"].replace("Z", "+00:00")
                    )
                except:
                    pass
            
            return FeatureFlags(
                plan=plan,
                features=features,
                limits=limits,
                company_id=company_id,
                user_id=user_id,
                trial_ends_at=trial_ends_at,
            )
        
        # Return free tier defaults
        plan_config = PLAN_CONFIGS[Plan.FREE]
        return FeatureFlags(
            plan=Plan.FREE,
            features={f: plan_config["features"].get(f, False) for f in Feature},
            limits=plan_config["limits"],
            company_id=company_id,
            user_id=user_id,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # CHECK FEATURES
    # ─────────────────────────────────────────────────────────────────────────
    
    async def has_feature(
        self,
        feature: Feature,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
    ) -> bool:
        """Check if a user/company has access to a feature."""
        flags = await self.get_flags(user_id, company_id)
        return flags.has_feature(feature)
    
    async def check_limit(
        self,
        limit_name: str,
        current_usage: int,
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Check if usage is within limits.
        
        Returns:
            {
                "allowed": bool,
                "limit": int,
                "usage": int,
                "remaining": int,
                "unlimited": bool
            }
        """
        flags = await self.get_flags(user_id, company_id)
        limit = flags.get_limit(limit_name)
        
        if limit == -1:
            return {
                "allowed": True,
                "limit": -1,
                "usage": current_usage,
                "remaining": -1,
                "unlimited": True,
            }
        
        return {
            "allowed": current_usage < limit,
            "limit": limit,
            "usage": current_usage,
            "remaining": max(0, limit - current_usage),
            "unlimited": False,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # UPDATE FLAGS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def set_plan(
        self,
        plan: Plan,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
        trial_days: int = 0,
    ) -> FeatureFlags:
        """
        Set the plan for a company or user.
        
        Creates or updates the feature_flags record.
        """
        from datetime import timedelta
        
        plan_config = PLAN_CONFIGS.get(plan, PLAN_CONFIGS[Plan.FREE])
        
        # Build flags JSONB
        flags = {f.value: enabled for f, enabled in plan_config["features"].items()}
        flags.update(plan_config["limits"])
        
        data = {
            "plan_name": plan.value,
            "flags": flags,
            "company_id": company_id,
            "user_id": user_id,
        }
        
        if trial_days > 0:
            data["trial_ends_at"] = (datetime.utcnow() + timedelta(days=trial_days)).isoformat()
        
        # Upsert
        result = self.db.table("feature_flags").upsert(data).execute()
        
        logger.info(f"Set plan {plan.value} for company={company_id}, user={user_id}")
        
        return await self.get_flags(user_id, company_id)
    
    async def toggle_feature(
        self,
        feature: Feature,
        enabled: bool,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> bool:
        """Toggle a specific feature on/off."""
        # Get current flags
        flags = await self.get_flags(user_id, company_id)
        
        # Find the record
        query = self.db.table("feature_flags").select("id, flags")
        
        if user_id:
            query = query.eq("user_id", user_id)
        elif company_id:
            query = query.eq("company_id", company_id).is_("user_id", "null")
        else:
            return False
        
        result = query.single().execute()
        
        if not result.data:
            # Create new record
            await self.set_plan(flags.plan, company_id, user_id)
            result = query.single().execute()
        
        # Update flags
        current_flags = result.data.get("flags", {})
        current_flags[feature.value] = enabled
        
        self.db.table("feature_flags").update({
            "flags": current_flags,
        }).eq("id", result.data["id"]).execute()
        
        logger.info(f"Toggled {feature.value}={enabled} for company={company_id}, user={user_id}")
        
        return True
    
    # ─────────────────────────────────────────────────────────────────────────
    # USAGE TRACKING
    # ─────────────────────────────────────────────────────────────────────────
    
    async def increment_usage(
        self,
        usage_type: str,  # e.g., "ai_calls", "leads"
        amount: int = 1,
        company_id: Optional[str] = None,
    ) -> int:
        """
        Increment usage counter.
        
        Returns new usage count.
        """
        if not company_id:
            return 0
        
        # For ai_calls, update monthly_ai_calls_used
        if usage_type == "ai_calls":
            result = self.db.table("feature_flags").select(
                "id, monthly_ai_calls_used"
            ).eq("company_id", company_id).is_("user_id", "null").single().execute()
            
            if result.data:
                new_usage = (result.data.get("monthly_ai_calls_used") or 0) + amount
                
                self.db.table("feature_flags").update({
                    "monthly_ai_calls_used": new_usage,
                }).eq("id", result.data["id"]).execute()
                
                return new_usage
        
        return 0
    
    async def reset_monthly_usage(self, company_id: str) -> bool:
        """Reset monthly usage counters."""
        try:
            self.db.table("feature_flags").update({
                "monthly_ai_calls_used": 0,
            }).eq("company_id", company_id).execute()
            return True
        except Exception:
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

_feature_service: Optional[FeatureService] = None


def get_feature_service() -> FeatureService:
    """Get singleton FeatureService instance."""
    global _feature_service
    if _feature_service is None:
        _feature_service = FeatureService()
    return _feature_service


async def check_feature(
    user_id: Optional[str] = None,
    feature: Optional[Feature] = None,
    feature_name: Optional[str] = None,
    company_id: Optional[str] = None,
) -> bool:
    """
    Convenience function to check if a feature is enabled.
    
    Usage:
        if await check_feature(user_id, Feature.AUTOPILOT):
            # Feature enabled
        
        if await check_feature(user_id, feature_name="autopilot"):
            # Also works with string name
    """
    service = get_feature_service()
    
    if feature is None and feature_name:
        try:
            feature = Feature(feature_name)
        except ValueError:
            return False
    
    if feature is None:
        return False
    
    return await service.has_feature(feature, user_id, company_id)


async def get_plan_limits(
    user_id: Optional[str] = None,
    company_id: Optional[str] = None,
) -> Dict[str, int]:
    """Get all limits for a user/company."""
    service = get_feature_service()
    flags = await service.get_flags(user_id, company_id)
    return flags.limits

