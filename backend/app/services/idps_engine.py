"""
Sales Flow AI - IDPS Engine (Intelligent DM Persistence System)

Die zentrale Engine für das DM-Persistenz-System:
- Unified Inbox Management
- Automatische Follow-up Sequenzen
- Status-basierte Reaktivierung
- Tonalitäts-Adaption
- Best Time to Contact Berechnung

Non Plus Ultra: Null-Lead-Verlust-Toleranz
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from ..config import get_settings
from ..schemas.idps import (
    ConversationStatus,
    DMConversation,
    DMMessage,
    DMPlatform,
    Sentiment,
    UnifiedInboxItem,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# CONSTANTS
# ============================================================================

# Keywords für automatische Intent-Erkennung
INTEREST_KEYWORDS = [
    "interessiert", "erzähl mir mehr", "wie funktioniert", "was kostet",
    "termin", "call", "meeting", "demo", "angebot", "preis",
    "interested", "tell me more", "how does it work", "price",
]

OBJECTION_KEYWORDS = [
    "keine zeit", "zu teuer", "kein interesse", "kein budget",
    "nicht interessiert", "später", "no time", "too expensive",
    "not interested", "no budget",
]

DELAY_KEYWORDS = [
    "gerade busy", "melde mich", "diese woche nicht", "urlaub",
    "stress", "später melden", "in 2 wochen", "nächste woche",
]

OPTOUT_KEYWORDS = [
    "stop", "unsubscribe", "nicht mehr schreiben", "in ruhe lassen",
    "abmelden", "keine nachrichten mehr", "opt out",
]

# Sequenz-Phasen Delays (in Stunden)
DEFAULT_SEQUENCE_DELAYS = {
    1: 0,      # P1: Sofort (manuell)
    2: 48,     # P2: 48h später
    3: 120,    # P3: 5 Tage später
    4: 288,    # P4: 12 Tage später
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def analyze_message_content(text: str) -> Dict[str, Any]:
    """
    Analysiert den Inhalt einer Nachricht auf Intent, Keywords, etc.
    
    Returns:
        Dict mit:
        - contains_question: bool
        - contains_interest_signal: bool
        - contains_objection: bool
        - sentiment: str
        - detected_keywords: List[str]
        - suggested_status: Optional[str]
    """
    text_lower = text.lower()
    result = {
        "contains_question": "?" in text,
        "contains_interest_signal": False,
        "contains_objection": False,
        "sentiment": "neutral",
        "detected_keywords": [],
        "suggested_status": None,
    }
    
    # Interest Detection
    for keyword in INTEREST_KEYWORDS:
        if keyword in text_lower:
            result["contains_interest_signal"] = True
            result["detected_keywords"].append(keyword)
            result["sentiment"] = "interested"
            result["suggested_status"] = ConversationStatus.NEEDS_HUMAN_ATTENTION.value
    
    # Objection Detection
    for keyword in OBJECTION_KEYWORDS:
        if keyword in text_lower:
            result["contains_objection"] = True
            result["detected_keywords"].append(keyword)
            result["sentiment"] = "hesitant"
    
    # Delay Detection
    for keyword in DELAY_KEYWORDS:
        if keyword in text_lower:
            result["detected_keywords"].append(keyword)
            result["suggested_status"] = ConversationStatus.DELAY_REQUESTED.value
    
    # Opt-Out Detection
    for keyword in OPTOUT_KEYWORDS:
        if keyword in text_lower:
            result["detected_keywords"].append(keyword)
            result["suggested_status"] = ConversationStatus.UNSUBSCRIBED.value
            result["sentiment"] = "negative"
    
    # Sentiment basierend auf positiven/negativen Wörtern
    positive_words = ["super", "toll", "perfekt", "danke", "freut", "gerne", "great", "awesome", "thanks"]
    negative_words = ["leider", "schade", "nein", "nicht", "schlecht", "sorry", "unfortunately"]
    
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)
    
    if pos_count > neg_count and result["sentiment"] == "neutral":
        result["sentiment"] = "positive"
    elif neg_count > pos_count and result["sentiment"] == "neutral":
        result["sentiment"] = "negative"
    
    return result


def calculate_priority_score(
    messages_received: int,
    messages_sent: int,
    days_since_last_contact: Optional[int],
    sentiment: str,
    has_interest_signal: bool,
    p_score: Optional[float] = None,
) -> int:
    """
    Berechnet den Priority Score (0-100) für eine Conversation.
    """
    score = 50  # Basis
    
    # Engagement-Faktor
    if messages_received > 0:
        engagement_ratio = messages_received / max(messages_sent, 1)
        score += min(20, int(engagement_ratio * 10))
    
    # Recency-Faktor
    if days_since_last_contact is not None:
        if days_since_last_contact < 1:
            score += 15
        elif days_since_last_contact < 3:
            score += 10
        elif days_since_last_contact < 7:
            score += 5
        elif days_since_last_contact > 30:
            score -= 10
    
    # Sentiment-Faktor
    sentiment_scores = {
        "interested": 20,
        "positive": 10,
        "neutral": 0,
        "hesitant": -5,
        "negative": -15,
    }
    score += sentiment_scores.get(sentiment, 0)
    
    # Interest Signal
    if has_interest_signal:
        score += 15
    
    # P-Score Integration
    if p_score is not None:
        score += int(p_score * 0.2)  # 20% des P-Scores
    
    return max(0, min(100, score))


# ============================================================================
# MAIN ENGINE FUNCTIONS
# ============================================================================


async def get_unified_inbox(
    db: Client,
    user_id: str,
    platforms: Optional[List[str]] = None,
    statuses: Optional[List[str]] = None,
    needs_attention: bool = False,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Holt die Unified Inbox für einen User.
    
    Returns:
        Tuple[items, total_count]
    """
    logger.info(f"Getting unified inbox: user_id={user_id}, needs_attention={needs_attention}")
    
    try:
        # Basis-Query
        if needs_attention:
            query = db.table("v_inbox_needs_attention").select("*")
        else:
            query = db.table("v_unified_inbox").select("*")
        
        query = query.eq("user_id", user_id)
        
        # Platform Filter
        if platforms:
            query = query.in_("platform", platforms)
        
        # Status Filter
        if statuses:
            query = query.in_("status", statuses)
        
        # Search (in contact_name und platform_contact_handle)
        if search:
            # Supabase unterstützt OR nicht direkt, wir nutzen textSearch
            query = query.or_(
                f"platform_contact_handle.ilike.%{search}%,"
                f"contact_name.ilike.%{search}%,"
                f"last_message_preview.ilike.%{search}%"
            )
        
        # Pagination
        query = query.order("priority_score", desc=True)
        query = query.order("last_message_at", desc=True)
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        items = result.data or []
        
        # Total Count (separate Query)
        count_query = db.table("dm_conversations").select("id", count="exact").eq("user_id", user_id)
        if platforms:
            count_query = count_query.in_("platform", platforms)
        if statuses:
            count_query = count_query.in_("status", statuses)
        
        count_result = count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(items)
        
        logger.info(f"Unified inbox loaded: {len(items)} items, total={total_count}")
        return items, total_count
        
    except Exception as e:
        logger.exception(f"Error getting unified inbox: {e}")
        return [], 0


