"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL API SCHEMAS                                                          ║
║  Request/Response Models für Goal Endpoints                                ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date

from app.domain.goals.models import (
    GoalType,
    GoalStatus,
    DailyFlowConfig,
    DailyFlowTargets,
    DEFAULT_DAILY_FLOW_CONFIG,
)
from app.domain.compensation.models import RankDefinition


# ============================================
# CALCULATE GOAL
# ============================================

class GoalCalculateRequest(BaseModel):
    """Request to calculate goal targets."""
    
    company_id: str = Field(..., description="Company identifier (e.g., 'zinzino')")
    region: str = Field(default="DE", description="Region code")
    goal_type: GoalType = Field(..., description="Type of goal: income or rank")
    
    target_monthly_income: Optional[float] = Field(
        None, ge=0, le=100000,
        description="Target monthly income in EUR (for income goals)"
    )
    target_rank_id: Optional[str] = Field(
        None, description="Target rank ID (for rank goals)"
    )
    
    timeframe_months: int = Field(
        default=6, ge=1, le=60,
        description="Timeframe to achieve goal in months"
    )
    current_group_volume: float = Field(
        default=0, ge=0,
        description="Current group volume"
    )
    
    config: Optional[DailyFlowConfig] = Field(
        default=None,
        description="Custom daily flow configuration"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "zinzino",
                "region": "DE",
                "goal_type": "income",
                "target_monthly_income": 2000,
                "timeframe_months": 6,
                "current_group_volume": 0,
            }
        }


class GoalCalculateResponse(BaseModel):
    """Response with calculated goal targets."""
    
    success: bool = True
    
    # Target
    target_rank_id: str
    target_rank_name: str
    company_id: str
    company_name: str
    
    # Volume
    required_group_volume: float
    missing_group_volume: float
    
    # Estimates
    estimated_customers: int
    estimated_partners: int
    
    # Time distribution
    per_month_volume: float
    per_week_volume: float
    per_day_volume: float
    timeframe_months: int
    
    # Daily targets
    weekly_new_contacts: float
    weekly_followups: float
    weekly_reactivations: float
    daily_new_contacts: float
    daily_followups: float
    daily_reactivations: float
    
    # For frontend display
    summary_text: str
    disclaimer: str


# ============================================
# SAVE GOAL
# ============================================

class GoalSaveRequest(BaseModel):
    """Request to save a user goal."""
    
    company_id: str
    goal_type: GoalType
    target_monthly_income: Optional[float] = None
    target_rank_id: Optional[str] = None
    target_rank_name: Optional[str] = None
    timeframe_months: int = Field(default=6, ge=1, le=60)
    
    # Calculated values
    calculated_group_volume: Optional[float] = None
    calculated_customers: Optional[int] = None
    calculated_partners: Optional[int] = None
    
    # Daily targets to save
    daily_targets: Optional[DailyFlowTargets] = None
    config: Optional[DailyFlowConfig] = None


class GoalSaveResponse(BaseModel):
    """Response after saving a goal."""
    
    success: bool
    goal_id: Optional[UUID] = None
    message: str
    error: Optional[str] = None


# ============================================
# GET DAILY TARGETS
# ============================================

class DailyTargetsResponse(BaseModel):
    """Response with user's current daily targets."""
    
    has_goal: bool
    
    # Goal info (if exists)
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    target_rank_name: Optional[str] = None
    target_monthly_income: Optional[float] = None
    
    # Progress
    days_remaining: Optional[int] = None
    progress_percent: Optional[float] = None
    
    # Daily targets
    daily_new_contacts: float = 0
    daily_followups: float = 0
    daily_reactivations: float = 0
    
    # Weekly targets
    weekly_new_contacts: float = 0
    weekly_followups: float = 0


# ============================================
# GOAL LIST
# ============================================

class GoalSummary(BaseModel):
    """Summary of a user goal."""
    
    goal_id: UUID
    company_id: str
    goal_type: GoalType
    target_monthly_income: Optional[float]
    target_rank_name: Optional[str]
    timeframe_months: int
    start_date: date
    end_date: date
    days_remaining: int
    progress_percent: float
    status: GoalStatus
    
    daily_new_contacts: float
    daily_followups: float
    daily_reactivations: float


class GoalListResponse(BaseModel):
    """Response with list of user goals."""
    
    goals: List[GoalSummary]
    active_goal: Optional[GoalSummary] = None

