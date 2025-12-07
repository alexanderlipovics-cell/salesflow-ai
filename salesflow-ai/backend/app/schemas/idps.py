"""
Sales Flow AI - IDPS (Intelligent DM Persistence System) Schemas

Pydantic models für das DM-Persistenz-System und die Unified Inbox.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# ENUMS
# ============================================================================


class DMPlatform(str, Enum):
    """Unterstützte DM-Plattformen"""
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    EMAIL = "email"
    SMS = "sms"


class ConversationStatus(str, Enum):
    """Status einer DM-Conversation"""
    NEW = "new"
    DM_INITIATED_NO_RESPONSE = "dm_initiated_no_response"
    READ_NO_REPLY = "read_no_reply"
    REPLIED = "replied"
    NEEDS_HUMAN_ATTENTION = "needs_human_attention"
    IN_SEQUENCE = "in_sequence"
    DELAY_REQUESTED = "delay_requested"
    CONVERTED = "converted"
    ARCHIVED = "archived"
    UNSUBSCRIBED = "unsubscribed"


class MessageDirection(str, Enum):
    """Nachrichtenrichtung"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class DeliveryStatus(str, Enum):
    """Zustellstatus einer Nachricht"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class Sentiment(str, Enum):
    """Sentiment einer Conversation/Nachricht"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    INTERESTED = "interested"
    HESITANT = "hesitant"


# ============================================================================
# CONVERSATION SCHEMAS
# ============================================================================


class DMConversationBase(BaseModel):
    """Basis-Schema für DM-Conversations"""
    platform: DMPlatform
    platform_conversation_id: Optional[str] = None
    platform_contact_handle: Optional[str] = None
    contact_id: Optional[str] = None
    status: ConversationStatus = ConversationStatus.NEW
    overall_sentiment: Sentiment = Sentiment.NEUTRAL
    priority_score: int = Field(default=50, ge=0, le=100)
    deep_link_url: Optional[str] = None
    platform_metadata: Optional[Dict[str, Any]] = None


class DMConversationCreate(DMConversationBase):
    """Schema zum Erstellen einer neuen Conversation"""
    pass


class DMConversationUpdate(BaseModel):
    """Schema zum Aktualisieren einer Conversation"""
    status: Optional[ConversationStatus] = None
    contact_id: Optional[str] = None
    overall_sentiment: Optional[Sentiment] = None
    priority_score: Optional[int] = Field(default=None, ge=0, le=100)
    current_sequence_phase: Optional[int] = None
    next_sequence_action_at: Optional[datetime] = None
    sequence_paused: Optional[bool] = None
    pause_until: Optional[datetime] = None
    platform_metadata: Optional[Dict[str, Any]] = None


class DMConversation(DMConversationBase):
    """Vollständiges Conversation-Schema (Response)"""
    id: str
    user_id: str
    current_sequence_phase: int = 0
    last_sequence_action_at: Optional[datetime] = None
    next_sequence_action_at: Optional[datetime] = None
    sequence_paused: bool = False
    pause_until: Optional[datetime] = None
    messages_sent: int = 0
    messages_received: int = 0
    last_message_at: Optional[datetime] = None
    last_inbound_at: Optional[datetime] = None
    last_outbound_at: Optional[datetime] = None
    avg_response_time_hours: Optional[float] = None
    detected_intent: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# MESSAGE SCHEMAS
# ============================================================================


class DMMessageBase(BaseModel):
    """Basis-Schema für DM-Nachrichten"""
    direction: MessageDirection
    content: str
    content_type: str = "text"
    platform_message_id: Optional[str] = None


class DMMessageCreate(DMMessageBase):
    """Schema zum Erstellen einer Nachricht"""
    conversation_id: str
    is_ai_generated: bool = False
    ai_template_used: Optional[str] = None
    ai_persona_variant: Optional[str] = None
    sequence_phase: Optional[int] = None
    sequence_message_type: Optional[str] = None


