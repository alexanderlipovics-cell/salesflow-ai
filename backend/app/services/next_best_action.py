"""
Sales Flow AI - Next Best Action (NBA) Service

Bestimmt die optimale nächste Aktion für einen Lead basierend auf:
- P-Score (Predictive Score)
- Message Event Historie
- Lead-Status und Timing

Version 1.0 - Heuristischer Entscheidungsbaum
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Literal, List
from uuid import UUID
import logging

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# TYPES & CONFIGURATION
# ============================================================================

NBAActionKey = Literal[
    "follow_up",       # Follow-up Nachricht senden
    "call_script",     # Anruf vorbereiten (Erstkontakt)
    "offer_create",    # Angebot erstellen
    "closing_helper",  # Abschluss-Unterstützung
    "research_person", # Person recherchieren
    "nurture",         # Content/Nurturing senden
    "wait",            # Abwarten (kein Action nötig)
]

# Action Descriptions für Begründungen
ACTION_DESCRIPTIONS = {
    "follow_up": "Follow-up empfohlen - Lead zeigt Engagement",
    "call_script": "Erstkontakt per Telefon - Lead ist qualifiziert aber unberührt",
    "offer_create": "Angebot erstellen - Lead ist heiß und bereit",
    "closing_helper": "Abschluss-Phase - Lead zeigt starkes Kaufinteresse",
    "research_person": "Recherche empfohlen - Mehr Kontext sammeln",
    "nurture": "Nurturing - Lead warmhalten mit Content",
    "wait": "Abwarten - Kürzlich kontaktiert, Geduld zeigen",
}

# Priority Mapping basierend auf P-Score
PRIORITY_THRESHOLDS = [
    (80, 5),  # Score >= 80 -> Priority 5 (höchste)
    (60, 4),  # Score >= 60 -> Priority 4
    (40, 3),  # Score >= 40 -> Priority 3
    (20, 2),  # Score >= 20 -> Priority 2
    (0, 1),   # Score < 20 -> Priority 1 (niedrigste)
]


# ============================================================================
# CORE NBA FUNCTION
# ============================================================================


async def compute_next_best_action_for_lead(
    db: Client,
    user_id: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Berechnet die Next Best Action für einen Lead/Contact.
    
    Entscheidungslogik (V1 - heuristisch):
    1. P-Score >= 75 + viele inbound Events -> offer_create oder closing_helper
    2. P-Score 40-75 + letzter Kontakt > 3 Tage -> follow_up
    3. P-Score < 40 -> nurture (Content senden)
    4. Keine Events -> call_script (Erstkontakt)
    5. Kürzlich kontaktiert -> wait
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        lead_id: Optional Lead UUID
        contact_id: Optional Contact UUID
        
    Returns:
        dict: {action_key, reason, suggested_channel, priority}
    """
    logger.info(f"Computing NBA: user_id={user_id}, lead_id={lead_id}, contact_id={contact_id}")
    
    # Default Response
    default_response = {
        "action_key": "wait",
        "reason": "Nicht genügend Daten für eine Empfehlung.",
        "suggested_channel": "whatsapp",
        "priority": 1,
        "meta": {}
    }
    
    # Wir brauchen mindestens eine ID
    if not lead_id and not contact_id:
        logger.warning("NBA called without lead_id or contact_id")
        return default_response
    
    try:
        # 1. Lead-Daten holen
        lead = None
        if lead_id:
            lead_result = db.table("leads").select("*").eq("id", lead_id).execute()
            if lead_result.data:
                lead = lead_result.data[0]
        
        # 2. Message Events holen (letzte 14 Tage, max 20)
        cutoff = (datetime.utcnow() - timedelta(days=14)).isoformat()
        events_query = (
            db.table("message_events")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", cutoff)
            .order("created_at", desc=True)
            .limit(20)
        )
        
        # Wenn contact_id vorhanden, danach filtern
        if contact_id:
            events_query = events_query.eq("contact_id", contact_id)
        
        events_result = events_query.execute()
        events = events_result.data or []
        
        # 3. Event-Analyse
        inbound_count = sum(1 for e in events if e.get("direction") == "inbound")
        outbound_count = sum(1 for e in events if e.get("direction") == "outbound")
        total_events = len(events)
        
        # Letztes Event Timing
        last_event_at = None
        days_since_last = None
        if events:
            last_event_str = events[0].get("created_at")
            if last_event_str:
                try:
                    last_event_at = datetime.fromisoformat(last_event_str.replace("Z", "+00:00"))
                    days_since_last = (datetime.utcnow().replace(tzinfo=last_event_at.tzinfo) - last_event_at).days
                except:
                    pass
        
        # Letzter Kanal für suggested_channel
        last_channel = events[0].get("channel", "whatsapp") if events else "whatsapp"
        if last_channel == "internal":
            last_channel = "whatsapp"  # Fallback für interne Messages
        
        # 4. P-Score und Status extrahieren
        p_score = 50.0  # Default
        status = "NEW"
        
        if lead:
            p_score = float(lead.get("p_score") or 50)
            status = (lead.get("status") or "NEW").upper()
        
        # 5. NBA-Entscheidungslogik
        action_key: NBAActionKey = "wait"
        reason = ""
        meta = {
            "p_score": p_score,
            "inbound_count": inbound_count,
            "outbound_count": outbound_count,
            "days_since_last": days_since_last,
            "status": status,
        }
        
        # Fall 1: Keine Events -> Erstkontakt
        if total_events == 0:
            action_key = "call_script"
            reason = "Noch kein Kontakt - Erstkontakt mit Gesprächsleitfaden empfohlen."
        
        # Fall 2: Kürzlich kontaktiert (< 1 Tag) -> Warten
        elif days_since_last is not None and days_since_last < 1:
            action_key = "wait"
            reason = "Erst kürzlich kontaktiert - Geduld zeigen, auf Antwort warten."
        
        # Fall 3: Hoher P-Score + viele Inbound Events -> Closing/Offer
        elif p_score >= 75 and inbound_count >= 3:
            # Prüfen ob schon ein Angebot raus ist (vereinfacht: Status)
            if status in ["PROPOSAL", "NEGOTIATION"]:
                action_key = "closing_helper"
                reason = f"Lead ist heiß (P-Score {p_score:.0f}) und im {status}-Stadium - Abschluss vorbereiten!"
            else:
                action_key = "offer_create"
                reason = f"Lead ist heiß (P-Score {p_score:.0f}) mit {inbound_count} Antworten - Angebot erstellen!"
        
        # Fall 4: Mittlerer P-Score + längerer Zeitraum -> Follow-up
        elif 40 <= p_score < 75:
            if days_since_last is not None and days_since_last >= 3:
                action_key = "follow_up"
                reason = f"Letzter Kontakt vor {days_since_last} Tagen - Zeit für ein Follow-up."
            elif inbound_count > 0:
                action_key = "follow_up"
                reason = f"Lead zeigt Interesse (P-Score {p_score:.0f}) - Gespräch vertiefen."
            else:
                action_key = "research_person"
                reason = "Mittleres Interesse aber wenig Engagement - mehr über den Lead herausfinden."
        
        # Fall 5: Niedriger P-Score -> Nurture
        elif p_score < 40:
            if inbound_count == 0 and outbound_count >= 2:
                action_key = "nurture"
                reason = "Noch keine Reaktion trotz Kontaktversuchen - wertvolles Content senden."
            else:
                action_key = "nurture"
                reason = f"Lead ist noch kalt (P-Score {p_score:.0f}) - mit Content warmhalten."
        
        # Fallback
        else:
            action_key = "follow_up"
            reason = "Standard Follow-up empfohlen."
        
        # 6. Priority bestimmen
        priority = 1
        for threshold, prio in PRIORITY_THRESHOLDS:
            if p_score >= threshold:
                priority = prio
                break
        
        # 7. Response zusammenbauen
        response = {
            "action_key": action_key,
            "reason": reason,
            "suggested_channel": last_channel,
            "priority": priority,
            "meta": meta,
        }
        
        logger.info(f"NBA result: action={action_key}, priority={priority}")
        return response
        
    except Exception as e:
        logger.exception(f"Error computing NBA: {e}")
        default_response["reason"] = f"Fehler bei der Berechnung: {str(e)}"
        return default_response


async def get_nba_batch_for_user(
    db: Client,
    user_id: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """
    Holt NBA Empfehlungen für die Top-Leads eines Users.
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        limit: Max. Anzahl Leads
        
    Returns:
        List[dict]: Liste von {lead, nba} Objekten
    """
    logger.info(f"Getting NBA batch for user: {user_id}, limit={limit}")
    
    try:
        # Hot Leads holen (nach P-Score sortiert)
        leads_result = (
            db.table("leads")
            .select("id, name, p_score, status")
            .order("p_score", desc=True, nullsfirst=False)
            .limit(limit)
            .execute()
        )
        
        leads = leads_result.data or []
        results = []
        
        for lead in leads:
            nba = await compute_next_best_action_for_lead(
                db=db,
                user_id=user_id,
                lead_id=lead["id"],
            )
            results.append({
                "lead": lead,
                "nba": nba,
            })
        
        # Nach Priority sortieren
        results.sort(key=lambda x: x["nba"]["priority"], reverse=True)
        
        return results
        
    except Exception as e:
        logger.exception(f"Error getting NBA batch: {e}")
        return []


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "NBAActionKey",
    "ACTION_DESCRIPTIONS",
    "compute_next_best_action_for_lead",
    "get_nba_batch_for_user",
]

