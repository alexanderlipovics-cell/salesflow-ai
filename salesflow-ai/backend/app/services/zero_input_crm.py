"""
Zero-Input CRM Service für SALESFLOW AI.

Automatische Zusammenfassung von Konversationen und Task-Generierung.

Nach Calls/Chats werden automatisch:
- Notes geschrieben (crm_notes)
- Tasks angelegt (tasks)
- Deal-Status aktualisiert (optional, V2)

Workflow:
1. Letzte N message_events für Lead/Contact laden
2. AI-Prompt für Zusammenfassung + Next Step bauen
3. AI-Antwort parsen
4. CRM Note erstellen
5. Task erstellen (optional)
6. Response zurückgeben
"""

from __future__ import annotations

import json
import logging
import time
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from ..config import get_settings
from ..schemas import ChatMessage
from ..schemas.zero_input_crm import (
    ConversationSummary,
    SuggestedNextStep,
    ZeroInputResponse,
)
from ..core.ai_prompts import BASE_STYLE

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# AI PROMPT für Zero-Input CRM
# ============================================================================

ZERO_INPUT_SUMMARY_PROMPT = BASE_STYLE + """

═══════════════════════════════════════════════════════════════════════════════
ZERO-INPUT CRM - KONVERSATIONS-ZUSAMMENFASSUNG
═══════════════════════════════════════════════════════════════════════════════

Du erhältst eine Konversation zwischen einem Vertriebler und einem Lead/Kontakt.
Deine Aufgabe ist es, die Konversation zusammenzufassen und den nächsten sinnvollen Schritt vorzuschlagen.

AUFGABE:
1) Fasse die Konversation kurz zusammen (3-5 Bulletpoints)
2) Identifiziere die Hauptthemen
3) Bewerte die Stimmung und das Engagement
4) Schlage GENAU EINEN nächsten sinnvollen Schritt vor

ANTWORT FORMAT (JSON):
{
    "summary": {
        "text": "• Punkt 1\\n• Punkt 2\\n• Punkt 3",
        "key_topics": ["Thema1", "Thema2"],
        "sentiment": "positive|neutral|negative",
        "engagement": "low|medium|high"
    },
    "next_step": {
        "action": "z.B. Follow-up Call, Angebot schicken, Demo vereinbaren",
        "description": "Konkrete Beschreibung was zu tun ist",
        "priority": "low|normal|high|urgent",
        "due_days": 2
    }
}

REGELN:
- Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Texte
- Summary: max. 5 Bulletpoints, prägnant
- Key Topics: max. 5 Themen
- Next Step: IMMER genau einen konkreten, umsetzbaren Schritt
- Due Days: Realistischer Zeitrahmen (1-14 Tage je nach Dringlichkeit)
- Sentiment: Basierend auf Tonfall der Nachrichten
- Engagement: Basierend auf Antwortlängen und -häufigkeit

═══════════════════════════════════════════════════════════════════════════════
"""


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _build_conversation_text(messages: List[Dict[str, Any]]) -> str:
    """
    Baut einen lesbaren Konversationstext aus message_events.
    
    Args:
        messages: Liste von message_event Dictionaries
        
    Returns:
        Formatierter Konversationstext
    """
    if not messages:
        return "Keine Nachrichten gefunden."
    
    lines = []
    for msg in messages:
        direction = msg.get("direction", "unknown")
        text = msg.get("normalized_text", msg.get("text", ""))
        channel = msg.get("channel", "unknown")
        created_at = msg.get("created_at", "")
        
        # Richtung als Label
        label = "LEAD" if direction == "inbound" else "VERTRIEBLER"
        
        # Timestamp formatieren (falls vorhanden)
        timestamp = ""
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                timestamp = dt.strftime("%d.%m. %H:%M")
            except:
                timestamp = ""
        
        line = f"[{label}] {timestamp}: {text}"
        lines.append(line)
    
    return "\n".join(lines)


