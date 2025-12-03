"""
WhatsApp Integration Service
Supports: 360dialog, UltraMsg, Twilio
"""

import os
import requests
from typing import Dict, Optional
import asyncio


class WhatsAppService:
    """WhatsApp Message Sending"""
    
    def __init__(self):
        self.provider = os.getenv('WHATSAPP_PROVIDER', 'ultramsg')
    
    async def send_message(
        self,
        to: str,
        message: str,
        media_url: Optional[str] = None
    ) -> Dict:
        """
        Send WhatsApp message via configured provider
        
        Args:
            to: Phone number (international format, e.g. +4367612345678)
            message: Message body
            media_url: Optional media URL (image, video, document)
            
        Returns:
            dict: { 'success': bool, 'message_id': str, 'response': dict }
        """
        
        # Normalize phone number
        to = self._normalize_phone(to)
        
        try:
            if self.provider == 'ultramsg':
                return await self._send_ultramsg(to, message, media_url)
            elif self.provider == '360dialog':
                return await self._send_360dialog(to, message, media_url)
            elif self.provider == 'twilio':
                return await self._send_twilio(to, message, media_url)
            else:
                raise ValueError(f"Unknown WhatsApp provider: {self.provider}")
        except Exception as e:
            print(f"WhatsApp send error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _send_ultramsg(
        self,
        to: str,
        message: str,
        media_url: Optional[str] = None
    ) -> Dict:
        """Send via UltraMsg API"""
        
        instance_id = os.getenv('ULTRAMSG_INSTANCE_ID')
        token = os.getenv('ULTRAMSG_TOKEN')
        
        if not instance_id or not token:
            raise ValueError("UltraMsg credentials not configured")
        
        url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
        
        payload = {
            'token': token,
            'to': to,
            'body': message
        }
        
        # Add media if provided
        if media_url:
            # Detect media type
            if any(ext in media_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                url = f"https://api.ultramsg.com/{instance_id}/messages/image"
                payload['image'] = media_url
                payload['caption'] = message
                del payload['body']
            elif any(ext in media_url.lower() for ext in ['.pdf', '.doc', '.docx']):
                url = f"https://api.ultramsg.com/{instance_id}/messages/document"
                payload['document'] = media_url
                payload['filename'] = media_url.split('/')[-1]
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(url, data=payload)
        )
        
        response_data = response.json()
        
        return {
            'success': response.status_code == 200 and response_data.get('sent') == 'true',
            'message_id': response_data.get('id'),
            'response': response_data
        }
    
    async def _send_360dialog(
        self,
        to: str,
        message: str,
        media_url: Optional[str] = None
    ) -> Dict:
        """Send via 360dialog Cloud API"""
        
        api_key = os.getenv('DIALOG360_API_KEY')
        phone_number_id = os.getenv('DIALOG360_PHONE_NUMBER_ID')
        
        if not api_key or not phone_number_id:
            raise ValueError("360dialog credentials not configured")
        
        url = f"https://waba.360dialog.io/v1/messages"
        
        headers = {
            'D360-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        payload = {
            'to': to,
            'type': 'text',
            'text': {
                'body': message
            }
        }
        
        # Add media if provided
        if media_url:
            if any(ext in media_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                payload['type'] = 'image'
                payload['image'] = {
                    'link': media_url,
                    'caption': message
                }
                del payload['text']
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(url, json=payload, headers=headers)
        )
        
        response_data = response.json()
        
        return {
            'success': response.status_code == 200,
            'message_id': response_data.get('messages', [{}])[0].get('id'),
            'response': response_data
        }
    
    async def _send_twilio(
        self,
        to: str,
        message: str,
        media_url: Optional[str] = None
    ) -> Dict:
        """Send via Twilio WhatsApp API"""
        
        try:
            from twilio.rest import Client
        except ImportError:
            raise ImportError("Twilio SDK not installed. Run: pip install twilio")
        
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        
        if not account_sid or not auth_token:
            raise ValueError("Twilio credentials not configured")
        
        client = Client(account_sid, auth_token)
        
        # Ensure 'whatsapp:' prefix
        if not to.startswith('whatsapp:'):
            to = f'whatsapp:{to}'
        
        if not from_number.startswith('whatsapp:'):
            from_number = f'whatsapp:{from_number}'
        
        message_params = {
            'from_': from_number,
            'body': message,
            'to': to
        }
        
        # Add media if provided
        if media_url:
            message_params['media_url'] = [media_url]
        
        loop = asyncio.get_event_loop()
        twilio_message = await loop.run_in_executor(
            None,
            lambda: client.messages.create(**message_params)
        )
        
        return {
            'success': twilio_message.status in ['queued', 'sent', 'delivered'],
            'message_id': twilio_message.sid,
            'response': {
                'sid': twilio_message.sid,
                'status': twilio_message.status
            }
        }
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to international format"""
        
        # Remove common separators
        phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Add + if missing
        if not phone.startswith('+'):
            # Assume German number if no country code
            if phone.startswith('0'):
                phone = '+43' + phone[1:]  # Austria
            else:
                phone = '+' + phone
        
        return phone
    
    async def get_webhook_handler(self):
        """
        Webhook handler for incoming WhatsApp messages
        To be implemented based on provider
        """
        pass


# Singleton instance
whatsapp_service = WhatsAppService()
