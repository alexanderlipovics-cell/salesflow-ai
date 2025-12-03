"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMAIL ACCOUNTS API                                                        ║
║  SMTP Account Management                                                   ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import logging

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.sequencer.email_sender import EmailSender

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-accounts", tags=["email-accounts"])


# =============================================================================
# SCHEMAS
# =============================================================================

class EmailAccountCreate(BaseModel):
    """Neuen Email-Account erstellen."""
    name: str = Field(..., min_length=1, max_length=100)
    email_address: EmailStr
    from_name: Optional[str] = None
    reply_to: Optional[EmailStr] = None
    provider: str = Field(default="smtp", description="smtp, sendgrid, mailgun, ses, gmail")
    smtp_host: Optional[str] = None
    smtp_port: int = Field(default=587)
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_secure: bool = Field(default=True)
    api_key: Optional[str] = None
    daily_limit: int = Field(default=500, ge=1, le=10000)
    hourly_limit: int = Field(default=50, ge=1, le=500)


class EmailAccountUpdate(BaseModel):
    """Email-Account updaten."""
    name: Optional[str] = None
    from_name: Optional[str] = None
    reply_to: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_secure: Optional[bool] = None
    api_key: Optional[str] = None
    daily_limit: Optional[int] = None
    hourly_limit: Optional[int] = None
    is_active: Optional[bool] = None


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/", response_model=dict)
async def create_email_account(
    data: EmailAccountCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Erstellt einen neuen Email-Account."""
    account_data = {
        "user_id": str(current_user.id),
        "name": data.name,
        "email_address": data.email_address,
        "from_name": data.from_name,
        "reply_to": data.reply_to,
        "provider": data.provider,
        "smtp_host": data.smtp_host,
        "smtp_port": data.smtp_port,
        "smtp_username": data.smtp_username,
        "smtp_password": data.smtp_password,  # TODO: Encrypt
        "smtp_secure": data.smtp_secure,
        "api_key": data.api_key,  # TODO: Encrypt
        "daily_limit": data.daily_limit,
        "hourly_limit": data.hourly_limit,
        "is_active": True,
    }
    
    result = supabase.table("email_accounts").insert(account_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create account")
    
    # Remove sensitive data from response
    account = result.data[0]
    account.pop("smtp_password", None)
    account.pop("api_key", None)
    
    return {"success": True, "account": account}


@router.get("/", response_model=dict)
async def list_email_accounts(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Listet alle Email-Accounts des Users."""
    result = supabase.table("email_accounts").select(
        "id, name, email_address, from_name, provider, is_active, is_verified, "
        "daily_limit, hourly_limit, sent_today, sent_this_hour, last_sent_at, "
        "last_error, consecutive_errors, created_at"
    ).eq("user_id", str(current_user.id)).order("created_at", desc=True).execute()
    
    return {"accounts": result.data or []}


@router.get("/{account_id}", response_model=dict)
async def get_email_account(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Lädt einen Email-Account (ohne Passwort)."""
    result = supabase.table("email_accounts").select(
        "id, name, email_address, from_name, reply_to, provider, "
        "smtp_host, smtp_port, smtp_username, smtp_secure, "
        "daily_limit, hourly_limit, sent_today, sent_this_hour, "
        "is_active, is_verified, verified_at, last_sent_at, "
        "last_error, consecutive_errors, created_at, updated_at"
    ).eq("id", account_id).eq("user_id", str(current_user.id)).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"account": result.data}


@router.patch("/{account_id}", response_model=dict)
async def update_email_account(
    account_id: str,
    data: EmailAccountUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Aktualisiert einen Email-Account."""
    updates = data.dict(exclude_unset=True)
    updates["updated_at"] = datetime.utcnow().isoformat()
    
    # If password changed, mark as unverified
    if "smtp_password" in updates or "api_key" in updates:
        updates["is_verified"] = False
    
    result = supabase.table("email_accounts").update(updates).eq(
        "id", account_id
    ).eq("user_id", str(current_user.id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Remove sensitive data
    account = result.data[0]
    account.pop("smtp_password", None)
    account.pop("api_key", None)
    
    return {"success": True, "account": account}


@router.delete("/{account_id}", response_model=dict)
async def delete_email_account(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Löscht einen Email-Account."""
    result = supabase.table("email_accounts").delete().eq(
        "id", account_id
    ).eq("user_id", str(current_user.id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"success": True}


@router.post("/{account_id}/verify", response_model=dict)
async def verify_email_account(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Verifiziert einen Email-Account durch Test-Email."""
    sender = EmailSender(supabase)
    
    result = await sender.verify_account(account_id, str(current_user.id))
    
    return result


@router.post("/{account_id}/test", response_model=dict)
async def send_test_email(
    account_id: str,
    to_email: EmailStr = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Sendet eine Test-Email."""
    sender = EmailSender(supabase)
    
    result = await sender.send(
        to_email=to_email,
        to_name="Test",
        subject="AURA OS - Test Email",
        content="This is a test email from AURA OS.\n\nYour email setup is working correctly!",
        account_id=account_id,
    )
    
    return result


@router.post("/{account_id}/warmup/start", response_model=dict)
async def start_warmup(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Startet Email-Warmup für einen Account."""
    result = supabase.table("email_accounts").update({
        "is_warming_up": True,
        "warmup_day": 0,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", account_id).eq("user_id", str(current_user.id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"success": True, "message": "Warmup started"}


@router.post("/{account_id}/warmup/stop", response_model=dict)
async def stop_warmup(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Stoppt Email-Warmup."""
    result = supabase.table("email_accounts").update({
        "is_warming_up": False,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", account_id).eq("user_id", str(current_user.id)).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"success": True, "message": "Warmup stopped"}

