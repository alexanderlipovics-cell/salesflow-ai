"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT API SCHEMAS                                                     ║
║  Pydantic Models für Autopilot Endpoints                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class AutonomyLevelEnum(str, Enum):
    OBSERVER = "observer"
    ASSISTANT = "assistant"
    AUTOPILOT = "autopilot"
    FULL_AUTO = "full_auto"


class ChannelEnum(str, Enum):
    INSTAGRAM = "instagram"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    TELEGRAM = "telegram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    SMS = "sms"
    MANUAL = "manual"


class ActionEnum(str, Enum):
    AUTO_SEND = "auto_send"
    DRAFT_REVIEW = "draft_review"
    HUMAN_NEEDED = "human_needed"
    ARCHIVE = "archive"
    SCHEDULE = "schedule"


class IntentEnum(str, Enum):
    SIMPLE_INFO = "simple_info"
    SPECIFIC_QUESTION = "specific_question"
    PRICE_INQUIRY = "price_inquiry"
    READY_TO_BUY = "ready_to_buy"
    BOOKING_REQUEST = "booking_request"
    PRICE_OBJECTION = "price_objection"
    TIME_OBJECTION = "time_objection"
    TRUST_OBJECTION = "trust_objection"
    COMPLEX_OBJECTION = "complex_objection"
    SCHEDULING = "scheduling"
    RESCHEDULE = "reschedule"
    CANCELLATION = "cancellation"
    NOT_INTERESTED = "not_interested"
    SPAM = "spam"
    IRRELEVANT = "irrelevant"
    UNCLEAR = "unclear"


