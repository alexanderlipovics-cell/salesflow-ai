"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PULSE TRACKER & BEHAVIORAL INTELLIGENCE SCHEMAS v2.1                     ║
║  Pydantic Models für API Requests & Responses                              ║
║                                                                            ║
║  NEU v2.1:                                                                ║
║  - MessageIntent (intro, discovery, pitch, scheduling, closing, etc.)     ║
║  - GhostType (soft, hard)                                                 ║
║  - Dynamic Timing & Thresholds                                            ║
║  - A/B Testing by Behavioral Profile                                      ║
║  - Intent-based Funnel Analytics                                          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class MessageStatus(str, Enum):
    sent = "sent"
    delivered = "delivered"
    seen = "seen"
    replied = "replied"
    ghosted = "ghosted"
    invisible = "invisible"
    stale = "stale"
    skipped = "skipped"


# NEU v2.1: Message Intent
class MessageIntent(str, Enum):
    intro = "intro"              # Erste Kontaktaufnahme
    discovery = "discovery"      # Bedarfsermittlung, Fragen stellen
    pitch = "pitch"              # Produkt/Opportunity präsentieren
    scheduling = "scheduling"    # Termin vereinbaren
    closing = "closing"          # Abschluss-Versuch
    follow_up = "follow_up"      # Nach-fassen
    reactivation = "reactivation"  # Ghost reaktivieren


# NEU v2.1: Ghost Type
class GhostType(str, Enum):
    soft = "soft"    # Kürzlich gesehen, evtl. busy
    hard = "hard"    # Lang gesehen, ignoriert aktiv


class FollowUpStrategy(str, Enum):
    none = "none"
    ghost_buster = "ghost_buster"
    cross_channel = "cross_channel"
    value_add = "value_add"
    story_reply = "story_reply"
    voice_note = "voice_note"
    direct_ask = "direct_ask"
    takeaway = "takeaway"


class ContactMood(str, Enum):
    enthusiastic = "enthusiastic"
    positive = "positive"
    neutral = "neutral"
    cautious = "cautious"
    stressed = "stressed"
    skeptical = "skeptical"
    annoyed = "annoyed"
    unknown = "unknown"


class DecisionTendency(str, Enum):
    leaning_yes = "leaning_yes"
    leaning_no = "leaning_no"
    undecided = "undecided"
    deferred = "deferred"
    committed = "committed"
    rejected = "rejected"


# =============================================================================
# OUTREACH MESSAGE SCHEMAS
# =============================================================================

class CreateOutreachRequest(BaseModel):
    """Request zum Erstellen einer Outreach-Nachricht"""
    
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    message_text: str
    channel: str
    message_type: str = "initial"
    template_id: Optional[str] = None
    template_variant: Optional[str] = None
    
    # NEU v2.1: Message Intent
    intent: MessageIntent = MessageIntent.follow_up
    
    # Optional: Sofort Status setzen
    initial_status: MessageStatus = MessageStatus.sent


class UpdateStatusRequest(BaseModel):
    """Request zum Updaten des Nachrichtenstatus"""
    
    status: MessageStatus
    seen_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    
    # Optional: Quelle der Info
    status_source: str = "manual"


class BulkStatusUpdateRequest(BaseModel):
    """Request für Bulk-Update von Check-ins"""
    
    outreach_ids: List[str]
    status: MessageStatus


class BulkSkipRequest(BaseModel):
    """Request zum Überspringen mehrerer Check-ins"""
    
    outreach_ids: List[str]


