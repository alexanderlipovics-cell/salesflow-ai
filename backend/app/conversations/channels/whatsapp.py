# backend/app/conversations/channels/whatsapp.py

from typing import Dict
import httpx
from .base import BaseChannel, StandardMessage
from app.core.config import get_settings

settings = get_settings()


class WhatsAppChannel(BaseChannel):
    
    async def normalize_webhook(self, payload: Dict) -> StandardMessage:
        # Extrahiere Meta/Twilio Payload Logik
        # Mock-Beispiel für Meta Cloud API
        try:
            entry = payload['entry'][0]['changes'][0]['value']
            message = entry['messages'][0]
            sender_phone = message['from']
            text = message['text']['body']
            
            return StandardMessage(
                content=text,
                content_type="text",
                metadata={"source_phone": sender_phone, "platform": "whatsapp"}
            )
        except (KeyError, IndexError):
            # Fallback für Twilio Format
            try:
                sender_phone = payload.get('From', '').replace('whatsapp:', '')
                text = payload.get('Body', '')
                
                return StandardMessage(
                    content=text,
                    content_type="text",
                    metadata={"source_phone": sender_phone, "platform": "whatsapp"}
                )
            except Exception:
                raise ValueError("Invalid WhatsApp Payload")

    async def send(self, recipient_phone: str, message: StandardMessage) -> bool:
        whatsapp_phone_id = getattr(settings, 'whatsapp_phone_id', None)
        whatsapp_token = getattr(settings, 'whatsapp_token', None)
        
        if not whatsapp_phone_id or not whatsapp_token:
            raise ValueError("WhatsApp credentials not configured")
        
        url = f"https://graph.facebook.com/v17.0/{whatsapp_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {whatsapp_token}",
            "Content-Type": "application/json"
        }
        data = {
            "messaging_product": "whatsapp",
            "to": recipient_phone,
            "type": "text",
            "text": {"body": message.content}
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=headers, json=data, timeout=10.0)
                return resp.status_code == 200
        except Exception:
            return False

