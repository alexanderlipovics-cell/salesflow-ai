# backend/app/conversations/channels/base.py

from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Optional, Dict, Any


class StandardMessage(BaseModel):
    """
    Das universelle Nachrichtenformat.
    Egal ob Email oder WhatsApp, intern nutzen wir NUR das.
    """
    lead_id: Optional[str] = None
    channel_identity_id: Optional[str] = None
    content: str
    content_type: str = "text"  # text, image, audio, template
    metadata: Dict[str, Any] = {}


class BaseChannel(ABC):
    """Abstract Base Class für alle Kanäle"""
    
    @abstractmethod
    async def send(self, recipient_id: str, message: StandardMessage) -> bool:
        pass

    @abstractmethod
    async def normalize_webhook(self, payload: Dict) -> StandardMessage:
        pass

