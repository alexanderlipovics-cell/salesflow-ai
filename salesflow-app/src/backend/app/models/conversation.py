"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CONVERSATION MODEL                                                         ║
║  Conversation Timeline für Kontakte                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS (für API)
# ═══════════════════════════════════════════════════════════════════════════

class ConversationEntryCreate(BaseModel):
    """Schema für neue Conversation Entry."""
    contact_id: str = Field(..., description="Kontakt ID")
    type: str = Field(
        ...,
        description="Typ: email_sent, email_received, whatsapp_sent, whatsapp_received, call, note, meeting"
    )
    channel: str = Field(
        ...,
        description="Kanal: email, whatsapp, linkedin, phone, in_person, sms"
    )
    direction: str = Field(
        ...,
        description="Richtung: outbound, inbound"
    )
    subject: Optional[str] = Field(None, description="Betreff (für Email)")
    content: str = Field(..., description="Inhalt/Nachricht")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Zusätzliche Metadaten (z.B. opened, clicked, duration)"
    )


class ConversationEntryUpdate(BaseModel):
    """Schema für Update einer Conversation Entry."""
    subject: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ConversationEntryResponse(BaseModel):
    """Response Schema für Conversation Entry."""
    id: str
    contact_id: str
    type: str
    channel: str
    direction: str
    subject: Optional[str] = None
    content: str
    timestamp: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationTimelineResponse(BaseModel):
    """Response für Timeline mit allen Einträgen."""
    contact_id: str
    entries: list[ConversationEntryResponse]
    total: int
    channels: list[str] = Field(default_factory=list, description="Verfügbare Kanäle")


# ═══════════════════════════════════════════════════════════════════════════
# DATACLASS (für interne Verwendung)
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ConversationEntry:
    """
    Conversation Entry Model.
    
    Repräsentiert eine einzelne Interaktion mit einem Kontakt.
    """
    id: str
    contact_id: str
    type: str  # "email_sent", "email_received", "whatsapp_sent", "call", "note", "meeting"
    channel: str  # "email", "whatsapp", "linkedin", "phone", "in_person", "sms"
    direction: str  # "outbound", "inbound"
    subject: Optional[str] = None
    content: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary."""
        return {
            "id": self.id,
            "contact_id": self.contact_id,
            "type": self.type,
            "channel": self.channel,
            "direction": self.direction,
            "subject": self.subject,
            "content": self.content,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "updated_at": self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationEntry":
        """Erstellt aus Dictionary."""
        # Parse datetime strings
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
        
        return cls(**data)


# ═══════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

CONVERSATION_TYPES = {
    "email_sent": "📧 Email gesendet",
    "email_received": "📧 Email erhalten",
    "whatsapp_sent": "💬 WhatsApp gesendet",
    "whatsapp_received": "💬 WhatsApp erhalten",
    "sms_sent": "📱 SMS gesendet",
    "sms_received": "📱 SMS erhalten",
    "call": "📞 Anruf",
    "note": "📝 Notiz",
    "meeting": "🤝 Meeting",
    "linkedin_message": "💼 LinkedIn Nachricht",
}

CONVERSATION_CHANNELS = {
    "email": "📧 Email",
    "whatsapp": "💬 WhatsApp",
    "sms": "📱 SMS",
    "linkedin": "💼 LinkedIn",
    "phone": "📞 Telefon",
    "in_person": "🤝 Persönlich",
}

CONVERSATION_DIRECTIONS = {
    "outbound": "Ausgehend",
    "inbound": "Eingehend",
}

