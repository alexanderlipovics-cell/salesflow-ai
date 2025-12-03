"""
╔════════════════════════════════════════════════════════════════════════════╗
║  WEBHOOK CONFIGURATION                                                     ║
║  Konfiguration und Handler für externe Channel-Webhooks                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Unterstützte Kanäle:
- Instagram/Facebook (Meta Graph API)
- WhatsApp Business API
- Telegram Bot API
- Email (via SendGrid/Mailgun Webhooks)
"""

from fastapi import APIRouter, Request, Response, HTTPException, BackgroundTasks
from typing import Optional, Dict, Any
import hashlib
import hmac
import json
from datetime import datetime

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK SECRETS (aus .env laden)
# ═══════════════════════════════════════════════════════════════════════════════

import os
from dotenv import load_dotenv
load_dotenv()

# Meta (Instagram/Facebook/WhatsApp)
META_VERIFY_TOKEN = os.getenv("META_VERIFY_TOKEN", "salesflow_verify_token_2024")
META_APP_SECRET = os.getenv("META_APP_SECRET", "")

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_SECRET_TOKEN = os.getenv("TELEGRAM_SECRET_TOKEN", "")

# Email
SENDGRID_WEBHOOK_KEY = os.getenv("SENDGRID_WEBHOOK_KEY", "")


