"""
Channel Adapters for Autopilot Engine V2

Multi-channel messaging support for:
- WhatsApp (Meta Business API)
- Email (SMTP)
- LinkedIn (LinkedIn Messaging API)
- Instagram (Facebook Graph API)
"""

from .base import ChannelAdapter, ChannelPayload, SendResult, NormalizedMessage
from .registry import get_channel_adapter, SUPPORTED_CHANNELS

__all__ = [
    "ChannelAdapter",
    "ChannelPayload",
    "SendResult",
    "NormalizedMessage",
    "get_channel_adapter",
    "SUPPORTED_CHANNELS",
]