async def create_conversation(
    db: Client,
    user_id: str,
    platform: str,
    platform_contact_handle: str,
    contact_id: Optional[str] = None,
    platform_metadata: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Erstellt eine neue DM-Conversation.
    """
    logger.info(f"Creating conversation: user={user_id}, platform={platform}, handle={platform_contact_handle}")
    
    data = {
        "user_id": user_id,
        "platform": platform,
        "platform_contact_handle": platform_contact_handle,
        "contact_id": contact_id,
        "status": ConversationStatus.NEW.value,
        "platform_metadata": platform_metadata or {},
    }
    
    result = db.table("dm_conversations").insert(data).execute()
    
    if not result.data:
        raise ValueError("Fehler beim Erstellen der Conversation")
    
    conversation = result.data[0]
    logger.info(f"Conversation created: id={conversation['id']}")
    return conversation


async def add_message_to_conversation(
    db: Client,
    user_id: str,
    conversation_id: str,
    direction: str,
    content: str,
    is_ai_generated: bool = False,
    sequence_phase: Optional[int] = None,
    sequence_message_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fügt eine Nachricht zu einer Conversation hinzu.
    
    Automatisch:
    - Analysiert Inhalt auf Intent/Sentiment
    - Aktualisiert Conversation-Status
    - Aktualisiert Priority Score
    """
    logger.info(f"Adding message: conversation={conversation_id}, direction={direction}")
    
    # Inhalt analysieren
    analysis = analyze_message_content(content)
    
    # Nachricht erstellen
    message_data = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "direction": direction,
        "content": content,
        "is_ai_generated": is_ai_generated,
        "sequence_phase": sequence_phase,
        "sequence_message_type": sequence_message_type,
        "sentiment": analysis["sentiment"],
        "contains_question": analysis["contains_question"],
        "contains_objection": analysis["contains_objection"],
        "contains_interest_signal": analysis["contains_interest_signal"],
        "detected_keywords": analysis["detected_keywords"],
        "sent_at": datetime.utcnow().isoformat(),
    }
    
    result = db.table("dm_messages").insert(message_data).execute()
    
    if not result.data:
        raise ValueError("Fehler beim Erstellen der Nachricht")
    
    message = result.data[0]
    
    # Conversation-Status aktualisieren (wenn inbound und Status-Änderung vorgeschlagen)
    if direction == "inbound" and analysis["suggested_status"]:
        await update_conversation_status(
            db=db,
            conversation_id=conversation_id,
            new_status=analysis["suggested_status"],
            user_id=user_id,
        )
    elif direction == "outbound":
        # Bei Outbound: Status auf dm_initiated_no_response setzen (wenn vorher new)
        conv = db.table("dm_conversations").select("status").eq("id", conversation_id).single().execute()
        if conv.data and conv.data["status"] == ConversationStatus.NEW.value:
            await update_conversation_status(
                db=db,
                conversation_id=conversation_id,
                new_status=ConversationStatus.DM_INITIATED_NO_RESPONSE.value,
                user_id=user_id,
            )
    
    logger.info(f"Message added: id={message['id']}")
    return message


