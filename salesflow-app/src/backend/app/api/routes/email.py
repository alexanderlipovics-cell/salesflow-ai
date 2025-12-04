"""
╔════════════════════════════════════════════════════════════════════════════╗
║  EMAIL API - FELLO Email Integration                                        ║
║  Gmail OAuth, Outlook OAuth, IMAP/SMTP                                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import logging

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.email.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["email"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ConnectGmailRequest(BaseModel):
    """Gmail OAuth Verbindung."""
    oauth_token: str = Field(..., description="Gmail OAuth Access Token")


class ConnectOutlookRequest(BaseModel):
    """Outlook OAuth Verbindung."""
    oauth_token: str = Field(..., description="Outlook OAuth Access Token")


class ConnectIMAPRequest(BaseModel):
    """IMAP/SMTP Verbindung."""
    host: str = Field(..., description="IMAP Server (z.B. imap.gmail.com)")
    email: EmailStr = Field(..., description="Email-Adresse")
    password: str = Field(..., description="Email-Passwort")
    port: int = Field(default=993, ge=1, le=65535, description="IMAP Port")
    use_ssl: bool = Field(default=True, description="SSL verwenden")


class SendEmailRequest(BaseModel):
    """Email senden."""
    to: EmailStr = Field(..., description="Empfänger Email")
    subject: str = Field(..., min_length=1, max_length=500, description="Betreff")
    body: str = Field(..., min_length=1, description="Email Body (Text)")
    html: Optional[str] = Field(None, description="Optional: HTML Body")


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/connect/gmail", response_model=dict)
async def connect_gmail(
    request: ConnectGmailRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """Verbindet Gmail-Account über OAuth."""
    service = EmailService(supabase)
    try:
        result = await service.connect_gmail(
            user_id=str(current_user.id),
            oauth_token=request.oauth_token,
        )
        return result
    except Exception as e:
        logger.error(f"Error connecting Gmail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect/outlook", response_model=dict)
async def connect_outlook(
    request: ConnectOutlookRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """Verbindet Outlook-Account über OAuth."""
    service = EmailService(supabase)
    try:
        result = await service.connect_outlook(
            user_id=str(current_user.id),
            oauth_token=request.oauth_token,
        )
        return result
    except Exception as e:
        logger.error(f"Error connecting Outlook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect/imap", response_model=dict)
async def connect_imap(
    request: ConnectIMAPRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """Verbindet IMAP/SMTP-Account."""
    service = EmailService(supabase)
    try:
        result = await service.connect_imap(
            user_id=str(current_user.id),
            host=request.host,
            email=request.email,
            password=request.password,
            port=request.port,
            use_ssl=request.use_ssl,
        )
        return result
    except Exception as e:
        logger.error(f"Error connecting IMAP: {e}")
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/inbox", response_model=dict)
async def get_inbox(
    since: Optional[datetime] = Query(None, description="Emails seit diesem Datum"),
    limit: int = Query(default=50, ge=1, le=200, description="Max. Anzahl Emails"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Holt Emails aus dem Inbox.
    
    Automatisches Matching mit Kontakten via Email-Adresse.
    """
    service = EmailService(supabase)
    
    try:
        emails = await service.fetch_emails(
            user_id=str(current_user.id),
            since=since,
            limit=limit,
        )
        
        return {
            "success": True,
            "count": len(emails),
            "emails": emails,
        }
        
    except Exception as e:
        logger.error(f"Error fetching inbox: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversation/{contact_id}", response_model=dict)
async def get_conversation(
    contact_id: str,
    limit: int = Query(default=50, ge=1, le=200, description="Max. Anzahl Emails"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Holt Email-Conversation für einen Kontakt.
    
    Args:
        contact_id: Kontakt ID (aus leads Tabelle)
        
    Returns:
        Liste von Emails mit diesem Kontakt
    """
    service = EmailService(supabase)
    
    try:
        # Kontakt laden
        contact_result = supabase.table("leads").select(
            "id, name, email"
        ).eq("id", contact_id).eq("user_id", str(current_user.id)).single().execute()
        
        if not contact_result.data:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        contact = contact_result.data
        contact_email = contact.get("email")
        
        if not contact_email:
            raise HTTPException(status_code=400, detail="Contact has no email address")
        
        # Alle Emails holen
        emails = await service.fetch_emails(
            user_id=str(current_user.id),
            since=None,
            limit=limit * 2,  # Mehr holen, dann filtern
        )
        
        # Filtern nach Kontakt-Email
        conversation = [
            email_data for email_data in emails
            if email_data.get("from_email", "").lower() == contact_email.lower()
            or contact_email.lower() in email_data.get("to", "").lower()
        ]
        
        # Sortiere nach Datum (neueste zuerst)
        conversation.sort(
            key=lambda x: x.get("date", ""),
            reverse=True
        )
        
        # Limit anwenden
        conversation = conversation[:limit]
        
        return {
            "success": True,
            "contact": {
                "id": contact.get("id"),
                "name": contact.get("name"),
                "email": contact_email,
            },
            "count": len(conversation),
            "emails": conversation,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send", response_model=dict)
async def send_email(
    request: SendEmailRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Sendet eine Email.
    
    Nutzt den verbundenen Email-Account des Users.
    """
    service = EmailService(supabase)
    
    try:
        result = await service.send_email(
            user_id=str(current_user.id),
            to=request.to,
            subject=request.subject,
            body=request.body,
            html=request.html,
        )
        
        return {
            "success": True,
            "message_id": result.get("message_id"),
            "to": request.to,
            "subject": request.subject,
        }
        
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/match/{email_address}", response_model=dict)
async def match_email_to_contact(
    email_address: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Matcht Email-Adresse mit Kontakt.
    
    Args:
        email_address: Email-Adresse zum Matchen
        
    Returns:
        Kontakt-Objekt oder null
    """
    service = EmailService(supabase)
    
    try:
        contact = await service.match_email_to_contact(
            email_address=email_address,
            user_id=str(current_user.id),
        )
        
        if contact:
            return {
                "success": True,
                "matched": True,
                "contact": contact,
            }
        else:
            return {
                "success": True,
                "matched": False,
                "contact": None,
            }
        
    except Exception as e:
        logger.error(f"Error matching email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

