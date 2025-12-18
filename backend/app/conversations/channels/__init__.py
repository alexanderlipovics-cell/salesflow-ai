"""SalesFlow AI - Channel Adapters"""

from .base import BaseChannel, StandardMessage
from .whatsapp import WhatsAppChannel

__all__ = ["BaseChannel", "StandardMessage", "WhatsAppChannel"]

