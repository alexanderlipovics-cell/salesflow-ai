"""
Message Events Repository für SALESFLOW AI.

Datenbankzugriff für Message Events.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import logging
import re

from supabase import Client

from ...schemas.message_events import (
    MessageEvent,
    MessageEventCreate,
)

logger = logging.getLogger(__name__)


# ============================================================================
# TEXT NORMALIZATION (Placeholder für späteres Preprocessing)
# ============================================================================


def normalize_text(text: str) -> str:
    """
    Normalisiert Nachrichtentext für KI-Verarbeitung.
    
    Placeholder - später erweiterbar um:
    - HTML-Tags entfernen
    - E-Mail-Signaturen entfernen
    - Zitate/Forwards bereinigen
    - Whitespace normalisieren
    """
    if not text:
        return ""
    
    # Einfache Normalisierung
    normalized = text.strip()
    
    # Mehrfache Whitespaces reduzieren
    normalized = re.sub(r'\s+', ' ', normalized)
    
    # HTML-Tags entfernen (basic)
    normalized = re.sub(r'<[^>]+>', '', normalized)
    
    return normalized


# ============================================================================
# REPOSITORY FUNCTIONS
# ============================================================================


async def create_message_event(
    db: Client,
    user_id: str,
    data: MessageEventCreate,
) -> MessageEvent:
    """
    Erstellt ein neues Message Event in der Datenbank.
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        data: MessageEventCreate mit Nachrichtendaten
        
    Returns:
        MessageEvent: Das erstellte Event
    """
    logger.info(
        f"Creating message event: user_id={user_id}, "
        f"channel={data.channel}, direction={data.direction}"
    )
    
    # Text normalisieren
    normalized_text = normalize_text(data.text)
    
    # Daten für Insert vorbereiten
    event_data: Dict[str, Any] = {
        "user_id": user_id,
        "contact_id": data.contact_id,
        "channel": data.channel,
        "direction": data.direction,
        "normalized_text": normalized_text,
        "raw_payload": data.raw_payload,
        "autopilot_status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        # A/B Experiment Fields
        "template_version": data.template_version,
        "persona_variant": data.persona_variant,
    }
    
    # Insert in Supabase
    result = db.table("message_events").insert(event_data).execute()
    
    if not result.data:
        raise ValueError("Fehler beim Erstellen des Message Events")
    
    row = result.data[0]
    logger.info(f"Message event created: id={row['id']}")
    
    # _row_to_message_event verwenden, aber original text behalten
    event = _row_to_message_event(row)
    event.text = data.text  # Original-Text behalten
    return event


async def list_message_events_for_user(
    db: Client,
    user_id: str,
    status: Optional[str] = None,
    contact_id: Optional[str] = None,
    channel: Optional[str] = None,
    direction: Optional[str] = None,
    limit: int = 50,
) -> List[MessageEvent]:
    """
    Listet Message Events für einen User.
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        status: Optional - Filter nach autopilot_status
        contact_id: Optional - Filter nach Contact
        channel: Optional - Filter nach Kanal
        direction: Optional - Filter nach Richtung
        limit: Max. Anzahl Events (default: 50)
        
    Returns:
        List[MessageEvent]: Liste der Events
    """
    logger.info(f"Listing message events: user_id={user_id}, status={status}")
    
    # Query aufbauen
    query = (
        db.table("message_events")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    
    # Optionale Filter
    if status:
        query = query.eq("autopilot_status", status)
    if contact_id:
        query = query.eq("contact_id", contact_id)
    if channel:
        query = query.eq("channel", channel)
    if direction:
        query = query.eq("direction", direction)
    
    result = query.execute()
    
    events = [_row_to_message_event(row) for row in result.data or []]
    
    logger.info(f"Found {len(events)} message events")
    return events


async def update_message_event_status(
    db: Client,
    event_id: str,
    user_id: str,
    new_status: str,
) -> Optional[MessageEvent]:
    """
    Aktualisiert den Autopilot-Status eines Message Events.
    
    Args:
        db: Supabase Client
        event_id: UUID des Events
        user_id: UUID des Users (für Sicherheit)
        new_status: Neuer Status
        
    Returns:
        MessageEvent oder None wenn nicht gefunden
    """
    logger.info(f"Updating message event status: id={event_id}, new_status={new_status}")
    
    result = (
        db.table("message_events")
        .update({"autopilot_status": new_status})
        .eq("id", event_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    row = result.data[0]
    return _row_to_message_event(row)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _row_to_message_event(row: Dict[str, Any]) -> MessageEvent:
    """Konvertiert DB-Row zu MessageEvent Schema."""
    return MessageEvent(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        contact_id=str(row["contact_id"]) if row.get("contact_id") else None,
        channel=row["channel"],
        direction=row["direction"],
        text=row["normalized_text"],
        normalized_text=row["normalized_text"],
        raw_payload=row.get("raw_payload"),
        suggested_reply=row.get("suggested_reply"),
        autopilot_status=row["autopilot_status"],
        # A/B Experiment Fields
        template_version=row.get("template_version"),
        persona_variant=row.get("persona_variant"),
        created_at=row["created_at"],
    )


# ============================================================================
# AUTOPILOT ENGINE FUNCTIONS
# ============================================================================


async def get_pending_events_for_user(
    db: Client,
    user_id: str,
    limit: int = 20,
    channel: Optional[str] = "internal",
) -> List[MessageEvent]:
    """
    Holt alle pending Message Events für einen User.
    Sortiert nach created_at ASC (älteste zuerst).
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        limit: Max. Anzahl Events (default: 20)
        channel: Filter nach Kanal (default: "internal" für v1)
        
    Returns:
        List[MessageEvent]: Liste der pending Events
    """
    logger.info(f"Getting pending events: user_id={user_id}, channel={channel}, limit={limit}")
    
    query = (
        db.table("message_events")
        .select("*")
        .eq("user_id", user_id)
        .eq("autopilot_status", "pending")
    )
    
    # V1: Nur internal channel verarbeiten
    if channel:
        query = query.eq("channel", channel)
    
    result = (
        query
        .order("created_at", desc=False)  # ASC - älteste zuerst
        .limit(limit)
        .execute()
    )
    
    events = [_row_to_message_event(row) for row in result.data or []]
    logger.info(f"Found {len(events)} pending events for channel={channel}")
    return events


async def set_event_suggested_reply(
    db: Client,
    event_id: str,
    suggested_reply: Dict[str, Any],
    new_status: str = "suggested",
) -> Optional[MessageEvent]:
    """
    Setzt den Antwortvorschlag für ein Message Event.
    
    Args:
        db: Supabase Client
        event_id: UUID des Events
        suggested_reply: Dict mit Antwortvorschlag { text, detected_action, channel, meta }
        new_status: Neuer Status (default: "suggested")
        
    Returns:
        MessageEvent oder None wenn nicht gefunden
    """
    logger.info(f"Setting suggested reply: event_id={event_id}, status={new_status}")
    
    result = (
        db.table("message_events")
        .update({
            "suggested_reply": suggested_reply,
            "autopilot_status": new_status,
        })
        .eq("id", event_id)
        .execute()
    )
    
    if not result.data:
        logger.warning(f"Event not found: {event_id}")
        return None
    
    row = result.data[0]
    logger.info(f"Suggested reply set for event: {event_id}")
    return _row_to_message_event(row)


async def set_event_status(
    db: Client,
    event_id: str,
    new_status: str,
) -> Optional[MessageEvent]:
    """
    Setzt nur den Status eines Events (ohne suggested_reply zu ändern).
    
    Args:
        db: Supabase Client
        event_id: UUID des Events
        new_status: Neuer Status
        
    Returns:
        MessageEvent oder None wenn nicht gefunden
    """
    logger.info(f"Setting event status: event_id={event_id}, status={new_status}")
    
    result = (
        db.table("message_events")
        .update({"autopilot_status": new_status})
        .eq("id", event_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    return _row_to_message_event(result.data[0])


__all__ = [
    "create_message_event",
    "list_message_events_for_user",
    "update_message_event_status",
    "normalize_text",
    "get_pending_events_for_user",
    "set_event_suggested_reply",
    "set_event_status",
    "_row_to_message_event",
]