class OutreachResponse(BaseModel):
    """Response für eine Outreach-Nachricht"""
    
    id: str
    user_id: str
    lead_id: Optional[str] = None
    message_text: str
    message_type: str
    channel: str
    status: MessageStatus
    status_updated_at: Optional[datetime] = None
    sent_at: datetime
    seen_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    check_in_due_at: Optional[datetime] = None
    check_in_completed: bool = False
    suggested_strategy: Optional[FollowUpStrategy] = None
    suggested_follow_up_text: Optional[str] = None
    response_time_hours: Optional[float] = None
    created_at: datetime
    
    # NEU v2.1
    intent: Optional[MessageIntent] = None
    ghost_type: Optional[GhostType] = None
    ghost_detected_at: Optional[datetime] = None
    check_in_hours_used: Optional[int] = None  # Dynamische Check-in Zeit


class CheckInItem(BaseModel):
    """Ein Check-in Item für die Queue"""
    
    outreach_id: str
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    message_text: str
    channel: str
    sent_at: datetime
    hours_since_sent: float
    priority: int = 3
    reminder_count: int = 0
    
    # Suggested Actions
    status_options: List[Dict[str, str]] = [
        {"status": "replied", "label": "✅ Antwort erhalten", "icon": "checkmark-circle"},
        {"status": "seen", "label": "👁️ Gelesen, keine Antwort", "icon": "eye"},
        {"status": "invisible", "label": "🔕 Nicht gelesen", "icon": "eye-off"},
    ]


class CheckInSummary(BaseModel):
    """Zusammenfassung der Check-ins für Dashboard/Briefing"""
    
    total_pending: int
    urgent: int  # Priority 1
    important: int  # Priority 2
    normal: int  # Priority 3
    estimated_time_minutes: float
    xp_reward: int


# =============================================================================
# BEHAVIORAL ANALYSIS SCHEMAS
# =============================================================================

class BehaviorAnalysisResult(BaseModel):
    """Ergebnis der Verhaltensanalyse"""
    
    # Emotion & Mood
    current_mood: ContactMood
    mood_confidence: float = Field(ge=0, le=1)
    sentiment_trajectory: Optional[str] = None
    mood_indicators: List[str] = []
    
    # Engagement
    engagement_level: int = Field(ge=1, le=5)
    avg_response_time_hours: Optional[float] = None
    asks_questions: bool = False
    proactive_contact: bool = False
    uses_emojis: bool = False
    engagement_trajectory: Optional[str] = None
    
    # Decision
    decision_tendency: DecisionTendency
    commitment_strength: int = Field(ge=1, le=5)
    objections_raised: List[str] = []
    buying_signals: List[str] = []
    hesitation_signals: List[str] = []
    
    # Trust
    trust_level: int = Field(ge=1, le=5)
    risk_flags: List[str] = []
    risk_descriptions: Dict[str, str] = {}
    
    # Coherence
    reliability_score: int = Field(ge=1, le=5)
    coherence_notes: Optional[str] = None
    words_vs_behavior: Optional[str] = None
    
    # Style
    communication_style: Optional[str] = None
    preferred_channel: Optional[str] = None
    formality: Optional[str] = None
    
    # Recommendations
    recommended_approach: str
    recommended_tone: str
    recommended_message_length: str
    recommended_timing: Optional[str] = None
    recommended_next_action: Optional[str] = None
    avoid: List[str] = []
    do_this: List[str] = []
    
    # Key Insights
    key_insights: List[str] = []


class AnalyzeBehaviorRequest(BaseModel):
    """Request für Verhaltensanalyse"""
    
    lead_id: str
    chat_text: str
    context: Optional[Dict[str, Any]] = None


class BehaviorProfileResponse(BaseModel):
    """Vollständiges Verhaltensprofil eines Leads"""
    
    lead_id: str
    lead_name: Optional[str] = None
    
    # Analysis
    analysis: BehaviorAnalysisResult
    
    # History
    mood_history: List[Dict[str, Any]] = []
    
    # Stats
    total_messages_sent: int = 0
    total_replies: int = 0
    response_rate: float = 0
    appointments_scheduled: int = 0
    appointments_kept: int = 0
    
    # Last Update
    last_analyzed_at: Optional[datetime] = None


