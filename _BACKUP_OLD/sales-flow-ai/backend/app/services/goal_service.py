"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL SERVICE                                                              ║
║  Business Logic für Goals - verbindet Engine, Repository und API           ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, Dict, Any
from loguru import logger

from app.domain.goals import (
    GoalCalculationInput,
    GoalCalculationResult,
    calculate_goal,
    format_target_summary,
    DailyFlowConfig,
    DEFAULT_DAILY_FLOW_CONFIG,
)
from app.domain.compensation import get_plan_by_id
from app.db.repositories.goals import goals_repository


class GoalService:
    """Service for goal operations."""
    
    def __init__(self):
        self.repository = goals_repository
    
    async def calculate_and_save_goal(
        self,
        user_id: str,
        workspace_id: str,
        company_id: str,
        goal_type: str,
        target_monthly_income: Optional[float] = None,
        target_rank_id: Optional[str] = None,
        timeframe_months: int = 6,
        current_group_volume: float = 0,
        config: Optional[DailyFlowConfig] = None,
    ) -> Dict[str, Any]:
        """
        Calculate goal targets and save to database.
        
        Returns:
            Dict with success status, goal_id, and result
        """
        try:
            # Build input
            calc_input = GoalCalculationInput(
                company_id=company_id,
                goal_type=goal_type,
                target_monthly_income=target_monthly_income,
                target_rank_id=target_rank_id,
                timeframe_months=timeframe_months,
                current_group_volume=current_group_volume,
                config=config or DEFAULT_DAILY_FLOW_CONFIG,
            )
            
            # Calculate
            result = calculate_goal(calc_input)
            
            # Save goal
            goal_id = await self.repository.create_goal(
                user_id=user_id,
                workspace_id=workspace_id,
                company_id=company_id,
                goal_type=goal_type,
                result=result,
                target_monthly_income=target_monthly_income,
                timeframe_months=timeframe_months,
            )
            
            if not goal_id:
                return {
                    "success": False,
                    "error": "Failed to save goal",
                }
            
            # Save daily targets
            await self.repository.save_daily_targets(
                user_id=user_id,
                workspace_id=workspace_id,
                goal_id=goal_id,
                company_id=company_id,
                result=result,
                config=config,
            )
            
            return {
                "success": True,
                "goal_id": goal_id,
                "result": result,
                "summary": format_target_summary(result),
            }
            
        except Exception as e:
            logger.exception(f"Error in calculate_and_save_goal: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def get_user_daily_targets(
        self,
        user_id: str,
    ) -> Dict[str, Any]:
        """Get daily targets for a user."""
        targets = await self.repository.get_daily_targets(user_id)
        
        if not targets:
            return {
                "has_goal": False,
                "daily_new_contacts": 0,
                "daily_followups": 0,
                "daily_reactivations": 0,
            }
        
        # Get associated goal for additional info
        goal_summary = await self.repository.get_goal_summary(user_id)
        goal = goal_summary[0] if goal_summary else None
        
        return {
            "has_goal": True,
            "company_id": targets.get("company_id"),
            "target_rank_name": goal.get("target_rank_name") if goal else None,
            "days_remaining": goal.get("days_remaining") if goal else None,
            "progress_percent": goal.get("progress_percent") if goal else None,
            "daily_new_contacts": targets.get("daily_new_contacts", 0),
            "daily_followups": targets.get("daily_followups", 0),
            "daily_reactivations": targets.get("daily_reactivations", 0),
            "weekly_new_contacts": targets.get("weekly_new_contacts", 0),
            "weekly_followups": targets.get("weekly_followups", 0),
        }


# Singleton instance
goal_service = GoalService()

