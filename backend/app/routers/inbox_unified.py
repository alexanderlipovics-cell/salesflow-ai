"""
Unified Inbox API Endpoints

Endpunkte für die neue Unified Inbox, die Follow-ups, AI Approvals und neue Leads kombiniert.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

from ..core.deps import get_supabase
from ..core.security import get_current_active_user
from ..services.activity_logger import ActivityLogger
from ..services.lead_status import (
    can_auto_send,
    set_contact_status_after_send,
    get_status_display_info,
    CONTACT_STATUS_NEVER_CONTACTED,
)

router = APIRouter(prefix="/api/inbox-unified", tags=["inbox-unified"])
logger = logging.getLogger(__name__)


# ============================================================================
# Request/Response Models
# ============================================================================

class BulkSendRequest(BaseModel):
    item_ids: List[str]


class BulkSendResponse(BaseModel):
    sent: int
    failed: int
    skipped: int
    errors: List[Dict[str, Any]] = []


class SkipRequest(BaseModel):
    snooze_days: Optional[int] = None


# ============================================================================
# Helper Functions
# ============================================================================

def _extract_user_id(current_user: dict) -> str:
    """Extrahiert die User-ID aus dem aktuellen User-Objekt."""
    if not current_user:
        raise HTTPException(status_code=401, detail="User nicht authentifiziert")
    
    user_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("sub")
        or current_user.get("team_member_id")
    )
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User-ID nicht gefunden")
    
    return str(user_id)


def _parse_item_id(item_id: str) -> tuple[str, str]:
    """
    Parst eine Inbox Item ID und gibt Typ und ID zurück.
    
    Format: {type}_{id}
    z.B. "followup_123" -> ("followup", "123")
         "approval_456" -> ("approval", "456")
         "lead_789" -> ("lead", "789")
    """
    parts = item_id.split("_", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail=f"Ungültige Item-ID Format: {item_id}. Erwartet: {{type}}_{{id}}"
        )
    return parts[0], parts[1]


async def _verify_user_access(
    db,
    user_id: str,
    item_type: str,
    item_id: str
) -> Dict[str, Any]:
    """
    Prüft ob der User Zugriff auf das Item hat und gibt die Item-Daten zurück.
    """
    if item_type == "followup":
        # Prüfe followup_suggestions Tabelle
        result = (
            db.table("followup_suggestions")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Follow-up Suggestion {item_id} nicht gefunden oder kein Zugriff"
            )
        
        return result.data[0]
    
    elif item_type == "approval":
        # Prüfe inbox_messages oder ähnliche Tabelle
        # TODO: Anpassen je nach tatsächlicher Tabellenstruktur
        result = (
            db.table("inbox_messages")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Approval Message {item_id} nicht gefunden oder kein Zugriff"
            )
        
        return result.data[0]
    
    elif item_type == "lead":
        # Prüfe leads Tabelle
        result = (
            db.table("leads")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Lead {item_id} nicht gefunden oder kein Zugriff"
            )
        
        return result.data[0]
    
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unbekannter Item-Typ: {item_type}"
        )


async def _send_followup_suggestion(
    db,
    user_id: str,
    suggestion_id: str,
    edited_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sendet eine Follow-up Suggestion.
    - Markiert als "sent" mit Timestamp
    - Loggt die Aktion
    """
    # Hole die Suggestion
    result = (
        db.table("followup_suggestions")
        .select("*")
        .eq("id", suggestion_id)
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"Follow-up Suggestion {suggestion_id} nicht gefunden oder bereits verarbeitet"
        )
    
    suggestion = result.data[0]
    message_to_send = edited_message or suggestion.get("suggested_message", "")
    
    # Update Status
    update_data = {
        "status": "sent",
        "sent_at": datetime.utcnow().isoformat(),
    }
    
    if edited_message:
        update_data["suggested_message"] = edited_message
    
    db.table("followup_suggestions").update(update_data).eq("id", suggestion_id).execute()
    
    # Log Activity
    try:
        activity = ActivityLogger(db, user_id)
        await activity.log(
            action_type="completed",
            entity_type="follow_up",
            entity_id=suggestion_id,
            entity_name=f"Follow-up für {suggestion.get('lead_id')}",
            details={
                "action": "send",
                "lead_id": suggestion.get("lead_id"),
                "channel": suggestion.get("channel"),
            },
            source="inbox",
        )
    except Exception as e:
        logger.warning(f"Could not log activity: {e}")
    
    return {
        "success": True,
        "item_id": suggestion_id,
        "type": "followup",
        "message": "Follow-up erfolgreich gesendet",
    }


