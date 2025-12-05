"""
Sales Flow AI - Zero-Input CRM Schemas

Pydantic models für das Zero-Input CRM System:
- Automatische Zusammenfassungen nach Calls/Chats
- Task-Generierung basierend auf Konversationen
- Deal-Status Updates
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# ENUMS
# ============================================================================


class NoteType(str, Enum):
    """Art der CRM Note"""
    
    MANUAL = "manual"           # Manuell erstellt
    AI_SUMMARY = "ai_summary"   # KI-generierte Zusammenfassung
    CALL_SUMMARY = "call_summary"     # Call-Zusammenfassung
    MEETING_SUMMARY = "meeting_summary"  # Meeting-Zusammenfassung


class NoteSource(str, Enum):
    """Quelle der CRM Note"""
    
    USER = "user"                  # Manuell vom User
    ZERO_INPUT_CRM = "zero_input_crm"  # Zero-Input CRM System
    AUTOPILOT = "autopilot"        # Autopilot System
    IMPORT = "import"              # Import


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class ZeroInputRequest(BaseModel):
    """
    Request für Zero-Input CRM Zusammenfassung.
    
    Triggert die automatische Zusammenfassung + Task-Generierung
    für einen bestimmten Lead/Contact.
    """
    
    lead_id: Optional[str] = Field(
        default=None,
        description="UUID des Leads (optional wenn contact_id gesetzt)"
    )
    contact_id: Optional[str] = Field(
        default=None,
        description="UUID des Contacts (optional wenn lead_id gesetzt)"
    )
    deal_id: Optional[str] = Field(
        default=None,
        description="UUID des Deals (optional, für Deal-Status Updates)"
    )
    message_limit: int = Field(
        default=20,
        ge=5,
        le=100,
        description="Max. Anzahl der message_events für Zusammenfassung"
    )
    create_task: bool = Field(
        default=True,
        description="Ob ein Task für den nächsten Schritt erstellt werden soll"
    )
    update_deal_status: bool = Field(
        default=False,
        description="Ob der Deal-Status aktualisiert werden soll (V2)"
    )


class CRMNoteCreate(BaseModel):
    """Schema zum Erstellen einer CRM Note"""
    
    lead_id: Optional[str] = Field(default=None, description="Lead-UUID")
    contact_id: Optional[str] = Field(default=None, description="Contact-UUID")
    deal_id: Optional[str] = Field(default=None, description="Deal-UUID")
    content: str = Field(..., min_length=1, description="Note-Inhalt")
    note_type: NoteType = Field(default=NoteType.MANUAL, description="Art der Note")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Zusätzliche Metadaten")


class CRMNoteUpdate(BaseModel):
    """Schema zum Aktualisieren einer CRM Note"""
    
    content: Optional[str] = Field(default=None, min_length=1, description="Note-Inhalt")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Zusätzliche Metadaten")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class CRMNote(BaseModel):
    """Vollständiges CRM Note Response Schema"""
    
    id: str = Field(description="Unique Note ID")
    user_id: str = Field(description="User-UUID")
    lead_id: Optional[str] = Field(default=None, description="Lead-UUID")
    contact_id: Optional[str] = Field(default=None, description="Contact-UUID")
    deal_id: Optional[str] = Field(default=None, description="Deal-UUID")
    content: str = Field(description="Note-Inhalt")
    note_type: str = Field(description="Art der Note")
    source: str = Field(description="Quelle der Note")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadaten")
    created_at: datetime = Field(description="Erstellungszeitpunkt")
    updated_at: datetime = Field(description="Letzte Aktualisierung")
    
    class Config:
        from_attributes = True


class SuggestedNextStep(BaseModel):
    """Vorgeschlagener nächster Schritt"""
    
    action: str = Field(description="Empfohlene Aktion (z.B. Follow-up Call)")
    description: str = Field(description="Beschreibung des nächsten Schritts")
    priority: str = Field(default="normal", description="Priorität: low, normal, high, urgent")
    suggested_due_days: int = Field(
        default=2,
        ge=0,
        le=30,
        description="Vorgeschlagene Tage bis zur Fälligkeit"
    )


class ConversationSummary(BaseModel):
    """Zusammenfassung einer Konversation"""
    
    summary_text: str = Field(description="Zusammenfassung in Bulletpoints")
    key_topics: List[str] = Field(default_factory=list, description="Hauptthemen")
    sentiment: str = Field(default="neutral", description="Stimmung: positive, neutral, negative")
    engagement_level: str = Field(default="medium", description="Engagement: low, medium, high")


class ZeroInputResponse(BaseModel):
    """Response für Zero-Input CRM Zusammenfassung"""
    
    success: bool = Field(default=True, description="Ob die Verarbeitung erfolgreich war")
    
    # Zusammenfassung
    summary: ConversationSummary = Field(description="Konversations-Zusammenfassung")
    
    # Note
    note_id: Optional[str] = Field(default=None, description="ID der erstellten CRM Note")
    note_content: str = Field(description="Inhalt der Note")
    
    # Task
    task_id: Optional[str] = Field(default=None, description="ID des erstellten Tasks")
    suggested_next_step: Optional[SuggestedNextStep] = Field(
        default=None,
        description="Vorgeschlagener nächster Schritt"
    )
    
    # Kontext
    lead_id: Optional[str] = Field(default=None, description="Lead-UUID")
    contact_id: Optional[str] = Field(default=None, description="Contact-UUID")
    deal_id: Optional[str] = Field(default=None, description="Deal-UUID")
    messages_analyzed: int = Field(default=0, description="Anzahl analysierter Nachrichten")
    
    # Meta
    processing_time_ms: int = Field(default=0, description="Verarbeitungszeit in ms")
    model_used: str = Field(default="unknown", description="Verwendetes AI-Model")


class CRMNotesListResponse(BaseModel):
    """Response für Liste von CRM Notes"""
    
    success: bool = True
    notes: List[CRMNote]
    count: int


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    # Enums
    "NoteType",
    "NoteSource",
    # Request Schemas
    "ZeroInputRequest",
    "CRMNoteCreate",
    "CRMNoteUpdate",
    # Response Schemas
    "CRMNote",
    "SuggestedNextStep",
    "ConversationSummary",
    "ZeroInputResponse",
    "CRMNotesListResponse",
]

