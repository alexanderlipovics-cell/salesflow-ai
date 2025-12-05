"""
Channel Webhooks Router für Sales Flow AI.

Generische Webhook-Endpunkte für verschiedene Kommunikationskanäle:
- E-Mail
- WhatsApp
- Social (Instagram, LinkedIn, Facebook)

WICHTIG:
- Keine echten Provider-APIs hardcoded
- Generische JSON-Formate werden akzeptiert
- Alle eingehenden Payloads werden in message_events normalisiert
- Autopilot kann diese Events dann verarbeiten

Zukünftige Erweiterungen:
- Signatur-Verifizierung für Webhooks
- Provider-spezifische Adapter (Twilio, SendGrid, etc.)
"""

from __future__ import annotations

import logging
from typing import Optional, Literal
from datetime import datetime

from fastapi import APIRouter, HTTPException, Body, Header
from pydantic import BaseModel, Field

from app.supabase_client import get_supabase_client, SupabaseNotConfiguredError
from app.schemas.message_events import MessageEventCreate
from app.db.repositories.message_events import create_message_event, normalize_text

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


# ============================================================================
# WEBHOOK PAYLOAD SCHEMAS
# ============================================================================


class EmailWebhookPayload(BaseModel):
    """
    Generisches E-Mail Webhook Format.
    
    Kann von verschiedenen Providern (SendGrid, Mailgun, etc.) 
    in dieses Format übersetzt werden.
    """
    user_id: str = Field(..., description="UUID des SALESFLOW Users")
    contact_id: Optional[str] = Field(default=None, description="UUID des Contacts (optional)")
    from_address: str = Field(..., alias="from", description="Absender E-Mail")
    to_address: str = Field(..., alias="to", description="Empfänger E-Mail")
    subject: Optional[str] = Field(default=None, description="Betreff")
    body: str = Field(..., description="E-Mail Text (Plain oder HTML)")
    direction: Literal["inbound", "outbound"] = Field(..., description="Nachrichtenrichtung")
    
    class Config:
        populate_by_name = True


class WhatsAppWebhookPayload(BaseModel):
    """
    Generisches WhatsApp Webhook Format.
    
    Kann von Twilio, WhatsApp Business API, etc. 
    in dieses Format übersetzt werden.
    """
    user_id: str = Field(..., description="UUID des SALESFLOW Users")
    contact_id: Optional[str] = Field(default=None, description="UUID des Contacts (optional)")
    from_number: str = Field(..., alias="from", description="Absender Nummer (z.B. whatsapp:+43660...)")
    to_number: str = Field(..., alias="to", description="Empfänger Nummer")
    message: str = Field(..., description="Nachrichtentext")
    direction: Literal["inbound", "outbound"] = Field(..., description="Nachrichtenrichtung")
    
    class Config:
        populate_by_name = True


class SocialWebhookPayload(BaseModel):
    """
    Generisches Social Media Webhook Format.
    
    Für Instagram DMs, LinkedIn Messages, Facebook Messenger, etc.
    """
    user_id: str = Field(..., description="UUID des SALESFLOW Users")
    contact_id: Optional[str] = Field(default=None, description="UUID des Contacts (optional)")
    platform: Literal["instagram", "linkedin", "facebook"] = Field(..., description="Social Platform")
    from_handle: str = Field(..., alias="from", description="Absender Handle/ID")
    to_handle: str = Field(..., alias="to", description="Empfänger Handle/ID")
    message: str = Field(..., description="Nachrichtentext")
    direction: Literal["inbound", "outbound"] = Field(..., description="Nachrichtenrichtung")
    
    class Config:
        populate_by_name = True


class WebhookResponse(BaseModel):
    """Standard Webhook Response"""
    success: bool = True
    event_id: Optional[str] = None
    message: str = "Event received"


# ============================================================================
# EMAIL WEBHOOK
# ============================================================================


