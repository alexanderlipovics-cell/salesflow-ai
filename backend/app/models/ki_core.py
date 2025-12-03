"""
SALES FLOW AI - KI Core Models
Pydantic Models für BANT, DISG, Recommendations & Intelligence
Version: 1.0.0 | Created: 2024-12-01
"""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ============================================================================
# BANT ASSESSMENT MODELS
# ============================================================================

class BANTScores(BaseModel):
    """Individual BANT scores"""
    budget_score: int = Field(..., ge=0, le=100, description="Budget assessment (0-100)")
    authority_score: int = Field(..., ge=0, le=100, description="Authority assessment (0-100)")
    need_score: int = Field(..., ge=0, le=100, description="Need assessment (0-100)")
    timeline_score: int = Field(..., ge=0, le=100, description="Timeline assessment (0-100)")


class BANTNotes(BaseModel):
    """Detailed BANT notes"""
    budget_notes: Optional[str] = Field(None, max_length=1000)
    authority_notes: Optional[str] = Field(None, max_length=1000)
    need_notes: Optional[str] = Field(None, max_length=1000)
    timeline_notes: Optional[str] = Field(None, max_length=1000)
    next_steps: Optional[str] = Field(None, max_length=2000)


class BANTAssessmentCreate(BaseModel):
    """Create BANT assessment"""
    lead_id: UUID
    budget_score: int = Field(..., ge=0, le=100)
    authority_score: int = Field(..., ge=0, le=100)
    need_score: int = Field(..., ge=0, le=100)
    timeline_score: int = Field(..., ge=0, le=100)
    budget_notes: Optional[str] = None
    authority_notes: Optional[str] = None
    need_notes: Optional[str] = None
    timeline_notes: Optional[str] = None
    next_steps: Optional[str] = None


class BANTAssessmentResponse(BaseModel):
    """BANT assessment response"""
    id: UUID
    lead_id: UUID
    user_id: UUID
    budget_score: int
    authority_score: int
    need_score: int
    timeline_score: int
    total_score: int
    traffic_light: Literal["green", "yellow", "red"]
    budget_notes: Optional[str] = None
    authority_notes: Optional[str] = None
    need_notes: Optional[str] = None
    timeline_notes: Optional[str] = None
    next_steps: Optional[str] = None
    ai_recommendations: dict[str, Any] = Field(default_factory=dict)
    assessed_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PERSONALITY PROFILE MODELS (DISG)
# ============================================================================

class PersonalityScores(BaseModel):
    """DISG personality scores"""
    dominance_score: int = Field(..., ge=0, le=100)
    influence_score: int = Field(..., ge=0, le=100)
    steadiness_score: int = Field(..., ge=0, le=100)
    conscientiousness_score: int = Field(..., ge=0, le=100)


class PersonalityProfileCreate(BaseModel):
    """Create personality profile"""
    lead_id: UUID
    dominance_score: int = Field(..., ge=0, le=100)
    influence_score: int = Field(..., ge=0, le=100)
    steadiness_score: int = Field(..., ge=0, le=100)
    conscientiousness_score: int = Field(..., ge=0, le=100)
    assessment_method: Literal["questionnaire", "ai_analysis", "manual"] = "ai_analysis"
    questionnaire_responses: Optional[dict[str, Any]] = None


class PersonalityProfileResponse(BaseModel):
    """Personality profile response"""
    id: UUID
    lead_id: UUID
    user_id: UUID
    dominance_score: int
    influence_score: int
    steadiness_score: int
    conscientiousness_score: int
    primary_type: Literal["D", "I", "S", "C"]
    secondary_type: Optional[Literal["D", "I", "S", "C"]] = None
    confidence_score: float = Field(..., ge=0, le=1)
    assessment_method: str
    communication_tips: dict[str, Any] = Field(default_factory=dict)
    ideal_pitch_style: Optional[str] = None
    objection_handling_style: Optional[str] = None
    analyzed_messages_count: int = 0
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DISGRecommendations(BaseModel):
    """DISG-based recommendations"""
    lead_id: UUID
    primary_type: Literal["D", "I", "S", "C"]
    confidence_score: float
    communication_style: dict[str, Any]
    objection_handling: dict[str, str]
    ideal_pitch_structure: list[str]
    close_technique: str
    red_flags: list[str]


# ============================================================================
# LEAD CONTEXT & MEMORY MODELS
# ============================================================================

