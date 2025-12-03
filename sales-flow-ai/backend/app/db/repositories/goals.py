"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOALS REPOSITORY                                                          ║
║  Database Access für User Goals & Daily Flow Targets                       ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime
from loguru import logger

from app.db.supabase import get_supabase_client
from app.domain.goals.models import (
    UserGoal,
    UserDailyFlowTargets,
    GoalStatus,
    DailyFlowConfig,
    GoalCalculationResult,
)


class GoalsRepository:
    """Repository for user goals and daily flow targets."""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # ============================================
    # USER GOALS
    # ============================================
    
    async def create_goal(
        self,
        user_id: str,
        workspace_id: str,
        company_id: str,
        goal_type: str,
        result: GoalCalculationResult,
        target_monthly_income: Optional[float] = None,
        timeframe_months: int = 6,
    ) -> Optional[str]:
        """
        Create a new user goal.
        Cancels any existing active goals for the same company.
        """
        try:
            # Use RPC for atomic operation
            response = self.client.rpc(
                "upsert_user_goal",
                {
                    "p_user_id": user_id,
                    "p_workspace_id": workspace_id,
                    "p_company_id": company_id,
                    "p_goal_type": goal_type,
                    "p_target_monthly_income": target_monthly_income,
                    "p_target_rank_id": result.target_rank.id,
                    "p_target_rank_name": result.target_rank.name,
                    "p_timeframe_months": timeframe_months,
                    "p_calculated_group_volume": result.missing_group_volume,
                    "p_calculated_customers": result.estimated_customers,
                    "p_calculated_partners": result.estimated_partners,
                }
            ).execute()
            
            return response.data
        except Exception as e:
            logger.error(f"Error creating goal: {e}")
            return None
    
    async def get_active_goal(
        self,
        user_id: str,
        company_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get the active goal for a user."""
        try:
            query = (
                self.client
                .table("user_goals")
                .select("*")
                .eq("user_id", user_id)
                .eq("status", "active")
            )
            
            if company_id:
                query = query.eq("company_id", company_id)
            
            response = query.single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error getting active goal: {e}")
            return None
    
    async def get_all_goals(
        self,
        user_id: str,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all goals for a user."""
        try:
            query = (
                self.client
                .table("user_goals")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
            )
            
            if status:
                query = query.eq("status", status)
            
            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting goals: {e}")
            return []
    
    async def mark_goal_achieved(self, goal_id: str) -> bool:
        """Mark a goal as achieved."""
        try:
            self.client.table("user_goals").update({
                "status": "achieved",
                "achieved_at": datetime.utcnow().isoformat(),
            }).eq("id", goal_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error marking goal achieved: {e}")
            return False
    
    # ============================================
    # DAILY FLOW TARGETS
    # ============================================
    
    async def save_daily_targets(
        self,
        user_id: str,
        workspace_id: str,
        goal_id: str,
        company_id: str,
        result: GoalCalculationResult,
        config: Optional[DailyFlowConfig] = None,
    ) -> Optional[str]:
        """Save daily flow targets for a user."""
        try:
            response = self.client.rpc(
                "upsert_daily_flow_targets",
                {
                    "p_user_id": user_id,
                    "p_workspace_id": workspace_id,
                    "p_goal_id": goal_id,
                    "p_company_id": company_id,
                    "p_weekly_new_customers": result.daily_targets.weekly.new_customers,
                    "p_weekly_new_partners": result.daily_targets.weekly.new_partners,
                    "p_weekly_new_contacts": result.daily_targets.weekly.new_contacts,
                    "p_weekly_followups": result.daily_targets.weekly.followups,
                    "p_weekly_reactivations": result.daily_targets.weekly.reactivations,
                    "p_daily_new_contacts": result.daily_targets.daily.new_contacts,
                    "p_daily_followups": result.daily_targets.daily.followups,
                    "p_daily_reactivations": result.daily_targets.daily.reactivations,
                    "p_config": config.model_dump() if config else None,
                }
            ).execute()
            
            return response.data
        except Exception as e:
            logger.error(f"Error saving daily targets: {e}")
            return None
    
    async def get_daily_targets(
        self,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get daily flow targets for a user."""
        try:
            response = (
                self.client
                .table("user_daily_flow_targets")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .single()
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error getting daily targets: {e}")
            return None
    
    async def get_goal_summary(
        self,
        user_id: str,
        company_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get goal summary via RPC."""
        try:
            response = self.client.rpc(
                "get_active_goal_summary",
                {
                    "p_user_id": user_id,
                    "p_company_id": company_id,
                }
            ).execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting goal summary: {e}")
            return []


# Singleton instance
goals_repository = GoalsRepository()

