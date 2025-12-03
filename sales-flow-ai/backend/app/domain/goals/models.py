"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL ENGINE MODELS                                                        ║
║  Pydantic Models für Ziele und Daily Flow Targets                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum
from datetime import date, datetime
from uuid import UUID

from app.domain.compensation.models import CompensationPlan, RankDefinition


# ============================================
# ENUMS
# ============================================

class GoalType(str, Enum):
    """Type of goal."""
    INCOME = "income"
    RANK = "rank"


class GoalStatus(str, Enum):
    """Status of a goal."""
    ACTIVE = "active"
    ACHIEVED = "achieved"
    PAUSED = "paused"
    CANCELLED = "cancelled"


# ============================================
# DAILY FLOW CONFIG
# ============================================

class DailyFlowConfig(BaseModel):
    """Configuration for daily flow calculations."""
    
    working_days_per_week: int = Field(
        default=5, ge=1, le=7,
        description="Number of working days per week"
    )
    contact_to_customer_rate: float = Field(
        default=0.2, ge=0, le=1,
        description="Conversion rate from contact to customer"
    )
    contact_to_partner_rate: float = Field(
        default=0.05, ge=0, le=1,
        description="Conversion rate from contact to partner"
    )
    followups_per_customer: int = Field(
        default=3, ge=0,
        description="Average follow-ups needed per customer"
    )
    followups_per_partner: int = Field(
        default=5, ge=0,
        description="Average follow-ups needed per partner"
    )
    reactivation_share: float = Field(
        default=0.2, ge=0, le=1,
        description="Share of time for reactivating old contacts"
    )


# Default config
DEFAULT_DAILY_FLOW_CONFIG = DailyFlowConfig()


# ============================================
# TARGETS
# ============================================

class WeeklyTargets(BaseModel):
    """Weekly activity targets."""
    new_customers: float = Field(..., ge=0)
    new_partners: float = Field(..., ge=0)
    new_contacts: float = Field(..., ge=0)
    followups: float = Field(..., ge=0)
    reactivations: float = Field(..., ge=0)


class DailyTargets(BaseModel):
    """Daily activity targets."""
    new_contacts: float = Field(..., ge=0)
    followups: float = Field(..., ge=0)
    reactivations: float = Field(..., ge=0)


class DailyFlowTargets(BaseModel):
    """Combined daily and weekly targets."""
    weekly: WeeklyTargets
    daily: DailyTargets


# ============================================
# GOAL CALCULATION
# ============================================

class GoalCalculationInput(BaseModel):
    """Input for goal calculation."""
    
    company_id: str = Field(..., description="Company identifier")
    region: str = Field(default="DE", description="Region")
    goal_type: GoalType = Field(..., description="Type of goal")
    
    target_monthly_income: Optional[float] = Field(
        None, ge=0, description="Target monthly income (for income goals)"
    )
    target_rank_id: Optional[str] = Field(
        None, description="Target rank ID (for rank goals)"
    )
    
    timeframe_months: int = Field(
        ..., ge=1, le=60, description="Timeframe in months"
    )
    current_group_volume: float = Field(
        default=0, ge=0, description="Current group volume"
    )
    
    config: DailyFlowConfig = Field(
        default_factory=DailyFlowConfig,
        description="Daily flow configuration"
    )


class GoalCalculationResult(BaseModel):
    """Result of goal calculation."""
    
    target_rank: RankDefinition = Field(..., description="Target rank to achieve")
    required_group_volume: float = Field(..., ge=0, description="Total required volume")
    missing_group_volume: float = Field(..., ge=0, description="Missing volume to achieve")
    
    estimated_customers: int = Field(..., ge=0, description="Estimated customers needed")
    estimated_partners: int = Field(..., ge=0, description="Estimated partners needed")
    
    per_month_volume: float = Field(..., ge=0, description="Volume needed per month")
    per_week_volume: float = Field(..., ge=0, description="Volume needed per week")
    per_day_volume: float = Field(..., ge=0, description="Volume needed per day")
    
    daily_targets: DailyFlowTargets = Field(..., description="Daily and weekly targets")
    
    # Meta
    company_id: str
    company_name: str
    timeframe_months: int


# ============================================
# USER GOAL (Database Model)
# ============================================

class UserGoal(BaseModel):
    """User goal stored in database."""
    
    id: UUID
    user_id: UUID
    workspace_id: UUID
    
    company_id: str
    goal_type: GoalType
    
    target_monthly_income: Optional[float] = None
    target_rank_id: Optional[str] = None
    target_rank_name: Optional[str] = None
    
    timeframe_months: int
    start_date: date
    end_date: date
    
    calculated_group_volume: Optional[float] = None
    calculated_customers: Optional[int] = None
    calculated_partners: Optional[int] = None
    
    status: GoalStatus = GoalStatus.ACTIVE
    achieved_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserDailyFlowTargets(BaseModel):
    """User daily flow targets stored in database."""
    
    id: UUID
    user_id: UUID
    workspace_id: UUID
    goal_id: Optional[UUID] = None
    company_id: str
    
    # Weekly targets
    weekly_new_customers: float = 0
    weekly_new_partners: float = 0
    weekly_new_contacts: float = 0
    weekly_followups: float = 0
    weekly_reactivations: float = 0
    
    # Daily targets
    daily_new_contacts: float = 0
    daily_followups: float = 0
    daily_reactivations: float = 0
    
    config: DailyFlowConfig
    is_active: bool = True
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# CONSTANTS
# ============================================

DISCLAIMER_TEXT = """
⚠️ Hinweis: Alle Angaben sind unverbindliche Beispielrechnungen und keine Verdienstgarantie.
Dein tatsächliches Einkommen hängt von deiner eigenen Leistung, deinem Team
und den offiziellen Richtlinien deiner Firma ab.
""".strip()

