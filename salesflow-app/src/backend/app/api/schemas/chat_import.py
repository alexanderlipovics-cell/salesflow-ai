# backend/app/api/schemas/chat_import.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHAT IMPORT SCHEMAS V2                                                    ║
║  Erweiterte Lead-Extraktion mit Conversation Intelligence                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Vollständige Chat-Analyse mit Claude
- Template Extraction
- Objection Detection
- Seller Style Analysis
- Learning Case Integration
"""

from enum import Enum
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════

class Channel(str, Enum):
    whatsapp = "whatsapp"
    instagram_dm = "instagram_dm"
    facebook_messenger = "facebook_messenger"
    email = "email"
    sms = "sms"
    linkedin = "linkedin"
    telegram = "telegram"
    other = "other"


class LeadStatus(str, Enum):
    cold = "cold"
    warm = "warm"
    hot = "hot"
    customer = "customer"
    lost = "lost"
    unknown = "unknown"


class DealState(str, Enum):
    none = "none"
    considering = "considering"
    pending_payment = "pending_payment"
    paid = "paid"
    on_hold = "on_hold"
    lost = "lost"


class ActionType(str, Enum):
    no_action = "no_action"
    follow_up_message = "follow_up_message"
    call = "call"
    check_payment = "check_payment"
    reactivation_follow_up = "reactivation_follow_up"
    send_info = "send_info"
    schedule_meeting = "schedule_meeting"
    wait_for_lead = "wait_for_lead"
    custom = "custom"


class ObjectionType(str, Enum):
    price = "price"
    time = "time"
    think_about_it = "think_about_it"
    not_interested = "not_interested"
    competitor = "competitor"
    trust = "trust"
    need = "need"
    authority = "authority"
    other = "other"


class MessageIntent(str, Enum):
    greeting = "greeting"
    question = "question"
    answer = "answer"
    objection = "objection"
    interest = "interest"
    commitment = "commitment"
    rejection = "rejection"
    closing = "closing"
    small_talk = "small_talk"


class LeadTemperature(str, Enum):
    """Temperatur des Leads (Legacy-Kompatibilität)."""
    cold = "cold"
    warm = "warm"
    hot = "hot"


class ChatChannel(str, Enum):
    """Legacy-Kompatibilität."""
    instagram = "instagram"
    facebook = "facebook"
    whatsapp = "whatsapp"
    telegram = "telegram"
    linkedin = "linkedin"
    other = "other"


class NextStepType(str, Enum):
    """Legacy-Kompatibilität."""
    follow_up = "follow_up"
    introduce_offer = "introduce_offer"
    book_call = "book_call"
    send_info = "send_info"
    close = "close"
    wait = "wait"


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ChatImportRequest(BaseModel):
    """Request für Chat-Import (V2)"""
    
    raw_text: str = Field(..., min_length=10, description="Vollständiger Chatverlauf")
    
    # Optional Context
    channel: Optional[Channel] = None
    vertical_id: Optional[str] = None
    company_id: Optional[str] = None
    
    # Existing Lead?
    existing_lead_id: Optional[str] = None
    
    # Import Settings
    language: str = "de"
    extract_templates: bool = True
    extract_objections: bool = True
    create_contact_plan: bool = True
    
    # Learning Case?
    save_as_learning_case: bool = False
    learning_case_goal: Optional[str] = None
    learning_case_outcome: Optional[str] = None


class ImportFromChatRequest(BaseModel):
    """Request für Chat-Import (Legacy V1)."""
    raw_chat: str = Field(
        ...,
        min_length=10,
        max_length=50000,
        description="Rohtext des Chatverlaufs"
    )
    channel: ChatChannel = Field(
        ...,
        description="Quelle des Chats"
    )
    user_role_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Wie der User im Chat heißt"
    )
    language_hint: str = Field(
        default="de",
        description="Sprachhinweis für bessere Analyse"
    )
    company_id: Optional[str] = Field(
        None,
        description="Company ID für Lead-Zuordnung"
    )
    
    @field_validator('raw_chat')
    @classmethod
    def validate_chat(cls, v: str) -> str:
        lines = v.strip().split('\n')
        if len(lines) < 2:
            raise ValueError('Chat muss mindestens 2 Zeilen haben')
        return v.strip()


class BatchImportRequest(BaseModel):
    """Request für Batch-Import mehrerer Gespräche"""
    
    conversations: List[ChatImportRequest]
    import_name: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS RESULT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ParsedMessage(BaseModel):
    """Einzelne geparste Nachricht"""
    
    sender_type: str                    # 'user', 'lead'
    sender_name: Optional[str] = None
    content: str
    sent_at: Optional[datetime] = None
    sequence_number: int
    
    # Analysis
    intent: Optional[MessageIntent] = None
    objection_type: Optional[ObjectionType] = None
    sentiment: Optional[str] = None     # 'positive', 'neutral', 'negative'
    
    # Template Candidate?
    is_template_candidate: bool = False
    template_use_case: Optional[str] = None


class LeadCandidate(BaseModel):
    """Extrahierte Lead-Daten"""
    
    name: Optional[str] = None
    handle_or_profile: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    channel: Optional[Channel] = None
    
    # Additional Info
    location: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None


class NextAction(BaseModel):
    """Vorgeschlagene nächste Aktion"""
    
    action_type: ActionType = ActionType.no_action
    action_description: Optional[str] = None
    
    suggested_date: Optional[date] = None
    suggested_time: Optional[str] = None
    
    suggested_channel: Optional[Channel] = None
    suggested_message: Optional[str] = None
    
    priority: int = Field(default=50, ge=0, le=100)
    is_urgent: bool = False
    
    reasoning: Optional[str] = None     # Warum diese Aktion?


class ExtractedTemplate(BaseModel):
    """Extrahiertes Template aus Gespräch"""
    
    content: str
    use_case: str
    
    context_description: Optional[str] = None
    works_for_lead_status: List[LeadStatus] = []
    works_for_deal_state: List[DealState] = []
    
    effectiveness_indicators: List[str] = []
    # z.B. ["reopened_conversation", "got_appointment", "handled_objection"]


class DetectedObjection(BaseModel):
    """Erkannter Einwand + Reaktion"""
    
    objection_type: ObjectionType
    objection_text: str
    objection_context: Optional[str] = None
    
    response_text: Optional[str] = None
    response_technique: Optional[str] = None
    # 'reframe', 'empathize', 'question', 'social_proof', 'pressure_off'
    
    response_worked: Optional[bool] = None


class SellerStyle(BaseModel):
    """Erkannter Verkäufer-Stil"""
    
    tone: str = "friendly_casual"
    # 'formal', 'friendly_casual', 'very_casual', 'professional'
    
    pressure_level: str = "low"
    # 'none', 'low', 'medium', 'high'
    
    emoji_usage: str = "moderate"
    # 'none', 'minimal', 'moderate', 'heavy'
    
    message_length: str = "medium"
    # 'very_short', 'short', 'medium', 'long'
    
    closing_style: str = "soft_ask"
    # 'soft_ask', 'direct_ask', 'assumptive', 'alternative_choice'
    
    personalization_level: str = "high"
    # 'low', 'medium', 'high'


class ConversationSummary(BaseModel):
    """Zusammenfassung des Gesprächs"""
    
    summary: str                        # 2-3 Sätze
    key_topics: List[str] = []
    
    customer_sentiment: str = "neutral"
    # 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
    
    sales_stage: str = "unknown"
    # 'awareness', 'interest', 'consideration', 'decision', 'closed_won', 'closed_lost'
    
    main_blocker: Optional[str] = None  # Was hält den Lead zurück?


# ═══════════════════════════════════════════════════════════════════════════
# MAIN RESPONSE SCHEMA (V2)
# ═══════════════════════════════════════════════════════════════════════════

class ChatImportResult(BaseModel):
    """Vollständiges Ergebnis der Chat-Analyse (V2)"""
    
    # Parsing
    messages: List[ParsedMessage] = []
    message_count: int = 0
    
    # Lead
    lead_candidate: LeadCandidate = Field(default_factory=LeadCandidate)
    lead_status: LeadStatus = LeadStatus.unknown
    deal_state: DealState = DealState.none
    
    # Summary
    conversation_summary: ConversationSummary = Field(default_factory=lambda: ConversationSummary(summary=""))
    last_contact_summary: str = ""
    
    # Next Action
    next_action: NextAction = Field(default_factory=NextAction)
    
    # Extracted Content
    extracted_templates: List[ExtractedTemplate] = []
    detected_objections: List[DetectedObjection] = []
    
    # Style Analysis
    seller_style: SellerStyle = Field(default_factory=SellerStyle)
    
    # Metadata
    detected_channel: Optional[Channel] = None
    detected_language: str = "de"
    first_message_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    
    # Confidence
    confidence_score: float = Field(default=0.8, ge=0, le=1)
    uncertainty_notes: List[str] = []
    
    # For Learning Case
    quality_score: Optional[float] = None  # 0-1, wie wertvoll als Training?


# ═══════════════════════════════════════════════════════════════════════════
# LEGACY RESPONSE SCHEMAS (V1 Kompatibilität)
# ═══════════════════════════════════════════════════════════════════════════

class ExtractedLeadData(BaseModel):
    """Aus dem Chat extrahierte Lead-Daten (Legacy)."""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    social_handle: Optional[str] = Field(None, max_length=100)
    social_url: Optional[str] = Field(None, max_length=500)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    channel: ChatChannel = ChatChannel.other
    language: str = Field(default="de", max_length=10)
    status: str = Field(default="interested")
    temperature: LeadTemperature = Field(default=LeadTemperature.warm)
    last_message_summary: Optional[str] = Field(None, max_length=1000)


class ConversationInsights(BaseModel):
    """AI-generierte Insights aus dem Chat (Legacy)."""
    sentiment: Literal["positive", "neutral", "negative", "mixed"] = "neutral"
    interest_level: Literal["high", "medium", "low", "none"] = "medium"
    objections_detected: List[str] = Field(default_factory=list)
    questions_asked: List[str] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    buying_signals: List[str] = Field(default_factory=list)
    stage_in_funnel: str = Field(default="interest")


class SuggestedNextStep(BaseModel):
    """Vorgeschlagener nächster Schritt (Legacy)."""
    type: NextStepType = Field(default=NextStepType.follow_up)
    suggested_in_days: int = Field(default=3, ge=0, le=90)
    message_suggestion: str = Field(default="", max_length=1000)
    urgency: Literal["high", "medium", "low"] = "medium"


class ImportFromChatResponse(BaseModel):
    """Response nach Chat-Analyse (Legacy)."""
    extracted_lead: ExtractedLeadData
    missing_fields: List[str] = Field(default_factory=list)
    conversation_insights: ConversationInsights
    suggested_next_step: SuggestedNextStep
    analysis_confidence: Literal["high", "medium", "low"] = "medium"
    raw_chat_word_count: int = Field(default=0)


# ═══════════════════════════════════════════════════════════════════════════
# SAVE IMPORT SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class SaveImportRequest(BaseModel):
    """Request zum Speichern des Import-Ergebnisses (V2)"""
    
    import_result: ChatImportResult
    raw_text: str
    
    # User Adjustments
    lead_name_override: Optional[str] = None
    lead_status_override: Optional[LeadStatus] = None
    deal_state_override: Optional[DealState] = None
    
    # What to save?
    create_lead: bool = True
    create_contact_plan: bool = True
    save_templates: bool = True
    save_objections: bool = True
    save_as_learning_case: bool = False
    
    # Learning Case Additions
    learning_case_goal: Optional[str] = None
    learning_case_outcome: Optional[str] = None
    learning_case_notes: Optional[str] = None


class SaveImportResponse(BaseModel):
    """Response nach Speicherung (V2)"""
    
    success: bool
    
    # Created IDs
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    contact_plan_id: Optional[str] = None
    learning_case_id: Optional[str] = None
    
    # Counts
    templates_saved: int = 0
    objections_saved: int = 0
    messages_saved: int = 0
    
    # XP
    xp_earned: int = 0
    
    message: str = ""


class SaveImportedLeadRequest(BaseModel):
    """Request zum Speichern des importierten Leads (Legacy)."""
    # Pflichtfelder
    first_name: str = Field(..., min_length=1, max_length=100)
    channel: ChatChannel
    
    # Optionale Felder
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    social_url: Optional[str] = Field(None, max_length=500)
    social_handle: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="interested")
    temperature: LeadTemperature = Field(default=LeadTemperature.warm)
    
    # AI-generierte Daten
    notes: Optional[str] = Field(None, max_length=5000)
    tags: List[str] = Field(default_factory=list)
    
    # Original Chat
    original_chat: Optional[str] = Field(None, max_length=50000)
    
    # Follow-up Setup
    next_contact_in_days: Optional[int] = Field(None, ge=0, le=90)
    next_step_message: Optional[str] = Field(None, max_length=1000)
    
    # Company Zuordnung
    company_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# CONTACT PLAN SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ContactPlanCreate(BaseModel):
    """Create Contact Plan"""
    lead_id: str
    action_type: ActionType
    action_description: Optional[str] = None
    planned_at: date
    planned_time: Optional[str] = None
    suggested_message: Optional[str] = None
    suggested_channel: Optional[str] = None
    priority: int = 50
    is_urgent: bool = False


class ContactPlanUpdate(BaseModel):
    """Update Contact Plan"""
    action_type: Optional[ActionType] = None
    action_description: Optional[str] = None
    planned_at: Optional[date] = None
    planned_time: Optional[str] = None
    suggested_message: Optional[str] = None
    status: Optional[str] = None
    completion_note: Optional[str] = None


class ContactPlanResponse(BaseModel):
    """Contact Plan Response"""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    action_type: str
    action_description: Optional[str] = None
    planned_at: date
    planned_time: Optional[str] = None
    suggested_message: Optional[str] = None
    suggested_channel: Optional[str] = None
    priority: int = 50
    is_urgent: bool = False
    status: str = "open"
    days_overdue: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════
# TEMPLATE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class TemplateCreate(BaseModel):
    """Create Template"""
    content: str
    name: Optional[str] = None
    use_case: str
    channel: Optional[str] = None
    context_tags: List[str] = []
    works_for_lead_status: List[str] = []
    works_for_deal_state: List[str] = []


class TemplateResponse(BaseModel):
    """Template Response"""
    id: str
    content: str
    name: Optional[str] = None
    use_case: str
    channel: Optional[str] = None
    context_tags: List[str] = []
    times_used: int = 0
    success_rate: Optional[float] = None
    is_team_shared: bool = False
    created_at: datetime
