"""
Autopilot Router für SALESFLOW AI.

Verwaltet Autopilot-Einstellungen pro User (global oder pro Contact).
"""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
import logging

from ..core.deps import get_current_user
from ..supabase_client import get_supabase_client, SupabaseNotConfiguredError
from ..schemas.autopilot import (
    AutopilotMode,
    AutopilotSettings,
    AutopilotSettingsResponse,
    AutopilotSettingsUpdate,
)
from ..schemas.message_events import (
    MessageEvent,
    MessageEventCreate,
    MessageEventResponse,
    MessageEventListResponse,
)
from ..db.repositories.message_events import (
    create_message_event,
    list_message_events_for_user,
    update_message_event_status,
)
from ..schemas.message_events import MessageEventStatusUpdate
from ..services.autopilot_engine import process_pending_autopilot_events_for_user

router = APIRouter(prefix="/autopilot", tags=["autopilot"])
logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _build_default_settings(user_id: str, contact_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Erstellt Default-Settings im RAM (ohne DB-Insert).
    Wird zurückgegeben wenn keine Settings existieren.
    """
    now = datetime.utcnow().isoformat()
    return {
        "id": None,  # Wird als "default" markiert
        "user_id": user_id,
        "contact_id": contact_id,
        "mode": AutopilotMode.OFF.value,
        "channels": ["email"],
        "max_auto_replies_per_day": 10,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }


def _row_to_settings(row: Dict[str, Any]) -> AutopilotSettings:
    """Konvertiert DB-Row zu Pydantic Schema."""
    return AutopilotSettings(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        contact_id=str(row["contact_id"]) if row.get("contact_id") else None,
        mode=row["mode"],
        channels=row["channels"] if isinstance(row["channels"], list) else ["email"],
        max_auto_replies_per_day=row["max_auto_replies_per_day"],
        is_active=row["is_active"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


# ============================================================================
# ENDPOINTS
# ============================================================================


@router.get("/settings", response_model=AutopilotSettingsResponse)
async def get_autopilot_settings(
    contact_id: Optional[str] = Query(
        default=None,
        description="Contact-UUID für spezifische Settings (optional)"
    ),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Holt Autopilot-Settings für den aktuellen User.
    
    - Wenn contact_id angegeben: Suche nach Contact-spezifischen Settings
    - Falls keine Contact-Settings gefunden: Fallback auf globale User-Settings
    - Falls keine Settings existieren: Gib Default-Settings zurück (ohne DB-Insert)
    
    **Response:**
    - `settings`: Die aktuellen Autopilot-Einstellungen
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    
    # Helper: Default Settings zurückgeben
    def _return_defaults():
        logger.info(f"Returning default settings for user_id={user_id}")
        default = _build_default_settings(user_id, contact_id)
        default["id"] = "default"
        return AutopilotSettingsResponse(
            success=True,
            settings=AutopilotSettings(
                id=default["id"],
                user_id=default["user_id"],
                contact_id=default["contact_id"],
                mode=default["mode"],
                channels=default["channels"],
                max_auto_replies_per_day=default["max_auto_replies_per_day"],
                is_active=default["is_active"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
        )
    
    try:
        db = get_supabase_client()
        
        logger.info(f"GET autopilot settings: user_id={user_id}, contact_id={contact_id}")
        
        # 1. Wenn contact_id gegeben: Versuche Contact-spezifische Settings zu holen
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
                logger.info(f"Found contact-specific settings for contact_id={contact_id}")
                return AutopilotSettingsResponse(
                    success=True,
                    settings=_row_to_settings(result.data[0])
                )
        
        # 2. Fallback: Globale User-Settings (contact_id IS NULL)
        result = (
            db.table("autopilot_settings")
            .select("*")
            .eq("user_id", user_id)
            .is_("contact_id", "null")
            .limit(1)
            .execute()
        )
        
        if result.data:
            logger.info(f"Found global settings for user_id={user_id}")
            return AutopilotSettingsResponse(
                success=True,
                settings=_row_to_settings(result.data[0])
            )
        
        # 3. Keine Settings gefunden: Default zurückgeben
        return _return_defaults()
    
    except SupabaseNotConfiguredError:
        # Supabase nicht konfiguriert -> Default Settings zurückgeben
        logger.warning("Supabase not configured - returning default autopilot settings")
        return _return_defaults()
        
    except Exception as e:
        error_str = str(e).lower()
        # Supabase nicht konfiguriert (HTTPException von deps.py) -> Default Settings
        if "supabase" in error_str and ("nicht konfiguriert" in error_str or "not configured" in error_str):
            logger.warning("Supabase not configured - returning default autopilot settings")
            return _return_defaults()
        # Tabelle oder Spalte existiert nicht -> Default Settings zurückgeben
        if "42p01" in error_str or "42703" in error_str or "does not exist" in error_str:
            logger.warning(
                f"autopilot_settings table/column not found - returning defaults. "
                f"Run migration: 20251205_create_autopilot_settings.sql"
            )
            return _return_defaults()
        
        logger.exception(f"Error getting autopilot settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settings", response_model=AutopilotSettingsResponse)
async def upsert_autopilot_settings(
    data: AutopilotSettingsUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Erstellt oder aktualisiert Autopilot-Settings für den aktuellen User.
    
    **Logik:**
    - Wenn Settings für (user_id, contact_id) existieren: Update
    - Sonst: Insert
    
    **Body:**
    - `mode`: off | assist | one_click | auto
    - `channels`: Array von Kanälen (z.B. ["email", "whatsapp"])
    - `max_auto_replies_per_day`: Limit für automatische Antworten
    - `is_active`: Aktiviert/Deaktiviert
    - `contact_id`: Optional - für Contact-spezifische Settings
    
    **Response:**
    - `settings`: Die gespeicherten Einstellungen
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    contact_id = data.contact_id
    
    try:
        db = get_supabase_client()
        
        logger.info(
            f"POST autopilot settings: user_id={user_id}, "
            f"contact_id={contact_id}, mode={data.mode}"
        )
        
        # Prüfen ob Settings existieren
        query = (
            db.table("autopilot_settings")
            .select("id")
            .eq("user_id", user_id)
        )
        
        if contact_id:
            query = query.eq("contact_id", contact_id)
        else:
            query = query.is_("contact_id", "null")
        
        existing = query.limit(1).execute()
        
        # Daten für Insert/Update vorbereiten
        settings_data = {
            "user_id": user_id,
            "contact_id": contact_id,
            "mode": data.mode.value if isinstance(data.mode, AutopilotMode) else data.mode,
            "channels": data.channels,
            "max_auto_replies_per_day": data.max_auto_replies_per_day,
            "is_active": data.is_active,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        if existing.data:
            # UPDATE
            settings_id = existing.data[0]["id"]
            logger.info(f"Updating existing settings id={settings_id}")
            
            result = (
                db.table("autopilot_settings")
                .update(settings_data)
                .eq("id", settings_id)
                .execute()
            )
        else:
            # INSERT
            settings_data["created_at"] = datetime.utcnow().isoformat()
            logger.info("Inserting new settings")
            
            result = (
                db.table("autopilot_settings")
                .insert(settings_data)
                .execute()
            )
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Fehler beim Speichern der Settings")
        
        saved = result.data[0]
        logger.info(f"Settings saved: id={saved['id']}")
        
        return AutopilotSettingsResponse(
            success=True,
            settings=_row_to_settings(saved)
        )
    
    except SupabaseNotConfiguredError:
        # Supabase nicht konfiguriert -> Hilfreiche Fehlermeldung
        logger.error("Supabase not configured - cannot save autopilot settings")
        raise HTTPException(
            status_code=503,
            detail="Supabase nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        # Tabelle oder Spalte existiert nicht -> Hilfreiche Fehlermeldung
        if "42p01" in error_str or "42703" in error_str or "does not exist" in error_str:
            logger.error(
                f"autopilot_settings table/column not found. "
                f"Run migration: 20251205_create_autopilot_settings.sql"
            )
            raise HTTPException(
                status_code=503,
                detail="Autopilot-Tabelle nicht gefunden. Bitte Migration ausführen: 20251205_create_autopilot_settings.sql"
            )
        
        logger.exception(f"Error upserting autopilot settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MESSAGE EVENTS ENDPOINTS
# ============================================================================


@router.post("/message-event", response_model=MessageEventResponse)
async def create_message_event_endpoint(
    data: MessageEventCreate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Erstellt ein neues Message Event für Autopilot-Verarbeitung.
    
    Dieses Event wird vom Autopilot analysiert und ggf. eine
    automatische Antwort vorgeschlagen.
    
    **Body:**
    - `contact_id`: Contact-UUID (optional)
    - `channel`: email | whatsapp | instagram | linkedin | facebook | internal
    - `direction`: inbound | outbound
    - `text`: Nachrichtentext
    - `raw_payload`: Original-Payload vom Kanal (optional)
    
    **Response:**
    - `event`: Das erstellte Message Event
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        logger.info(
            f"POST message-event: user_id={user_id}, "
            f"channel={data.channel}, direction={data.direction}"
        )
        
        # Event erstellen über Repository
        event = await create_message_event(db, user_id, data)
        
        return MessageEventResponse(
            success=True,
            event=event
        )
    
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured - cannot create message event")
        raise HTTPException(
            status_code=503,
            detail="Supabase nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen."
        )
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        error_str = str(e).lower()
        # Tabelle existiert nicht
        if "42p01" in error_str or "does not exist" in error_str:
            logger.error(
                f"message_events table not found. "
                f"Run migration: 20251205_create_message_events.sql"
            )
            raise HTTPException(
                status_code=503,
                detail="Message-Events-Tabelle nicht gefunden. Bitte Migration ausführen: 20251205_create_message_events.sql"
            )
        
        logger.exception(f"Error creating message event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/message-events", response_model=MessageEventListResponse)
async def list_message_events_endpoint(
    status: Optional[str] = Query(
        default=None,
        description="Filter nach autopilot_status: pending, suggested, approved, sent, skipped"
    ),
    contact_id: Optional[str] = Query(
        default=None,
        description="Filter nach Contact-UUID"
    ),
    channel: Optional[str] = Query(
        default=None,
        description="Filter nach Kanal: email, whatsapp, etc."
    ),
    direction: Optional[str] = Query(
        default=None,
        description="Filter nach Richtung: inbound, outbound"
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
        description="Max. Anzahl Events"
    ),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Listet Message Events für den aktuellen User.
    
    **Query-Parameter:**
    - `status`: Filter nach autopilot_status (optional)
    - `contact_id`: Filter nach Contact (optional)
    - `channel`: Filter nach Kanal (optional)
    - `direction`: Filter nach Richtung (optional)
    - `limit`: Max. Anzahl Events (default: 50, max: 200)
    
    **Response:**
    - `events`: Liste der Message Events
    - `count`: Anzahl der Events
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        logger.info(f"GET message-events: user_id={user_id}, status={status}")
        
        events = await list_message_events_for_user(
            db=db,
            user_id=user_id,
            status=status,
            contact_id=contact_id,
            channel=channel,
            direction=direction,
            limit=limit,
        )
        
        return MessageEventListResponse(
            success=True,
            events=events,
            count=len(events)
        )
    
    except SupabaseNotConfiguredError:
        logger.warning("Supabase not configured - returning empty events list")
        return MessageEventListResponse(
            success=True,
            events=[],
            count=0
        )
        
    except Exception as e:
        error_str = str(e).lower()
        # Tabelle existiert nicht
        if "42p01" in error_str or "does not exist" in error_str:
            logger.warning("message_events table not found - returning empty list")
            return MessageEventListResponse(
                success=True,
                events=[],
                count=0
            )
        
        logger.exception(f"Error listing message events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AUTOPILOT ENGINE ENDPOINTS
# ============================================================================


@router.post("/run-once")
async def run_autopilot_once(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Max. Anzahl zu verarbeitender Events"
    ),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Führt die Autopilot-Engine einmal aus.
    
    - Verarbeitet pending Events des aktuellen Users
    - Generiert KI-Antwortvorschläge
    - Setzt Status auf 'suggested' oder 'skipped'
    
    **Query-Parameter:**
    - `limit`: Max. Anzahl Events (default: 20, max: 100)
    
    **Response:**
    - `summary`: Verarbeitungsergebnis mit Countern
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    
    try:
        db = get_supabase_client()
        
        logger.info(f"POST run-once: user_id={user_id}, limit={limit}")
        
        summary = await process_pending_autopilot_events_for_user(
            db=db,
            user_id=user_id,
            max_events=limit,
        )
        
        return {
            "success": True,
            "summary": summary,
        }
    
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured - cannot run autopilot")
        raise HTTPException(
            status_code=503,
            detail="Supabase nicht konfiguriert. Bitte SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY setzen."
        )
        
    except Exception as e:
        error_str = str(e).lower()
        # Tabelle existiert nicht
        if "42p01" in error_str or "does not exist" in error_str:
            logger.error("Required tables not found - run migrations first")
            raise HTTPException(
                status_code=503,
                detail="Erforderliche Tabellen nicht gefunden. Bitte alle Migrationen ausführen."
            )
        
        logger.exception(f"Error running autopilot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/message-event/{event_id}", response_model=MessageEventResponse)
async def update_message_event_status_endpoint(
    event_id: str,
    data: MessageEventStatusUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Aktualisiert den Status eines Message Events.
    
    Ermöglicht manuelles Ändern des Autopilot-Status:
    - `approved`: User hat Vorschlag genehmigt
    - `skipped`: User hat Vorschlag abgelehnt
    - `sent`: Nachricht wurde gesendet
    - `pending`: Zurück in Warteschlange
    
    **Path-Parameter:**
    - `event_id`: UUID des Events
    
    **Body:**
    - `autopilot_status`: Neuer Status
    
    **Response:**
    - `event`: Aktualisiertes Message Event
    - `success`: true wenn erfolgreich
    """
    user_id = user.get("user_id", "unknown")
    
    # Status validieren
    valid_statuses = ["pending", "suggested", "approved", "sent", "skipped"]
    if data.autopilot_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültiger Status. Erlaubt: {', '.join(valid_statuses)}"
        )
    
    try:
        db = get_supabase_client()
        
        logger.info(
            f"PATCH message-event: event_id={event_id}, "
            f"new_status={data.autopilot_status}"
        )
        
        event = await update_message_event_status(
            db=db,
            event_id=event_id,
            user_id=user_id,
            new_status=data.autopilot_status,
        )
        
        if not event:
            raise HTTPException(
                status_code=404,
                detail=f"Event nicht gefunden: {event_id}"
            )
        
        return MessageEventResponse(
            success=True,
            event=event,
        )
    
    except HTTPException:
        raise
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured - cannot update event")
        raise HTTPException(
            status_code=503,
            detail="Supabase nicht konfiguriert."
        )
        
    except Exception as e:
        logger.exception(f"Error updating message event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = ["router"]

