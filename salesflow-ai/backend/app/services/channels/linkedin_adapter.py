"""
LinkedIn Messaging API Adapter

Implements ChannelAdapter for LinkedIn direct messages.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Dict

import httpx

from .base import ChannelAdapter, ChannelPayload, NormalizedMessage, SendResult

logger = logging.getLogger(__name__)


class LinkedInAdapter:
    """
    LinkedIn Messaging API Adapter.
    
    Requires:
    - LinkedIn OAuth Access Token
    - Permissions: w_member_social
    
    Docs: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
    """
    
    MAX_LENGTH = 1300  # LinkedIn message limit
    
    def __init__(self, access_token: str):
        """
        Initialize LinkedIn adapter.
        
        Args:
            access_token: LinkedIn OAuth 2.0 Access Token
        """
        self.access_token = access_token
        self.base_url = "https://api.linkedin.com/v2"
    
    def prepare_outgoing(self, message: NormalizedMessage) -> ChannelPayload:
        """
        Prepare message for LinkedIn.
        
        LinkedIn specifics:
        - Max 1300 characters
        - Professional tone preferred
        - No HTML
        - Fewer emojis recommended
        """
        # Truncate if too long
        text = message["text"][:self.MAX_LENGTH]
        
        # LinkedIn prefers professional tone - remove excessive emojis
        # (optional: could strip all emojis or limit to 1-2)
        text_cleaned = re.sub(r'[^\w\s,.!?-äöüßÄÖÜ]', '', text)
        
        # Get LinkedIn ID from metadata
        linkedin_id = message["metadata"].get("linkedin_id")
        
        if not linkedin_id:
            raise ValueError("LinkedIn requires linkedin_id in metadata")
        
        if not self.validate_recipient(linkedin_id):
            raise ValueError(f"Invalid LinkedIn ID: {linkedin_id}")
        
        return ChannelPayload(
            to=linkedin_id,
            message=text_cleaned,
            metadata={
                "type": "direct_message"
            },
            channel="linkedin"
        )
    
    async def send(self, payload: ChannelPayload) -> SendResult:
        """
        Send message via LinkedIn API.
        
        Returns:
            SendResult with success status and LinkedIn message ID
        """
        try:
            url = f"{self.base_url}/messages"
            
            body = {
                "recipients": [payload.to],
                "message": {
                    "body": payload.message
                }
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=body,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    message_id = data.get("id") or data.get("value", {}).get("messageId")
                    
                    logger.info(f"LinkedIn message sent: {message_id}")
                    
                    return SendResult(
                        success=True,
                        message_id=message_id,
                        error=None,
                        sent_at=datetime.utcnow()
                    )
                else:
                    error_msg = f"LinkedIn API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    return SendResult(
                        success=False,
                        message_id=None,
                        error=error_msg,
                        sent_at=None
                    )
        
        except Exception as e:
            error_msg = f"LinkedIn send error: {str(e)}"
            logger.exception(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate LinkedIn URN format.
        
        Format: urn:li:person:XXXXX
        
        Args:
            recipient: LinkedIn person URN
            
        Returns:
            True if valid LinkedIn URN
        """
        return recipient.startswith("urn:li:person:")
    
    def supports_feature(self, feature: str) -> bool:
        """
        LinkedIn feature support.
        
        Supported:
        - delivery_tracking
        
        Not supported:
        - html
        - rich_text
        - attachments (limited)
        - emojis (not recommended)
        """
        supported = ["delivery_tracking"]
        return feature in supported


__all__ = ["LinkedInAdapter"]

