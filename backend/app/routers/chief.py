"""
CHIEF API Router
Endpunkte für CHIEF (AI Assistant) Funktionalitäten
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json
import re

from ..core.deps import get_supabase
from ..core.security import get_current_active_user
from app.ai_client import AIClient
from app.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chief", tags=["chief"])


class EditMessageRequest(BaseModel):
    original_message: str
    user_instruction: str
    lead_context: Dict[str, Any]


class EditMessageResponse(BaseModel):
    edited_message: str


class GenerateFirstMessageRequest(BaseModel):
    lead_id: str
    lead_name: str
    lead_source: str
    lead_company: Optional[str] = None
    lead_notes: Optional[str] = None


class GenerateFirstMessageResponse(BaseModel):
    message: str


class GenerateQueueMessageRequest(BaseModel):
    queue_id: str


class GenerateQueueMessageResponse(BaseModel):
    message: str


@router.post("/generate-first-message", response_model=GenerateFirstMessageResponse)
async def generate_first_message(
    request: GenerateFirstMessageRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> GenerateFirstMessageResponse:
    """
    Generiert erste Nachricht für neuen Lead.
    Nutzt gelernte Patterns aus Shadow Analysis.
    """
    user_id = _extract_user_id(current_user)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API Key nicht konfiguriert"
        )
    
    try:
        # Prüfe gelernte Patterns (Shadow Analysis)
        learned_patterns = []
        try:
            result = (
                db.table("chief_learned_patterns")
                .select("*")
                .eq("user_id", user_id)
                .eq("pattern_type", "auto_apply")
                .execute()
            )
            learned_patterns = result.data or []
        except Exception:
            pass  # Tabelle existiert möglicherweise nicht
        
        # Baue Prompt mit gelernten Patterns
        pattern_hints = ""
        if learned_patterns:
            pattern_hints = "\n\nGelernte Präferenzen des Users:\n"
            for pattern in learned_patterns:
                pattern_hints += f"- {pattern.get('instruction', '')}\n"
        
        prompt = f"""Du bist CHIEF, ein intelligenter Sales-Assistent.

Generiere eine erste Kontaktnachricht für einen neuen Lead.

Lead-Informationen:
- Name: {request.lead_name}
- Quelle: {request.lead_source}
{f'- Firma: {request.lead_company}' if request.lead_company else ''}
{f'- Notizen: {request.lead_notes}' if request.lead_notes else ''}
{pattern_hints}

AUFGABE:
Generiere eine kurze, persönliche erste Nachricht:
- Maximal 3-4 Sätze
- Persönlich und authentisch (kein Bot-Gefühl)
- Passende Emojis (aber dezent)
- KEIN Sales-Pitch, sondern Wertversprechen oder Frage
- Verwende den Lead-Namen
- Antworte NUR mit der Nachricht, keine Erklärungen

Nachricht:"""
        
        # AI Call - Verwende gpt-4o-mini für Inbox-Nachrichten (25x günstiger als gpt-4o)
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",  # Explizit gpt-4o-mini für Inbox-Nachrichten
        )
        
        message = await ai_client.generate_async(
            system_prompt="Du bist CHIEF, ein intelligenter Sales-Assistent der erste Kontaktnachrichten generiert.",
            messages=[{"role": "user", "content": prompt}],
        )
        
        return GenerateFirstMessageResponse(message=message.strip())
        
    except Exception as e:
        logger.error(f"Error generating first message: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren der Nachricht: {str(e)}"
        )


@router.post("/edit-message", response_model=EditMessageResponse)
async def edit_message_with_chief(
    request: EditMessageRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> EditMessageResponse:
    """
    CHIEF passt eine Nachricht basierend auf User-Anweisung an.
    Lernt auch für Shadow Analysis!
    """
    user_id = _extract_user_id(current_user)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API Key nicht konfiguriert"
        )
    
    try:
        # Prompt für CHIEF bauen
        lead_name = request.lead_context.get('name', 'Lead')
        lead_source = request.lead_context.get('source', 'Unbekannt')
        lead_notes = request.lead_context.get('notes', '')
        
        prompt = f"""Du bist CHIEF, ein intelligenter Sales-Assistent.

Original-Nachricht:
{request.original_message}

User-Anweisung: {request.user_instruction}

Lead-Kontext:
- Name: {lead_name}
- Quelle: {lead_source}
{'- Notizen: ' + lead_notes if lead_notes else ''}

