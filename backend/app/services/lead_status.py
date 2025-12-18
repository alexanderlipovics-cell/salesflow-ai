"""
Lead Status Service
Prüft ob Auto-Send erlaubt ist basierend auf Lead-Status
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


# Status-Werte
CONTACT_STATUS_NEVER_CONTACTED = "never_contacted"
CONTACT_STATUS_AWAITING_REPLY = "awaiting_reply"
CONTACT_STATUS_IN_CONVERSATION = "in_conversation"
CONTACT_STATUS_CUSTOMER = "customer"
CONTACT_STATUS_LOST = "lost"


def can_auto_send(lead: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Prüft ob CHIEF automatisch senden darf.
    
    Args:
        lead: Lead-Dict aus Datenbank
        
    Returns:
        Tuple[bool, str]: (erlaubt, grund)
    """
    status = lead.get("contact_status", CONTACT_STATUS_NEVER_CONTACTED)
    
    if status == CONTACT_STATUS_NEVER_CONTACTED:
        return True, "first_contact"
    
    if status == CONTACT_STATUS_AWAITING_REPLY:
        awaiting_since = lead.get("awaiting_reply_since")
        if not awaiting_since:
            # Fallback: Nutze last_contact_date
            awaiting_since = lead.get("last_contact_date")
        
        if awaiting_since:
            try:
                if isinstance(awaiting_since, str):
                    awaiting_date = datetime.fromisoformat(awaiting_since.replace('Z', '+00:00'))
                else:
                    awaiting_date = awaiting_since
                
                days_waiting = (datetime.utcnow() - awaiting_date.replace(tzinfo=None)).days
                
                if days_waiting >= 2:
                    return True, "follow_up"
                else:
                    days_left = 2 - days_waiting
                    return False, f"wait_{days_left}_days"
            except Exception as e:
                logger.warning(f"Error parsing awaiting_reply_since: {e}")
                # Bei Fehler: Erlaube nach 2 Tagen
                return True, "follow_up"
        else:
            # Kein Datum vorhanden: Erlaube
            return True, "follow_up"
    
    if status == CONTACT_STATUS_IN_CONVERSATION:
        return False, "lead_replied_check_first"
    
    if status in [CONTACT_STATUS_CUSTOMER, CONTACT_STATUS_LOST]:
        return False, "not_in_inbox"
    
    # Unbekannter Status: Sicherheitshalber nicht erlauben
    return False, "unknown_status"


def get_status_display_info(reason: str) -> Dict[str, Any]:
    """
    Gibt Display-Informationen für Status-Grund zurück.
    
    Returns:
        Dict mit: label, color, icon, description
    """
    status_info = {
        "first_contact": {
            "label": "Erste Kontaktaufnahme",
            "color": "bg-cyan-500/20 text-cyan-400",
            "icon": "✨",
            "description": "CHIEF kann automatisch senden",
        },
        "follow_up": {
            "label": "Follow-up",
            "color": "bg-amber-500/20 text-amber-400",
            "icon": "📅",
            "description": "CHIEF kann automatisch senden",
        },
        "wait_1_days": {
            "label": "Follow-up in 1 Tag",
            "color": "bg-slate-500/20 text-slate-400",
            "icon": "⏰",
            "description": "Warte noch 1 Tag vor Follow-up",
        },
        "wait_2_days": {
            "label": "Follow-up in 2 Tagen",
            "color": "bg-slate-500/20 text-slate-400",
            "icon": "⏰",
            "description": "Warte noch 2 Tage vor Follow-up",
        },
        "lead_replied_check_first": {
            "label": "Hat geantwortet",
            "color": "bg-purple-500/20 text-purple-400",
            "icon": "📩",
            "description": "Lead hat geantwortet - bitte prüfen",
        },
        "not_in_inbox": {
            "label": "Nicht in Inbox",
            "color": "bg-slate-500/20 text-slate-400",
            "icon": "🚫",
            "description": "Lead ist Kunde oder verloren",
        },
        "unknown_status": {
            "label": "Status unbekannt",
            "color": "bg-red-500/20 text-red-400",
            "icon": "❓",
            "description": "Status konnte nicht bestimmt werden",
        },
    }
    
    return status_info.get(reason, {
        "label": reason,
        "color": "bg-slate-500/20 text-slate-400",
        "icon": "❓",
        "description": "Unbekannter Status",
    })


def set_contact_status_after_send(
    lead: Dict[str, Any],
    message_sent: bool = True,
) -> Dict[str, Any]:
    """
    Aktualisiert Lead-Status nach dem Senden einer Nachricht.
    
    Args:
        lead: Lead-Dict
        message_sent: Ob Nachricht erfolgreich gesendet wurde
        
    Returns:
        Dict mit Updates für Lead
    """
    updates = {}
    now = datetime.utcnow()
    
    if message_sent:
        # Status auf "awaiting_reply" setzen
        updates["contact_status"] = CONTACT_STATUS_AWAITING_REPLY
        updates["last_contact_date"] = now.isoformat()
        updates["last_contact_by"] = "user"
        updates["awaiting_reply_since"] = now.isoformat()
        
        # Contact Count erhöhen
        current_count = lead.get("contact_count", 0)
        updates["contact_count"] = current_count + 1
    
    return updates


def set_contact_status_from_chat_analysis(
    lead: Dict[str, Any],
    analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Setzt Status basierend auf Chat-Analyse.
    
    Args:
        lead: Lead-Dict
        analysis: Chat-Analyse mit last_message_by, lead_replied, etc.
        
    Returns:
        Dict mit Updates für Lead
    """
    updates = {}
    now = datetime.utcnow()
    
    last_message_by = analysis.get("last_message_by")
    lead_replied = analysis.get("lead_replied", False)
    last_message_date = analysis.get("last_message_date")
    
    if last_message_by == "user" and not lead_replied:
        # User hat zuletzt geschrieben, Lead hat nicht geantwortet
        updates["contact_status"] = CONTACT_STATUS_AWAITING_REPLY
        if last_message_date:
            updates["awaiting_reply_since"] = last_message_date
        else:
            updates["awaiting_reply_since"] = now.isoformat()
    elif last_message_by == "lead" or lead_replied:
        # Lead hat geantwortet
        updates["contact_status"] = CONTACT_STATUS_IN_CONVERSATION
        updates["awaiting_reply_since"] = None  # Zurücksetzen
    
    if last_message_date:
        updates["last_contact_date"] = last_message_date
        updates["last_contact_by"] = last_message_by
    
    return updates

