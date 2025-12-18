"""
Channel Adapter Registry

Factory for creating channel adapters.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Type

from .base import ChannelAdapter
from .email_adapter import EmailAdapter
from .instagram_adapter import InstagramAdapter
from .linkedin_adapter import LinkedInAdapter
from .whatsapp_adapter import WhatsAppAdapter

logger = logging.getLogger(__name__)

# Registry: Map channel name to adapter class
CHANNEL_ADAPTERS: Dict[str, Type] = {
    "whatsapp": WhatsAppAdapter,
    "email": EmailAdapter,
    "linkedin": LinkedInAdapter,
    "instagram": InstagramAdapter,
}

# Supported channels list
SUPPORTED_CHANNELS = list(CHANNEL_ADAPTERS.keys())


def get_channel_adapter(channel: str, config: Dict[str, Any]) -> ChannelAdapter:
    """
    Factory function to get channel adapter instance.
    
    Args:
        channel: Channel name (whatsapp, email, linkedin, instagram)
        config: Configuration dict for the adapter
        
    Returns:
        Initialized channel adapter
        
    Raises:
        ValueError: If channel is not supported
        
    Example:
        >>> adapter = get_channel_adapter("whatsapp", {
        ...     "api_key": "xxx",
        ...     "phone_number_id": "123456"
        ... })
        >>> result = await adapter.send(payload)
    """
    adapter_class = CHANNEL_ADAPTERS.get(channel)
    
    if not adapter_class:
        logger.error(f"Unknown channel: {channel}")
        raise ValueError(
            f"Channel '{channel}' not supported. "
            f"Supported channels: {', '.join(SUPPORTED_CHANNELS)}"
        )
    
    try:
        adapter = adapter_class(**config)
        logger.debug(f"Created {channel} adapter")
        return adapter
    except Exception as e:
        logger.exception(f"Error creating {channel} adapter: {e}")
        raise ValueError(f"Failed to initialize {channel} adapter: {str(e)}")


__all__ = [
    "get_channel_adapter",
    "CHANNEL_ADAPTERS",
    "SUPPORTED_CHANNELS",
]