# =============================================================================
# GHOST BUSTER SCHEMAS
# =============================================================================

class GhostLeadResponse(BaseModel):
    """Ein Ghost-Lead für die Ghost-Buster Liste"""
    
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    last_message_text: str
    channel: str
    seen_at: Optional[datetime] = None
    hours_ghosted: float
    
    # NEU v2.1: Ghost Classification
    ghost_type: GhostType = GhostType.soft
    dynamic_threshold_hours: int = 48  # Personalisierte Schwelle
    
    # Behavior Context
    behavior_mood: ContactMood = ContactMood.unknown
    behavior_decision: DecisionTendency = DecisionTendency.undecided
    
    # Suggestions
    suggested_strategy: Optional[FollowUpStrategy] = None
    suggested_templates: List[Dict[str, Any]] = []
    
    # NEU v2.1: Strategy based on ghost type
    ghost_strategy_hint: Optional[str] = None  # "Sanfter Check-in" vs "Pattern Interrupt"


class GhostBusterSuggestion(BaseModel):
    """Vorschlag für Ghost-Buster Aktion"""
    
    strategy: FollowUpStrategy
    template_id: Optional[str] = None
    template_text: str
    
    reasoning: str
    confidence: float = Field(ge=0, le=1)
    
    # For Cross-Channel
    cross_channel_action: Optional[str] = None


class SendGhostBusterRequest(BaseModel):
    """Request zum Senden einer Ghost-Buster Nachricht"""
    
    template_text: str
    strategy: FollowUpStrategy = FollowUpStrategy.ghost_buster
    custom_context: Optional[str] = None


class GhostBusterTemplateResponse(BaseModel):
    """Ghost Buster Template"""
    
    id: str
    name: str
    template_text: str
    template_text_short: Optional[str] = None
    strategy: FollowUpStrategy
    tone: Optional[str] = None
    works_for_mood: List[ContactMood] = []
    works_for_decision: List[DecisionTendency] = []
    days_since_ghost: Optional[int] = None
    example_context: Optional[str] = None
    success_rate: Optional[float] = None


# =============================================================================
# CONVERSION FUNNEL SCHEMAS
# =============================================================================

class ConversionFunnelResponse(BaseModel):
    """Conversion Funnel Metriken"""
    
    date: date
    
    # Outreach
    messages_sent: int = 0
    unique_leads_contacted: int = 0
    
    # Visibility
    messages_seen: int = 0
    messages_not_seen: int = 0
    open_rate: float = 0
    
    # Response
    messages_replied: int = 0
    reply_rate: float = 0
    
    # Ghosting
    messages_ghosted: int = 0
    ghost_rate: float = 0
    
    # Recovery
    ghosts_reactivated: int = 0
    ghost_buster_rate: float = 0
    
    # Unconfirmed
    messages_unconfirmed: int = 0
    messages_stale: int = 0
    messages_skipped: int = 0
    
    # Data Quality
    check_in_completion_rate: float = 0
    data_quality_score: int = 0
    
    # Outcomes
    appointments_set: int = 0
    sales_made: int = 0
    
    # Channel Breakdown
    channel_breakdown: Dict[str, Dict[str, int]] = {}


class AccurateFunnelResponse(BaseModel):
    """Funnel mit Unterscheidung bestätigt/unbestätigt"""
    
    date: str
    
    # Confirmed
    confirmed_sent: int = 0
    confirmed_seen: int = 0
    confirmed_replied: int = 0
    confirmed_ghosted: int = 0
    confirmed_invisible: int = 0
    
    # Unconfirmed
    unconfirmed_count: int = 0
    stale_count: int = 0
    skipped_count: int = 0
    
    # Rates
    confirmed_open_rate: float = 0
    confirmed_reply_rate: float = 0
    confirmed_ghost_rate: float = 0
    
    # Data Quality
    check_in_completion_rate: float = 0
    data_quality_score: int = 0


