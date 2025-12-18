"""
WhatsApp Business API Adapter

Implements ChannelAdapter for WhatsApp messaging via Meta Business API.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Dict, Any

import httpx

from .base import ChannelAdapter, ChannelPayload, SendResult, NormalizedMessage

logger = logging.getLogger(__name__)


class WhatsAppAdapter:
    """
    WhatsApp Business API Adapter.
    
    Requires:
    - WhatsApp Business Account
    - Meta Business API Access Token
    - Phone Number ID (from Meta Business Manager)
    
    Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
    """
    
    # WhatsApp Limits
    MAX_LENGTH = 4096
    
    def __init__(self, api_key: str, phone_number_id: str):
        """
        Initialize WhatsApp adapter.
        
        Args:
            api_key: Meta Business API Access Token
            phone_number_id: WhatsApp Business Phone Number ID
        """
        self.api_key = api_key
        self.phone_number_id = phone_number_id
        self.base_url = "https://graph.facebook.com/v18.0"
    
    def prepare_outgoing(self, message: NormalizedMessage) -> ChannelPayload:
        """
        Prepare message for WhatsApp.
        
        WhatsApp specifics:
        - Max 4096 characters
        - Emojis allowed
        - No HTML
        - E.164 phone number format required (+49123...)
        """
        # Truncate if too long
        text = message["text"][:self.MAX_LENGTH]
        
        # Get phone number from metadata
        phone = message["metadata"].get("phone_number") or message["metadata"].get("whatsapp_number")
        
        if not phone:
            raise ValueError("WhatsApp requires phone_number in metadata")
        
        # Ensure E.164 format
        if not phone.startswith("+"):
            phone = f"+{phone}"
        
        if not self.validate_recipient(phone):
            raise ValueError(f"Invalid WhatsApp phone number: {phone}")
        
        return ChannelPayload(
            to=phone,
            message=text,
            metadata={
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "type": "text"
            },
            channel="whatsapp"
        )
    
    async def send(self, payload: ChannelPayload) -> SendResult:
        """
        Send message via WhatsApp Business API.
        
        Returns:
            SendResult with success status and WhatsApp message ID
        """
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            
            body = {
                "messaging_product": "whatsapp",
                "to": payload.to,
                "type": "text",
                "text": {
                    "body": payload.message
                }
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
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
                    wa_message_id = data.get("messages", [{}])[0].get("id")
                    
                    logger.info(f"WhatsApp message sent: {wa_message_id}")
                    
                    return SendResult(
                        success=True,
                        message_id=wa_message_id,
                        error=None,
                        sent_at=datetime.utcnow(),
                        metadata={"whatsapp_message_id": wa_message_id}
                    )
                else:
                    error_msg = f"WhatsApp API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    
                    return SendResult(
                        success=False,
                        message_id=None,
                        error=error_msg,
                        sent_at=None
                    )
        
        except httpx.TimeoutException:
            error_msg = "WhatsApp API timeout after 30s"
            logger.error(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
        
        except Exception as e:
            error_msg = f"WhatsApp send error: {str(e)}"
            logger.exception(error_msg)
            return SendResult(
                success=False,
                message_id=None,
                error=error_msg,
                sent_at=None
            )
    
    def validate_recipient(self, recipient: str) -> bool:
        """
        Validate E.164 phone number format.
        
        Format: +[country_code][number]
        Example: +491234567890
        
        Args:
            recipient: Phone number
            
        Returns:
            True if valid E.164 format
        """
        # E.164 Format: +[1-9]\d{1,14}
        pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(pattern, recipient))
    
    def supports_feature(self, feature: str) -> bool:
        """
        Check WhatsApp feature support.
        
        Supported:
        - read_receipts
        - delivery_tracking
        - emojis
        - attachments (images, documents)
        
        Not supported:
        - html
        - rich_text
        """
        supported = [
            "read_receipts",
            "delivery_tracking",
            "emojis",
            "attachments"
        ]
        return feature in supported


__all__ = ["WhatsAppAdapter"]