AUFGABE:
Passe die Original-Nachricht an, basierend auf der User-Anweisung.
- Behalte den Kern und die Intention
- Folge der Anweisung präzise
- Bleibe persönlich und authentisch
- Verwende den Lead-Namen wenn passend
- Antworte NUR mit der bearbeiteten Nachricht, keine Erklärungen

Bearbeitete Nachricht:"""
        
        # AI Call - Verwende gpt-4o-mini für Inbox-Nachrichten (25x günstiger als gpt-4o)
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",  # Explizit gpt-4o-mini für Inbox-Nachrichten
        )
        
        edited_message = await ai_client.generate_async(
            system_prompt="Du bist CHIEF, ein intelligenter Sales-Assistent der Nachrichten anpasst.",
            messages=[{"role": "user", "content": prompt}],
        )
        
        # Für Shadow Analysis: Speichere die Änderung
        try:
            await _save_edit_pattern(
                db=db,
                user_id=user_id,
                instruction=request.user_instruction,
                original=request.original_message,
                edited=edited_message,
            )
        except Exception as e:
            logger.warning(f"Could not save edit pattern for shadow analysis: {e}")
        
        return EditMessageResponse(edited_message=edited_message.strip())
        
    except Exception as e:
        logger.error(f"Error editing message with CHIEF: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Bearbeiten der Nachricht: {str(e)}"
        )


class GenerateQueueMessageRequest(BaseModel):
    queue_id: str


class GenerateQueueMessageResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    queue_id: Optional[str] = None
    template_key: Optional[str] = None
    state: Optional[str] = None
    lead_name: Optional[str] = None
    error: Optional[str] = None




async def _save_edit_pattern(
    db,
    user_id: str,
    instruction: str,
    original: str,
    edited: str,
) -> None:
    """
    Speichert Edit-Pattern für Shadow Analysis.
    Wenn User 3x die gleiche Anweisung gibt, lernt CHIEF automatisch.
    """
    try:
        # Prüfe ob Tabelle existiert, sonst erstelle sie
        # (In Production sollte die Tabelle bereits existieren)
        db.table("chief_edit_patterns").insert({
            "user_id": user_id,
            "instruction": instruction.lower().strip(),  # Normalisiert für Pattern-Matching
            "original_message": original,
            "edited_message": edited,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        
        # Prüfe ob User 3x die gleiche Anweisung gegeben hat
        result = (
            db.table("chief_edit_patterns")
            .select("*")
            .eq("user_id", user_id)
            .eq("instruction", instruction.lower().strip())
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )
        
        if len(result.data) >= 3:
            # User hat 3x die gleiche Anweisung gegeben
            # Speichere als gelerntes Pattern
            db.table("chief_learned_patterns").upsert({
                "user_id": user_id,
                "instruction": instruction.lower().strip(),
                "pattern_type": "auto_apply",  # CHIEF soll dies automatisch anwenden
                "learned_at": datetime.utcnow().isoformat(),
                "usage_count": len(result.data),
            }, on_conflict="user_id,instruction").execute()
            
            logger.info(f"CHIEF learned pattern for user {user_id}: {instruction}")
            
    except Exception as e:
        # Tabelle existiert möglicherweise nicht - das ist OK
        logger.debug(f"Could not save edit pattern (table might not exist): {e}")


@router.post("/generate-queue-message", response_model=GenerateQueueMessageResponse)
async def generate_queue_message(
    request: GenerateQueueMessageRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> GenerateQueueMessageResponse:
    """
    Generiert Nachricht für ein Queue-Item (Follow-up Cycle).
    Wird aufgerufen, wenn ein Queue-Item ohne ai_generated_content angeklickt wird.
    """
    user_id = _extract_user_id(current_user)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API Key nicht konfiguriert"
        )
    
    try:
        # Queue-Item mit Cycle und Lead-Daten laden
        result = (
            db.table("contact_follow_up_queue")
            .select("*, follow_up_cycles(*), leads(id, name, email, phone, instagram, whatsapp, company)")
            .eq("id", request.queue_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Queue-Item nicht gefunden"
            )
        
        queue_item = result.data
        cycle = queue_item.get("follow_up_cycles") or {}
        lead = queue_item.get("leads") or {}
        
        # Lead-Name extrahieren
        lead_name = (
            lead.get("name") or 
            lead.get("first_name", "") + " " + lead.get("last_name", "")
        ).strip() or "dort"
        
        # Cycle-Informationen
        message_type = cycle.get("message_type", "followup")
        template_key = cycle.get("template_key", "")
        state = cycle.get("state", "")
        sequence_order = cycle.get("sequence_order", 0)
        
        # Prüfe gelernte Patterns (Shadow Analysis)
        learned_patterns = []
        try:
            pattern_result = (
                db.table("chief_learned_patterns")
                .select("*")
                .eq("user_id", user_id)
                .eq("pattern_type", "auto_apply")
                .execute()
            )
            learned_patterns = pattern_result.data or []
        except Exception:
            pass  # Tabelle existiert möglicherweise nicht
        
        # Baue Prompt mit gelernten Patterns
        pattern_hints = ""
        if learned_patterns:
            pattern_hints = "\n\nGelernte Präferenzen des Users:\n"
            for pattern in learned_patterns:
                pattern_hints += f"- {pattern.get('instruction', '')}\n"
        
        # Prompt basierend auf Message-Type
        if message_type.lower() == "followup":
            prompt = f"""Du bist CHIEF, ein intelligenter Sales-Assistent.