def _parse_ai_response(response_text: str) -> Dict[str, Any]:
    """
    Parst die AI-Antwort (JSON) und extrahiert Summary + Next Step.
    
    Args:
        response_text: AI-Antwort als Text
        
    Returns:
        Geparstes Dictionary mit summary und next_step
    """
    # Versuche JSON zu parsen
    try:
        # Manchmal ist die Antwort in Markdown code blocks
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            # Remove markdown code block
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
        
        data = json.loads(cleaned)
        return data
    except json.JSONDecodeError:
        logger.warning(f"Could not parse AI response as JSON: {response_text[:200]}")
        
        # Fallback: Versuche aus dem Text zu extrahieren
        return {
            "summary": {
                "text": response_text[:500] if response_text else "Zusammenfassung nicht verfügbar",
                "key_topics": [],
                "sentiment": "neutral",
                "engagement": "medium"
            },
            "next_step": {
                "action": "Follow-up",
                "description": "Kontakt nachfassen und Status klären",
                "priority": "normal",
                "due_days": 3
            }
        }


async def _fetch_message_events(
    db: Client,
    user_id: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Holt die letzten N message_events für einen Lead/Contact.
    
    Args:
        db: Supabase Client
        user_id: User-UUID
        lead_id: Optional Lead-UUID
        contact_id: Optional Contact-UUID
        limit: Max. Anzahl Nachrichten
        
    Returns:
        Liste von message_event Dictionaries
    """
    query = (
        db.table("message_events")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    
    # Filter nach Lead oder Contact
    if contact_id:
        query = query.eq("contact_id", contact_id)
    # Wenn nur lead_id, müssen wir eventuell über einen anderen Weg filtern
    # V1: Wir nehmen einfach alle Events des Users wenn kein contact_id
    
    result = query.execute()
    
    # Chronologisch sortieren (älteste zuerst)
    messages = list(reversed(result.data or []))
    return messages


async def _create_crm_note(
    db: Client,
    user_id: str,
    content: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    note_type: str = "ai_summary",
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Erstellt eine CRM Note in der Datenbank.
    
    Args:
        db: Supabase Client
        user_id: User-UUID
        content: Note-Inhalt
        lead_id: Optional Lead-UUID
        contact_id: Optional Contact-UUID
        deal_id: Optional Deal-UUID
        note_type: Art der Note
        metadata: Zusätzliche Metadaten
        
    Returns:
        Erstellte Note oder None
    """
    note_data = {
        "user_id": user_id,
        "content": content,
        "note_type": note_type,
        "source": "zero_input_crm",
        "metadata": metadata or {},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    if lead_id:
        note_data["lead_id"] = lead_id
    if contact_id:
        note_data["contact_id"] = contact_id
    if deal_id:
        note_data["deal_id"] = deal_id
    
    try:
        result = db.table("crm_notes").insert(note_data).execute()
        if result.data:
            logger.info(f"CRM Note created: {result.data[0]['id']}")
            return result.data[0]
    except Exception as e:
        logger.exception(f"Error creating CRM note: {e}")
    
    return None


async def _create_task(
    db: Client,
    org_id: str,
    user_id: str,
    title: str,
    description: Optional[str] = None,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    priority: str = "normal",
    due_days: int = 2,
) -> Optional[Dict[str, Any]]:
    """
    Erstellt einen Task in der Datenbank.
    
    Args:
        db: Supabase Client
        org_id: Organisation-UUID
        user_id: User-UUID (für assigned_to)
        title: Task-Titel
        description: Task-Beschreibung
        contact_id: Optional Contact-UUID
        deal_id: Optional Deal-UUID
        priority: Priorität
        due_days: Tage bis Fälligkeit
        
    Returns:
        Erstellter Task oder None
    """
    due_at = datetime.utcnow() + timedelta(days=due_days)
    
    task_data = {
        "org_id": org_id,
        "title": title,
        "description": description,
        "type": "followup",
        "priority": priority,
        "status": "pending",
        "due_at": due_at.isoformat(),
        "assigned_to": user_id,
        "created_by": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    if contact_id:
        task_data["contact_id"] = contact_id
    if deal_id:
        task_data["deal_id"] = deal_id
    
    try:
        result = db.table("tasks").insert(task_data).execute()
        if result.data:
            logger.info(f"Task created: {result.data[0]['id']}")
            return result.data[0]
    except Exception as e:
        logger.exception(f"Error creating task: {e}")
    
    return None


def _generate_ai_summary(
    conversation_text: str,
) -> Dict[str, Any]:
    """
    Generiert eine KI-Zusammenfassung der Konversation.
    
    Args:
        conversation_text: Formatierter Konversationstext
        
    Returns:
        Dict mit summary und next_step
    """
    # Mock-Modus wenn kein API Key
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus für Zero-Input CRM")
        return _generate_mock_summary(conversation_text)
    
    # AI-Client importieren (lazy)
    from ..ai_client import AIClient
    
    try:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        # Messages aufbauen
        user_message = f"""
Hier ist die Konversation zur Analyse:

{conversation_text}

Bitte erstelle eine Zusammenfassung und schlage den nächsten Schritt vor.
Antworte NUR mit dem JSON-Objekt wie im System-Prompt beschrieben.
"""
        
        messages = [ChatMessage(role="user", content=user_message)]
        
        # AI-Antwort generieren
        response_text = ai_client.generate(ZERO_INPUT_SUMMARY_PROMPT, messages)
        
        # Parsen
        parsed = _parse_ai_response(response_text)
        parsed["_model"] = settings.openai_model
        parsed["_raw_response"] = response_text[:500]
        
        return parsed
        
    except Exception as e:
        logger.exception(f"Error generating AI summary: {e}")
        return _generate_mock_summary(conversation_text)


def _generate_mock_summary(conversation_text: str) -> Dict[str, Any]:
    """
    Generiert eine Mock-Zusammenfassung wenn kein AI-API-Key verfügbar.
    """
    # Einfache Analyse des Textes
    word_count = len(conversation_text.split())
    has_question = "?" in conversation_text
    
    return {
        "summary": {
            "text": "• Konversation zwischen Vertriebler und Lead\n• Themen wurden besprochen\n• Weiterer Kontakt empfohlen",
            "key_topics": ["Erstkontakt", "Produkt/Service"],
            "sentiment": "neutral",
            "engagement": "medium" if word_count > 50 else "low"
        },
        "next_step": {
            "action": "Follow-up Call" if has_question else "Check-in Nachricht",
            "description": "Kontakt in den nächsten Tagen nachfassen",
            "priority": "normal",
            "due_days": 2
        },
        "_model": "mock"
    }


# ============================================================================
# MAIN SERVICE FUNCTION
# ============================================================================


async def summarize_conversation_and_suggest_next_step(
    db: Client,
    user_id: str,
    org_id: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    message_limit: int = 20,
    create_task: bool = True,
) -> ZeroInputResponse:
    """
    Hauptfunktion für Zero-Input CRM.
    
    Holt die letzten N message_events für diesen Lead/Kontakt,
    nutzt AI zur Zusammenfassung & zum Vorschlag 'Next Step',
    und erzeugt:
      - einen crm_note-Eintrag
      - optional einen task-Eintrag
    
    Args:
        db: Supabase Client
        user_id: UUID des Users
        org_id: UUID der Organisation
        lead_id: Optional UUID des Leads
        contact_id: Optional UUID des Contacts
        deal_id: Optional UUID des Deals
        message_limit: Max. Anzahl der message_events
        create_task: Ob ein Task erstellt werden soll
        
    Returns:
        ZeroInputResponse mit note_id, task_id, summary_text, suggested_next_step
    """
    start_time = time.time()
    logger.info(
        f"Starting Zero-Input CRM: user_id={user_id}, "
        f"lead_id={lead_id}, contact_id={contact_id}"
    )
    
    # 1. Message Events laden
    messages = await _fetch_message_events(
        db=db,
        user_id=user_id,
        lead_id=lead_id,
        contact_id=contact_id,
        limit=message_limit,
    )
    
    messages_analyzed = len(messages)
    logger.info(f"Found {messages_analyzed} message events")
    
    if messages_analyzed == 0:
        # Keine Nachrichten - leere Response
        return ZeroInputResponse(
            success=False,
            summary=ConversationSummary(
                summary_text="Keine Nachrichten gefunden für diesen Lead/Contact.",
                key_topics=[],
                sentiment="neutral",
                engagement_level="low"
            ),
            note_content="Keine Nachrichten vorhanden.",
            lead_id=lead_id,
            contact_id=contact_id,
            deal_id=deal_id,
            messages_analyzed=0,
            processing_time_ms=int((time.time() - start_time) * 1000),
            model_used="none"
        )
    
    # 2. Konversationstext aufbauen
    conversation_text = _build_conversation_text(messages)
    
    # 3. AI-Zusammenfassung generieren
    ai_result = _generate_ai_summary(conversation_text)
    model_used = ai_result.get("_model", "unknown")
    
    # 4. Daten extrahieren
    summary_data = ai_result.get("summary", {})
    next_step_data = ai_result.get("next_step", {})
    
    # Summary erstellen
    summary = ConversationSummary(
        summary_text=summary_data.get("text", "Zusammenfassung nicht verfügbar"),
        key_topics=summary_data.get("key_topics", []),
        sentiment=summary_data.get("sentiment", "neutral"),
        engagement_level=summary_data.get("engagement", "medium")
    )
    
    # Next Step erstellen
    suggested_next_step = None
    if next_step_data:
        suggested_next_step = SuggestedNextStep(
            action=next_step_data.get("action", "Follow-up"),
            description=next_step_data.get("description", "Kontakt nachfassen"),
            priority=next_step_data.get("priority", "normal"),
            suggested_due_days=next_step_data.get("due_days", 2)
        )
    
    # 5. CRM Note erstellen
    note_content = f"""
📝 **Automatische Zusammenfassung** (Zero-Input CRM)

{summary.summary_text}

**Hauptthemen:** {', '.join(summary.key_topics) if summary.key_topics else 'Keine identifiziert'}
**Stimmung:** {summary.sentiment}
**Engagement:** {summary.engagement_level}

---
**Empfohlener nächster Schritt:** {suggested_next_step.action if suggested_next_step else 'Keiner'}
{suggested_next_step.description if suggested_next_step else ''}
""".strip()
    
    note_metadata = {
        "ai_model": model_used,
        "messages_analyzed": messages_analyzed,
        "generated_at": datetime.utcnow().isoformat(),
    }
    
    created_note = await _create_crm_note(
        db=db,
        user_id=user_id,
        content=note_content,
        lead_id=lead_id,
        contact_id=contact_id,
        deal_id=deal_id,
        note_type="ai_summary",
        metadata=note_metadata,
    )
    
    note_id = created_note.get("id") if created_note else None
    
    # 6. Task erstellen (optional)
    task_id = None
    if create_task and suggested_next_step:
        created_task = await _create_task(
            db=db,
            org_id=org_id,
            user_id=user_id,
            title=suggested_next_step.action,
            description=suggested_next_step.description,
            contact_id=contact_id,
            deal_id=deal_id,
            priority=suggested_next_step.priority,
            due_days=suggested_next_step.suggested_due_days,
        )
        task_id = created_task.get("id") if created_task else None
    
    # 7. Response erstellen
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    response = ZeroInputResponse(
        success=True,
        summary=summary,
        note_id=note_id,
        note_content=note_content,
        task_id=task_id,
        suggested_next_step=suggested_next_step,
        lead_id=lead_id,
        contact_id=contact_id,
        deal_id=deal_id,
        messages_analyzed=messages_analyzed,
        processing_time_ms=processing_time_ms,
        model_used=model_used,
    )
    
    logger.info(
        f"Zero-Input CRM complete: note_id={note_id}, task_id={task_id}, "
        f"time={processing_time_ms}ms"
    )
    
    return response


# ============================================================================
# ADDITIONAL FUNCTIONS (für spätere Erweiterung)
# ============================================================================


async def get_notes_for_lead(
    db: Client,
    user_id: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Holt alle CRM Notes für einen Lead/Contact.
    """
    query = (
        db.table("crm_notes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if contact_id:
        query = query.eq("contact_id", contact_id)
    
    result = query.execute()
    return result.data or []


async def delete_note(
    db: Client,
    user_id: str,
    note_id: str,
) -> bool:
    """
    Löscht eine CRM Note.
    """
    try:
        result = (
            db.table("crm_notes")
            .delete()
            .eq("id", note_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(result.data)
    except Exception as e:
        logger.exception(f"Error deleting note: {e}")
        return False


# ============================================================================
# EXPORTS
# ============================================================================


__all__ = [
    "summarize_conversation_and_suggest_next_step",
    "get_notes_for_lead",
    "delete_note",
    "ZERO_INPUT_SUMMARY_PROMPT",
]