class FunnelInsightsResponse(BaseModel):
    """AI-generierte Insights zum Funnel"""
    
    # Key Metrics
    overall_health: str  # 'good', 'warning', 'critical'
    health_score: int = Field(ge=0, le=100)
    
    # Insights
    top_issue: Optional[str] = None
    top_opportunity: Optional[str] = None
    
    # Metrics
    metrics: Dict[str, float] = {}
    
    # Recommendations
    recommendations: List[Dict[str, str]] = []
    
    # Comparisons
    vs_last_week: Dict[str, float] = {}
    vs_average: Dict[str, float] = {}


# =============================================================================
# INTENT CORRECTION SCHEMAS
# =============================================================================

class IntentCorrectionRequest(BaseModel):
    """Request für Intent-Korrektur (Training)"""
    
    query_text: str
    detected_intent: str
    corrected_intent: str
    detected_objection: Optional[str] = None
    corrected_objection: Optional[str] = None
    reason: Optional[str] = None


class IntentCorrectionResponse(BaseModel):
    """Response für Intent-Korrektur"""
    
    success: bool
    message: str


# =============================================================================
# ANALYTICS SCHEMAS
# =============================================================================

class CheckinComplianceItem(BaseModel):
    """Check-in Compliance pro Tag"""
    
    date: date
    total_sent: int
    checked_in: int
    skipped: int
    stale: int
    completion_rate: float


class GhostBusterEffectivenessItem(BaseModel):
    """Ghost-Buster Effektivität pro Strategie"""
    
    strategy: str
    times_used: int
    successful: int
    success_rate: float


# =============================================================================
# NEU v2.1: INTENT FUNNEL SCHEMAS
# =============================================================================

class IntentFunnelItem(BaseModel):
    """Funnel-Metriken für einen Intent"""
    
    intent: MessageIntent
    sent_count: int
    seen_count: int
    replied_count: int
    ghosted_count: int
    reply_rate: float
    ghost_rate: float
    
    # Performance Level
    performance_level: Optional[str] = None  # 'strong', 'average', 'weak'


class IntentFunnelResponse(BaseModel):
    """Kompletter Intent-basierter Funnel"""
    
    start_date: date
    end_date: date
    intents: List[IntentFunnelItem]
    
    # Overall
    total_sent: int = 0
    overall_reply_rate: float = 0
    
    # Best/Worst
    best_intent: Optional[MessageIntent] = None
    worst_intent: Optional[MessageIntent] = None


class IntentCoachingInsight(BaseModel):
    """Intent-basiertes Coaching Insight"""
    
    intent: MessageIntent
    sent_count: int
    reply_rate: float
    performance_level: str  # 'strong', 'average', 'weak'
    coaching_tip: str


class IntentCoachingResponse(BaseModel):
    """Alle Intent-basierten Coaching Insights"""
    
    insights: List[IntentCoachingInsight]
    overall_message: Optional[str] = None


# =============================================================================
# NEU v2.1: DYNAMIC TIMING SCHEMAS
# =============================================================================

class DynamicTimingInfo(BaseModel):
    """Dynamische Timing-Informationen für einen Lead"""
    
    lead_id: str
    avg_response_time_hours: Optional[float] = None
    engagement_level: int = 3
    
    # Berechnete Werte
    predicted_check_in_hours: int = 24
    predicted_ghost_threshold_hours: int = 48
    
    # Response Time Trend
    response_time_trend: Optional[str] = None  # 'faster', 'stable', 'slower'


class SmartInferenceResult(BaseModel):
    """Ergebnis der Smart Status Inference"""
    
    outreach_id: str
    old_status: MessageStatus
    new_status: MessageStatus
    inference_reason: str
    was_auto_inferred: bool = True


class SmartInferenceRequest(BaseModel):
    """Request für Smart Status Inference aus Chat-Import"""
    
    lead_id: str
    latest_sender: str  # 'lead' oder 'user'
    has_unread_from_lead: bool = False