async def _skip_followup_suggestion(
    db,
    user_id: str,
    suggestion_id: str,
    snooze_days: Optional[int] = None
) -> Dict[str, Any]:
    """
    Überspringt eine Follow-up Suggestion.
    - Wenn snooze_days: Neues Datum setzen
    - Sonst: Als "skipped" markieren
    """
    # Hole die Suggestion
    result = (
        db.table("followup_suggestions")
        .select("*")
        .eq("id", suggestion_id)
        .eq("user_id", user_id)
        .eq("status", "pending")
        .execute()
    )
    
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"Follow-up Suggestion {suggestion_id} nicht gefunden oder bereits verarbeitet"
        )
    
    suggestion = result.data[0]
    
    if snooze_days:
        # Snooze: Neues Datum setzen
        new_due_at = (datetime.utcnow() + timedelta(days=snooze_days)).isoformat()
        update_data = {
            "status": "snoozed",
            "due_at": new_due_at,
            "snoozed_until": new_due_at,
        }
    else:
        # Skip: Als skipped markieren
        update_data = {
            "status": "skipped",
            "skipped_at": datetime.utcnow().isoformat(),
        }
    
    db.table("followup_suggestions").update(update_data).eq("id", suggestion_id).execute()
    
    # Log Activity
    try:
        activity = ActivityLogger(db, user_id)
        await activity.log(
            action_type="updated",
            entity_type="follow_up",
            entity_id=suggestion_id,
            entity_name=f"Follow-up für {suggestion.get('lead_id')}",
            details={
                "action": "skip" if not snooze_days else "snooze",
                "lead_id": suggestion.get("lead_id"),
                "snooze_days": snooze_days,
            },
            source="inbox",
        )
    except Exception as e:
        logger.warning(f"Could not log activity: {e}")
    
    return {
        "success": True,
        "item_id": suggestion_id,
        "type": "followup",
        "message": f"Follow-up {'verschoben' if snooze_days else 'übersprungen'}",
    }


# ============================================================================
# API Endpoints
# ============================================================================

class SendRequest(BaseModel):
    edited_message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# WICHTIG: Route-Reihenfolge in FastAPI!
# ═══════════════════════════════════════════════════════════════════════════
# Spezifische/statische Routes MÜSSEN VOR generischen Routes stehen!
# FastAPI matcht Routes in der Reihenfolge ihrer Definition.
# 
# RICHTIG:
# 1. Statische Routes: /bulk-send, /check-auto-send/{lead_id}
# 2. Generische Routes: /{item_id}/send, /{item_id}/skip
#
# FALSCH wäre:
# /{item_id}/send vor /check-auto-send/{lead_id}
# → Dann würde "check-auto-send" als item_id interpretiert!
# ═══════════════════════════════════════════════════════════════════════════


