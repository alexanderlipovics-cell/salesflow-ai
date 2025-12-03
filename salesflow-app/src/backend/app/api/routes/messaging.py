"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MESSAGING API                                                             ║
║  SMS & WhatsApp via Twilio                                                ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ...db.supabase import get_supabase
from ...db.deps import get_current_user, CurrentUser
from ...services.messaging import TwilioService

router = APIRouter(prefix="/messaging", tags=["messaging"])


# =============================================================================
# SCHEMAS
# =============================================================================

class SendSMSRequest(BaseModel):
    """Request für SMS-Versand."""
    to_number: str
    body: str
    lead_id: Optional[str] = None


class SendWhatsAppRequest(BaseModel):
    """Request für WhatsApp-Versand."""
    to_number: str
    body: str
    lead_id: Optional[str] = None
    media_url: Optional[str] = None


class TwilioSettingsRequest(BaseModel):
    """Request für Twilio Settings."""
    account_sid: str
    auth_token: str
    phone_number: str
    whatsapp_number: Optional[str] = None


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/status")
async def get_messaging_status(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📊 Gibt den Status der Messaging-Integration zurück.
    """
    service = TwilioService(supabase)
    account_info = await service.get_account_info()
    
    if not account_info.get("configured"):
        return {
            "configured": False,
            "sms_enabled": False,
            "whatsapp_enabled": False,
            "message": "Twilio nicht konfiguriert. Bitte TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN und TWILIO_PHONE_NUMBER in den Umgebungsvariablen setzen.",
        }
    
    return {
        "configured": True,
        "sms_enabled": bool(account_info.get("phone_number")),
        "whatsapp_enabled": bool(account_info.get("whatsapp_number")),
        "account_name": account_info.get("account_name"),
        "phone_number": account_info.get("phone_number"),
        "whatsapp_number": account_info.get("whatsapp_number"),
        "balance": account_info.get("balance"),
    }


@router.get("/stats")
async def get_messaging_stats(
    days: int = 30,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📈 Gibt Usage-Statistiken für den Zeitraum zurück.
    """
    service = TwilioService(supabase)
    stats = await service.get_usage_stats(days=days)
    
    return {
        "period_days": days,
        "stats": stats,
    }


@router.post("/send/sms")
async def send_sms(
    request: SendSMSRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📱 Sendet eine SMS.
    """
    service = TwilioService(supabase)
    
    if not service.is_configured:
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    result = await service.send_sms(
        to_number=request.to_number,
        body=request.body,
        user_id=current_user.id,
        lead_id=request.lead_id,
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/send/whatsapp")
async def send_whatsapp(
    request: SendWhatsAppRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    💬 Sendet eine WhatsApp-Nachricht.
    """
    service = TwilioService(supabase)
    
    if not service.is_configured:
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    result = await service.send_whatsapp(
        to_number=request.to_number,
        body=request.body,
        user_id=current_user.id,
        lead_id=request.lead_id,
        media_url=request.media_url,
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/message/{message_sid}/status")
async def get_message_status(
    message_sid: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    🔍 Holt den aktuellen Status einer Nachricht.
    """
    service = TwilioService(supabase)
    
    if not service.is_configured:
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    result = await service.get_message_status(message_sid)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/history")
async def get_message_history(
    lead_id: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = 50,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📜 Gibt die Nachrichtenhistorie zurück.
    """
    query = supabase.table("message_logs").select("*").eq("user_id", current_user.id)
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    
    if channel:
        query = query.eq("channel", channel)
    
    result = query.order("created_at", desc=True).limit(limit).execute()
    
    return {
        "messages": result.data or [],
        "count": len(result.data or []),
    }


# =============================================================================
# TWILIO WEBHOOKS (No Auth)
# =============================================================================

@router.post("/webhook/twilio")
async def twilio_webhook(
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    🔔 Twilio Status Webhook Endpoint.
    
    Empfängt:
    - Delivery Status Updates
    - Incoming Messages (Replies)
    
    Konfigurieren in Twilio Console:
    - Messaging → Settings → Webhook URL
    - URL: https://your-domain.com/api/v1/messaging/webhook/twilio
    """
    # Parse form data
    form_data = await request.form()
    data = dict(form_data)
    
    service = TwilioService(supabase)
    result = await service.handle_webhook(data)
    
    # Twilio erwartet leere 200 Response
    return {"status": "received", **result}


@router.post("/webhook/twilio/status")
async def twilio_status_webhook(
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    🔔 Twilio Status Callback Webhook.
    
    Speziell für Message Status Updates:
    - queued → sending → sent → delivered → read
    """
    form_data = await request.form()
    data = dict(form_data)
    
    message_sid = data.get("MessageSid")
    message_status = data.get("MessageStatus") or data.get("SmsStatus")
    
    if message_sid and message_status:
        # Update in DB
        supabase.table("message_logs").update({
            "status": message_status,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("message_sid", message_sid).execute()
    
    return {"status": "received"}


# =============================================================================
# TEMPLATES
# =============================================================================

@router.get("/templates")
async def get_message_templates(
    channel: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    📝 Gibt vordefinierte Nachrichtenvorlagen zurück.
    """
    # Hardcoded Templates für jetzt
    templates = [
        {
            "id": "follow-up-basic",
            "name": "Follow-Up Basic",
            "channel": "sms",
            "body": "Hi {{first_name}}, ich wollte nochmal kurz nachhaken bzgl. unserem Gespräch. Wann passt es dir diese Woche?",
            "category": "follow_up",
        },
        {
            "id": "appointment-reminder",
            "name": "Termin-Erinnerung",
            "channel": "sms",
            "body": "Hi {{first_name}}! Kurze Erinnerung an unseren Termin morgen um {{time}}. Bis dann! 👋",
            "category": "reminder",
        },
        {
            "id": "thank-you",
            "name": "Danke nach Meeting",
            "channel": "whatsapp",
            "body": "Hey {{first_name}}! 👋 Danke für das tolle Gespräch heute! Wie besprochen schick ich dir gleich die Infos per Mail. Bei Fragen meld dich jederzeit!",
            "category": "follow_up",
        },
        {
            "id": "check-in",
            "name": "Friendly Check-In",
            "channel": "whatsapp",
            "body": "Hey {{first_name}}! Wie läuft's? Wollte mal kurz einchecken. Falls du Fragen hast oder wir uns mal wieder austauschen sollten - sag Bescheid! 😊",
            "category": "engagement",
        },
        {
            "id": "value-drop",
            "name": "Value Drop",
            "channel": "whatsapp",
            "body": "Hey {{first_name}}! Hab grad was Interessantes gesehen, das für dich relevant sein könnte: [LINK]. Was meinst du?",
            "category": "value",
        },
    ]
    
    if channel:
        templates = [t for t in templates if t["channel"] == channel]
    
    return {"templates": templates}

