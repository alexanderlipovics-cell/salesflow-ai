"""
Email Integration API Router
Gmail & Outlook/Exchange
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..core.supabase import get_supabase_client
from ..services.email.gmail_service import GmailService
from ..services.email.outlook_service import OutlookService


router = APIRouter(prefix="/api/email", tags=["email"])


class EmailAccountConnect(BaseModel):
    provider: str  # 'gmail' or 'outlook'
    redirect_uri: str


class SendEmailRequest(BaseModel):
    account_id: str
    to: str
    subject: str
    body: str
    lead_id: Optional[str] = None


@router.post("/connect")
async def connect_email_account(
    data: EmailAccountConnect,
    current_user: dict = Depends(get_current_user)
):
    """Get OAuth URL to connect email account."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    if data.provider == 'gmail':
        service = GmailService(supabase)
        auth_url = await service.get_auth_url(user_id, data.redirect_uri)
    elif data.provider == 'outlook':
        service = OutlookService(supabase)
        auth_url = await service.get_auth_url(user_id, data.redirect_uri)
    else:
        raise HTTPException(400, "Invalid provider. Use 'gmail' or 'outlook'")
    
    return {"auth_url": auth_url}


@router.get("/callback/{provider}")
async def email_oauth_callback(
    provider: str,
    code: str,
    state: Optional[str] = None,
    redirect_uri: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Handle OAuth callback."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    if provider == 'gmail':
        service = GmailService(supabase)
        account_id = await service.handle_oauth_callback(
            user_id, code, state, redirect_uri
        )
    elif provider == 'outlook':
        service = OutlookService(supabase)
        account_id = await service.handle_oauth_callback(
            user_id, code, redirect_uri
        )
    else:
        raise HTTPException(400, "Invalid provider")
    
    return {"account_id": account_id, "status": "connected"}


@router.get("/accounts")
async def get_email_accounts(
    current_user: dict = Depends(get_current_user)
):
    """Get user's connected email accounts."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('email_accounts').select('*').eq('user_id', user_id).execute()
    
    return response.data


@router.get("/messages")
async def get_email_messages(
    account_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get email messages."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Build query
    query = supabase.table('email_messages').select("""
        *,
        email_accounts!inner(user_id)
    """)
    
    # Filter by user
    query = query.eq('email_accounts.user_id', user_id)
    
    if account_id:
        query = query.eq('email_account_id', account_id)
    
    if lead_id:
        query = query.eq('lead_id', lead_id)
    
    # Order and limit
    query = query.order('sent_at', desc=True).limit(limit)
    
    response = query.execute()
    
    return response.data


@router.post("/send")
async def send_email(
    data: SendEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send email."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Get account and verify ownership
    account_response = supabase.table('email_accounts').select('provider').eq('id', data.account_id).eq('user_id', user_id).execute()
    
    if not account_response.data:
        raise HTTPException(404, "Email account not found")
    
    account = account_response.data[0]
    
    if account['provider'] == 'gmail':
        service = GmailService(supabase)
    else:
        service = OutlookService(supabase)
    
    message_id = await service.send_email(
        data.account_id,
        data.to,
        data.subject,
        data.body,
        data.lead_id
    )
    
    return {"message_id": message_id, "status": "sent"}


@router.post("/sync/{account_id}")
async def sync_emails(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger email sync."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Get account and verify ownership
    account_response = supabase.table('email_accounts').select('provider').eq('id', account_id).eq('user_id', user_id).execute()
    
    if not account_response.data:
        raise HTTPException(404, "Email account not found")
    
    account = account_response.data[0]
    
    if account['provider'] == 'gmail':
        service = GmailService(supabase)
    else:
        service = OutlookService(supabase)
    
    import asyncio
    asyncio.create_task(service.sync_emails(account_id))
    
    return {"status": "sync_started"}


@router.delete("/accounts/{account_id}")
async def disconnect_email_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Disconnect email account."""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Delete account (cascades to messages)
    supabase.table('email_accounts').delete().eq('id', account_id).eq('user_id', user_id).execute()
    
    return {"status": "disconnected"}