async def update_conversation_status(
    db: Client,
    conversation_id: str,
    new_status: str,
    user_id: str,
    pause_until: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Aktualisiert den Status einer Conversation.
    """
    logger.info(f"Updating conversation status: id={conversation_id}, new_status={new_status}")
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    if pause_until:
        update_data["pause_until"] = pause_until.isoformat()
        update_data["sequence_paused"] = True
    
    if new_status == ConversationStatus.IN_SEQUENCE.value:
        update_data["sequence_paused"] = False
        update_data["pause_until"] = None
    
    result = (
        db.table("dm_conversations")
        .update(update_data)
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        raise ValueError("Conversation nicht gefunden oder keine Berechtigung")
    
    return result.data[0]


async def start_sequence_for_conversation(
    db: Client,
    user_id: str,
    conversation_id: str,
    template_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Startet eine Follow-up Sequenz für eine Conversation.
    """
    logger.info(f"Starting sequence: conversation={conversation_id}, template={template_id}")
    
    # Template laden (oder Default)
    if template_id:
        template = db.table("dm_sequence_templates").select("*").eq("id", template_id).single().execute()
    else:
        template = db.table("dm_sequence_templates").select("*").eq("is_default", True).limit(1).execute()
        template = template.data[0] if template.data else None
    
    if not template:
        raise ValueError("Kein Sequenz-Template gefunden")
    
    template_data = template.data if hasattr(template, 'data') else template
    steps = template_data.get("sequence_steps", [])
    
    if not steps:
        raise ValueError("Template hat keine Sequenz-Schritte")
    
    # Nächste Aktion berechnen (Phase 2, da Phase 1 manuell ist)
    next_phase = 2
    next_step = next((s for s in steps if s.get("phase") == next_phase), None)
    
    if next_step:
        delay_hours = next_step.get("delay_hours", 48)
        next_action_at = datetime.utcnow() + timedelta(hours=delay_hours)
    else:
        next_action_at = datetime.utcnow() + timedelta(hours=48)
    
    # Conversation aktualisieren
    update_data = {
        "status": ConversationStatus.IN_SEQUENCE.value,
        "current_sequence_phase": 1,  # Startet bei Phase 1 (manuell bereits gesendet)
        "next_sequence_action_at": next_action_at.isoformat(),
        "last_sequence_action_at": datetime.utcnow().isoformat(),
        "sequence_paused": False,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    result = (
        db.table("dm_conversations")
        .update(update_data)
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    # Template Usage Counter erhöhen
    db.table("dm_sequence_templates").update({
        "times_used": template_data.get("times_used", 0) + 1
    }).eq("id", template_data["id"]).execute()
    
    logger.info(f"Sequence started: next_action_at={next_action_at}")
    return result.data[0] if result.data else {}


async def process_pending_sequence_actions(
    db: Client,
    user_id: str,
    max_actions: int = 20,
) -> Dict[str, Any]:
    """
    Verarbeitet alle fälligen Sequenz-Aktionen für einen User.
    
    Returns:
        Summary mit processed, skipped, errors Countern
    """
    logger.info(f"Processing pending sequence actions: user={user_id}")
    
    now = datetime.utcnow().isoformat()
    
    # Fällige Conversations laden
    pending = (
        db.table("dm_conversations")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", ConversationStatus.IN_SEQUENCE.value)
        .eq("sequence_paused", False)
        .lte("next_sequence_action_at", now)
        .limit(max_actions)
        .execute()
    )
    
    conversations = pending.data or []
    logger.info(f"Found {len(conversations)} pending sequence actions")
    
    summary = {
        "processed": 0,
        "skipped": 0,
        "errors": 0,
        "details": [],
    }
    
    # Default-Template laden
    template_result = db.table("dm_sequence_templates").select("*").eq("is_default", True).limit(1).execute()
    default_template = template_result.data[0] if template_result.data else None
    
    for conv in conversations:
        try:
            current_phase = conv.get("current_sequence_phase", 0)
            next_phase = current_phase + 1
            
            # Template-Step für nächste Phase finden
            if default_template:
                steps = default_template.get("sequence_steps", [])
                next_step = next((s for s in steps if s.get("phase") == next_phase), None)
            else:
                next_step = None
            
            if not next_step:
                # Sequenz abgeschlossen
                await update_conversation_status(
                    db=db,
                    conversation_id=conv["id"],
                    new_status=ConversationStatus.ARCHIVED.value,
                    user_id=user_id,
                )
                summary["processed"] += 1
                summary["details"].append({
                    "conversation_id": conv["id"],
                    "action": "sequence_completed",
                })
                continue
            
            # KI-Nachricht generieren (wenn is_ai_generated)
            if next_step.get("is_ai_generated"):
                message_text = await generate_sequence_message(
                    db=db,
                    conversation_id=conv["id"],
                    phase=next_phase,
                    template=next_step.get("message_template"),
                    ai_prompt=next_step.get("ai_prompt"),
                )
            else:
                message_text = next_step.get("message_template", "")
            
            if message_text:
                # Nachricht hinzufügen (als Entwurf - Status NEEDS_HUMAN_ATTENTION)
                await add_message_to_conversation(
                    db=db,
                    user_id=user_id,
                    conversation_id=conv["id"],
                    direction="outbound",
                    content=message_text,
                    is_ai_generated=next_step.get("is_ai_generated", False),
                    sequence_phase=next_phase,
                    sequence_message_type=next_step.get("name"),
                )
                
                # Status aktualisieren: Braucht menschliche Bestätigung
                await update_conversation_status(
                    db=db,
                    conversation_id=conv["id"],
                    new_status=ConversationStatus.NEEDS_HUMAN_ATTENTION.value,
                    user_id=user_id,
                )
                
                # Nächste Phase und Zeitpunkt setzen
                further_steps = [s for s in steps if s.get("phase", 0) > next_phase]
                if further_steps:
                    next_next_step = further_steps[0]
                    delay = next_next_step.get("delay_hours", 48)
                    next_action = datetime.utcnow() + timedelta(hours=delay)
                else:
                    next_action = None
                
                db.table("dm_conversations").update({
                    "current_sequence_phase": next_phase,
                    "last_sequence_action_at": datetime.utcnow().isoformat(),
                    "next_sequence_action_at": next_action.isoformat() if next_action else None,
                }).eq("id", conv["id"]).execute()
                
                summary["processed"] += 1
                summary["details"].append({
                    "conversation_id": conv["id"],
                    "action": f"phase_{next_phase}_generated",
                    "message_type": next_step.get("name"),
                })
            else:
                summary["skipped"] += 1
                
        except Exception as e:
            logger.exception(f"Error processing sequence for {conv['id']}: {e}")
            summary["errors"] += 1
    
    logger.info(f"Sequence processing complete: {summary}")
    return summary


async def generate_sequence_message(
    db: Client,
    conversation_id: str,
    phase: int,
    template: Optional[str] = None,
    ai_prompt: Optional[str] = None,
) -> str:
    """
    Generiert eine Sequenz-Nachricht (ggf. mit KI).
    """
    # Conversation und letzte Nachrichten laden für Kontext
    conv = db.table("dm_conversations").select("*").eq("id", conversation_id).single().execute()
    if not conv.data:
        return template or ""
    
    conv_data = conv.data
    
    # Lead-Infos laden (falls verknüpft)
    lead_name = "dort"
    if conv_data.get("contact_id"):
        lead = db.table("leads").select("name").eq("id", conv_data["contact_id"]).single().execute()
        if lead.data:
            lead_name = lead.data.get("name", "dort")
    
    # Template-Variablen ersetzen
    message = template or ""
    message = message.replace("{{name}}", lead_name)
    message = message.replace("{{platform}}", conv_data.get("platform", ""))
    
    # Wenn KI-generiert und wir einen API-Key haben
    if ai_prompt and settings.openai_api_key:
        try:
            from ..ai_client import AIClient
            
            ai_client = AIClient(
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )
            
            system_prompt = f"""
Du bist ein Sales-Assistent für Network Marketing.
Generiere eine kurze, persönliche Follow-up-Nachricht.

Phase: {phase}
Plattform: {conv_data.get('platform', 'DM')}
Kontext: {ai_prompt}

REGELN:
- Maximal 3-4 Sätze
- Persönlich und authentisch (kein Bot-Gefühl)
- Passende Emojis (aber dezent)
- KEIN Sales-Pitch, sondern Mehrwert oder Klarheit
- Name des Empfängers: {lead_name}
"""
            
            from ..schemas import ChatMessage
            messages = [ChatMessage(role="user", content=f"Generiere die Nachricht für Phase {phase}")]
            
            message = ai_client.generate(system_prompt, messages)
            
        except Exception as e:
            logger.exception(f"Error generating AI message: {e}")
            # Fallback auf Template
            pass
    
    return message


async def get_best_time_to_contact(
    db: Client,
    conversation_id: str,
) -> Optional[str]:
    """
    Berechnet die beste Kontaktzeit basierend auf historischen Daten.
    """
    try:
        result = db.rpc("calculate_best_contact_time", {"p_conversation_id": conversation_id}).execute()
        return result.data if result.data else None
    except Exception as e:
        logger.exception(f"Error calculating best contact time: {e}")
        return None


async def get_platform_connections(
    db: Client,
    user_id: str,
) -> List[Dict[str, Any]]:
    """
    Holt alle Plattform-Verbindungen eines Users.
    """
    result = db.table("platform_connections").select(
        "id, platform, is_connected, account_name, account_email, last_sync_at, webhook_verified, error_count"
    ).eq("user_id", user_id).execute()
    
    return result.data or []


async def get_idps_analytics(
    db: Client,
    user_id: str,
) -> Dict[str, Any]:
    """
    Holt Analytik-Daten für das IDPS-Dashboard.
    """
    # Basis-Statistiken
    conversations = db.table("dm_conversations").select("id, platform, status").eq("user_id", user_id).execute()
    all_convs = conversations.data or []
    
    # Status-Verteilung
    by_status = {}
    by_platform = {}
    
    for conv in all_convs:
        status = conv.get("status", "unknown")
        platform = conv.get("platform", "unknown")
        
        by_status[status] = by_status.get(status, 0) + 1
        
        if platform not in by_platform:
            by_platform[platform] = {"total": 0, "active": 0}
        by_platform[platform]["total"] += 1
        if status not in ["archived", "unsubscribed"]:
            by_platform[platform]["active"] += 1
    
    # Needs Attention Count
    needs_attention = db.table("dm_conversations").select("id", count="exact").eq(
        "user_id", user_id
    ).eq("status", "needs_human_attention").execute()
    
    # Active Sequences
    active_seq = db.table("dm_conversations").select("id", count="exact").eq(
        "user_id", user_id
    ).eq("status", "in_sequence").execute()
    
    return {
        "total_conversations": len(all_convs),
        "active_sequences": active_seq.count if hasattr(active_seq, 'count') else 0,
        "needs_attention": needs_attention.count if hasattr(needs_attention, 'count') else 0,
        "by_status": by_status,
        "by_platform": by_platform,
    }


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "analyze_message_content",
    "calculate_priority_score",
    "get_unified_inbox",
    "create_conversation",
    "add_message_to_conversation",
    "update_conversation_status",
    "start_sequence_for_conversation",
    "process_pending_sequence_actions",
    "generate_sequence_message",
    "get_best_time_to_contact",
    "get_platform_connections",
    "get_idps_analytics",
]


