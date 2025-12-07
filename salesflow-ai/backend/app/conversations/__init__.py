"""SalesFlow AI - Conversation Engine 2.0"""

from .memory.manager import HybridMemoryManager
from .channels.base import BaseChannel, StandardMessage
from .channels.whatsapp import WhatsAppChannel
from .router_logic import handle_incoming_webhook

__all__ = [
    "HybridMemoryManager",
    "BaseChannel",
    "StandardMessage",
    "WhatsAppChannel",
    "handle_incoming_webhook",
]

