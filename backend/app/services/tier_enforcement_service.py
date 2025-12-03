"""
═══════════════════════════════════════════════════════════════════════════
TIER ENFORCEMENT SERVICE
═══════════════════════════════════════════════════════════════════════════
Verwaltet Tier-Limits und Feature-Zugriff.

Features:
- Lead-Limits pro Tier
- AI-Chat-Limits
- Feature-Access-Control
- Usage Tracking
- Automatic Tier Upgrades

Tiers:
- FREE: 25 Leads, 5 AI-Chats/Tag
- STARTER: 200 Leads, Unlimited Chats, Knowledge Base (100 MB)
- PRO: 500 Leads, All Playbooks, Squad (5 Users)
- PREMIUM: Unlimited Leads, Active Lead Gen, Autonomous Agent
- ENTERPRISE: Everything + White-Label

Version: 1.0.0
═══════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, Optional
from datetime import datetime, date
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


class TierEnforcementService:
    """
    Service to enforce tier limits and feature access.
    """
    
    # Tier Configurations
    TIER_LIMITS = {
        'free': {
            'max_leads': 25,
            'max_ai_chats_per_day': 5,
            'max_knowledge_base_mb': 0,
            'max_squad_users': 1,
            'features': {
                'basic_features': True,
                'playbooks': ['DEAL-MEDIC']
            }
        },
        'starter': {
            'max_leads': 200,
            'max_ai_chats_per_day': -1,  # Unlimited
            'max_knowledge_base_mb': 100,
            'max_squad_users': 1,
            'features': {
                'unlimited_chats': True,
                'knowledge_base': True,
                'core_playbooks': True
            }
        },
        'pro': {
            'max_leads': 500,
            'max_ai_chats_per_day': -1,
            'max_knowledge_base_mb': 500,
            'max_squad_users': 5,
            'features': {
                'all_playbooks': True,
                'squad_management': True,
                'advanced_analytics': True,
                'social_import_passive': True
            }
        },
        'premium': {
            'max_leads': -1,  # Unlimited
            'max_ai_chats_per_day': -1,
            'max_knowledge_base_mb': 1000,
            'max_squad_users': 10,
            'features': {
                'unlimited_leads': True,
                'active_lead_gen': True,
                'autonomous_agent': True,
                'predictive_ai': True,
                'multi_channel': True
            }
        },
        'enterprise': {
            'max_leads': -1,
            'max_ai_chats_per_day': -1,
            'max_knowledge_base_mb': -1,
            'max_squad_users': -1,
            'features': {
                'everything': True,
                'white_label': True,
                'custom_features': True,
                'priority_support': True
            }
        }
    }
    
    def __init__(self, supabase=None):
        self.supabase = supabase or get_supabase_client()
    
    async def check_can_create_lead(self, user_id: str) -> Dict:
        """
        Check if user can create a new lead based on their tier limit.
        
        Returns:
        {
            "can_create": True/False,
            "reason": "...",
            "current_count": 10,
            "limit": 25,
            "tier": "free"
        }
        """
        try:
            # Get user subscription
            tier, limits = await self._get_user_tier_and_limits(user_id)
            
            max_leads = limits['max_leads']
            
            # If unlimited (-1), allow
            if max_leads == -1:
                return {
                    "can_create": True,
                    "reason": "Unlimited leads",
                    "current_count": None,
                    "limit": -1,
                    "tier": tier
                }
            
            # Count current leads
            leads = self.supabase.table('leads').select('id', count='exact').eq('user_id', user_id).execute()
            current_count = leads.count if hasattr(leads, 'count') else len(leads.data or [])
            
            if current_count >= max_leads:
                return {
                    "can_create": False,
                    "reason": f"Lead-Limit erreicht. Upgrade auf höheren Tier für mehr Leads.",
                    "current_count": current_count,
                    "limit": max_leads,
                    "tier": tier
                }
            
            return {
                "can_create": True,
                "reason": "OK",
                "current_count": current_count,
                "limit": max_leads,
                "tier": tier
            }
        
        except Exception as e:
            logger.error(f"Error checking lead creation: {str(e)}")
            # Fail open - allow creation
            return {
                "can_create": True,
                "reason": "Error checking limit - allowing",
                "error": str(e)
            }
    
    async def check_can_use_ai_chat(self, user_id: str) -> Dict:
        """
        Check if user can use AI chat based on daily limit.
        
        Returns:
        {
            "can_use": True/False,
            "reason": "...",
            "daily_count": 3,
            "daily_limit": 5,
            "tier": "free"
        }
        """
        try:
            # Get user subscription
            tier, limits = await self._get_user_tier_and_limits(user_id)
            
            daily_limit = limits['max_ai_chats_per_day']
            
            # If unlimited (-1), allow
            if daily_limit == -1:
                return {
                    "can_use": True,
                    "reason": "Unlimited AI chats",
                    "daily_count": None,
                    "daily_limit": -1,
                    "tier": tier
                }
            
            # Get today's usage
            today = date.today()
            usage = await self._get_or_create_daily_usage(user_id, today)
            
            daily_count = usage.get('ai_chats_count', 0)
            
            if daily_count >= daily_limit:
                return {
                    "can_use": False,
                    "reason": f"Tages-Limit von {daily_limit} AI-Chats erreicht. Upgrade für unlimited chats.",
                    "daily_count": daily_count,
                    "daily_limit": daily_limit,
                    "tier": tier
                }
            
            return {
                "can_use": True,
                "reason": "OK",
                "daily_count": daily_count,
                "daily_limit": daily_limit,
                "tier": tier
            }
        
        except Exception as e:
            logger.error(f"Error checking AI chat usage: {str(e)}")
            # Fail open - allow usage
            return {
                "can_use": True,
                "reason": "Error checking limit - allowing",
                "error": str(e)
            }
    
    async def check_feature_access(self, user_id: str, feature_name: str) -> Dict:
        """
        Check if user has access to a specific feature.
        
        Features:
        - active_lead_gen (Premium+)
        - autonomous_agent (Premium+)
        - predictive_ai (Premium+)
        - squad_management (Pro+)
        - knowledge_base (Starter+)
        - all_playbooks (Pro+)
        
        Returns:
        {
            "has_access": True/False,
            "tier": "starter",
            "required_tier": "premium"
        }
        """
        try:
            tier, limits = await self._get_user_tier_and_limits(user_id)
            
            features = limits.get('features', {})
            has_access = features.get(feature_name, False)
            
            # Determine required tier
            required_tier = self._get_required_tier_for_feature(feature_name)
            
            return {
                "has_access": has_access,
                "tier": tier,
                "required_tier": required_tier,
                "feature": feature_name
            }
        
        except Exception as e:
            logger.error(f"Error checking feature access: {str(e)}")
            return {
                "has_access": False,
                "error": str(e)
            }
    
    async def increment_ai_chat_usage(self, user_id: str):
        """
        Increment AI chat usage counter for today.
        """
        try:
            today = date.today()
            usage = await self._get_or_create_daily_usage(user_id, today)
            
            # Increment counter
            new_count = usage.get('ai_chats_count', 0) + 1
            
            self.supabase.table('user_usage_tracking').update({
                'ai_chats_count': new_count,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', user_id).eq('date', today.isoformat()).execute()
        
        except Exception as e:
            logger.error(f"Error incrementing AI chat usage: {str(e)}")
    
    async def increment_lead_count(self, user_id: str):
        """
        Increment lead count in daily usage tracking.
        """
        try:
            today = date.today()
            usage = await self._get_or_create_daily_usage(user_id, today)
            
            # Increment counter
            new_count = usage.get('leads_count', 0) + 1
            
            self.supabase.table('user_usage_tracking').update({
                'leads_count': new_count,
                'updated_at': datetime.now().isoformat()
            }).eq('user_id', user_id).eq('date', today.isoformat()).execute()
        
        except Exception as e:
            logger.error(f"Error incrementing lead count: {str(e)}")
    
    async def get_usage_stats(self, user_id: str) -> Dict:
        """
        Get comprehensive usage stats for user.
        
        Returns:
        {
            "tier": "starter",
            "limits": {...},
            "usage": {
                "leads": {"current": 45, "limit": 200},
                "ai_chats_today": {"current": 2, "limit": -1},
                "knowledge_base_mb": {"current": 12.5, "limit": 100}
            }
        }
        """
        try:
            tier, limits = await self._get_user_tier_and_limits(user_id)
            
            # Get lead count
            leads = self.supabase.table('leads').select('id', count='exact').eq('user_id', user_id).execute()
            lead_count = leads.count if hasattr(leads, 'count') else len(leads.data or [])
            
            # Get today's usage
            today = date.today()
            daily_usage = await self._get_or_create_daily_usage(user_id, today)
            
            # Get knowledge base usage (if available)
            # TODO: Implement KB size tracking
            kb_usage = 0
            
            return {
                "tier": tier,
                "limits": limits,
                "usage": {
                    "leads": {
                        "current": lead_count,
                        "limit": limits['max_leads']
                    },
                    "ai_chats_today": {
                        "current": daily_usage.get('ai_chats_count', 0),
                        "limit": limits['max_ai_chats_per_day']
                    },
                    "knowledge_base_mb": {
                        "current": kb_usage,
                        "limit": limits['max_knowledge_base_mb']
                    },
                    "squad_users": {
                        "current": 1,  # TODO: Implement squad user counting
                        "limit": limits['max_squad_users']
                    }
                },
                "features": limits.get('features', {})
            }
        
        except Exception as e:
            logger.error(f"Error getting usage stats: {str(e)}")
            return {
                "error": str(e)
            }
    
    async def _get_user_tier_and_limits(self, user_id: str) -> tuple[str, Dict]:
        """
        Get user's tier and limits.
        
        Returns: (tier_name, limits_dict)
        """
        try:
            # Get user subscription
            subscription = self.supabase.table('user_subscriptions').select('*').eq('user_id', user_id).eq('status', 'active').execute()
            
            if subscription.data:
                tier = subscription.data[0]['tier']
                # Get limits from tier config
                limits = self.TIER_LIMITS.get(tier, self.TIER_LIMITS['free'])
                return tier, limits
            
            # Default to free tier
            return 'free', self.TIER_LIMITS['free']
        
        except Exception as e:
            logger.error(f"Error getting user tier: {str(e)}")
            # Default to free tier on error
            return 'free', self.TIER_LIMITS['free']
    
    async def _get_or_create_daily_usage(self, user_id: str, date: date) -> Dict:
        """
        Get or create daily usage record.
        """
        try:
            # Try to get existing record
            usage = self.supabase.table('user_usage_tracking').select('*').eq('user_id', user_id).eq('date', date.isoformat()).execute()
            
            if usage.data:
                return usage.data[0]
            
            # Create new record
            new_usage = {
                'user_id': user_id,
                'date': date.isoformat(),
                'leads_count': 0,
                'ai_chats_count': 0,
                'knowledge_base_mb_used': 0,
                'active_lead_gen_runs': 0,
                'autonomous_agent_hours': 0
            }
            
            result = self.supabase.table('user_usage_tracking').insert(new_usage).execute()
            return result.data[0] if result.data else new_usage
        
        except Exception as e:
            logger.error(f"Error getting/creating daily usage: {str(e)}")
            return {}
    
    def _get_required_tier_for_feature(self, feature_name: str) -> str:
        """
        Determine which tier is required for a feature.
        """
        feature_tier_map = {
            'active_lead_gen': 'premium',
            'autonomous_agent': 'premium',
            'predictive_ai': 'premium',
            'multi_channel': 'premium',
            'squad_management': 'pro',
            'all_playbooks': 'pro',
            'advanced_analytics': 'pro',
            'social_import_passive': 'pro',
            'knowledge_base': 'starter',
            'unlimited_chats': 'starter',
            'basic_features': 'free'
        }
        
        return feature_tier_map.get(feature_name, 'premium')

