"""
Autopilot Engine für SALESFLOW AI.

Verarbeitet pending Message Events und generiert KI-Antwortvorschläge.

Workflow:
1. Pending Events laden
2. Autopilot-Settings prüfen
3. KI-Antwort generieren (wenn mode != 'off')
4. Suggested Reply speichern
5. Status auf 'suggested' setzen
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from supabase import Client

from ..config import get_settings
from ..schemas import ChatMessage
from ..schemas.message_events import MessageEvent
from ..schemas.autopilot import AutopilotMode
from ..db.repositories.message_events import (
    get_pending_events_for_user,
    set_event_suggested_reply,
    set_event_status,
)
from ..core.ai_prompts import (
    SALES_COACH_PROMPT,
    build_coach_prompt_with_action,
    detect_action_from_text,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# A/B EXPERIMENT CONFIGURATION
# ============================================================================

# Aktuelle Experiment-Einstellungen (V1 - Defaults)
CURRENT_TEMPLATE_VERSION = "v1.0"
CURRENT_PERSONA_VARIANT = "default"


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def detect_action_for_message(text: str) -> str:
    """
    Ermittelt die passende AI-Action für eine Nachricht.
    
    Prüft auf bekannte Einwände und Keywords.
    
    Args:
        text: Nachrichtentext
        
    Returns:
        Action-String für den AI-Prompt
    """
    text_lower = text.lower()
    
    # Einwand-Erkennung
    objection_keywords = [
        "zu teuer", "kein budget", "keine zeit", "nicht interessiert",
        "hab schon", "kein interesse", "zu viel", "kein geld",
        "muss überlegen", "später", "passt nicht", "nicht jetzt",
        "too expensive", "no time", "not interested",
    ]
    
    if any(keyword in text_lower for keyword in objection_keywords):
        logger.info("Detected objection in message")
        return "objection_handler"
    
    # Frage nach Preis/Kosten
    price_keywords = ["was kostet", "preis", "kosten", "price", "cost"]
    if any(keyword in text_lower for keyword in price_keywords):
        return "offer_create"
    
    # Terminanfrage
    meeting_keywords = ["termin", "treffen", "call", "meeting", "gespräch"]
    if any(keyword in text_lower for keyword in meeting_keywords):
        return "follow_up"
    
    # Allgemeine Intent-Erkennung aus dem Prompt-Hub
    detected = detect_action_from_text(text)
    if detected:
        return detected
    
    # Default: Nachricht generieren
    return "generate_message"


async def get_autopilot_settings_for_event(
    db: Client,
    user_id: str,
    contact_id: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    Lädt Autopilot-Settings für einen User/Contact.
    
    Reihenfolge:
    1. Contact-spezifische Settings
    2. Globale User-Settings
    3. None (wenn nichts gefunden)
    
    Args:
        db: Supabase Client
        user_id: User-UUID
        contact_id: Contact-UUID (optional)
        
    Returns:
        Settings-Dict oder None
    """
    # 1. Contact-spezifische Settings versuchen
    if contact_id:
        result = (
            db.table("autopilot_settings")
            .select("*")
            .eq("user_id", user_id)
            .eq("contact_id", contact_id)
            .limit(1)
            .execute()
        )
        if result.data:
            logger.debug(f"Found contact-specific settings for contact_id={contact_id}")
            return result.data[0]
    
    # 2. Globale User-Settings
    result = (
        db.table("autopilot_settings")
        .select("*")
        .eq("user_id", user_id)
        .is_("contact_id", "null")
        .limit(1)
        .execute()
    )
    
    if result.data:
        logger.debug(f"Found global settings for user_id={user_id}")
        return result.data[0]
    
    return None


def generate_ai_response(
    message_text: str,
    action: str,
    channel: str,
    history: Optional[List[ChatMessage]] = None,
) -> Dict[str, Any]:
    """
    Generiert eine KI-Antwort für eine eingehende Nachricht.
    
    Args:
        message_text: Eingehende Nachricht
        action: Erkannte Action (z.B. objection_handler)
        channel: Kanal der Nachricht
        history: Optionale Chat-History
        
    Returns:
        Dict mit reply_text und meta
    """
    # Mock-Modus wenn kein API Key
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus für Autopilot")
        return _generate_mock_response(message_text, action, channel)
    
    # AI-Client importieren (lazy, um zirkuläre Imports zu vermeiden)
    from ..ai_client import AIClient
    
    try:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        # System-Prompt basierend auf Action
        system_prompt = build_coach_prompt_with_action(action)
        
        # Autopilot-spezifischen Kontext hinzufügen
        system_prompt += f"""

═══════════════════════════════════════
AUTOPILOT-KONTEXT:
- Dies ist eine EINGEHENDE Nachricht über {channel}
- Erstelle eine kurze, direkte Antwort (max. 4-5 Sätze)
- Die Antwort wird dem User als VORSCHLAG gezeigt
- Stil: Persönlich, professionell, WhatsApp-tauglich
- KEINE Floskeln, KEIN "Sehr geehrte/r"
"""
        
        # Messages aufbauen
        messages = history or []
        messages.append(ChatMessage(role="user", content=message_text))
        
        # AI-Antwort generieren
        reply_text = ai_client.generate(system_prompt, messages)
        
        return {
            "text": reply_text,
            "model": settings.openai_model,
            "action": action,
        }
        
    except Exception as e:
        logger.exception(f"Error generating AI response: {e}")
        return _generate_mock_response(message_text, action, channel)