class DMMessage(DMMessageBase):
    """Vollständiges Nachrichten-Schema (Response)"""
    id: str
    conversation_id: str
    user_id: str
    delivery_status: DeliveryStatus = DeliveryStatus.SENT
    read_at: Optional[datetime] = None
    is_ai_generated: bool = False
    ai_template_used: Optional[str] = None
    ai_persona_variant: Optional[str] = None
    sequence_phase: Optional[int] = None
    sequence_message_type: Optional[str] = None
    sentiment: Optional[str] = None
    contains_question: bool = False
    contains_objection: bool = False
    contains_interest_signal: bool = False
    detected_keywords: List[str] = []
    sent_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# UNIFIED INBOX SCHEMAS
# ============================================================================


class UnifiedInboxItem(BaseModel):
    """Ein Eintrag in der Unified Inbox"""
    id: str
    user_id: str
    contact_id: Optional[str] = None
    platform: str
    platform_contact_handle: Optional[str] = None
    status: str
    current_sequence_phase: int = 0
    next_sequence_action_at: Optional[datetime] = None
    messages_sent: int = 0
    messages_received: int = 0
    last_message_at: Optional[datetime] = None
    overall_sentiment: str = "neutral"
    priority_score: int = 50
    deep_link_url: Optional[str] = None
    created_at: datetime
    
    # Berechnete Felder aus dem View
    last_message_preview: Optional[str] = None
    last_message_direction: Optional[str] = None
    unread_count: int = 0
    days_since_last_contact: Optional[int] = None
    
    # Lead-Infos
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_p_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class UnifiedInboxFilters(BaseModel):
    """Filter für die Unified Inbox"""
    platforms: Optional[List[str]] = None
    statuses: Optional[List[str]] = None
    min_priority: Optional[int] = None
    needs_attention: bool = False
    search: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class UnifiedInboxResponse(BaseModel):
    """Response für Unified Inbox Abfrage"""
    success: bool = True
    items: List[UnifiedInboxItem]
    total_count: int
    unread_total: int = 0
    needs_attention_count: int = 0


# ============================================================================
# SEQUENCE SCHEMAS
# ============================================================================


class SequenceStep(BaseModel):
    """Ein Schritt in einer Follow-up Sequenz"""
    phase: int
    name: str
    delay_hours: int
    message_template: Optional[str] = None
    is_ai_generated: bool = False
    ai_prompt: Optional[str] = None
    description: Optional[str] = None


class DMSequenceTemplate(BaseModel):
    """Follow-up Sequenz Template"""
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    platform: Optional[str] = None
    sequence_steps: List[SequenceStep]
    times_used: int = 0
    avg_response_rate: Optional[float] = None
    avg_conversion_rate: Optional[float] = None
    is_active: bool = True
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class SequenceTemplateCreate(BaseModel):
    """Schema zum Erstellen eines Sequenz-Templates"""
    name: str
    description: Optional[str] = None
    platform: Optional[str] = None
    sequence_steps: List[SequenceStep]


# ============================================================================
# AUTOMATION RULES SCHEMAS
# ============================================================================


class TriggerCondition(BaseModel):
    """Eine Trigger-Bedingung für Automation Rules"""
    field: str
    operator: str  # contains, equals, contains_any, greater_than, etc.
    value: Optional[str] = None
    values: Optional[List[str]] = None


class AutomationTrigger(BaseModel):
    """Trigger-Definition für Automation Rules"""
    event_type: str  # message_received, message_read, no_response_timeout
    platform: Optional[str] = None
    conditions: List[TriggerCondition] = []


class AutomationAction(BaseModel):
    """Aktionen einer Automation Rule"""
    set_status: Optional[str] = None
    set_pause_until: Optional[str] = None  # z.B. "+14 days"
    generate_ai_draft: bool = False
    generate_ai_reply: bool = False
    send_notification: bool = False
    notification_message: Optional[str] = None
    stop_sequence: bool = False
    add_tag: Optional[str] = None


class DMAutomationRule(BaseModel):
    """Automation Rule für IDPS"""
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    is_active: bool = True
    priority: int = 100
    trigger_conditions: AutomationTrigger
    actions: AutomationAction
    times_triggered: int = 0
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# PLATFORM CONNECTION SCHEMAS
# ============================================================================


class PlatformConnectionBase(BaseModel):
    """Basis-Schema für Plattform-Verbindungen"""
    platform: str
    account_email: Optional[str] = None
    account_name: Optional[str] = None