@router.post("/email", response_model=WebhookResponse)
async def email_webhook(
    payload: dict = Body(...),
    x_webhook_secret: Optional[str] = Header(default=None, alias="X-Webhook-Secret"),
):
    """
    Generischer E-Mail-Webhook.
    
    Erwartet ein normalisiertes Format:
    ```json
    {
      "user_id": "uuid",
      "contact_id": "uuid|null",
      "from": "sender@example.com",
      "to": "me@example.com",
      "subject": "Betreff",
      "body": "Text oder HTML",
      "direction": "inbound" | "outbound"
    }
    ```
    
    Die Nachricht wird als message_event mit channel='email' gespeichert.
    """
    logger.info(f"Email webhook received: {payload.get('from')} -> {payload.get('to')}")
    
    # Validierung
    user_id = payload.get("user_id")
    direction = payload.get("direction")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id ist erforderlich")
    if not direction or direction not in ["inbound", "outbound"]:
        raise HTTPException(status_code=400, detail="direction muss 'inbound' oder 'outbound' sein")
    
    body = payload.get("body", "")
    subject = payload.get("subject", "")
    
    if not body:
        raise HTTPException(status_code=400, detail="body ist erforderlich")
    
    try:
        db = get_supabase_client()
        
        # Text normalisieren: Subject + Body kombinieren
        full_text = f"{subject}\n\n{body}" if subject else body
        
        # Message Event erstellen
        event_data = MessageEventCreate(
            contact_id=payload.get("contact_id"),
            channel="email",
            direction=direction,
            text=full_text,
            raw_payload={
                "from": payload.get("from"),
                "to": payload.get("to"),
                "subject": subject,
                "original_body": body,
                "received_at": datetime.utcnow().isoformat(),
            },
        )
        
        event = await create_message_event(db, user_id, event_data)
        
        logger.info(f"Email event created: id={event.id}, direction={direction}")
        
        return WebhookResponse(
            success=True,
            event_id=event.id,
            message=f"Email event created ({direction})",
        )
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured for email webhook")
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Email webhook error: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


# ============================================================================
# WHATSAPP WEBHOOK
# ============================================================================


@router.post("/whatsapp", response_model=WebhookResponse)
async def whatsapp_webhook(
    payload: dict = Body(...),
    x_webhook_secret: Optional[str] = Header(default=None, alias="X-Webhook-Secret"),
):
    """
    Generischer WhatsApp-Webhook.
    
    Erwartet ein normalisiertes Format:
    ```json
    {
      "user_id": "uuid",
      "contact_id": "uuid|null",
      "from": "whatsapp:+43660123456",
      "to": "whatsapp:+43660789012",
      "message": "Nachrichtentext",
      "direction": "inbound" | "outbound"
    }
    ```
    
    Die Nachricht wird als message_event mit channel='whatsapp' gespeichert.
    """
    logger.info(f"WhatsApp webhook received: {payload.get('from')} -> {payload.get('to')}")
    
    # Validierung
    user_id = payload.get("user_id")
    direction = payload.get("direction")
    message = payload.get("message", "")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id ist erforderlich")
    if not direction or direction not in ["inbound", "outbound"]:
        raise HTTPException(status_code=400, detail="direction muss 'inbound' oder 'outbound' sein")
    if not message:
        raise HTTPException(status_code=400, detail="message ist erforderlich")
    
    try:
        db = get_supabase_client()
        
        # Message Event erstellen
        event_data = MessageEventCreate(
            contact_id=payload.get("contact_id"),
            channel="whatsapp",
            direction=direction,
            text=message,
            raw_payload={
                "from": payload.get("from"),
                "to": payload.get("to"),
                "received_at": datetime.utcnow().isoformat(),
            },
        )
        
        event = await create_message_event(db, user_id, event_data)
        
        logger.info(f"WhatsApp event created: id={event.id}, direction={direction}")
        
        return WebhookResponse(
            success=True,
            event_id=event.id,
            message=f"WhatsApp event created ({direction})",
        )
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured for WhatsApp webhook")
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"WhatsApp webhook error: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


# ============================================================================
# SOCIAL MEDIA WEBHOOK
# ============================================================================