# =============================================================================
# NEU v2.1: A/B TESTING BY PROFILE SCHEMAS
# =============================================================================

class TemplateVariantPerformance(BaseModel):
    """Performance einer Template-Variante"""
    
    variant: str
    sent: int = 0
    seen: int = 0
    replied: int = 0
    reply_rate: float = 0


class TemplatePerformanceByMood(BaseModel):
    """Template-Performance aufgeschlüsselt nach Lead-Mood"""
    
    variant: str
    mood_performance: Dict[str, TemplateVariantPerformance] = {}
    # z.B. {"enthusiastic": {...}, "cautious": {...}}


class BestTemplateRecommendation(BaseModel):
    """Empfehlung für beste Template-Variante für einen Lead"""
    
    lead_id: str
    lead_mood: ContactMood
    recommended_variant: str
    expected_reply_rate: float
    reasoning: str


class CampaignPerformanceByProfile(BaseModel):
    """Kampagnen-Performance aufgeschlüsselt nach Behavioral Profile"""
    
    campaign_id: str
    campaign_name: str
    
    # Overall
    total_sent: int = 0
    overall_reply_rate: float = 0
    
    # Per Variant
    variant_performance: Dict[str, TemplateVariantPerformance] = {}
    
    # Per Variant BY Mood (NEU v2.1)
    variant_performance_by_mood: Dict[str, Dict[str, TemplateVariantPerformance]] = {}
    
    # Winning Variant per Mood
    best_variant_per_mood: Dict[str, str] = {}
    # z.B. {"enthusiastic": "A", "cautious": "B"}


# =============================================================================
# NEU v2.1: SOFT VS HARD GHOSTING SCHEMAS
# =============================================================================

class GhostClassificationRequest(BaseModel):
    """Request zur Ghost-Klassifizierung"""
    
    outreach_id: str
    lead_was_online_since: Optional[bool] = None
    lead_posted_since: Optional[bool] = None


class GhostClassificationResponse(BaseModel):
    """Response der Ghost-Klassifizierung"""
    
    outreach_id: str
    ghost_type: GhostType
    hours_since_seen: float
    
    # Strategy Recommendation
    recommended_strategy: FollowUpStrategy
    strategy_reasoning: str
    
    # Templates für diesen Ghost-Typ
    suggested_templates: List[Dict[str, Any]] = []


class GhostStatsByType(BaseModel):
    """Ghost-Statistiken nach Typ"""
    
    soft_ghosts: int = 0
    hard_ghosts: int = 0
    soft_reactivation_rate: float = 0
    hard_reactivation_rate: float = 0


# =============================================================================
# NEU v2.1: CAMPAIGN SCHEMAS (ERWEITERT)
# =============================================================================

class CreateCampaignRequest(BaseModel):
    """Request zum Erstellen einer A/B Test Kampagne"""
    
    name: str
    description: Optional[str] = None
    
    template_variants: List[Dict[str, str]]
    # [{"variant": "A", "text": "..."}, {"variant": "B", "text": "..."}]
    
    target_channel: Optional[str] = None
    target_intent: Optional[MessageIntent] = None  # NEU v2.1
    target_lead_status: Optional[List[str]] = None


class CampaignResponse(BaseModel):
    """Response für eine Kampagne"""
    
    id: str
    name: str
    description: Optional[str] = None
    template_variants: List[Dict[str, str]]
    
    target_channel: Optional[str] = None
    target_intent: Optional[MessageIntent] = None
    
    # Status
    status: str = "draft"
    messages_sent: int = 0
    messages_replied: int = 0
    
    # Performance
    variant_performance: Dict[str, TemplateVariantPerformance] = {}
    variant_performance_by_mood: Dict[str, Dict[str, Any]] = {}  # NEU v2.1
    
    created_at: datetime
    started_at: Optional[datetime] = None

