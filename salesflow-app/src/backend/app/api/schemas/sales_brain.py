# backend/app/api/schemas/sales_brain.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🧠 SALES BRAIN SCHEMAS                                                     ║
║  Pydantic Models für Teach-UI & Rule Learning                               ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


# =============================================================================
# ENUMS
# =============================================================================

class RuleScope(str, Enum):
    user = "user"
    team = "team"


class RuleStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    pending_review = "pending_review"


class RulePriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class OverrideType(str, Enum):
    full_replace = "full_replace"
    edit = "edit"
    append = "append"
    prepend = "prepend"


class LeadSentiment(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


# =============================================================================
# CONTEXT SCHEMAS
# =============================================================================

class OverrideContextSchema(BaseModel):
    """Kontext in dem der Override passierte"""
    vertical_id: Optional[str] = None
    company_id: Optional[str] = None
    channel: Optional[str] = None
    use_case: Optional[str] = None
    language: Optional[str] = "de"
    lead_status: Optional[str] = None
    deal_state: Optional[str] = None
    lead_sentiment: Optional[LeadSentiment] = None


# =============================================================================
# OVERRIDE EVENT SCHEMAS
# =============================================================================

class OverrideEventSchema(BaseModel):
    """Das Override-Event mit allen Details"""
    suggestion_id: Optional[str] = None
    original_text: str = Field(..., min_length=1)
    final_text: str = Field(..., min_length=1)
    similarity_score: float = Field(..., ge=0, le=1)
    override_type: Optional[OverrideType] = OverrideType.full_replace
    context: OverrideContextSchema = Field(default_factory=OverrideContextSchema)


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class CreateRuleRequest(BaseModel):
    """Request um eine neue Regel zu erstellen"""
    scope: RuleScope
    override: OverrideEventSchema
    note: Optional[str] = Field(None, max_length=500)
    auto_tag: Optional[str] = None


class UpdateRuleRequest(BaseModel):
    """Request um eine Regel zu aktualisieren"""
    preferred_text: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)
    status: Optional[RuleStatus] = None
    priority: Optional[RulePriority] = None


class MatchRulesRequest(BaseModel):
    """Request um passende Regeln zu finden"""
    channel: Optional[str] = None
    use_case: Optional[str] = None
    lead_status: Optional[str] = None
    deal_state: Optional[str] = None
    input_text: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=50)


class RuleFeedbackRequest(BaseModel):
    """Feedback zu einer angewendeten Regel"""
    accepted: bool
    modified: Optional[bool] = False
    final_text: Optional[str] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class SalesBrainRuleResponse(BaseModel):
    """Eine Sales Brain Regel"""
    id: str
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    scope: RuleScope
    
    # Context Filter
    vertical_id: Optional[str] = None
    company_id: Optional[str] = None
    channel: Optional[str] = None
    use_case: Optional[str] = None
    language: str = "de"
    
    # Text
    original_text: str
    preferred_text: str
    similarity_score: float
    
    # Metadata
    note: Optional[str] = None
    status: RuleStatus = RuleStatus.active
    priority: RulePriority = RulePriority.medium
    
    # Stats
    apply_count: int = 0
    accept_count: int = 0
    accept_rate: float = 0.0
    
    # Timestamps
    created_at: datetime
    last_applied_at: Optional[datetime] = None


class CreateRuleResponse(BaseModel):
    """Response nach Regel-Erstellung"""
    id: str
    message: str = "Regel erfolgreich erstellt"
    template_created: bool = False
    template_id: Optional[str] = None


class GetRulesResponse(BaseModel):
    """Liste von Regeln"""
    rules: List[SalesBrainRuleResponse]
    total: int
    page: int = 1
    page_size: int = 20


class SalesBrainStatsResponse(BaseModel):
    """Sales Brain Statistiken"""
    total_rules: int
    user_rules: int
    team_rules: int
    applied_this_week: int
    top_use_cases: List[dict]


# =============================================================================
# INTERNAL SCHEMAS
# =============================================================================

class RuleMatchScore(BaseModel):
    """Internes Scoring für Regel-Matching"""
    rule_id: str
    score: float
    match_reason: str