class LeadTemperatureEnum(str, Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"
    DEAD = "dead"


# ═══════════════════════════════════════════════════════════════════════════
# WEBHOOK SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class WebhookMessageContent(BaseModel):
    """Inhalt einer Webhook-Nachricht."""
    type: Literal["text", "image", "voice", "file"] = "text"
    text: str = ""
    media_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InboundWebhookPayload(BaseModel):
    """Payload für eingehende Webhook-Nachrichten."""
    channel: ChannelEnum
    external_id: str = Field(..., description="Platform message ID")
    lead_external_id: str = Field(..., description="Platform user ID")
    content: WebhookMessageContent
    timestamp: Optional[datetime] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class WebhookResponse(BaseModel):
    """Antwort auf Webhook."""
    success: bool
    message_id: Optional[str] = None
    action_taken: Optional[ActionEnum] = None
    response_sent: bool = False
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# SETTINGS SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AutopilotSettingsBase(BaseModel):
    """Basis-Schema für Autopilot Settings."""
    autonomy_level: AutonomyLevelEnum = AutonomyLevelEnum.ASSISTANT
    confidence_threshold: int = Field(90, ge=50, le=100)
    
    # Permissions
    auto_info_replies: bool = True
    auto_simple_questions: bool = True
    auto_followups: bool = True
    auto_scheduling: bool = True
    auto_calendar_booking: bool = False
    auto_price_replies: bool = False
    auto_objection_handling: bool = False
    auto_closing: bool = False
    
    # Notifications
    notify_hot_lead: bool = True
    notify_human_needed: bool = True
    notify_daily_summary: bool = True
    notify_every_action: bool = False
    
    # Working Hours
    working_hours_start: str = "09:00"
    working_hours_end: str = "20:00"
    send_on_weekends: bool = False


class AutopilotSettingsCreate(AutopilotSettingsBase):
    """Schema zum Erstellen von Settings."""
    pass


class AutopilotSettingsUpdate(BaseModel):
    """Schema zum Updaten von Settings (alle Felder optional)."""
    autonomy_level: Optional[AutonomyLevelEnum] = None
    confidence_threshold: Optional[int] = Field(None, ge=50, le=100)
    auto_info_replies: Optional[bool] = None
    auto_simple_questions: Optional[bool] = None
    auto_followups: Optional[bool] = None
    auto_scheduling: Optional[bool] = None
    auto_calendar_booking: Optional[bool] = None
    auto_price_replies: Optional[bool] = None
    auto_objection_handling: Optional[bool] = None
    auto_closing: Optional[bool] = None
    notify_hot_lead: Optional[bool] = None
    notify_human_needed: Optional[bool] = None
    notify_daily_summary: Optional[bool] = None
    notify_every_action: Optional[bool] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    send_on_weekends: Optional[bool] = None


class AutopilotSettingsResponse(AutopilotSettingsBase):
    """Response-Schema für Settings."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# LEAD OVERRIDE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class LeadOverrideMode(str, Enum):
    NORMAL = "normal"
    CAREFUL = "careful"
    AGGRESSIVE = "aggressive"
    DISABLED = "disabled"


class LeadOverrideCreate(BaseModel):
    """Schema zum Erstellen eines Lead Overrides."""
    lead_id: str
    mode: LeadOverrideMode = LeadOverrideMode.NORMAL
    reason: Optional[str] = None
    is_vip: bool = False


class LeadOverrideUpdate(BaseModel):
    """Schema zum Updaten eines Lead Overrides."""
    mode: Optional[LeadOverrideMode] = None
    reason: Optional[str] = None
    is_vip: Optional[bool] = None


class LeadOverrideResponse(BaseModel):
    """Response-Schema für Lead Override."""
    id: str
    lead_id: str
    mode: LeadOverrideMode
    reason: Optional[str]
    is_vip: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════════════════
# DRAFT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class DraftStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EDITED = "edited"


class DraftResponse(BaseModel):
    """Response-Schema für Drafts."""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    content: str
    intent: str
    status: DraftStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class DraftApproveRequest(BaseModel):
    """Request zum Genehmigen eines Drafts."""
    edited_content: Optional[str] = None  # Falls editiert


class DraftListResponse(BaseModel):
    """Liste von Drafts."""
    drafts: List[DraftResponse]
    total: int
    pending_count: int


# ═══════════════════════════════════════════════════════════════════════════
# ACTION LOG SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ActionLogResponse(BaseModel):
    """Response-Schema für Action Logs."""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    action: ActionEnum
    intent: IntentEnum
    confidence_score: int
    response_sent: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActionLogListResponse(BaseModel):
    """Liste von Action Logs."""
    actions: List[ActionLogResponse]
    total: int
    
    # Stats
    auto_sent_count: int
    draft_count: int
    human_needed_count: int


# ═══════════════════════════════════════════════════════════════════════════
# BRIEFING SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TodayTask(BaseModel):
    """Eine Aufgabe für heute."""
    type: str
    priority: Literal["high", "medium", "low"]
    description: str
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None


class MorningBriefingResponse(BaseModel):
    """Response für Morning Briefing."""
    date: str
    overnight_messages: int
    auto_replied: int
    drafts_pending: int
    human_needed: int
    auto_booked_appointments: int
    new_hot_leads: int
    ready_to_close: int
    estimated_pipeline_value: float
    today_tasks: List[TodayTask]
    estimated_user_time_minutes: int
    greeting_message: str


class EveningSummaryResponse(BaseModel):
    """Response für Evening Summary."""
    date: str
    total_messages_sent: int
    auto_replies: int
    followups_sent: int
    user_approved: int
    new_replies_received: int
    appointments_booked: int
    deals_closed: int
    revenue: float
    user_time_minutes: int
    estimated_manual_time_minutes: int
    time_saved_minutes: int
    tomorrow_preview: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# STATS SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AutopilotStatsResponse(BaseModel):
    """Autopilot Performance Stats."""
    period: str  # "today", "week", "month"
    
    # Volume
    total_inbound: int
    total_processed: int
    
    # Actions
    auto_sent: int
    drafts_created: int
    human_needed: int
    archived: int
    
    # Rates
    auto_rate: float  # % auto-gesendet
    success_rate: float  # % positive Outcomes
    
    # Time Saved
    estimated_time_saved_minutes: int
    
    # Confidence
    avg_confidence_score: float
    confidence_distribution: Dict[str, int]  # {"90-100": 50, "80-90": 30, ...}


class ConfidenceBreakdownResponse(BaseModel):
    """Aufschlüsselung eines Confidence Scores."""
    knowledge_match: int
    intent_clarity: int
    response_fit: int
    risk_assessment: int
    total: int


class ProcessingDetailResponse(BaseModel):
    """Detaillierte Info über eine Verarbeitung."""
    lead_id: str
    lead_name: str
    channel: ChannelEnum
    incoming_message: str
    
    # Analysis
    detected_intent: IntentEnum
    intent_confidence: float
    lead_temperature: LeadTemperatureEnum
    sentiment: str
    urgency: str
    
    # Decision
    action: ActionEnum
    confidence_score: int
    confidence_breakdown: ConfidenceBreakdownResponse
    reasoning: str
    
    # Response
    response_message: Optional[str]
    response_sent: bool
    
    # Next Steps
    follow_up_scheduled: bool
    follow_up_date: Optional[datetime]
    
    created_at: datetime

