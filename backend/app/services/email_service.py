"""
Email Integration Service
Supports: Gmail, Outlook, SendGrid
"""

import os
from typing import Dict, Optional, List
import asyncio


class EmailService:
    """Email Sending and Integration"""
    
    def __init__(self):
        self.provider = os.getenv('EMAIL_PROVIDER', 'sendgrid')
    
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Send email via configured provider
        
        Args:
            to: Recipient email
            subject: Email subject
            body: Email body (plain text or HTML)
            html: Whether body is HTML
            cc: CC recipients
            bcc: BCC recipients
            attachments: List of attachments [{'filename': str, 'content': bytes, 'type': str}]
            
        Returns:
            dict: { 'success': bool, 'message_id': str, 'response': dict }
        """
        
        try:
            if self.provider == 'sendgrid':
                return await self._send_sendgrid(to, subject, body, html, cc, bcc, attachments)
            elif self.provider == 'gmail':
                return await self._send_gmail(to, subject, body, html, cc, bcc, attachments)
            elif self.provider == 'outlook':
                return await self._send_outlook(to, subject, body, html, cc, bcc, attachments)
            else:
                raise ValueError(f"Unknown email provider: {self.provider}")
        except Exception as e:
            print(f"Email send error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _send_sendgrid(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """Send via SendGrid API"""
        
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
            import base64
        except ImportError:
            raise ImportError("SendGrid SDK not installed. Run: pip install sendgrid")
        
        api_key = os.getenv('SENDGRID_API_KEY')
        from_email = os.getenv('FROM_EMAIL', 'noreply@salesflow.ai')
        
        if not api_key:
            raise ValueError("SendGrid API key not configured")
        
        message = Mail(
            from_email=from_email,
            to_emails=to,
            subject=subject,
            plain_text_content=body if not html else None,
            html_content=body if html else None
        )
        
        # Add CC/BCC
        if cc:
            message.cc = cc
        if bcc:
            message.bcc = bcc
        
        # Add attachments
        if attachments:
            for att in attachments:
                encoded_file = base64.b64encode(att['content']).decode()
                
                attachment = Attachment(
                    FileContent(encoded_file),
                    FileName(att['filename']),
                    FileType(att.get('type', 'application/octet-stream')),
                    Disposition('attachment')
                )
                message.add_attachment(attachment)
        
        sg = SendGridAPIClient(api_key)
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: sg.send(message)
        )
        
        return {
            'success': response.status_code == 202,
            'message_id': response.headers.get('X-Message-Id'),
            'status_code': response.status_code,
            'response': {
                'status_code': response.status_code,
                'body': response.body,
                'headers': dict(response.headers)
            }
        }
    
    async def _send_gmail(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """Send via Gmail API"""
        
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from email.mime.base import MIMEBase
            from email import encoders
            import base64
        except ImportError:
            raise ImportError("Google API client not installed. Run: pip install google-api-python-client google-auth")
        
        # Load credentials from environment or file
        # This is simplified - in production, implement proper OAuth flow
        credentials_file = os.getenv('GMAIL_CREDENTIALS_FILE')
        if not credentials_file:
            raise ValueError("Gmail credentials not configured")
        
        # Build message
        if attachments:
            message = MIMEMultipart()
        else:
            message = MIMEText(body, 'html' if html else 'plain')
        
        message['to'] = to
        message['subject'] = subject
        message['from'] = os.getenv('FROM_EMAIL', 'noreply@salesflow.ai')
        
        if cc:
            message['cc'] = ', '.join(cc)
        if bcc:
            message['bcc'] = ', '.join(bcc)
        
        if attachments:
            message.attach(MIMEText(body, 'html' if html else 'plain'))
            
            for att in attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(att['content'])
                encoders.encode_base64(part)
                part.add_header('Content-Disposition', f'attachment; filename={att["filename"]}')
                message.attach(part)
        
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send via Gmail API
        # Note: This requires proper OAuth setup
        creds = Credentials.from_authorized_user_file(credentials_file)
        service = build('gmail', 'v1', credentials=creds)
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
        )
        
        return {
            'success': True,
            'message_id': result['id'],
            'response': result
        }
    
    async def _send_outlook(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None
    ) -> Dict:
        """Send via Microsoft Graph API (Outlook)"""
        
        import requests
        
        access_token = os.getenv('OUTLOOK_ACCESS_TOKEN')
        
        if not access_token:
            raise ValueError("Outlook access token not configured")
        
        url = "https://graph.microsoft.com/v1.0/me/sendMail"
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'message': {
                'subject': subject,
                'body': {
                    'contentType': 'HTML' if html else 'Text',
                    'content': body
                },
                'toRecipients': [
                    {'emailAddress': {'address': to}}
                ]
            }
        }
        
        # Add CC/BCC
        if cc:
            payload['message']['ccRecipients'] = [
                {'emailAddress': {'address': addr}} for addr in cc
            ]
        if bcc:
            payload['message']['bccRecipients'] = [
                {'emailAddress': {'address': addr}} for addr in bcc
            ]
        
        # Add attachments (simplified - requires file upload)
        if attachments:
            payload['message']['attachments'] = [
                {
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    'name': att['filename'],
                    'contentType': att.get('type', 'application/octet-stream'),
                    'contentBytes': att['content'].decode() if isinstance(att['content'], bytes) else att['content']
                }
                for att in attachments
            ]
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: requests.post(url, json=payload, headers=headers)
        )
        
        return {
            'success': response.status_code == 202,
            'message_id': None,  # Graph API doesn't return message ID
            'status_code': response.status_code,
            'response': response.json() if response.text else {}
        }
    
    async def track_email_open(self, message_id: str) -> Dict:
        """
        Track email open (requires tracking pixel implementation)
        """
        # To implement: Store tracking pixel URL in email
        # When pixel is loaded, mark as opened
        pass
    
    async def track_email_click(self, message_id: str, link_url: str) -> Dict:
        """
        Track email link click (requires link wrapping)
        """
        # To implement: Wrap links with tracking redirects
        pass


# Singleton instance
email_service = EmailService()