def _generate_mock_response(
    message_text: str,
    action: str,
    channel: str,
) -> Dict[str, Any]:
    """
    Generiert Mock-Antworten wenn kein AI-API-Key verfügbar.
    """
    mock_responses = {
        "objection_handler": (
            "Verstehe ich total! 🤔 Lass mich kurz nachfragen: "
            "Was wäre denn der ideale Zeitpunkt/Preis für dich? "
            "Vielleicht finden wir eine Lösung."
        ),
        "generate_message": (
            "Hey! Danke für deine Nachricht. "
            "Ich melde mich gleich ausführlicher bei dir. 👋"
        ),
        "follow_up": (
            "Hi! Wollte kurz nachhaken - "
            "hast du dir das schon anschauen können? "
            "Bin gespannt auf dein Feedback! 😊"
        ),
        "offer_create": (
            "Gute Frage! Ich schick dir gleich alle Details. "
            "Kurz vorab: Es gibt verschiedene Optionen je nach deinen Bedürfnissen."
        ),
    }
    
    reply_text = mock_responses.get(
        action,
        mock_responses["generate_message"]
    )
    
    return {
        "text": reply_text,
        "model": "mock",
        "action": action,
    }


# ============================================================================
# MAIN ENGINE FUNCTION
# ============================================================================


async def process_pending_autopilot_events_for_user(
    db: Client,
    user_id: str,
    max_events: int = 20,
) -> Dict[str, Any]:
    """
    Verarbeitet pending Events eines Users und erzeugt KI-Vorschläge.
    
    Workflow:
    1. Pending Events laden
    2. Für jedes Event:
       - Settings prüfen
       - Wenn mode=off → skip
       - Sonst: AI-Antwort generieren
       - Suggested Reply speichern
    3. Summary zurückgeben
    
    Args:
        db: Supabase Client
        user_id: User-UUID
        max_events: Max. Anzahl zu verarbeitender Events
        
    Returns:
        Summary-Dict mit Countern
    """
    logger.info(f"Starting autopilot processing: user_id={user_id}, max_events={max_events}")
    
    # Counters
    processed = 0
    suggested_count = 0
    skipped_count = 0
    error_count = 0
    
    # 1. Pending Events laden
    try:
        events = await get_pending_events_for_user(db, user_id, limit=max_events)
    except Exception as e:
        logger.exception(f"Error loading pending events: {e}")
        return {
            "processed": 0,
            "suggested": 0,
            "skipped": 0,
            "errors": 1,
            "error_details": str(e),
        }
    
    if not events:
        logger.info("No pending events found")
        return {
            "processed": 0,
            "suggested": 0,
            "skipped": 0,
            "errors": 0,
        }
    
    logger.info(f"Found {len(events)} pending events")
    
    # 2. Events verarbeiten
    for event in events:
        processed += 1
        
        try:
            # Settings laden
            settings_data = await get_autopilot_settings_for_event(
                db, user_id, event.contact_id
            )
            
            # Prüfen ob Autopilot aktiv
            if not settings_data:
                # Keine Settings → Skip
                logger.info(f"No settings found for event {event.id} - skipping")
                await set_event_status(db, event.id, "skipped")
                skipped_count += 1
                continue
            
            mode = settings_data.get("mode", "off")
            is_active = settings_data.get("is_active", False)
            
            if mode == "off" or not is_active:
                logger.info(f"Autopilot off/inactive for event {event.id} - skipping")
                await set_event_status(db, event.id, "skipped")
                skipped_count += 1
                continue
            
            # Nur inbound-Nachrichten verarbeiten
            if event.direction != "inbound":
                logger.info(f"Event {event.id} is outbound - skipping")
                await set_event_status(db, event.id, "skipped")
                skipped_count += 1
                continue
            
            # 3. Action ermitteln
            action = detect_action_for_message(event.normalized_text)
            logger.info(f"Detected action for event {event.id}: {action}")
            
            # 4. AI-Antwort generieren
            ai_result = generate_ai_response(
                message_text=event.normalized_text,
                action=action,
                channel=event.channel,
            )
            
            # 5. Suggested Reply zusammenbauen (V1 Format) mit A/B Tracking
            suggested_reply = {
                "text": ai_result["text"],
                "detected_action": ai_result.get("action", action),
                "channel": event.channel,
                "mode_used": mode,  # V1: Direkt im Reply, nicht unter meta
                "model": ai_result.get("model", "unknown"),
                # A/B Experiment Fields
                "template_version": CURRENT_TEMPLATE_VERSION,
                "persona_variant": CURRENT_PERSONA_VARIANT,
            }
            
            # 6. In DB speichern
            await set_event_suggested_reply(
                db=db,
                event_id=event.id,
                suggested_reply=suggested_reply,
                new_status="suggested",
            )
            
            suggested_count += 1
            logger.info(f"Suggested reply saved for event {event.id}")
            
        except Exception as e:
            logger.exception(f"Error processing event {event.id}: {e}")
            error_count += 1
            # Event nicht auf error setzen, bleibt auf pending für Retry
    
    # 7. Summary
    summary = {
        "processed": processed,
        "suggested": suggested_count,
        "skipped": skipped_count,
        "errors": error_count,
    }
    
    logger.info(f"Autopilot processing complete: {summary}")
    return summary


__all__ = [
    "process_pending_autopilot_events_for_user",
    "detect_action_for_message",
    "generate_ai_response",
    "get_autopilot_settings_for_event",
]