Generiere eine Follow-up Nachricht für einen Kontakt.

Kontakt-Informationen:
- Name: {lead_name}
- Quelle: {lead.get('instagram') or lead.get('whatsapp') or 'Unbekannt'}
{f'- Firma: {lead.get("company")}' if lead.get('company') else ''}

Follow-up Kontext:
- State: {state}
- Sequenz-Nummer: {sequence_order}
- Template: {template_key}
{pattern_hints}

AUFGABE:
Generiere eine kurze, persönliche Follow-up Nachricht:
- Maximal 3-4 Sätze
- Persönlich und authentisch (kein Bot-Gefühl)
- Passende Emojis (aber dezent)
- KEIN Sales-Pitch, sondern Wertversprechen oder Frage
- Verwende den Kontakt-Namen
- Antworte NUR mit der Nachricht, keine Erklärungen

Nachricht:"""
        else:
            # Generischer Prompt für andere Message-Types
            prompt = f"""Du bist CHIEF, ein intelligenter Sales-Assistent.

Generiere eine {message_type} Nachricht für einen Kontakt.

Kontakt-Informationen:
- Name: {lead_name}
- Quelle: {lead.get('instagram') or lead.get('whatsapp') or 'Unbekannt'}
{f'- Firma: {lead.get("company")}' if lead.get('company') else ''}

Kontext:
- Type: {message_type}
- Template: {template_key}
{pattern_hints}

AUFGABE:
Generiere eine kurze, persönliche Nachricht:
- Maximal 3-4 Sätze
- Persönlich und authentisch (kein Bot-Gefühl)
- Passende Emojis (aber dezent)
- Verwende den Kontakt-Namen
- Antworte NUR mit der Nachricht, keine Erklärungen