@router.post("/social", response_model=WebhookResponse)
async def social_webhook(
    payload: dict = Body(...),
    x_webhook_secret: Optional[str] = Header(default=None, alias="X-Webhook-Secret"),
):
    """
    Generischer Social Media Webhook (Instagram, LinkedIn, Facebook).
    
    Erwartet ein normalisiertes Format:
    ```json
    {
      "user_id": "uuid",
      "contact_id": "uuid|null",
      "platform": "instagram" | "linkedin" | "facebook",
      "from": "sender_handle_or_id",
      "to": "my_handle_or_id",
      "message": "Nachrichtentext",
      "direction": "inbound" | "outbound"
    }
    ```
    
    Die Nachricht wird als message_event mit dem entsprechenden channel gespeichert.
    """
    logger.info(f"Social webhook received: platform={payload.get('platform')}")
    
    # Validierung
    user_id = payload.get("user_id")
    direction = payload.get("direction")
    platform = payload.get("platform", "").lower()
    message = payload.get("message", "")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id ist erforderlich")
    if not direction or direction not in ["inbound", "outbound"]:
        raise HTTPException(status_code=400, detail="direction muss 'inbound' oder 'outbound' sein")
    if platform not in ["instagram", "linkedin", "facebook"]:
        raise HTTPException(
            status_code=400, 
            detail="platform muss 'instagram', 'linkedin' oder 'facebook' sein"
        )
    if not message:
        raise HTTPException(status_code=400, detail="message ist erforderlich")
    
    try:
        db = get_supabase_client()
        
        # Message Event erstellen (channel = platform)
        event_data = MessageEventCreate(
            contact_id=payload.get("contact_id"),
            channel=platform,  # instagram, linkedin, oder facebook
            direction=direction,
            text=message,
            raw_payload={
                "platform": platform,
                "from": payload.get("from"),
                "to": payload.get("to"),
                "received_at": datetime.utcnow().isoformat(),
            },
        )
        
        event = await create_message_event(db, user_id, event_data)
        
        logger.info(f"Social event created: id={event.id}, platform={platform}, direction={direction}")
        
        return WebhookResponse(
            success=True,
            event_id=event.id,
            message=f"{platform.capitalize()} event created ({direction})",
        )
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured for social webhook")
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Social webhook error: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


# ============================================================================
# GENERIC WEBHOOK (Catch-All)
# ============================================================================


@router.post("/generic", response_model=WebhookResponse)
async def generic_webhook(
    payload: dict = Body(...),
    x_webhook_secret: Optional[str] = Header(default=None, alias="X-Webhook-Secret"),
):
    """
    Generischer Catch-All Webhook für beliebige Kanäle.
    
    Erwartet:
    ```json
    {
      "user_id": "uuid",
      "contact_id": "uuid|null",
      "channel": "email|whatsapp|instagram|linkedin|facebook|internal",
      "message": "Nachrichtentext",
      "direction": "inbound" | "outbound",
      "metadata": {...}  // Optional
    }
    ```
    """
    logger.info(f"Generic webhook received: channel={payload.get('channel')}")
    
    # Validierung
    user_id = payload.get("user_id")
    direction = payload.get("direction")
    channel = payload.get("channel", "internal")
    message = payload.get("message", "")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id ist erforderlich")
    if not direction or direction not in ["inbound", "outbound"]:
        raise HTTPException(status_code=400, detail="direction muss 'inbound' oder 'outbound' sein")
    if not message:
        raise HTTPException(status_code=400, detail="message ist erforderlich")
    
    # Channel validieren
    valid_channels = ["email", "whatsapp", "instagram", "linkedin", "facebook", "internal"]
    if channel not in valid_channels:
        raise HTTPException(
            status_code=400,
            detail=f"channel muss einer von {valid_channels} sein"
        )
    
    try:
        db = get_supabase_client()
        
        event_data = MessageEventCreate(
            contact_id=payload.get("contact_id"),
            channel=channel,
            direction=direction,
            text=message,
            raw_payload=payload.get("metadata", {}),
        )
        
        event = await create_message_event(db, user_id, event_data)
        
        logger.info(f"Generic event created: id={event.id}, channel={channel}")
        
        return WebhookResponse(
            success=True,
            event_id=event.id,
            message=f"Event created (channel={channel}, direction={direction})",
        )
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured for generic webhook")
        raise HTTPException(status_code=503, detail="Datenbank nicht konfiguriert")
    except Exception as e:
        logger.exception(f"Generic webhook error: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler: {str(e)}")


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def webhooks_health():
    """Health-Check für die Webhook-Endpoints."""
    return {
        "status": "ok",
        "service": "webhooks",
        "endpoints": {
            "email": "/webhooks/email",
            "whatsapp": "/webhooks/whatsapp",
            "social": "/webhooks/social",
            "generic": "/webhooks/generic",
        },
        "note": "Webhooks akzeptieren generische JSON-Payloads. Siehe API-Docs für Formatspezifikationen."
    }


__all__ = ["router"]

