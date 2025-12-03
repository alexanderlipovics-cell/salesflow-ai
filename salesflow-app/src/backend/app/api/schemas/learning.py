# backend/app/api/schemas/learning.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LEARNING SCHEMAS                                                          ║
║  Template-Performance & Analytics                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Schemas für:
- Learning Events (Template-Nutzung tracken)
- Learning Aggregates (Performance-Metriken)
- Template Analytics (Top Templates, Trends)
"""

from datetime import datetime, date
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class LearningEventType(str, Enum):
    """Typ des Learning Events."""
    template_used = "template_used"
    template_edited = "template_edited"
    response_received = "response_received"
    positive_outcome = "positive_outcome"
    negative_outcome = "negative_outcome"
    objection_handled = "objection_handled"
    follow_up_sent = "follow_up_sent"


class OutcomeType(str, Enum):
    """Typ des Outcomes."""
    appointment_booked = "appointment_booked"
    deal_closed = "deal_closed"
    info_sent = "info_sent"
    follow_up_scheduled = "follow_up_scheduled"
    objection_overcome = "objection_overcome"
    no_response = "no_response"
    rejected = "rejected"
    ghosted = "ghosted"


class TemplateCategory(str, Enum):
    """Kategorie des Templates."""
    first_contact = "first_contact"
    follow_up = "follow_up"
    reactivation = "reactivation"
    objection_handler = "objection_handler"
    closing = "closing"
    appointment_booking = "appointment_booking"
    info_request = "info_request"
    custom = "custom"


class AggregateType(str, Enum):
    """Zeitraum für Aggregationen."""
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class TrendDirection(str, Enum):
    """Trend-Richtung."""
    improving = "improving"
    declining = "declining"
    stable = "stable"


# ═══════════════════════════════════════════════════════════════════════════
# LEARNING EVENT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class LearningEventCreate(BaseModel):
    """Request zum Erstellen eines Learning Events."""
    event_type: LearningEventType = Field(
        ...,
        description="Typ des Events"
    )
    template_id: Optional[str] = Field(
        None,
        description="Template ID falls verwendet"
    )
    lead_id: Optional[str] = Field(
        None,
        description="Lead ID falls relevant"
    )
    channel: Optional[str] = Field(
        None,
        max_length=50,
        description="Kanal: instagram, whatsapp, etc."
    )
    message_text: Optional[str] = Field(
        None,
        max_length=5000,
        description="Gesendete Nachricht (wird anonymisiert)"
    )
    response_received: bool = Field(
        default=False,
        description="Wurde eine Antwort erhalten?"
    )
    response_time_hours: Optional[float] = Field(
        None,
        ge=0,
        description="Zeit bis zur Antwort in Stunden"
    )
    outcome: Optional[OutcomeType] = Field(
        None,
        description="Ergebnis des Kontakts"
    )
    outcome_value: Optional[float] = Field(
        None,
        ge=0,
        description="Wert des Outcomes (z.B. Deal-Wert)"
    )
    converted_to_next_stage: bool = Field(
        default=False,
        description="In nächste Funnel-Stage konvertiert?"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Zusätzliche Metadaten"
    )


class LearningEventResponse(BaseModel):
    """Response für ein Learning Event."""
    id: str
    company_id: str
    user_id: str
    event_type: LearningEventType
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    template_category: Optional[TemplateCategory] = None
    lead_id: Optional[str] = None
    channel: Optional[str] = None
    response_received: bool = False
    outcome: Optional[OutcomeType] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# TEMPLATE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TemplateCreate(BaseModel):
    """Request zum Erstellen eines Templates."""
    name: str = Field(..., min_length=1, max_length=200)
    category: TemplateCategory = Field(default=TemplateCategory.custom)
    content: str = Field(..., min_length=1, max_length=5000)
    target_channel: Optional[str] = Field(None, max_length=50)
    target_temperature: Optional[str] = Field(None, max_length=20)
    target_stage: Optional[str] = Field(None, max_length=50)
    tags: List[str] = Field(default_factory=list)
    is_shared: bool = Field(default=False)


class TemplateResponse(BaseModel):
    """Response für ein Template."""
    id: str
    company_id: str
    name: str
    category: TemplateCategory
    content: str
    target_channel: Optional[str] = None
    target_temperature: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True
    is_shared: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateWithPerformance(TemplateResponse):
    """Template mit Performance-Daten."""
    total_uses: int = 0
    response_rate: float = 0.0
    conversion_rate: float = 0.0
    quality_score: float = 50.0
    trend: TrendDirection = TrendDirection.stable
    last_used_at: Optional[datetime] = None


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TemplatePerformanceStats(BaseModel):
    """Performance-Statistiken für ein Template."""
    template_id: str
    template_name: str
    category: TemplateCategory
    
    # Lifetime Stats
    total_uses: int = 0
    total_responses: int = 0
    total_conversions: int = 0
    response_rate: float = 0.0  # Prozent
    conversion_rate: float = 0.0  # Prozent
    
    # Last 30 Days
    uses_last_30d: int = 0
    response_rate_30d: float = 0.0
    conversion_rate_30d: float = 0.0
    
    # Quality & Trend
    quality_score: float = 50.0
    trend: TrendDirection = TrendDirection.stable


class TopTemplatesResponse(BaseModel):
    """Response für Top-Templates."""
    templates: List[TemplatePerformanceStats]
    period_days: int = 30
    total_templates: int = 0


class ChannelBreakdown(BaseModel):
    """Breakdown nach Channel."""
    channel: str
    sent: int = 0
    responses: int = 0
    response_rate: float = 0.0
    conversions: int = 0
    conversion_rate: float = 0.0


class CategoryBreakdown(BaseModel):
    """Breakdown nach Template-Kategorie."""
    category: TemplateCategory
    templates_used: int = 0
    total_uses: int = 0
    avg_response_rate: float = 0.0
    avg_conversion_rate: float = 0.0


class LearningAggregateResponse(BaseModel):
    """Response für Learning Aggregates."""
    aggregate_type: AggregateType
    period_start: date
    period_end: date
    
    # Volume Metrics
    total_events: int = 0
    templates_used: int = 0
    unique_leads: int = 0
    
    # Response Metrics
    responses_received: int = 0
    response_rate: float = 0.0
    avg_response_time_hours: Optional[float] = None
    
    # Conversion Metrics
    positive_outcomes: int = 0
    negative_outcomes: int = 0
    conversion_rate: float = 0.0
    
    # Outcomes
    appointments_booked: int = 0
    deals_closed: int = 0
    total_deal_value: float = 0.0
    
    # Breakdowns
    channel_breakdown: List[ChannelBreakdown] = []
    category_breakdown: List[CategoryBreakdown] = []
    top_templates: List[TemplatePerformanceStats] = []


# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsKPI(BaseModel):
    """Ein einzelner KPI für das Dashboard."""
    id: str
    label: str
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    trend: TrendDirection = TrendDirection.stable
    unit: str = ""  # "%", "€", "Stunden", etc.


class AnalyticsDashboardResponse(BaseModel):
    """Response für das Analytics Dashboard."""
    period: str  # "last_7d", "last_30d", "this_month"
    period_start: date
    period_end: date
    
    # KPIs
    kpis: List[AnalyticsKPI] = []
    
    # Aggregates
    daily_aggregates: List[LearningAggregateResponse] = []
    
    # Top Performers
    top_templates: List[TemplatePerformanceStats] = []
    
    # Breakdowns
    channel_breakdown: List[ChannelBreakdown] = []
    category_breakdown: List[CategoryBreakdown] = []


# ═══════════════════════════════════════════════════════════════════════════
# CHIEF INTEGRATION SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TemplateInsight(BaseModel):
    """Ein Insight über Templates für CHIEF."""
    type: str  # "recommendation", "warning", "tip"
    message: str
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    action_suggestion: Optional[str] = None


class ChiefTemplateInsightsResponse(BaseModel):
    """Template-Insights für CHIEF Kontext."""
    insights: List[TemplateInsight] = []
    top_template: Optional[TemplatePerformanceStats] = None
    worst_template: Optional[TemplatePerformanceStats] = None
    improvement_opportunity: Optional[str] = None
    weekly_summary: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST QUERY PARAMS
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsQueryParams(BaseModel):
    """Query-Parameter für Analytics-Requests."""
    period: str = Field(
        default="last_30d",
        description="Zeitraum: last_7d, last_30d, this_month, last_month"
    )
    category: Optional[TemplateCategory] = Field(
        None,
        description="Nach Kategorie filtern"
    )
    channel: Optional[str] = Field(
        None,
        description="Nach Channel filtern"
    )
    user_id: Optional[str] = Field(
        None,
        description="Nach User filtern (nur für Admins/Leader)"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Anzahl Ergebnisse"
    )


# ═══════════════════════════════════════════════════════════════════════════
# CONVENIENCE SCHEMAS (für /learning Routes)
# ═══════════════════════════════════════════════════════════════════════════

class LogLearningEventRequest(BaseModel):
    """Request zum Loggen eines Learning Events."""
    event_type: str = Field(..., description="Event-Type (message_sent, message_replied, etc.)")
    lead_id: Optional[str] = None
    template_id: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LogLearningEventResponse(BaseModel):
    """Response nach Event-Logging."""
    success: bool = True
    event_id: Optional[str] = None
    message: Optional[str] = None


class LogMessageSentRequest(BaseModel):
    """Request für 'Nachricht gesendet' Event."""
    lead_id: str
    template_id: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    was_edited: bool = False
    message_preview: Optional[str] = None


class LogReplyReceivedRequest(BaseModel):
    """Request für 'Antwort erhalten' Event."""
    lead_id: str
    is_positive: Optional[bool] = None
    response_time_hours: Optional[float] = None
    template_id: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None


class LogDealOutcomeRequest(BaseModel):
    """Request für Deal-Outcome Event."""
    lead_id: str
    won: bool
    template_id: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    deal_value: Optional[float] = None


class TemplateStatsEntry(BaseModel):
    """Stats-Eintrag für ein Template."""
    template_id: str
    name: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    events_sent: int = 0
    events_replied: int = 0
    events_positive: int = 0
    events_won: int = 0
    reply_rate: Optional[float] = None
    win_rate: Optional[float] = None


class ChannelStatsEntry(BaseModel):
    """Stats-Eintrag für einen Channel."""
    channel: str
    events_sent: int = 0
    events_replied: int = 0
    events_won: int = 0
    reply_rate: Optional[float] = None
    win_rate: Optional[float] = None


class TopTemplateForChief(BaseModel):
    """Top-Template für CHIEF Context."""
    template_id: str
    name: Optional[str] = None
    channel: Optional[str] = None
    vertical_id: Optional[str] = None
    preview: Optional[str] = None
    stats: Optional[TemplateStatsEntry] = None