"""
Base Channel Adapter Protocol

Defines the interface that all channel adapters must implement.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional, Protocol, TypedDict


class NormalizedMessage(TypedDict):
    """Channel-agnostic message object"""
    
    id: str  # Unique Message ID
    user_id: str
    contact_id: Optional[str]
    channel: str  # whatsapp, email, linkedin, instagram
    direction: str  # inbound, outbound
    text: str  # Normalized message text
    metadata: Dict[str, Any]  # Channel-specific data
    timestamp: datetime
    
    # Scheduling
    scheduled_for: Optional[datetime]  # When to send?
    timezone: Optional[str]  # Contact timezone
    
    # AI & Confidence
    detected_action: Optional[str]  # objection_handler, follow_up, etc.
    confidence_score: Optional[float]  # 0.0-1.0
    
    # A/B Testing
    experiment_id: Optional[str]
    variant_id: Optional[str]  # A, B, C


@dataclass
class ChannelPayload:
    """Channel-specific payload ready to send"""
    
    to: str  # Recipient (email, phone, user_id)
    message: str  # Formatted message text
    metadata: Dict[str, Any]  # Channel-specific fields
    channel: str


@dataclass
class SendResult:
    """Result of a send operation"""
    
    success: bool
    message_id: Optional[str]  # Channel message ID
    error: Optional[str]
    sent_at: Optional[datetime]
    metadata: Optional[Dict[str, Any]] = None


class ChannelAdapter(Protocol):
    """
    Protocol (Interface) for Channel Adapters.
    
    All channel adapters must implement these methods.
    """
    
    def prepare_outgoing(self, message: NormalizedMessage) -> ChannelPayload:
        """
        Convert normalized message to channel-specific format.
        
        Examples:
        - Email: HTML/Plaintext, Subject, CC/BCC
        - WhatsApp: 4096 char limit, Emojis allowed, no HTML
        - LinkedIn: 1300 char limit, no HTML, professional tone
        
        Args:
            message: Normalized message object
            
        Returns:
            ChannelPayload ready to send
            
        Raises:
            ValueError: If message cannot be prepared (invalid recipient, etc.)
        """
        ...
    
    async def send(self, payload: ChannelPayload) -> SendResult:
        """
        Send message via the channel.
        
        Args:
            payload: Channel-specific payload
            
        Returns:
            SendResult with success/error/message_id
        """
        ...
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate recipient format.
        
        Examples:
        - Email: RFC-5322 email validation
        - WhatsApp: E.164 phone number format (+49...)
        - LinkedIn: LinkedIn user ID (urn:li:person:...)
        
        Args:
            recipient: Recipient identifier
            
        Returns:
            True if valid, False otherwise
        """
        ...
    
    def supports_feature(self, feature: str) -> bool:
        """
        Check if channel supports a feature.
        
        Features:
        - rich_text (HTML, Markdown)
        - attachments (Images, PDFs)
        - read_receipts
        - delivery_tracking
        - emojis
        - formatting (bold, italic)
        
        Args:
            feature: Feature name
            
        Returns:
            True if supported, False otherwise
        """
        ...


__all__ = [
    "NormalizedMessage",
    "ChannelPayload",
    "SendResult",
    "ChannelAdapter",
]

