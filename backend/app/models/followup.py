# file: app/models/followup.py
"""
Follow-Up Domain Models - GPT-5.1 Design

Zentrale Datenmodelle für das intelligente Follow-Up System:
- FollowUpSequence: Konfigurierbare Sequenzen (z.B. "Interessent → Partner")
- FollowUpStep: Einzelne Schritte innerhalb einer Sequenz
- FollowUpSuggestion: AI-generierte Empfehlungen
- AIMessage: Generierte Nachrichten
"""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────
# Enums
# ─────────────────────────────────────

class FollowUpChannel(str, Enum):
    """Verfügbare Kommunikationskanäle"""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    PHONE = "phone"
    INSTAGRAM_DM = "instagram_dm"
    FACEBOOK_MESSENGER = "facebook_messenger"
    TELEGRAM = "telegram"
    LINKEDIN_DM = "linkedin_dm"


class FollowUpPriority(str, Enum):
    """Prioritätsstufen für Follow-ups"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class FollowUpCondition(str, Enum):
    """Bedingungen für Sequenz-Steps"""
    ALWAYS = "always"
    NO_REPLY = "no_reply"
    REPLIED_POSITIVE = "replied_positive"
    REPLIED_NEGATIVE = "replied_negative"
    BECAME_CUSTOMER = "became_customer"
    BECAME_PARTNER = "became_partner"
    CUSTOM = "custom"


class FollowUpSequenceStatus(str, Enum):
    """Status eines Leads in einer Sequenz"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    WAITING_RESPONSE = "waiting_response"
    COMPLETED = "completed"
    STOPPED = "stopped"
    GHOSTED = "ghosted"
    PAUSED = "paused"


# ─────────────────────────────────────
# Core Domain Models
# ─────────────────────────────────────

class FollowUpStep(BaseModel):
    """
    Ein einzelner Schritt innerhalb einer FollowUpSequence.
    
    day_offset = Anzahl Tage nach Sequenz-Start / Trigger-Ereignis.
    """
    id: UUID = Field(..., description="Step ID (UUID)")
    sequence_id: UUID
    order_index: int = Field(..., description="Sort order inside sequence")
    day_offset: int = Field(..., ge=0, description="Offset in days from sequence start/trigger")
    action: str = Field(..., description="Human readable action, z.B. 'send_video'")
    template_key: Optional[str] = Field(
        default=None,
        description="Key for message template; AI nutzt das als Hint"
    )
    channel: FollowUpChannel
    condition: FollowUpCondition = FollowUpCondition.ALWAYS
    condition_expression: Optional[str] = Field(
        default=None,
        description="Optional: DSL/Expression für komplexere Bedingungen (z.B. JSONLogic)"
    )

    class Config:
        frozen = True


class FollowUpSequence(BaseModel):
    """
    Konfigurierbare Follow-Up-Sequenz (z.B. 'Interessent → Partner').
    
    Network Marketing Beispiele:
    - Interessent → Partner
    - Kunde → Reorder/Abo-Verlängerung
    - Ghosted → Reaktivierung
    - Warmkontakt → Ersttermin
    """
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    trigger: Optional[str] = Field(
        default=None,
        description="z.B. 'new_lead_with_interest', 'after_first_order'"
    )
    steps: List[FollowUpStep] = Field(default_factory=list)
    is_active: bool = True
    is_default: bool = False
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class FollowUpSequenceState(BaseModel):
    """
    Aktueller Zustand eines Leads in einer Sequenz.
    
    Wird in Tabelle `followup_sequence_states` gespeichert.
    """
    id: UUID
    workspace_id: UUID
    lead_id: UUID
    sequence_id: UUID
    status: FollowUpSequenceStatus = FollowUpSequenceStatus.NOT_STARTED
    current_step_id: Optional[UUID] = None
    current_step_index: Optional[int] = None
    started_at: Optional[datetime] = None
    last_step_scheduled_at: Optional[datetime] = None
    last_step_completed_at: Optional[datetime] = None
    last_interaction_type: Optional[str] = None  # e.g. 'reply_positive', 'reply_negative', 'no_reply'
    last_interaction_at: Optional[datetime] = None
    paused_until: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