# ═══════════════════════════════════════════════════════════════════════════════
# META (INSTAGRAM / FACEBOOK / WHATSAPP)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/meta")
async def meta_webhook_verify(request: Request):
    """
    Meta Webhook Verification (GET).
    
    Meta sendet eine GET-Anfrage um den Webhook zu verifizieren.
    Wir müssen mit dem hub.challenge antworten.
    """
    params = request.query_params
    
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode == "subscribe" and token == META_VERIFY_TOKEN:
        print(f"✅ Meta Webhook verifiziert!")
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
async def meta_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Meta Webhook Handler (POST).
    
    Empfängt Nachrichten von Instagram, Facebook Messenger und WhatsApp.
    """
    # Signature verifizieren (optional aber empfohlen)
    if META_APP_SECRET:
        signature = request.headers.get("X-Hub-Signature-256", "")
        body = await request.body()
        
        expected = "sha256=" + hmac.new(
            META_APP_SECRET.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=403, detail="Invalid signature")
    
    payload = await request.json()
    
    # Payload parsen
    for entry in payload.get("entry", []):
        # Instagram DMs
        if "messaging" in entry:
            for message_event in entry.get("messaging", []):
                background_tasks.add_task(
                    process_instagram_message,
                    message_event
                )
        
        # WhatsApp
        if "changes" in entry:
            for change in entry.get("changes", []):
                if change.get("field") == "messages":
                    background_tasks.add_task(
                        process_whatsapp_message,
                        change.get("value", {})
                    )
    
    return {"status": "ok"}


# Alias-Routen für spezifische Kanäle
@router.get("/instagram")
async def instagram_verify(request: Request):
    """Instagram-spezifische Verification."""
    return await meta_webhook_verify(request)


@router.post("/instagram")
async def instagram_receive(request: Request, background_tasks: BackgroundTasks):
    """Instagram-spezifische Handler."""
    return await meta_webhook_receive(request, background_tasks)


@router.get("/whatsapp")
async def whatsapp_verify(request: Request):
    """WhatsApp-spezifische Verification."""
    return await meta_webhook_verify(request)


@router.post("/whatsapp")
async def whatsapp_receive(request: Request, background_tasks: BackgroundTasks):
    """WhatsApp-spezifische Handler."""
    return await meta_webhook_receive(request, background_tasks)


# ═══════════════════════════════════════════════════════════════════════════════
# TELEGRAM
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/telegram")
async def telegram_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Telegram Bot Webhook Handler.
    
    Empfängt Updates vom Telegram Bot.
    """
    # Secret Token verifizieren
    if TELEGRAM_SECRET_TOKEN:
        header_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if header_token != TELEGRAM_SECRET_TOKEN:
            raise HTTPException(status_code=403, detail="Invalid secret token")
    
    payload = await request.json()
    
    # Message verarbeiten
    if "message" in payload:
        background_tasks.add_task(
            process_telegram_message,
            payload["message"]
        )
    
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/email/sendgrid")
async def sendgrid_webhook_receive(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    SendGrid Inbound Parse Webhook.
    
    Empfängt eingehende E-Mails.
    """
    # Form-Daten parsen (SendGrid sendet multipart/form-data)
    form = await request.form()
    
    email_data = {
        "from": form.get("from", ""),
        "to": form.get("to", ""),
        "subject": form.get("subject", ""),
        "text": form.get("text", ""),
        "html": form.get("html", ""),
    }
    
    background_tasks.add_task(
        process_email_message,
        email_data
    )
    
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE PROCESSORS (Background Tasks)
# ═══════════════════════════════════════════════════════════════════════════════

async def process_instagram_message(message_event: Dict[str, Any]):
    """Verarbeitet eine Instagram DM."""
    from ..schemas.autopilot import ChannelEnum
    from ...services.autopilot import AutopilotEngine
    from ...services.learning.events import LearningEventsService
    from ...services.llm_client import get_llm_client
    from ...db.supabase import get_supabase
    from ...config.prompts.chief_autopilot import InboundMessage, InboundChannel
    
    try:
        sender_id = message_event.get("sender", {}).get("id", "")
        message = message_event.get("message", {})
        
        if not message.get("text"):
            return  # Nur Text-Nachrichten verarbeiten
        
        print(f"📱 Instagram DM von {sender_id}: {message.get('text', '')[:50]}...")
        
        # Supabase Client holen
        supabase = get_supabase()
        
        # User-Mapping finden
        user_id = await _find_user_for_channel(
            supabase=supabase,
            channel="instagram",
            external_id=sender_id
        )
        
        if not user_id:
            print(f"⚠️ Kein User-Mapping für Instagram-Account gefunden")
            return
        
        # InboundMessage erstellen
        inbound_message = InboundMessage(
            channel=InboundChannel.INSTAGRAM,
            external_id=message.get("mid", ""),
            lead_external_id=sender_id,
            content_type="text",
            text=message.get("text", ""),
            timestamp=datetime.utcnow(),
            raw_payload=message_event
        )
        
        # An Autopilot weiterleiten
        await _process_with_autopilot(
            supabase=supabase,
            user_id=user_id,
            message=inbound_message,
            channel="instagram"
        )
        
    except Exception as e:
        print(f"❌ Instagram Message Error: {e}")
        import traceback
        traceback.print_exc()


async def process_whatsapp_message(value: Dict[str, Any]):
    """Verarbeitet eine WhatsApp Nachricht."""
    from ...config.prompts.chief_autopilot import InboundMessage, InboundChannel
    from ...db.supabase import get_supabase
    
    try:
        messages = value.get("messages", [])
        contacts = value.get("contacts", [])
        metadata = value.get("metadata", {})
        phone_number_id = metadata.get("phone_number_id", "")
        
        for msg in messages:
            if msg.get("type") != "text":
                continue
            
            sender = msg.get("from", "")
            text = msg.get("text", {}).get("body", "")
            
            # Kontakt-Name finden
            contact_name = ""
            for contact in contacts:
                if contact.get("wa_id") == sender:
                    contact_name = contact.get("profile", {}).get("name", "")
                    break
            
            print(f"💬 WhatsApp von {contact_name or sender}: {text[:50]}...")
            
            # Supabase Client holen
            supabase = get_supabase()
            
            # User-Mapping finden
            user_id = await _find_user_for_channel(
                supabase=supabase,
                channel="whatsapp",
                external_id=phone_number_id
            )
            
            if not user_id:
                print(f"⚠️ Kein User-Mapping für WhatsApp-Account gefunden")
                continue
            
            # InboundMessage erstellen
            inbound_message = InboundMessage(
                channel=InboundChannel.WHATSAPP,
                external_id=msg.get("id", ""),
                lead_external_id=sender,
                content_type="text",
                text=text,
                timestamp=datetime.utcnow(),
                raw_payload=value
            )
            
            # An Autopilot weiterleiten
            await _process_with_autopilot(
                supabase=supabase,
                user_id=user_id,
                message=inbound_message,
                channel="whatsapp"
            )
            
    except Exception as e:
        print(f"❌ WhatsApp Message Error: {e}")
        import traceback
        traceback.print_exc()


async def process_telegram_message(message: Dict[str, Any]):
    """Verarbeitet eine Telegram Nachricht."""
    from ...config.prompts.chief_autopilot import InboundMessage, InboundChannel
    from ...db.supabase import get_supabase
    
    try:
        chat = message.get("chat", {})
        user = message.get("from", {})
        text = message.get("text", "")
        
        if not text:
            return
        
        sender_id = str(user.get("id", ""))
        sender_name = (user.get("first_name", "") + " " + user.get("last_name", "")).strip()
        
        print(f"📲 Telegram von {sender_name}: {text[:50]}...")
        
        # Supabase Client holen
        supabase = get_supabase()
        
        # User-Mapping finden (via Bot Token Hash)
        user_id = await _find_user_for_channel(
            supabase=supabase,
            channel="telegram",
            external_id=str(chat.get("id", ""))
        )
        
        if not user_id:
            print(f"⚠️ Kein User-Mapping für Telegram-Bot gefunden")
            return
        
        # InboundMessage erstellen
        inbound_message = InboundMessage(
            channel=InboundChannel.TELEGRAM,
            external_id=str(message.get("message_id", "")),
            lead_external_id=sender_id,
            content_type="text",
            text=text,
            timestamp=datetime.utcnow(),
            raw_payload=message
        )
        
        # An Autopilot weiterleiten
        await _process_with_autopilot(
            supabase=supabase,
            user_id=user_id,
            message=inbound_message,
            channel="telegram"
        )
        
    except Exception as e:
        print(f"❌ Telegram Message Error: {e}")
        import traceback
        traceback.print_exc()


async def process_email_message(email_data: Dict[str, Any]):
    """Verarbeitet eine eingehende E-Mail."""
    from ...config.prompts.chief_autopilot import InboundMessage, InboundChannel
    from ...db.supabase import get_supabase
    import re
    
    try:
        sender = email_data.get("from", "")
        subject = email_data.get("subject", "")
        text = email_data.get("text", "")
        to_email = email_data.get("to", "")
        
        print(f"📧 Email von {sender}: {subject[:30]}...")
        
        # Email-Adresse extrahieren
        email_match = re.search(r'<(.+?)>', sender)
        sender_email = email_match.group(1) if email_match else sender
        
        # Supabase Client holen
        supabase = get_supabase()
        
        # User-Mapping finden (via To-Adresse)
        user_id = await _find_user_for_channel(
            supabase=supabase,
            channel="email",
            external_id=to_email.split('@')[0] if '@' in to_email else to_email
        )
        
        if not user_id:
            print(f"⚠️ Kein User-Mapping für Email-Adresse gefunden")
            return
        
        # InboundMessage erstellen (Subject + Body)
        full_text = f"[Betreff: {subject}]\n\n{text}" if subject else text
        
        inbound_message = InboundMessage(
            channel=InboundChannel.EMAIL,
            external_id=email_data.get("message_id", str(hash(sender + subject))),
            lead_external_id=sender_email,
            content_type="text",
            text=full_text,
            timestamp=datetime.utcnow(),
            raw_payload=email_data
        )
        
        # An Autopilot weiterleiten
        await _process_with_autopilot(
            supabase=supabase,
            user_id=user_id,
            message=inbound_message,
            channel="email"
        )
        
    except Exception as e:
        print(f"❌ Email Message Error: {e}")
        import traceback
        traceback.print_exc()


# ═══════════════════════════════════════════════════════════════════════════════
# AUTOPILOT INTEGRATION HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

async def _find_user_for_channel(
    supabase,
    channel: str,
    external_id: str
) -> Optional[str]:
    """
    Findet den User für einen bestimmten Kanal.
    
    Args:
        supabase: Supabase Client
        channel: Kanal (instagram, whatsapp, etc.)
        external_id: Externe Account-ID
        
    Returns:
        User ID oder None
    """
    try:
        result = supabase.table("channel_mappings").select(
            "user_id"
        ).eq(
            "channel", channel
        ).eq(
            "external_account_id", external_id
        ).eq(
            "is_active", True
        ).limit(1).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]["user_id"]
        
        return None
        
    except Exception as e:
        print(f"Error finding user for channel: {e}")
        return None


async def _process_with_autopilot(
    supabase,
    user_id: str,
    message,  # InboundMessage
    channel: str
):
    """
    Verarbeitet eine Nachricht mit dem Autopilot.
    
    Args:
        supabase: Supabase Client
        user_id: User ID
        message: InboundMessage
        channel: Kanal
    """
    from ...services.autopilot import AutopilotEngine
    from ...services.learning.events import LearningEventsService, AIDecisionLog
    from ...services.llm_client import get_llm_client
    
    try:
        # LLM Client holen
        llm_client = get_llm_client()
        
        # Autopilot Engine erstellen
        engine = AutopilotEngine(
            supabase=supabase,
            llm_client=llm_client
        )
        
        # Nachricht verarbeiten
        result = await engine.process_inbound_message(
            user_id=user_id,
            message=message
        )
        
        if result.success:
            print(f"✅ Autopilot verarbeitet: Lead {result.lead_id}, Action: {result.decision.action}")
            
            # Learning Event loggen
            learning_service = LearningEventsService(supabase)
            
            ai_decision = AIDecisionLog(
                intent=result.intent_analysis.intent.value,
                confidence=result.confidence_result.score,
                action=result.decision.action.value,
                reasoning=result.decision.reasoning or "",
                suggested_response=result.response_message
            )
            
            await learning_service.log_autopilot_decision(
                user_id=user_id,
                lead_id=result.lead_id,
                action_id=result.message_id,  # Verwenden als Action-Referenz
                ai_decision=ai_decision,
                channel=channel,
                lead_temperature=result.intent_analysis.lead_temperature.value if result.intent_analysis.lead_temperature else None
            )
        else:
            print(f"⚠️ Autopilot Fehler: {result.error}")
            
    except Exception as e:
        print(f"Error in autopilot processing: {e}")
        import traceback
        traceback.print_exc()


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK SETUP GUIDE
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/setup-guide")
async def webhook_setup_guide():
    """
    Gibt eine Anleitung zur Webhook-Konfiguration zurück.
    """
    base_url = os.getenv("WEBHOOK_BASE_URL", "https://your-domain.com/api/v1")
    
    return {
        "title": "CHIEF Autopilot Webhook Setup Guide",
        "channels": {
            "instagram": {
                "webhook_url": f"{base_url}/webhooks/instagram",
                "verify_token": META_VERIFY_TOKEN,
                "setup_steps": [
                    "1. Gehe zu developers.facebook.com",
                    "2. Wähle deine App oder erstelle eine neue",
                    "3. Füge 'Instagram Graph API' Produkt hinzu",
                    "4. Unter 'Webhooks' → 'Edit Callback URL'",
                    f"5. Callback URL: {base_url}/webhooks/instagram",
                    f"6. Verify Token: {META_VERIFY_TOKEN}",
                    "7. Subscribed Fields: messages, messaging_postbacks"
                ]
            },
            "whatsapp": {
                "webhook_url": f"{base_url}/webhooks/whatsapp",
                "verify_token": META_VERIFY_TOKEN,
                "setup_steps": [
                    "1. Gehe zu developers.facebook.com",
                    "2. Wähle deine App",
                    "3. Füge 'WhatsApp' Produkt hinzu",
                    "4. Unter 'Configuration' → 'Webhooks'",
                    f"5. Callback URL: {base_url}/webhooks/whatsapp",
                    f"6. Verify Token: {META_VERIFY_TOKEN}",
                    "7. Subscribed Fields: messages"
                ]
            },
            "telegram": {
                "webhook_url": f"{base_url}/webhooks/telegram",
                "setup_steps": [
                    "1. Erstelle einen Bot via @BotFather",
                    "2. Kopiere den Bot Token",
                    "3. Setze den Webhook via API:",
                    f"   curl https://api.telegram.org/bot<TOKEN>/setWebhook?url={base_url}/webhooks/telegram",
                    "4. Optional: Secret Token für Sicherheit setzen"
                ]
            },
            "email": {
                "webhook_url": f"{base_url}/webhooks/email/sendgrid",
                "setup_steps": [
                    "1. Gehe zu app.sendgrid.com",
                    "2. Settings → Inbound Parse",
                    "3. Add Host & URL",
                    f"4. Destination URL: {base_url}/webhooks/email/sendgrid",
                    "5. Spam Check: On",
                    "6. POST the raw, full MIME message: Off"
                ]
            }
        },
        "environment_variables": [
            "META_VERIFY_TOKEN - Verification Token für Meta Webhooks",
            "META_APP_SECRET - App Secret für Signature Verification",
            "TELEGRAM_BOT_TOKEN - Telegram Bot Token",
            "TELEGRAM_SECRET_TOKEN - Secret Token für Telegram Webhook",
            "WEBHOOK_BASE_URL - Basis-URL für Webhooks (z.B. https://api.salesflow.ai/api/v1)"
        ]
    }