Nachricht:"""
        
        # AI Call - Verwende gpt-4o-mini für Inbox-Nachrichten (25x günstiger als gpt-4o)
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",  # Explizit gpt-4o-mini für Inbox-Nachrichten
        )
        
        message = await ai_client.generate_async(
            system_prompt="Du bist CHIEF, ein intelligenter Sales-Assistent der Follow-up Nachrichten generiert.",
            messages=[{"role": "user", "content": prompt}],
        )
        
        # Optional: Speichere die generierte Nachricht im Queue-Item
        try:
            db.table("contact_follow_up_queue").update({
                "ai_generated_content": message.strip(),
                "updated_at": datetime.utcnow().isoformat(),
            }).eq("id", request.queue_id).execute()
        except Exception as e:
            logger.warning(f"Could not update queue item with generated message: {e}")
        
        return GenerateQueueMessageResponse(
            success=True,
            message=message.strip(),
            queue_id=request.queue_id,
            template_key=template_key,
            state=state,
            lead_name=lead_name,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating queue message: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren der Nachricht: {str(e)}"
        )


# ============================================================================
# REPLY FLOW ENDPOINTS
# ============================================================================

class ProcessReplyRequest(BaseModel):
    lead_id: str
    reply_text: str  # Die Antwort des Leads
    channel: Optional[str] = "whatsapp"  # whatsapp, instagram, email, sms


class NextStepLogic(BaseModel):
    urgency_score: int  # 0-100
    hours_until_followup: float  # Kann 6, 12, 24, 48 etc. sein
    display_text: str  # "in 6 Stunden", "morgen", "in 3 Tagen"
    reason: str
    recommended_channel: str  # "whatsapp", "instagram", "email", "phone"


class ProcessReplyResponse(BaseModel):
    success: bool
    generated_response: str
    analysis: Dict[str, Any]  # Sentiment, Intent, suggested_state
    new_state: str
    lead_name: str
    cancelled_followups: int
    next_step: NextStepLogic


@router.post("/process-reply", response_model=ProcessReplyResponse)
async def process_lead_reply(
    request: ProcessReplyRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> ProcessReplyResponse:
    """
    Verarbeitet eine Antwort eines Leads:
    1. Speichert die Antwort als Activity
    2. Analysiert Sentiment und Intent
    3. Aktualisiert Lead-State automatisch
    4. Cancelt geplante Follow-ups
    5. Generiert passende Reaktion via CHIEF
    """
    user_id = _extract_user_id(current_user)
    
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API Key nicht konfiguriert"
        )
    
    try:
        # 1. Lead laden
        lead_result = db.table("leads")\
            .select("*")\
            .eq("id", request.lead_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not lead_result.data:
            raise HTTPException(status_code=404, detail="Lead nicht gefunden")
        
        lead = lead_result.data
        lead_name = lead.get("name", "Unbekannt")
        current_state = lead.get("status", "new").lower()
        
        # 2. Antwort als Activity speichern
        activity_data = {
            "lead_id": request.lead_id,
            "user_id": user_id,
            "type": "reply_received",
            "channel": request.channel,
            "content": request.reply_text,
            "metadata": {
                "direction": "inbound",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        try:
            db.table("lead_activities").insert(activity_data).execute()
        except Exception as e:
            logger.warning(f"Could not save activity: {e}")
        
        # 3. Letzte Konversation laden für Kontext
        history = []
        try:
            history_result = db.table("lead_activities")\
                .select("*")\
                .eq("lead_id", request.lead_id)\
                .order("created_at", desc=True)\
                .limit(10)\
                .execute()
            history = history_result.data if history_result.data else []
        except Exception as e:
            logger.warning(f"Could not load history: {e}")
        
        # 4. CHIEF analysiert und generiert Reaktion
        conversation_history = []
        if history:
            conversation_history = [
                {
                    'type': h.get('type', 'unknown'),
                    'content': h.get('content', '')[:150]
                }
                for h in history[:3]
            ]
        
        # Verfügbare Kanäle prüfen
        has_instagram = bool(lead.get('instagram') or lead.get('instagram_url'))
        has_whatsapp = bool(lead.get('whatsapp') or lead.get('phone'))
        has_email = bool(lead.get('email'))
        
        analysis_prompt = f"""Du bist CHIEF, der intelligente Sales-Assistent von AlSales.

## Lead-Informationen
- Name: {lead_name}
- Aktueller Status: {current_state}
- Quelle: {lead.get('source', 'Unbekannt')}
- Verfügbare Kanäle: Instagram: {'Ja' if has_instagram else 'Nein'}, WhatsApp: {'Ja' if has_whatsapp else 'Nein'}, Email: {'Ja' if has_email else 'Nein'}

## Neue Antwort des Leads ({request.channel})
"{request.reply_text}"

## Konversations-Historie
{json.dumps(conversation_history, ensure_ascii=False, indent=2)}

## State Transition
- Aktuell: {current_state}
- POSITIV (Interesse/Zusage) → einen State weiter (new→engaged→opportunity→won)
- NEGATIV → "lost"
- UNKLAR → State bleibt

## URGENCY SCORE (0-100)
90-100: Kaufabsicht, Termin-Zusage, "Ja!", Bestellung → Follow-up in 6-12h
70-89: Preis-Frage, "Erzähl mehr", aktives Interesse → Follow-up in 24h
50-69: Neugierig aber unverbindlich → Follow-up in 48-72h
30-49: Zögert, Einwände, "muss überlegen" → Follow-up in 96-120h
10-29: Desinteresse, Absage → Follow-up in 168h (1 Woche)
0-9: "Nie wieder" → Kein Follow-up, State = lost

