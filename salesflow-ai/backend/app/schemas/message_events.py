"""
Sales Flow AI - Message Events Schemas

Pydantic models für Unified Message Events (Autopilot)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# ============================================================================
# ENUMS
# ============================================================================


class MessageChannel(str, Enum):
    """Verfügbare Nachrichtenkanäle"""
    
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INTERNAL = "internal"


class MessageDirection(str, Enum):
    """Nachrichtenrichtung"""
    
    INBOUND = "inbound"    # Eingehend (vom Kontakt)
    OUTBOUND = "outbound"  # Ausgehend (vom User)


class AutopilotStatus(str, Enum):
    """Autopilot Verarbeitungsstatus"""
    
    PENDING = "pending"      # Wartet auf Verarbeitung
    SUGGESTED = "suggested"  # KI-Antwort vorgeschlagen
    APPROVED = "approved"    # User hat Antwort genehmigt
    SENT = "sent"            # Antwort wurde gesendet
    SKIPPED = "skipped"      # Übersprungen (manuell/kein Autopilot)


# ============================================================================
# CREATE SCHEMA (Request)
# ============================================================================


class MessageEventCreate(BaseModel):
    """Schema zum Erstellen eines Message Events"""
    
    contact_id: Optional[str] = Field(
        default=None,
        description="Contact-UUID (optional)"
    )
    channel: str = Field(
        ...,
        description="Kanal: email, whatsapp, instagram, linkedin, facebook, internal"
    )
    direction: str = Field(
        ...,
        description="Richtung: inbound oder outbound"
    )
    text: str = Field(
        ...,
        min_length=1,
        description="Nachrichtentext"
    )
    raw_payload: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Original-Payload vom Kanal (optional)"
    )
    # A/B Experiment Fields
    template_version: Optional[str] = Field(
        default=None,
        description="Version des verwendeten Templates/Prompts (z.B. v1.0)"
    )
    persona_variant: Optional[str] = Field(
        default=None,
        description="Persona-Variante für A/B-Tests (z.B. default, friendly)"
    )


# ============================================================================
# READ SCHEMA (Response)
# ============================================================================


class SuggestedReply(BaseModel):
    """Schema für KI-generierte Antwortvorschläge"""
    
    text: str = Field(description="Vorgeschlagener Antworttext")
    detected_action: Optional[str] = Field(
        default=None,
        description="Erkannte Action (z.B. objection_handler, followup)"
    )
    channel: Optional[str] = Field(
        default=None,
        description="Ziel-Kanal für die Antwort"
    )
    meta: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Zusätzliche Metadaten"
    )


class MessageEvent(BaseModel):
    """Vollständiges Message Event Response Schema"""
    
    id: str = Field(description="Unique Event ID")
    user_id: str = Field(description="User-UUID")
    contact_id: Optional[str] = Field(
        default=None,
        description="Contact-UUID"
    )
    channel: str = Field(description="Kommunikationskanal")
    direction: str = Field(description="Nachrichtenrichtung")
    text: str = Field(description="Original-Text")
    normalized_text: str = Field(description="Normalisierter Text für KI")
    raw_payload: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Original-Payload"
    )
    suggested_reply: Optional[Dict[str, Any]] = Field(
        default=None,
        description="KI-generierter Antwortvorschlag"
    )
    autopilot_status: str = Field(
        default="pending",
        description="Autopilot Verarbeitungsstatus"
    )
    # A/B Experiment Fields
    template_version: Optional[str] = Field(
        default=None,
        description="Version des verwendeten Templates/Prompts"
    )
    persona_variant: Optional[str] = Field(
        default=None,
        description="Persona-Variante für A/B-Tests"
    )
    created_at: datetime = Field(description="Erstellungszeitpunkt")

    class Config:
        from_attributes = True


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class MessageEventResponse(BaseModel):
    """Standard API Response für Message Event"""
    
    success: bool = True
    event: MessageEvent


class MessageEventListResponse(BaseModel):
    """API Response für Liste von Message Events"""
    
    success: bool = True
    events: list[MessageEvent]
    count: int


# ============================================================================
# EXPORTS
# ============================================================================


class MessageEventStatusUpdate(BaseModel):
    """Schema zum Aktualisieren des Event-Status"""
    
    autopilot_status: str = Field(
        ...,
        description="Neuer Status: pending, suggested, approved, sent, skipped"
    )


__all__ = [
    "MessageChannel",
    "MessageDirection",
    "AutopilotStatus",
    "MessageEventCreate",
    "MessageEvent",
    "MessageEventResponse",
    "MessageEventListResponse",
    "SuggestedReply",
    "MessageEventStatusUpdate",
]

