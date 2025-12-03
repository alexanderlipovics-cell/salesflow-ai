"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COMPENSATION API SCHEMAS                                                  ║
║  Request/Response Models für Compensation Plan Endpoints                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Tuple

from app.domain.compensation.models import PlanType, PlanUnit, Region


# ============================================
# COMPANY LIST
# ============================================

class CompanyInfo(BaseModel):
    """Basic company information."""
    id: str
    name: str
    logo: str
    region: str


class CompanyListResponse(BaseModel):
    """Response with list of available companies."""
    companies: List[CompanyInfo]
    count: int


# ============================================
# RANK INFO
# ============================================

class RankInfo(BaseModel):
    """Rank information for API response."""
    id: str
    name: str
    order: int
    min_group_volume: Optional[float] = None
    avg_monthly_income: Optional[float] = None
    income_range: Optional[Tuple[float, float]] = None


class RankListResponse(BaseModel):
    """Response with list of ranks for a company."""
    company_id: str
    company_name: str
    ranks: List[RankInfo]
    count: int


# ============================================
# COMPENSATION PLAN
# ============================================

class CompensationPlanResponse(BaseModel):
    """Full compensation plan response."""
    
    company_id: str
    company_name: str
    company_logo: Optional[str]
    region: str
    plan_type: str
    
    unit_label: str
    unit_code: str
    currency: str
    
    avg_volume_per_customer: Optional[float]
    avg_volume_per_partner: Optional[float]
    
    ranks: List[RankInfo]
    
    version: int
    disclaimer: Optional[str]


# ============================================
# FIND RANK
# ============================================

class FindRankRequest(BaseModel):
    """Request to find a rank by income."""
    company_id: str
    target_income: float = Field(..., ge=0)
    region: str = Field(default="DE")


class FindRankResponse(BaseModel):
    """Response with found rank."""
    found: bool
    rank: Optional[RankInfo] = None
    message: str