@router.post("/bulk-send")
async def bulk_send_inbox_items(
    request: BulkSendRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> BulkSendResponse:
    """
    Sendet mehrere Follow-ups auf einmal.
    - Iteriert durch alle IDs
    - Sendet jede Nachricht
    - Gibt Erfolgs-/Fehlerstatistik zurück
    """
    user_id = _extract_user_id(current_user)
    
    result = BulkSendResponse(sent=0, failed=0, skipped=0, errors=[])
    
    for item_id in request.item_ids:
        try:
            item_type, item_db_id = _parse_item_id(item_id)
            
            # Verifiziere Zugriff
            await _verify_user_access(db, user_id, item_type, item_db_id)
            
            if item_type == "followup":
                await _send_followup_suggestion(db, user_id, item_db_id)
                result.sent += 1
            elif item_type == "approval":
                # Weiterleitung an bestehenden Endpunkt
                from ..routers.inbox import approve_message
                await approve_message(item_db_id, None, current_user, db)
                result.sent += 1
            else:
                result.skipped += 1
                result.errors.append({
                    "item_id": item_id,
                    "error": f"Item-Typ {item_type} wird in Bulk-Send nicht unterstützt"
                })
        
        except HTTPException as e:
            result.failed += 1
            result.errors.append({
                "item_id": item_id,
                "error": e.detail
            })
        except Exception as e:
            result.failed += 1
            result.errors.append({
                "item_id": item_id,
                "error": str(e)
            })
            logger.error(f"Error sending item {item_id}: {e}")
    
    return result


@router.get("/check-auto-send/{lead_id}")
async def check_auto_send(
    lead_id: str,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """
    Prüft ob Auto-Send für einen Lead erlaubt ist.
    
    Endpoint: GET /api/inbox-unified/check-auto-send/{lead_id}
    """
    user_id = _extract_user_id(current_user)
    
    # Hole Lead
    result = (
        db.table("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"Lead {lead_id} nicht gefunden"
        )
    
    lead = result.data[0]
    
    # Safe call with fallback
    try:
        can_send, reason = can_auto_send(lead)
        status_info = get_status_display_info(reason)
    except Exception as e:
        logger.warning(f"can_auto_send error: {e}")
        can_send = True
        reason = "default"
        status_info = {"label": "Bereit", "color": "green"}
    
    return {
        "lead_id": lead_id,
        "can_send": can_send,
        "reason": reason,
        "status_info": status_info,
        "contact_status": lead.get("contact_status", "unknown")
    }


# ═══════════════════════════════════════════════════════════════════════════
# Generische Routes (MÜSSEN nach spezifischen Routes stehen!)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/{item_id}/send")
async def send_inbox_item(
    item_id: str,
    request: Optional[SendRequest] = None,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """
    Sendet eine KI-generierte Nachricht.
    - Findet den Follow-up Task in der Datenbank
    - Markiert als "sent" mit Timestamp
    - Gibt Erfolg zurück
    """
    user_id = _extract_user_id(current_user)
    item_type, item_db_id = _parse_item_id(item_id)
    
    # Verifiziere Zugriff
    await _verify_user_access(db, user_id, item_type, item_db_id)
    
    edited_message = request.edited_message if request else None
    
    if item_type == "followup":
        return await _send_followup_suggestion(db, user_id, item_db_id, edited_message)
    elif item_type == "approval":
        # TODO: Implementiere Approval senden (ähnlich wie in inbox.py)
        # Für jetzt: Weiterleitung an bestehenden Endpunkt
        from ..routers.inbox import approve_message
        return await approve_message(item_db_id, None, current_user, db)
    elif item_type == "lead":
        # Für neue Leads: Nur als "reviewed" markieren
        db.table("leads").update({
            "status": "REVIEWED",
            "reviewed_at": datetime.utcnow().isoformat(),
        }).eq("id", item_db_id).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "item_id": item_id,
            "type": "lead",
            "message": "Lead als reviewed markiert",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Item-Typ {item_type} kann nicht gesendet werden"
        )


@router.post("/{item_id}/skip")
async def skip_inbox_item(
    item_id: str,
    request: Optional[SkipRequest] = None,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """
    Überspringt/Snoozed einen Follow-up.
    - Wenn snooze_days: Neues Datum setzen
    - Sonst: Als "skipped" markieren
    """
    user_id = _extract_user_id(current_user)
    item_type, item_db_id = _parse_item_id(item_id)
    
    # Verifiziere Zugriff
    await _verify_user_access(db, user_id, item_type, item_db_id)
    
    snooze_days = request.snooze_days if request else None
    
    if item_type == "followup":
        return await _skip_followup_suggestion(db, user_id, item_db_id, snooze_days)
    elif item_type == "approval":
        # Weiterleitung an bestehenden Endpunkt
        from ..routers.inbox import skip_message
        return await skip_message(item_db_id, current_user, db)
    elif item_type == "lead":
        # Für neue Leads: Als "archived" markieren
        db.table("leads").update({
            "status": "ARCHIVED",
            "archived_at": datetime.utcnow().isoformat(),
        }).eq("id", item_db_id).eq("user_id", user_id).execute()
        
        return {
            "success": True,
            "item_id": item_id,
            "type": "lead",
            "message": "Lead archiviert",
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Item-Typ {item_type} kann nicht übersprungen werden"
        )

