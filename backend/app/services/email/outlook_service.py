"""
Outlook/Exchange Integration
Microsoft Graph API
"""

import os
import asyncio
import requests
from typing import Dict, List, Optional
from datetime import datetime

import msal


class OutlookService:
    """Microsoft Graph API for Outlook"""
    
    SCOPES = [
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/Mail.Send'
    ]
    
    GRAPH_API = 'https://graph.microsoft.com/v1.0'
    
    def __init__(self, db):
        self.db = db
    
    async def get_auth_url(self, user_id: str, redirect_uri: str) -> str:
        """Generate Microsoft OAuth URL."""
        
        app = msal.PublicClientApplication(
            os.getenv('OUTLOOK_CLIENT_ID'),
            authority=f"https://login.microsoftonline.com/common"
        )
        
        auth_url = app.get_authorization_request_url(
            self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        return auth_url
    
    async def handle_oauth_callback(
        self,
        user_id: str,
        code: str,
        redirect_uri: str
    ) -> str:
        """Exchange code for tokens."""
        
        app = msal.PublicClientApplication(
            os.getenv('OUTLOOK_CLIENT_ID'),
            authority=f"https://login.microsoftonline.com/common"
        )
        
        result = app.acquire_token_by_authorization_code(
            code,
            scopes=self.SCOPES,
            redirect_uri=redirect_uri
        )
        
        if 'error' in result:
            raise ValueError(result['error_description'])
        
        # Get user profile
        headers = {'Authorization': f"Bearer {result['access_token']}"}
        profile = requests.get(f'{self.GRAPH_API}/me', headers=headers).json()
        
        # Save account
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
                updated_at = NOW()
            RETURNING id
        """,
            user_id,
            'outlook',
            profile['mail'],
            profile['displayName'],
            result['access_token'],
            result.get('refresh_token'),
            datetime.fromtimestamp(result['expires_in'])
        )
        
        # Start sync
        asyncio.create_task(self.sync_emails(account_id))
        
        return account_id
    
    async def sync_emails(self, account_id: str, max_results: int = 100):
        """Sync Outlook emails via Graph API."""
        
        account = await self.db.fetchrow("""
            SELECT * FROM email_accounts WHERE id = $1
        """, account_id)
        
        headers = {'Authorization': f"Bearer {account['access_token']}"}
        
        # Get messages
        response = requests.get(
            f"{self.GRAPH_API}/me/messages",
            headers=headers,
            params={'$top': max_results, '$orderby': 'receivedDateTime desc'}
        )
        
        messages = response.json().get('value', [])
        
        for msg in messages:
            await self._save_email_message(account_id, msg)
        
        await self.db.execute("""
            UPDATE email_accounts
            SET last_sync_at = NOW(),
                total_emails_synced = total_emails_synced + $1
            WHERE id = $2
        """, len(messages), account_id)
    
    async def _save_email_message(self, account_id: str, outlook_msg: Dict):
        """Parse Outlook message and save."""
        
        account = await self.db.fetchrow("SELECT email_address FROM email_accounts WHERE id = $1", account_id)
        
        direction = 'outbound' if outlook_msg['from']['emailAddress']['address'] == account['email_address'] else 'inbound'
        
        to_addresses = [r['emailAddress']['address'] for r in outlook_msg.get('toRecipients', [])]
        
        await self.db.execute("""
            INSERT INTO email_messages (
                email_account_id, message_id,
                from_address, to_addresses, subject,
                body_text, body_html, direction, sent_at,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (message_id) DO NOTHING
        """,
            account_id,
            outlook_msg['id'],
            outlook_msg['from']['emailAddress']['address'],
            to_addresses,
            outlook_msg['subject'],
            outlook_msg['body'].get('content') if outlook_msg['body']['contentType'] == 'text' else None,
            outlook_msg['body'].get('content') if outlook_msg['body']['contentType'] == 'html' else None,
            direction,
            datetime.fromisoformat(outlook_msg['sentDateTime'].replace('Z', '+00:00'))
        )
    
    async def send_email(
        self,
        account_id: str,
        to: str,
        subject: str,
        body: str,
        lead_id: Optional[str] = None
    ) -> str:
        """Send email via Graph API."""
        
        account = await self.db.fetchrow("SELECT * FROM email_accounts WHERE id = $1", account_id)
        
        headers = {'Authorization': f"Bearer {account['access_token']}"}
        
        email_data = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
                },
                "toRecipients": [
                    {"emailAddress": {"address": to}}
                ]
            },
            "saveToSentItems": "true"
        }
        
        response = requests.post(
            f"{self.GRAPH_API}/me/sendMail",
            headers=headers,
            json=email_data
        )
        
        if response.status_code == 202:
            # Accepted - save to DB
            message_id = await self.db.fetchval("""
                INSERT INTO email_messages (
                    email_account_id, lead_id,
                    from_address, to_addresses, subject,
                    body_text, direction, sent_at, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                RETURNING id
            """,
                account_id, lead_id,
                account['email_address'], [to],
                subject, body, 'outbound'
            )
            return message_id
        else:
            raise Exception(f"Failed to send: {response.text}")

