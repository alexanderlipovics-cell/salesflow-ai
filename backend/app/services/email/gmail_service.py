"""
Gmail Integration Service
OAuth2 + Gmail API
"""

import os
import base64
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


class GmailService:
    """Gmail API Integration"""
    
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
    ]
    
    def __init__(self, db):
        self.db = db
    
    async def get_auth_url(self, user_id: str, redirect_uri: str) -> str:
        """
        Generate OAuth2 authorization URL.
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GMAIL_CLIENT_ID"),
                    "client_secret": os.getenv("GMAIL_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Store state for CSRF protection
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store state in DB
        await self.db.execute("""
            INSERT INTO oauth_states (user_id, state, provider, created_at)
            VALUES ($1, $2, $3, NOW())
        """, user_id, state, 'gmail')
        
        return auth_url
    
    async def handle_oauth_callback(
        self,
        user_id: str,
        code: str,
        state: str,
        redirect_uri: str
    ) -> str:
        """
        Exchange authorization code for tokens and save account.
        """
        # Verify state
        stored_state = await self.db.fetchval("""
            SELECT state FROM oauth_states
            WHERE user_id = $1 AND provider = 'gmail' AND state = $2
        """, user_id, state)
        
        if not stored_state:
            raise ValueError("Invalid state parameter")
        
        # Exchange code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv("GMAIL_CLIENT_ID"),
                    "client_secret": os.getenv("GMAIL_CLIENT_SECRET"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user's email address
        service = build('gmail', 'v1', credentials=credentials)
        profile = service.users().getProfile(userId='me').execute()
        email_address = profile['emailAddress']
        
        # Save to database
        account_id = await self.db.fetchval("""
            INSERT INTO email_accounts (
                user_id, provider, email_address, display_name,
                access_token, refresh_token, token_expires_at,
                sync_enabled, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
            ON CONFLICT (user_id, email_address)
            DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                sync_status = 'active',
                updated_at = NOW()
            RETURNING id
        """,
            user_id,
            'gmail',
            email_address,
            email_address,
            credentials.token,
            credentials.refresh_token,
            credentials.expiry
        )
        
        # Start initial sync
        asyncio.create_task(self.sync_emails(account_id))
        
        return account_id
    
    async def sync_emails(
        self,
        account_id: str,
        max_results: int = 100
    ):
        """
        Sync emails from Gmail to our database.
        """
        # Get account
        account = await self.db.fetchrow("""
            SELECT * FROM email_accounts WHERE id = $1
        """, account_id)
        
        if not account:
            return
        
        try:
            # Build credentials
            credentials = Credentials(
                token=account['access_token'],
                refresh_token=account['refresh_token'],
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GMAIL_CLIENT_ID"),
                client_secret=os.getenv("GMAIL_CLIENT_SECRET")
            )
            
            service = build('gmail', 'v1', credentials=credentials)
            
            # Get messages
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results,
                q='in:inbox OR in:sent'
            ).execute()
            
            messages = results.get('messages', [])
            
            for msg in messages:
                # Get full message
                full_msg = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                # Parse and save
                await self._save_email_message(account_id, full_msg)
            
            # Update sync status
            await self.db.execute("""
                UPDATE email_accounts
                SET last_sync_at = NOW(),
                    total_emails_synced = total_emails_synced + $1,
                    sync_status = 'active'
                WHERE id = $2
            """, len(messages), account_id)
            
        except HttpError as e:
            await self.db.execute("""
                UPDATE email_accounts
                SET sync_status = 'error',
                    sync_error = $1
                WHERE id = $2
            """, str(e), account_id)
    
    async def _save_email_message(self, account_id: str, gmail_msg: Dict):
        """Parse Gmail message and save to DB."""
        
        headers = {h['name']: h['value'] for h in gmail_msg['payload']['headers']}
        
        # Extract body
        body_text = ''
        body_html = ''
        
        if 'parts' in gmail_msg['payload']:
            for part in gmail_msg['payload']['parts']:
                if part['mimeType'] == 'text/plain' and 'data' in part.get('body', {}):
                    body_text = base64.urlsafe_b64decode(part['body']['data']).decode()
                elif part['mimeType'] == 'text/html' and 'data' in part.get('body', {}):
                    body_html = base64.urlsafe_b64decode(part['body']['data']).decode()
        else:
            if gmail_msg['payload']['mimeType'] == 'text/plain' and 'data' in gmail_msg['payload'].get('body', {}):
                body_text = base64.urlsafe_b64decode(gmail_msg['payload']['body']['data']).decode()
        
        # Determine direction
        account = await self.db.fetchrow("SELECT email_address FROM email_accounts WHERE id = $1", account_id)
        from_address = headers.get('From', '')
        direction = 'outbound' if account['email_address'] in from_address else 'inbound'
        
        # Save message
        await self.db.execute("""
            INSERT INTO email_messages (
                email_account_id, message_id, thread_id,
                from_address, to_addresses, subject,
                body_text, body_html, direction, sent_at,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (message_id) DO NOTHING
        """,
            account_id,
            headers.get('Message-ID'),
            gmail_msg.get('threadId'),
            headers.get('From'),
            [headers.get('To')],
            headers.get('Subject'),
            body_text,
            body_html,
            direction,
            datetime.fromtimestamp(int(gmail_msg['internalDate']) / 1000)
        )
    
    async def send_email(
        self,
        account_id: str,
        to: str,
        subject: str,
        body: str,
        lead_id: Optional[str] = None
    ) -> str:
        """Send email via Gmail API."""
        
        account = await self.db.fetchrow("""
            SELECT * FROM email_accounts WHERE id = $1
        """, account_id)
        
        credentials = Credentials(
            token=account['access_token'],
            refresh_token=account['refresh_token'],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GMAIL_CLIENT_ID"),
            client_secret=os.getenv("GMAIL_CLIENT_SECRET")
        )
        
        service = build('gmail', 'v1', credentials=credentials)
        
        # Create message
        message = MIMEText(body)
        message['to'] = to
        message['from'] = account['email_address']
        message['subject'] = subject
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send
        sent_msg = service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        
        # Save to DB
        message_id = await self.db.fetchval("""
            INSERT INTO email_messages (
                email_account_id, lead_id, message_id,
                from_address, to_addresses, subject,
                body_text, direction, sent_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id
        """,
            account_id,
            lead_id,
            sent_msg['id'],
            account['email_address'],
            [to],
            subject,
            body,
            'outbound'
        )
        
        return message_id