class LeadContextCreate(BaseModel):
    """Create lead context summary"""
    lead_id: UUID
    short_summary: Optional[str] = Field(None, max_length=500)
    detailed_summary: Optional[str] = Field(None, max_length=5000)
    key_facts: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    pain_points: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    objections_raised: list[str] = Field(default_factory=list)


class LeadContextResponse(BaseModel):
    """Lead context response"""
    id: UUID
    lead_id: UUID
    user_id: UUID
    short_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    key_facts: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)
    pain_points: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    objections_raised: list[str] = Field(default_factory=list)
    first_contact_date: Optional[datetime] = None
    last_interaction_date: Optional[datetime] = None
    total_interactions: int = 0
    interaction_frequency: Optional[str] = None
    sources_count: int = 0
    generated_by: str = "ai"
    last_updated_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# AI RECOMMENDATIONS MODELS
# ============================================================================

class AIRecommendationCreate(BaseModel):
    """Create AI recommendation"""
    lead_id: Optional[UUID] = None
    type: Literal["followup", "playbook", "message_draft", "channel_switch", "assessment"]
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    reasoning: Optional[str] = Field(None, max_length=1000)
    playbook_name: Optional[str] = Field(None, max_length=100)
    suggested_action: dict[str, Any] = Field(default_factory=dict)
    triggered_by: str = "manual"
    confidence_score: float = Field(0.5, ge=0, le=1)
    expected_impact: Optional[Literal["low", "medium", "high"]] = None


class AIRecommendationResponse(BaseModel):
    """AI recommendation response"""
    id: UUID
    lead_id: Optional[UUID] = None
    user_id: UUID
    type: str
    priority: str
    title: str
    description: Optional[str] = None
    reasoning: Optional[str] = None
    suggested_action: dict[str, Any] = Field(default_factory=dict)
    playbook_name: Optional[str] = None
    triggered_by: str
    status: Literal["pending", "accepted", "dismissed", "completed"] = "pending"
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dismissed_reason: Optional[str] = None
    confidence_score: float
    expected_impact: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AIRecommendationUpdate(BaseModel):
    """Update recommendation status"""
    status: Literal["accepted", "dismissed", "completed"]
    dismissed_reason: Optional[str] = None


# ============================================================================
# COMPLIANCE MODELS
# ============================================================================

class ComplianceCheckRequest(BaseModel):
    """Request compliance check"""
    content_type: Literal["ai_message", "template", "recommendation", "script"]
    original_content: str = Field(..., min_length=1, max_length=10000)
    related_lead_id: Optional[UUID] = None


class ComplianceCheckResponse(BaseModel):
    """Compliance check result"""
    id: UUID
    violation_detected: bool
    violation_types: list[str] = Field(default_factory=list)
    severity: Optional[Literal["low", "medium", "high", "critical"]] = None
    action: str
    filtered_content: Optional[str] = None
    disclaimer_added: Optional[str] = None
    checked_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PLAYBOOK EXECUTION MODELS
# ============================================================================

class PlaybookExecutionCreate(BaseModel):
    """Start playbook execution"""
    lead_id: UUID
    playbook_name: Literal["DEAL-MEDIC", "NEURO-PROFILER", "FEUERLÖSCHER", "EMPFEHLUNGS-MASCHINE"]
    total_steps: int = Field(..., ge=1, le=20)


class PlaybookExecutionUpdate(BaseModel):
    """Update playbook execution"""
    current_step: Optional[int] = None
    steps_completed: Optional[list[dict[str, Any]]] = None
    inputs: Optional[dict[str, Any]] = None
    outputs: Optional[dict[str, Any]] = None
    status: Optional[Literal["in_progress", "completed", "abandoned"]] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None


class PlaybookExecutionResponse(BaseModel):
    """Playbook execution response"""
    id: UUID
    lead_id: UUID
    user_id: UUID
    playbook_name: str
    playbook_version: str
    status: str
    current_step: int
    total_steps: int
    steps_completed: list[dict[str, Any]] = Field(default_factory=list)
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# COACHING SESSION MODELS
# ============================================================================

class CoachingMessage(BaseModel):
    """Single coaching message"""
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CoachingSessionCreate(BaseModel):
    """Start coaching session"""
    lead_id: Optional[UUID] = None
    session_type: Literal["general", "lead_specific", "playbook", "objection_handling"]
    topic: Optional[str] = Field(None, max_length=200)