## Empfohlener Kanal
- Bevorzuge den Kanal auf dem geantwortet wurde: {request.channel}
- Bei hoher Urgency: Schnellster verfügbarer Kanal
- NUR Kanäle empfehlen die existieren!

## WICHTIG: Antworte NUR mit diesem JSON, KEIN anderer Text!

```json
{{
  "sentiment": "positive|neutral|negative|interested|hesitant",
  "intent": "ready_to_buy|wants_meeting|wants_info|has_questions|interested|hesitant|needs_time|not_interested",
  "suggested_state": "new|engaged|opportunity|won|lost|dormant",
  "state_reason": "Kurze Begründung",
  "response_strategy": "Was die Antwort erreichen soll",
  "generated_response": "Fertige Nachricht (kurz, persönlich, duzen, max 3 Sätze)",
  "urgency_score": 85,
  "hours_until_followup": 24,
  "followup_reason": "Warum dieses Timing",
  "recommended_channel": "whatsapp|instagram|email|phone"
}}
```"""

        # AI Call
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",
        )
        
        ai_response_text = await ai_client.generate_async(
            system_prompt="Du bist CHIEF, ein intelligenter Sales-Assistent der Lead-Antworten analysiert und Reaktionen generiert.",
            messages=[{"role": "user", "content": analysis_prompt}],
        )
        
        # Parse JSON Response
        json_match = re.search(r'```json\s*(.*?)\s*```', ai_response_text, re.DOTALL)
        if json_match:
            analysis_json = json.loads(json_match.group(1))
        else:
            # Versuche direkt zu parsen
            try:
                analysis_json = json.loads(ai_response_text)
            except json.JSONDecodeError:
                # Fallback: Erstelle einfache Analyse mit State-Transition-Logik
                # Bei positiver Antwort: State weiter
                reply_lower = request.reply_text.lower()
                is_positive = any(word in reply_lower for word in ["ja", "ok", "interessant", "erzähl", "mehr", "klar", "gerne", "klingt gut"])
                is_negative = any(word in reply_lower for word in ["nein", "kein interesse", "nicht", "ne", "keine zeit", "nicht interessiert"])
                
                if is_negative:
                    fallback_state = "lost"
                elif is_positive:
                    # State weiter: new→engaged→opportunity→won
                    if current_state == "new":
                        fallback_state = "engaged"
                    elif current_state == "engaged":
                        fallback_state = "opportunity"
                    elif current_state == "opportunity":
                        fallback_state = "won"
                    else:
                        fallback_state = current_state
                else:
                    # Unklar: State bleibt
                    fallback_state = current_state
                
                # Fallback Urgency Score basierend auf Sentiment
                if is_positive:
                    fallback_urgency = 75
                    fallback_hours = 24
                elif is_negative:
                    fallback_urgency = 15
                    fallback_hours = 168
                else:
                    fallback_urgency = 50
                    fallback_hours = 72
                
                analysis_json = {
                    "sentiment": "positive" if is_positive else ("negative" if is_negative else "neutral"),
                    "intent": "has_questions",
                    "suggested_state": fallback_state,
                    "state_reason": "Automatische Analyse (Fallback)",
                    "response_strategy": "Freundlich antworten und weiterhelfen",
                    "generated_response": f"Hallo {lead_name.split()[0] if lead_name else 'dort'}, danke für deine Nachricht! Lass mich dir gerne weiterhelfen.",
                    "urgency_score": fallback_urgency,
                    "hours_until_followup": fallback_hours,
                    "followup_reason": "Automatische Berechnung (Fallback)",
                    "recommended_channel": request.channel
                }
        
        # 5. Urgency Score und NextStepLogic erstellen
        urgency_score = int(analysis_json.get("urgency_score", 50))
        hours = float(analysis_json.get("hours_until_followup", 72))
        
        # Display Text generieren
        if hours <= 6:
            display_text = "in 6 Stunden"
        elif hours <= 12:
            display_text = "heute Abend"
        elif hours <= 24:
            display_text = "morgen"
        elif hours <= 48:
            display_text = "in 2 Tagen"
        elif hours <= 72:
            display_text = "in 3 Tagen"
        elif hours <= 120:
            display_text = "in 5 Tagen"
        else:
            display_text = f"in {int(hours/24)} Tagen"
        
        # Kanal validieren - nur wenn verfügbar
        recommended_channel = analysis_json.get("recommended_channel", request.channel)
        if recommended_channel == "instagram" and not has_instagram:
            recommended_channel = request.channel
        elif recommended_channel == "whatsapp" and not has_whatsapp:
            recommended_channel = request.channel
        elif recommended_channel == "email" and not has_email:
            recommended_channel = request.channel
        
        next_step = NextStepLogic(
            urgency_score=urgency_score,
            hours_until_followup=hours,
            display_text=display_text,
            reason=analysis_json.get("followup_reason", "Standard Follow-up"),
            recommended_channel=recommended_channel
        )
        
        # 6. State automatisch updaten
        new_state = analysis_json.get("suggested_state", current_state).lower()
        
        # State Transition validieren (aus followup_engine.py)
        STATE_TRANSITIONS = {
            'new': ['engaged', 'lost', 'dormant'],
            'engaged': ['opportunity', 'lost', 'dormant'],
            'opportunity': ['won', 'lost', 'dormant'],
            'won': ['churned', 'dormant'],
            'lost': ['engaged', 'dormant'],
            'churned': ['engaged', 'dormant'],
            'dormant': ['engaged', 'new']
        }
        
        if new_state != current_state:
            valid_transitions = STATE_TRANSITIONS.get(current_state, [])
            if new_state in valid_transitions:
                # Update Lead Status
                db.table("leads").update({
                    "status": new_state.upper(),
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", request.lead_id).execute()
            else:
                # Fallback: engaged wenn Antwort kam
                if current_state == "new":
                    new_state = "engaged"
                    db.table("leads").update({
                        "status": "ENGAGED",
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("id", request.lead_id).execute()
                else:
                    new_state = current_state
        else:
            # State bleibt gleich, aber updated_at aktualisieren
            db.table("leads").update({
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", request.lead_id).execute()
        
        # 7. Geplante Follow-ups canceln (Lead hat geantwortet)
        cancelled_count = 0
        try:
            cancel_result = db.table("contact_follow_up_queue")\
                .update({
                    "status": "cancelled",
                    "cancelled_reason": "lead_replied"
                })\
                .eq("contact_id", request.lead_id)\
                .eq("status", "pending")\
                .execute()
            # Zähle gecancelte Items
            if cancel_result.data:
                cancelled_count = len(cancel_result.data) if isinstance(cancel_result.data, list) else 1
        except Exception as e:
            logger.warning(f"Could not cancel follow-ups: {e}")
        
        # 8. Activity für generierte Antwort speichern
        response_activity = {
            "lead_id": request.lead_id,
            "user_id": user_id,
            "type": "ai_response_generated",
            "content": analysis_json.get("generated_response", ""),
            "metadata": {
                "analysis": {
                    "sentiment": analysis_json.get("sentiment"),
                    "intent": analysis_json.get("intent"),
                    "strategy": analysis_json.get("response_strategy")
                },
                "state_change": {
                    "from": current_state,
                    "to": new_state
                }
            }
        }
        try:
            db.table("lead_activities").insert(response_activity).execute()
        except Exception as e:
            logger.warning(f"Could not save response activity: {e}")
        
        return ProcessReplyResponse(
            success=True,
            generated_response=analysis_json.get("generated_response", ""),
            analysis={
                "sentiment": analysis_json.get("sentiment"),
                "intent": analysis_json.get("intent"),
                "state_reason": analysis_json.get("state_reason"),
                "response_strategy": analysis_json.get("response_strategy")
            },
            new_state=new_state,
            lead_name=lead_name,
            cancelled_followups=cancelled_count,
            next_step=next_step
        )
        
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"AI Response parsing error: {e}")
        raise HTTPException(status_code=500, detail=f"AI Response parsing error: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class MarkSentRequest(BaseModel):
    lead_id: str
    message_sent: str
    schedule_followup: bool = True
    hours_until_followup: Optional[float] = None  # CHIEF überschreibt das
    followup_hours: Optional[float] = None  # Alternative Feldname (Frontend compatibility)
    followup_days: Optional[int] = None  # Fallback: in Tagen


class MarkSentResponse(BaseModel):
    success: bool
    next_followup_date: Optional[str] = None
    message: str


@router.post("/mark-sent-with-followup", response_model=MarkSentResponse)
async def mark_sent_with_followup(
    request: MarkSentRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> MarkSentResponse:
    """
    Markiert Nachricht als gesendet und plant optional neuen Follow-up.
    """
    user_id = _extract_user_id(current_user)
    
    try:
        # 1. Activity speichern
        activity_data = {
            "lead_id": request.lead_id,
            "user_id": user_id,
            "type": "message_sent",
            "content": request.message_sent,
            "metadata": {
                "direction": "outbound",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        try:
            db.table("lead_activities").insert(activity_data).execute()
        except Exception as e:
            logger.warning(f"Could not save sent activity: {e}")
        
        # 2. Alte pending Follow-ups für diesen Lead canceln
        try:
            cancel_result = db.table("contact_follow_up_queue")\
                .update({
                    "status": "cancelled",
                    "cancelled_reason": "message_sent"
                })\
                .eq("contact_id", request.lead_id)\
                .eq("status", "pending")\
                .execute()
            cancelled_count = len(cancel_result.data) if cancel_result.data else 0
            if cancelled_count > 0:
                logger.info(f"Cancelled {cancelled_count} old follow-up(s) for lead {request.lead_id}")
        except Exception as e:
            logger.warning(f"Could not cancel old follow-ups: {e}")
        
        next_followup = None
        new_followup_id = None
        
        # 3. Neuen Follow-up planen falls gewünscht
        if request.schedule_followup:
            # Lead laden für State
            lead_result = db.table("leads")\
                .select("status, vertical")\
                .eq("id", request.lead_id)\
                .single()\
                .execute()
            
            if lead_result.data:
                lead_state = lead_result.data.get("status", "ENGAGED").lower()
                vertical = lead_result.data.get("vertical", "mlm")
                
                # Passenden Cycle finden (erster Step im State)
                cycle_result = db.table("follow_up_cycles")\
                    .select("*")\
                    .eq("vertical", vertical)\
                    .eq("state", lead_state)\
                    .eq("is_active", True)\
                    .order("sequence_order")\
                    .limit(1)\
                    .execute()
                
                if cycle_result.data and len(cycle_result.data) > 0:
                    cycle = cycle_result.data[0]
                    
                    # Berechne next_due_at: hours_until_followup > followup_hours > followup_days > default
                    hours = request.hours_until_followup or request.followup_hours
                    if hours:
                        due_date = datetime.utcnow() + timedelta(hours=float(hours))
                    elif request.followup_days:
                        due_date = datetime.utcnow() + timedelta(days=request.followup_days)
                    else:
                        # Default: 3 Tage (72 Stunden)
                        due_date = datetime.utcnow() + timedelta(hours=72)
                    
                    queue_item = {
                        "contact_id": request.lead_id,
                        "user_id": user_id,
                        "cycle_id": cycle.get("id"),
                        "current_state": lead_state,
                        "status": "pending",
                        "next_due_at": due_date.isoformat(),
                        "ai_generated_content": None,
                    }
                    try:
                        insert_result = db.table("contact_follow_up_queue").insert(queue_item).execute()
                        if insert_result.data and len(insert_result.data) > 0:
                            new_followup_id = insert_result.data[0].get("id")
                            next_followup = due_date.strftime("%d.%m.%Y %H:%M")
                            logger.info(f"Created new follow-up for lead {request.lead_id}, due at {next_followup}")
                    except Exception as e:
                        logger.error(f"Could not schedule follow-up: {e}")
                else:
                    logger.warning(f"No active cycle found for state {lead_state}, vertical {vertical}")
            else:
                logger.warning(f"Lead {request.lead_id} not found")
        
        return MarkSentResponse(
            success=True,
            next_followup_date=next_followup,
            message=f"Nachricht gespeichert. {'Nächster Follow-up am ' + next_followup if next_followup else 'Kein Follow-up geplant.'}"
        )
        
        return MarkSentResponse(
            success=True,
            next_followup_date=next_followup,
            message=f"Nachricht gespeichert. {'Nächster Follow-up am ' + next_followup if next_followup else 'Kein Follow-up geplant.'}"
        )
        
    except Exception as e:
        logger.error(f"Error marking sent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _extract_user_id(current_user: Any) -> str:
    """Extrahiert user_id aus current_user (verschiedene Formate möglich)"""
    if isinstance(current_user, dict):
        return current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
    if hasattr(current_user, "user_id"):
        return str(current_user.user_id)
    if hasattr(current_user, "id"):
        return str(current_user.id)
    raise HTTPException(status_code=401, detail="User ID konnte nicht extrahiert werden")