# ─────────────────────────────────────
# Lead & Context Models
# ─────────────────────────────────────

class LeadContext(BaseModel):
    """
    Lightweight-View auf einen Lead, den die FollowUpEngine braucht.
    
    Wird aus dem Leads-Model gemappt.
    """
    id: UUID
    workspace_id: UUID
    owner_id: UUID
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    timezone: Optional[str] = Field(default=None, description="IANA timezone, e.g. 'Europe/Vienna'")
    primary_channel: Optional[FollowUpChannel] = None
    language: Optional[str] = Field(default="de", description="ISO language code, e.g. 'de', 'en'")
    last_contacted_at: Optional[datetime] = None
    last_incoming_message_at: Optional[datetime] = None
    lead_score: Optional[float] = None
    tags: List[str] = Field(default_factory=list)
    meta: Dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────
# Suggestion & AI Output
# ─────────────────────────────────────

class FollowUpSuggestion(BaseModel):
    """
    Was die Engine als 'nächsten Follow-up' empfiehlt.
    
    Enthält:
    - Welcher Lead
    - Welcher Kanal
    - Wann (Zeitpunkt)
    - Wie dringend (Priorität)
    - Warum (Begründung)
    """
    lead_id: UUID
    workspace_id: UUID
    owner_id: UUID

    sequence_id: Optional[UUID] = None
    step_id: Optional[UUID] = None

    recommended_channel: FollowUpChannel
    recommended_time: datetime

    priority: FollowUpPriority = FollowUpPriority.MEDIUM
    reason: str = Field(..., description="Kurzbegründung, warum dieser Follow-up jetzt")
    meta: Dict[str, Any] = Field(default_factory=dict)


class AIMessage(BaseModel):
    """
    Ergebnis der Text-Generierung für einen Follow-up.
    
    Enthält den generierten Text plus Metadaten für Monitoring.
    """
    model_config = ConfigDict(protected_namespaces=())
    
    lead_id: UUID
    workspace_id: UUID
    owner_id: UUID
    channel: FollowUpChannel
    content: str
    language: Optional[str] = "de"
    template_key: Optional[str] = None
    used_sequence_id: Optional[UUID] = None
    used_step_id: Optional[UUID] = None

    # Für Debugging / Monitoring
    model_name: Optional[str] = None
    prompt_version: Optional[str] = None
    tokens_used: Optional[int] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


# ─────────────────────────────────────
# Team Duplikation Models
# ─────────────────────────────────────

class TeamTemplate(BaseModel):
    """
    Team-Template für Duplikation.
    
    Team-Leader erstellen Templates, Team-Members klonen sie.
    """
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    created_by: UUID  # Team Leader
    
    # Was wird dupliziert?
    sequence_ids: List[UUID] = Field(default_factory=list)
    message_template_ids: List[str] = Field(default_factory=list)
    daily_flow_config: Optional[Dict[str, Any]] = None
    objection_handler_ids: List[str] = Field(default_factory=list)
    
    # Sharing Settings
    shared_with: List[UUID] = Field(default_factory=list)
    is_public: bool = False
    
    # Versioning
    version: int = 1
    
    # Stats
    times_cloned: int = 0
    
    # Timestamps
    created_at: datetime
    updated_at: datetime


class TeamTemplateClone(BaseModel):
    """
    Tracking, wer welches Template geklont hat.
    """
    id: UUID
    template_id: UUID
    original_template_version: int
    cloned_by: UUID  # Team Member
    cloned_at: datetime
    is_synced: bool = True  # Noch mit Original synchron?
    last_sync_at: Optional[datetime] = None


__all__ = [
    # Enums
    "FollowUpChannel",
    "FollowUpPriority", 
    "FollowUpCondition",
    "FollowUpSequenceStatus",
    # Models
    "FollowUpStep",
    "FollowUpSequence",
    "FollowUpSequenceState",
    "LeadContext",
    "FollowUpSuggestion",
    "AIMessage",
    "TeamTemplate",
    "TeamTemplateClone",
]

