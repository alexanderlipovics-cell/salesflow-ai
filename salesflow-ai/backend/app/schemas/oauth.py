"""
Sales Flow AI - OAuth & Webhooks Schemas

Pydantic models für OAuth-Flows und Webhook-Integration.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================================
# ENUMS
# ============================================================================


class OAuthProvider(str, Enum):
    """Unterstützte OAuth-Provider"""
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    WHATSAPP_BUSINESS = "whatsapp_business"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    CALENDLY = "calendly"


class ConnectionStatus(str, Enum):
    """Status einer OAuth-Verbindung"""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class WebhookEventStatus(str, Enum):
    """Verarbeitungsstatus eines Webhook-Events"""
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    SKIPPED = "skipped"


# ============================================================================
# OAUTH SCHEMAS
# ============================================================================


class OAuthInitRequest(BaseModel):
    """Request zum Starten eines OAuth-Flows"""
    provider: OAuthProvider
    redirect_uri: Optional[str] = None
    scopes: Optional[List[str]] = None


class OAuthInitResponse(BaseModel):
    """Response mit OAuth Authorization URL"""
    success: bool = True
    authorization_url: str
    state: str  # CSRF-Token


class OAuthCallbackRequest(BaseModel):
    """Request für OAuth Callback"""
    provider: OAuthProvider
    code: str
    state: str
    error: Optional[str] = None
    error_description: Optional[str] = None


class OAuthToken(BaseModel):
    """OAuth Token (ohne sensitive Daten in Response)"""
    id: str
    provider: str
    provider_email: Optional[str] = None
    is_valid: bool = True
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    scopes: List[str] = []
    connection_status: ConnectionStatus = ConnectionStatus.ACTIVE
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class OAuthConnectionStatus(BaseModel):
    """Status einer OAuth-Verbindung (für Dashboard)"""
    provider: str
    is_connected: bool = False
    provider_email: Optional[str] = None
    connection_status: str = "disconnected"
    expires_at: Optional[datetime] = None
    webhook_active: bool = False
    last_sync_at: Optional[datetime] = None
    error_count: int = 0


class OAuthConnectionsResponse(BaseModel):
    """Response mit allen OAuth-Verbindungen"""
    success: bool = True
    connections: List[OAuthConnectionStatus]


# ============================================================================
# WEBHOOK SCHEMAS
# ============================================================================


class WebhookSubscription(BaseModel):
    """Webhook-Subscription"""
    id: str
    provider: str
    resource_type: str
    is_active: bool = True
    last_notification_at: Optional[datetime] = None
    notification_count: int = 0
    expires_at: Optional[datetime] = None
    error_count: int = 0

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class WebhookEvent(BaseModel):
    """Ein Webhook-Event"""
    id: str
    provider: str
    event_type: str
    processing_status: str = "pending"
    received_at: datetime
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class WebhookEventListResponse(BaseModel):
    """Response für Liste von Webhook-Events"""
    success: bool = True
    events: List[WebhookEvent]
    count: int


# ============================================================================
# GMAIL SCHEMAS
# ============================================================================


class GmailWatchRequest(BaseModel):
    """Request zum Starten von Gmail Push Notifications"""
    labels: List[str] = Field(default=["INBOX"], description="Gmail Labels zu überwachen")


class GmailWatchResponse(BaseModel):
    """Response nach Gmail Watch Setup"""
    success: bool = True
    history_id: str
    expiration: datetime


class GmailMessage(BaseModel):
    """Eine Gmail-Nachricht (vereinfacht)"""
    id: str
    thread_id: str
    from_address: str
    to_address: str
    subject: Optional[str] = None
    snippet: str
    date: datetime
    labels: List[str] = []
    has_attachments: bool = False


class GmailSyncStatus(BaseModel):
    """Gmail Sync-Status"""
    is_connected: bool = False
    last_sync_at: Optional[datetime] = None
    messages_synced: int = 0
    history_id: Optional[str] = None
    sync_enabled: bool = True
    consecutive_errors: int = 0


# ============================================================================
# WHATSAPP BUSINESS SCHEMAS
# ============================================================================


class WhatsAppConfig(BaseModel):
    """WhatsApp Business Konfiguration"""
    id: str
    waba_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    business_name: Optional[str] = None
    is_verified: bool = False
    quality_rating: Optional[str] = None
    daily_limit: int = 1000
    messages_sent_today: int = 0
    webhook_registered: bool = False

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class WhatsAppTemplate(BaseModel):
    """WhatsApp Message Template"""
    name: str
    language: str
    category: str  # MARKETING, UTILITY, AUTHENTICATION
    status: str  # approved, pending, rejected
    components: List[Dict[str, Any]] = []


class WhatsAppSendRequest(BaseModel):
    """Request zum Senden einer WhatsApp-Nachricht"""
    to_phone: str = Field(..., description="Empfänger-Telefonnummer (E.164 Format)")
    message_type: str = Field(default="text", description="text oder template")
    text: Optional[str] = None
    template_name: Optional[str] = None
    template_params: Optional[Dict[str, str]] = None


class WhatsAppSendResponse(BaseModel):
    """Response nach WhatsApp-Versand"""
    success: bool = True
    message_id: str
    status: str


class WhatsAppWebhookPayload(BaseModel):
    """Eingehender WhatsApp Webhook Payload (vereinfacht)"""
    object: str
    entry: List[Dict[str, Any]]


# ============================================================================
# REALTIME MESSAGE QUEUE SCHEMAS
# ============================================================================


class RealtimeMessage(BaseModel):
    """Eine Nachricht in der Echtzeit-Queue"""
    id: str
    user_id: str
    channel: str
    direction: str
    from_address: str
    to_address: str
    subject: Optional[str] = None
    body: str
    status: str = "pending"
    contact_id: Optional[str] = None
    conversation_id: Optional[str] = None
    matched_by: Optional[str] = None
    match_confidence: Optional[float] = None
    received_at: datetime
    processed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class RealtimeQueueStatus(BaseModel):
    """Status der Echtzeit-Queue"""
    pending_count: int = 0
    matched_count: int = 0
    processed_count: int = 0
    failed_count: int = 0
    oldest_pending_at: Optional[datetime] = None


# ============================================================================
# PROVIDER-SPEZIFISCHE CONFIG SCHEMAS
# ============================================================================


class GoogleOAuthScopes:
    """Standard-Scopes für Google OAuth"""
    GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly"
    GMAIL_SEND = "https://www.googleapis.com/auth/gmail.send"
    GMAIL_MODIFY = "https://www.googleapis.com/auth/gmail.modify"
    CALENDAR_READONLY = "https://www.googleapis.com/auth/calendar.readonly"
    CALENDAR_EVENTS = "https://www.googleapis.com/auth/calendar.events"
    PROFILE = "https://www.googleapis.com/auth/userinfo.profile"
    EMAIL = "https://www.googleapis.com/auth/userinfo.email"
    
    # Standard-Kombination für SALESFLOW
    DEFAULT = [
        GMAIL_READONLY,
        GMAIL_SEND,
        GMAIL_MODIFY,
        PROFILE,
        EMAIL,
    ]


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    # Enums
    "OAuthProvider",
    "ConnectionStatus",
    "WebhookEventStatus",
    # OAuth
    "OAuthInitRequest",
    "OAuthInitResponse",
    "OAuthCallbackRequest",
    "OAuthToken",
    "OAuthConnectionStatus",
    "OAuthConnectionsResponse",
    # Webhooks
    "WebhookSubscription",
    "WebhookEvent",
    "WebhookEventListResponse",
    # Gmail
    "GmailWatchRequest",
    "GmailWatchResponse",
    "GmailMessage",
    "GmailSyncStatus",
    # WhatsApp
    "WhatsAppConfig",
    "WhatsAppTemplate",
    "WhatsAppSendRequest",
    "WhatsAppSendResponse",
    "WhatsAppWebhookPayload",
    # Realtime Queue
    "RealtimeMessage",
    "RealtimeQueueStatus",
    # Config
    "GoogleOAuthScopes",
]


