import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.webhook_security import (
    verify_instagram_signature,
    enforce_rate_limit,
    enforce_ip_whitelist,
)
from app.services.lead_processing_service import (
    IngestedLead,
    LeadProcessingService,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/webhooks/instagram",
    tags=["webhooks", "instagram"],
)

# ---------- VERIFY ENDPOINT (Meta Subscription) ----------

@router.get("", response_class=PlainTextResponse)
async def verify_instagram_webhook(
    hub_mode: str,
    hub_verify_token: str,
    hub_challenge: str,
):
    if (
        hub_mode == "subscribe"
        and hub_verify_token == settings.instagram_verify_token
    ):
        return hub_challenge
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid verify token",
    )

# ---------- EVENT ENDPOINT ----------

@router.post("")
async def handle_instagram_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    client_ip = request.client.host if request.client else "0.0.0.0"
    enforce_rate_limit(client_ip, key_prefix="instagram_webhook")
    enforce_ip_whitelist(client_ip, allowed_cidrs=settings.instagram_webhook_ip_whitelist)

    verify_instagram_signature(raw_body, request, settings.instagram_app_secret)

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError:
        logger.exception("Invalid JSON payload from Instagram")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON",
        )

    logger.info("Received Instagram webhook payload: %s", payload)

    entry_list: list[dict[str, Any]] = payload.get("entry", [])
    service = LeadProcessingService(db=db)

    for entry in entry_list:
        # Struktur je nach Subscription: messaging / changes / etc.
        messaging_events = entry.get("messaging", []) or entry.get("standby", [])
        for event in messaging_events:
            message = event.get("message")
            if not message:
                continue

            sender = event.get("sender", {})
            sender_id = sender.get("id")
            text = message.get("text")
            timestamp_ms = event.get("timestamp")
            if not sender_id or not text:
                continue

            received_at = (
                datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
                if timestamp_ms
                else datetime.now(tz=timezone.utc)
            )

            sentiment, intent = _simple_sentiment_and_intent(text)

            ingested = IngestedLead(
                source="instagram",
                external_id=sender_id,
                campaign_name=None,
                form_name=None,
                full_name=None,
                first_name=None,
                last_name=None,
                email=None,
                phone=None,
                message=text,
                company=None,
                job_title=None,
                industry=None,
                raw_payload={
                    "event": event,
                    "sentiment": sentiment,
                    "intent": intent,
                },
                received_at=received_at,
            )

            try:
                lead = service.process_ingested_lead(ingested)
                await _maybe_send_auto_reply(sender_id, text, intent)
            except Exception:
                logger.exception("Failed to process instagram DM from %s", sender_id)

    return {"status": "ok"}

# ---------- Helper: Intent / Sentiment & Auto-Reply ----------

def _simple_sentiment_and_intent(message: str) -> tuple[str, str]:
    """
    Simple Heuristik für Sentiment & Intent.
    """
    msg = message.lower()
    sentiment = "neutral"
    if any(w in msg for w in ["danke", "super", "cool", "top", "nice"]):
        sentiment = "positive"
    if any(w in msg for w in ["scheiße", "schlecht", "problem", "nicht gut"]):
        sentiment = "negative"

    intent = "unknown"
    if any(w in msg for w in ["preis", "kosten", "gebühr", "tarif"]):
        intent = "pricing"
    elif any(w in msg for w in ["termin", "call", "telefonat", "zoom", "meeting"]):
        intent = "meeting"
    elif any(w in msg for w in ["mehr infos", "information", "details", "erklären"]):
        intent = "info_request"

    return sentiment, intent

async def _maybe_send_auto_reply(sender_id: str, message: str, intent: str) -> None:
    """
    Auto-Reply über die Meta Messages API.
    Nur aktiv, wenn INSTAGRAM_SEND_AUTOREPLY=True.
    """
    if not settings.instagram_send_autoreply:
        return

    reply_text = None
    if intent == "pricing":
        reply_text = (
            "Danke für deine Nachricht! 🙌\n"
            "Ich schicke dir gleich Infos zu unseren Preisen & Paketen. "
            "Schreib mir kurz, in welcher Branche du aktiv bist?"
        )
    elif intent == "meeting":
        reply_text = (
            "Mega, dass du ein Gespräch möchtest! 🔥\n"
            "Schick mir 2–3 Zeitfenster, dann bekommst du einen Terminlink 📅"
        )
    elif intent == "info_request":
        reply_text = (
            "Sehr gerne! 😊\n"
            "Ich schicke dir gleich ein paar Infos, wie wir dir helfen können, "
            "mehr Umsatz mit weniger Chaos zu machen."
        )
    if not reply_text:
        return

    url = "https://graph.facebook.com/v18.0/me/messages"
    params = {"access_token": settings.facebook_page_access_token}
    payload = {
        "messaging_type": "RESPONSE",
        "recipient": {"id": sender_id},
        "message": {"text": reply_text},
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, params=params, json=payload)
        if resp.status_code >= 400:
            logger.error(
                "Error sending instagram auto reply to %s: %s %s",
                sender_id,
                resp.status_code,
                resp.text,
            )
