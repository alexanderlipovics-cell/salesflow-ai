"""
Pydantic-Schemas für das Sales Flow AI Backend.
"""

from __future__ import annotations

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


__all__ = [
    "ActionType",
    "ChatRole",
    "ChatMessage",
    "LeadData",
    "ActionData",
    "ActionRequest",
    "ActionResponse",
]