class PlatformConnectionCreate(PlatformConnectionBase):
    """Schema zum Erstellen einer Verbindung"""
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    api_key: Optional[str] = None
    phone_number_id: Optional[str] = None


class PlatformConnection(PlatformConnectionBase):
    """Vollständiges Verbindungs-Schema (Response)"""
    id: str
    user_id: str
    is_connected: bool = False
    last_sync_at: Optional[datetime] = None
    webhook_verified: bool = False
    error_count: int = 0
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Tokens werden NICHT in Response zurückgegeben!

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class PlatformConnectionStatus(BaseModel):
    """Status einer Plattform-Verbindung (für Dashboard)"""
    platform: str
    is_connected: bool
    account_name: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    has_errors: bool = False


# ============================================================================
# ACTION SCHEMAS
# ============================================================================


class SendMessageRequest(BaseModel):
    """Request zum Senden einer Nachricht"""
    conversation_id: str
    content: str
    is_ai_generated: bool = False
    schedule_at: Optional[datetime] = None


class StartSequenceRequest(BaseModel):
    """Request zum Starten einer Sequenz"""
    conversation_id: str
    template_id: Optional[str] = None  # None = Default-Template


class GenerateAIDraftRequest(BaseModel):
    """Request zum Generieren eines KI-Entwurfs"""
    conversation_id: str
    context: Optional[str] = None
    tone: Optional[str] = None  # formal, casual, friendly
    max_length: int = Field(default=500, ge=50, le=2000)


class GenerateAIDraftResponse(BaseModel):
    """Response mit KI-generiertem Entwurf"""
    success: bool = True
    draft_text: str
    detected_intent: Optional[str] = None
    suggested_next_action: Optional[str] = None
    confidence: float = 0.0


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================


class IDPSAnalytics(BaseModel):
    """Analytik für das IDPS-System"""
    total_conversations: int = 0
    active_sequences: int = 0
    needs_attention: int = 0
    response_rate: float = 0.0
    avg_response_time_hours: float = 0.0
    conversion_rate: float = 0.0
    
    # Per Platform
    by_platform: Dict[str, Dict[str, int]] = {}
    
    # Per Status
    by_status: Dict[str, int] = {}
    
    # Trends (letzte 7 Tage)
    daily_messages_sent: List[int] = []
    daily_messages_received: List[int] = []
    daily_conversions: List[int] = []


# ============================================================================
# RESPONSE WRAPPERS
# ============================================================================


class DMConversationResponse(BaseModel):
    """Standard API Response für Conversation"""
    success: bool = True
    conversation: DMConversation


class DMConversationListResponse(BaseModel):
    """API Response für Liste von Conversations"""
    success: bool = True
    conversations: List[DMConversation]
    count: int


class DMMessageResponse(BaseModel):
    """Standard API Response für Message"""
    success: bool = True
    message: DMMessage


class DMMessageListResponse(BaseModel):
    """API Response für Liste von Messages"""
    success: bool = True
    messages: List[DMMessage]
    count: int


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    # Enums
    "DMPlatform",
    "ConversationStatus",
    "MessageDirection",
    "DeliveryStatus",
    "Sentiment",
    # Conversation
    "DMConversationBase",
    "DMConversationCreate",
    "DMConversationUpdate",
    "DMConversation",
    "DMConversationResponse",
    "DMConversationListResponse",
    # Message
    "DMMessageBase",
    "DMMessageCreate",
    "DMMessage",
    "DMMessageResponse",
    "DMMessageListResponse",
    # Unified Inbox
    "UnifiedInboxItem",
    "UnifiedInboxFilters",
    "UnifiedInboxResponse",
    # Sequence
    "SequenceStep",
    "DMSequenceTemplate",
    "SequenceTemplateCreate",
    # Automation
    "TriggerCondition",
    "AutomationTrigger",
    "AutomationAction",
    "DMAutomationRule",
    # Platform Connection
    "PlatformConnectionBase",
    "PlatformConnectionCreate",
    "PlatformConnection",
    "PlatformConnectionStatus",
    # Actions
    "SendMessageRequest",
    "StartSequenceRequest",
    "GenerateAIDraftRequest",
    "GenerateAIDraftResponse",
    # Analytics
    "IDPSAnalytics",
]


