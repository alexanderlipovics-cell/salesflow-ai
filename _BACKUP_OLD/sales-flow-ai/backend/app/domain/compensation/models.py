"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COMPENSATION PLAN MODELS                                                  ║
║  Pydantic Models für MLM Compensation Plans                                ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Tuple
from enum import Enum


# ============================================
# ENUMS
# ============================================

class PlanType(str, Enum):
    """Type of compensation plan."""
    UNILEVEL = "unilevel"
    BINARY = "binary"
    MATRIX = "matrix"
    HYBRID = "hybrid"


class PlanUnit(str, Enum):
    """Unit of volume measurement."""
    CREDITS = "credits"
    PV = "pv"
    POINTS = "points"
    VOLUME = "volume"


class Region(str, Enum):
    """Supported regions."""
    DE = "DE"
    AT = "AT"
    CH = "CH"
    EU = "EU"
    GLOBAL = "GLOBAL"


# ============================================
# RANK MODELS
# ============================================

class LegVolumeRequirement(BaseModel):
    """Leg volume requirement for rank qualification."""
    legs_required: int = Field(..., ge=0, description="Number of legs required")
    min_volume_per_leg: float = Field(..., ge=0, description="Minimum volume per leg")


class RankRequirement(BaseModel):
    """Requirements to achieve a rank."""
    min_personal_volume: Optional[float] = Field(None, ge=0, description="Minimum personal volume")
    min_group_volume: Optional[float] = Field(None, ge=0, description="Minimum group volume")
    min_legs: Optional[int] = Field(None, ge=0, description="Minimum number of legs")
    leg_volume_requirements: Optional[LegVolumeRequirement] = None


class RankEarningEstimate(BaseModel):
    """Estimated earnings for a rank."""
    avg_monthly_income: float = Field(..., ge=0, description="Average monthly income")
    range: Optional[Tuple[float, float]] = Field(None, description="Income range (min, max)")


class RankDefinition(BaseModel):
    """Definition of a rank in the compensation plan."""
    id: str = Field(..., description="Unique rank identifier")
    name: str = Field(..., description="Display name of the rank")
    order: int = Field(..., ge=0, description="Rank order (0 = lowest)")
    unit: PlanUnit = Field(..., description="Volume unit")
    requirements: RankRequirement = Field(..., description="Rank requirements")
    earning_estimate: Optional[RankEarningEstimate] = Field(None, description="Earning estimate")


# ============================================
# COMPENSATION PLAN MODEL
# ============================================

class CompensationPlan(BaseModel):
    """Complete compensation plan for a company."""
    
    company_id: str = Field(..., description="Unique company identifier")
    company_name: str = Field(..., description="Display name of the company")
    company_logo: Optional[str] = Field(None, description="Emoji or icon for the company")
    region: Region = Field(..., description="Region this plan applies to")
    plan_type: PlanType = Field(..., description="Type of compensation plan")
    
    unit_label: str = Field(..., description="Display label for volume unit")
    unit_code: PlanUnit = Field(..., description="Code for volume unit")
    currency: str = Field(default="EUR", description="Currency for earnings")
    
    ranks: List[RankDefinition] = Field(..., description="List of ranks")
    
    # Average values for calculations
    avg_personal_volume_per_customer: Optional[float] = Field(
        None, ge=0, description="Average volume per customer"
    )
    avg_personal_volume_per_partner: Optional[float] = Field(
        None, ge=0, description="Average volume per partner"
    )
    
    # Meta
    version: int = Field(default=1, description="Plan version")
    last_updated: Optional[str] = Field(None, description="Last update date")
    disclaimer: Optional[str] = Field(None, description="Legal disclaimer")
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "company_id": "zinzino",
                "company_name": "Zinzino",
                "company_logo": "🧬",
                "region": "DE",
                "plan_type": "unilevel",
                "unit_label": "Credits",
                "unit_code": "credits",
                "currency": "EUR",
                "ranks": [],
                "avg_personal_volume_per_customer": 60,
                "avg_personal_volume_per_partner": 100,
            }
        }

