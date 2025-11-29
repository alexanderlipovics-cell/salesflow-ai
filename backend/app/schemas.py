"""
Pydantic-Schemas für das Sales Flow AI Backend.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

ActionType = Literal[
    "chat",
    "generate_message",
    "analyze_lead",
    "create_template",
    "knowledge_answer",
]

ChatRole = Literal["user", "assistant", "system"]


class ChatMessage(BaseModel):
    """Repräsentiert eine einzelne Konversationsnachricht."""

    role: ChatRole
    content: str = Field(..., min_length=1)


class LeadData(BaseModel):
    """Optionaler Lead-Kontext, der von der KI genutzt werden kann."""

    name: Optional[str] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    notes: Optional[str] = None
    disg_type: Optional[Literal["D", "I", "S", "G"]] = Field(
        default=None, alias="disg_type"
    )
    extra: Dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class ActionData(BaseModel):
    """Payload pro Action mit Nachrichten, Lead- und Knowledge-Kontext."""

    messages: List[ChatMessage] = Field(default_factory=list)
    lead: Optional[LeadData] = None
    knowledge: Optional[str] = None


class ActionRequest(BaseModel):
    """Eingehende Anfrage an POST /ai."""

    action: ActionType
    data: ActionData = Field(default_factory=ActionData)


class ActionResponse(BaseModel):
    """Antwortformat des Backends."""

    action: ActionType
    reply: str


class ImportSummary(BaseModel):
    """Antwortformat für den Lead-Import."""

    total_rows: int
    imported_count: int
    updated_count: int
    needs_action_count: int
    without_last_contact_count: int
    errors: Optional[List[str]] = None
    total: int
    with_ai_status: int
    without_status: int
    auto_scheduled_count: int = 0
    needs_manual_action_count: int = 0
    without_last_contact_count: int = 0


class LeadListItem(BaseModel):
    """Leichtgewichtiger Lead-Eintrag für Übersichten."""

    id: Optional[str | int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    last_contact: Optional[str] = None


class DailyCommandItem(BaseModel):
    """Lead-Eintrag für das Daily Sales Command."""

    id: str | int
    name: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    deal_value: Optional[float] = None
    needs_action: bool = False


class DailyCommandResponse(BaseModel):
    """Antwortformat für das Daily Sales Command."""

    items: List[DailyCommandItem] = Field(default_factory=list)


class NeedsActionResponse(BaseModel):
    """Antwortformat für Leads mit needs_action = true."""

    leads: List[LeadListItem] = Field(default_factory=list)


class DailyCommandItem(BaseModel):
    """Ein Lead, der für den Daily Sales Command priorisiert wurde."""

    id: str | int
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    next_action: Optional[str] = None
    next_action_at: Optional[datetime] = None
    deal_value: Optional[float] = None
    needs_action: bool


class DailyCommandResponse(BaseModel):
    """Antwortformat für den Daily Sales Command."""

    items: List[DailyCommandItem] = Field(default_factory=list)


__all__ = [
    "ActionType",
    "ChatRole",
    "ChatMessage",
    "LeadData",
    "ActionData",
    "ActionRequest",
    "ActionResponse",
    "ImportSummary",
    "LeadListItem",
    "DailyCommandItem",
    "DailyCommandResponse",
    "NeedsActionResponse",
    "DailyCommandItem",
    "DailyCommandResponse",
]
