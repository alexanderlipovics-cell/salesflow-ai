"""
CHIEF API Router
Endpunkte für CHIEF (AI Assistant) Funktionalitäten
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

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


@router.post("/generate-queue-message", response_model=GenerateQueueMessageResponse)
async def generate_queue_message_endpoint(
    request: GenerateQueueMessageRequest,
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase),
) -> GenerateQueueMessageResponse:
    """
    Generiert eine AI-Nachricht für ein Queue Item.
    Nutzt State Psychology und Template-spezifische Prompts.
    Speichert generierte Nachricht in der DB.
    """
    user_id = _extract_user_id(current_user)

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API Key nicht konfiguriert"
        )

    try:
        from app.services.queue_message_generator import generate_queue_message
        
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",
        )
        
        result = await generate_queue_message(
            db=db,
            queue_id=request.queue_id,
            user_id=user_id,
            ai_client=ai_client,
        )
        
        return GenerateQueueMessageResponse(**result)

    except Exception as e:
        logger.error(f"Error in generate_queue_message endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren: {str(e)}"
        )


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
        
        return GenerateQueueMessageResponse(message=message.strip())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating queue message: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Generieren der Nachricht: {str(e)}"
        )


def _extract_user_id(current_user: Any) -> str:
    """Extrahiert user_id aus current_user (verschiedene Formate möglich)"""
    if isinstance(current_user, dict):
        return current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
    if hasattr(current_user, "user_id"):
        return str(current_user.user_id)
    if hasattr(current_user, "id"):
        return str(current_user.id)
    raise HTTPException(status_code=401, detail="User ID konnte nicht extrahiert werden")

