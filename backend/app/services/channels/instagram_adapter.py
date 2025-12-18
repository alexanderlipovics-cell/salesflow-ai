"""
Instagram Messaging API Adapter

Implements ChannelAdapter for Instagram DMs via Facebook Graph API.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict

import httpx

from .base import ChannelAdapter, ChannelPayload, NormalizedMessage, SendResult

logger = logging.getLogger(__name__)


class InstagramAdapter:
    """
    Instagram Messaging API Adapter (via Facebook Graph API).
    
    Requires:
    - Instagram Business Account
    - Facebook Page Access Token
    - Instagram Account connected to Facebook Page
    
    Docs: https://developers.facebook.com/docs/messenger-platform/instagram
    """
    
    MAX_LENGTH = 1000
    
    def __init__(self, page_access_token: str, instagram_account_id: str):
        """
        Initialize Instagram adapter.
        
        Args:
            page_access_token: Facebook Page Access Token
            instagram_account_id: Instagram Business Account ID
        """
        self.access_token = page_access_token
        self.instagram_account_id = instagram_account_id
        self.base_url = "https://graph.facebook.com/v18.0"
    
    def prepare_outgoing(self, message: NormalizedMessage) -> ChannelPayload:
        """
        Prepare message for Instagram.
        
        Instagram specifics:
        - Max ~1000 characters
        - Emojis welcome
        - No HTML
        - Casual tone
        """
        text = message["text"][:self.MAX_LENGTH]
        
        # Get Instagram user ID (IGSID)
        instagram_user_id = message["metadata"].get("instagram_user_id") or message["metadata"].get("instagram_id")
        
        if not instagram_user_id:
            raise ValueError("Instagram requires instagram_user_id in metadata")
        
        if not self.validate_recipient(instagram_user_id):
            raise ValueError(f"Invalid Instagram user ID: {instagram_user_id}")
        
        return ChannelPayload(
            to=instagram_user_id,
            message=text,
            metadata={
                "messaging_type": "RESPONSE"  # or MESSAGE_TAG for 24h+ window
            },
            channel="instagram"
        )
    
    async def send(self, payload: ChannelPayload) -> SendResult:
        """
        Send message via Instagram/Facebook Graph API.
        
        Returns:
            SendResult with success status and Instagram message ID
        """
        try:
            url = f"{self.base_url}/me/messages"
            
            body = {
                "recipient": {"id": payload.to},
                "message": {"text": payload.message},
                "messaging_type": payload.metadata.get("messaging_type", "RESPONSE")
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=body,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    message_id = data.get("message_id")
                    
                    logger.info(f"Instagram message sent: {message_id}")
                    
                    return SendResult(
                        success=True,
                        message_id=message_id,
                        error=None,
                        sent_at=datetime.utcnow()
                    )
                else:
                    error_msg = f"Instagram API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    return SendResult(
                        success=False,
                        message_id=None,
                        error=error_msg,
                        sent_at=None
                    )
        
        except Exception as e:
            error_msg = f"Instagram send error: {str(e)}"
            logger.exception(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate Instagram user ID (IGSID).
        
        Format: Usually numeric
        
        Args:
            recipient: Instagram user ID
            
        Returns:
            True if valid format
        """
        return recipient.isdigit() or recipient.startswith("ig:")
    
    def supports_feature(self, feature: str) -> bool:
        """
        Instagram feature support.
        
        Supported:
        - read_receipts
        - emojis
        - attachments (images)
        
        Not supported:
        - html
        - rich_text
        """
        supported = ["read_receipts", "emojis", "attachments"]
        return feature in supported


__all__ = ["InstagramAdapter"]