class CoachingSessionAddMessage(BaseModel):
    """Add message to coaching session"""
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=5000)


class CoachingSessionResponse(BaseModel):
    """Coaching session response"""
    id: UUID
    user_id: UUID
    lead_id: Optional[UUID] = None
    session_type: str
    topic: Optional[str] = None
    messages: list[dict[str, Any]] = Field(default_factory=list)
    message_count: int = 0
    context_loaded: dict[str, Any] = Field(default_factory=dict)
    recommendations_given: list[dict[str, Any]] = Field(default_factory=list)
    scripts_generated: list[dict[str, Any]] = Field(default_factory=list)
    playbooks_suggested: list[str] = Field(default_factory=list)
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# INTELLIGENCE SUMMARY MODELS
# ============================================================================

class LeadIntelligence(BaseModel):
    """Complete lead intelligence summary"""
    lead_id: UUID
    name: str
    email: Optional[str] = None
    status: str
    source: Optional[str] = None
    
    # BANT
    bant: dict[str, Any] = Field(default_factory=dict)
    
    # Personality
    personality: dict[str, Any] = Field(default_factory=dict)
    
    # Context
    context: dict[str, Any] = Field(default_factory=dict)
    
    # Recommendations
    pending_recommendations: list[dict[str, Any]] = Field(default_factory=list)
    
    # Intelligence Score
    intelligence_score: Literal["low", "medium", "high"] = "low"


class FollowupRecommendation(BaseModel):
    """Follow-up action recommendation"""
    lead_id: UUID
    lead_name: str
    recommended_action: str
    priority: Literal["low", "medium", "high", "urgent"]
    reasoning: str
    confidence: float = Field(..., ge=0, le=1)
    lead_status: str
    days_since_contact: float


class BestContactWindow(BaseModel):
    """Best contact window for channel"""
    channel: str
    best_hours: list[int] = Field(default_factory=list)
    best_days: list[int] = Field(default_factory=list)
    contact_rate: float
    sample_size: int
    avg_response_time_hours: Optional[float] = None


# ============================================================================
# BULK OPERATIONS
# ============================================================================

class BulkRecommendationsResponse(BaseModel):
    """Bulk recommendations response"""
    total: int
    recommendations: list[FollowupRecommendation]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class LeadMemoryUpdateRequest(BaseModel):
    """Request lead memory update"""
    lead_id: UUID
    force_refresh: bool = False


class LeadMemoryUpdateResponse(BaseModel):
    """Lead memory update response"""
    success: bool
    lead_id: UUID
    context_length: int
    sources_count: int
    updated_at: datetime


# ============================================================================
# ANALYTICS MODELS
# ============================================================================

class ScoredLead(BaseModel):
    """Scored lead from materialized view"""
    id: UUID
    user_id: UUID
    name: str
    email: Optional[str] = None
    status: str
    bant_score: Optional[int] = None
    bant_traffic_light: Optional[str] = None
    personality_type: Optional[str] = None
    personality_confidence: Optional[float] = None
    engagement_score: int
    overall_health_score: int
    health_status: Literal["excellent", "good", "needs_attention", "critical"]
    days_since_contact: float
    pending_recommendations: int
    urgent_recommendations: int
    has_complete_profile: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversionMicrosteps(BaseModel):
    """Conversion funnel micro-steps"""
    user_id: UUID
    total_leads: int
    reached_first_contact: int
    reached_bant: int
    reached_personality: int
    reached_meeting: int
    reached_won: int
    cr_to_first_contact: float
    cr_to_bant: float
    cr_to_personality: float
    cr_to_meeting: float
    cr_to_won: float
    overall_conversion_rate: float
    avg_days_to_first_contact: Optional[float] = None
    avg_days_to_bant: Optional[float] = None
    avg_days_to_meeting: Optional[float] = None
    avg_days_to_close: Optional[float] = None
    avg_total_sales_cycle_days: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class PersonalityInsights(BaseModel):
    """Personality insights analytics"""
    user_id: UUID
    count_dominant: int
    count_influence: int
    count_steadiness: int
    count_conscientiousness: int
    win_rate_dominant: Optional[float] = None
    win_rate_influence: Optional[float] = None
    win_rate_steadiness: Optional[float] = None
    win_rate_conscientiousness: Optional[float] = None
    best_performing_type: Optional[str] = None
    avg_confidence_score: float
    total_profiles: int

    model_config = ConfigDict(from_attributes=True)

