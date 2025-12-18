"""
Copilot-Router für Sales Coach AI.

Dieser Router liefert intelligente Antwort-Optionen (Soft, Direkt, Frage)
basierend auf der Nutzeranfrage und dem Kontext.

WICHTIG: 
- System-Prompt kommt aus dem zentralen Prompt-Hub (app.core.ai_prompts)
- AUTOPILOT: Jede Nachricht wird als Message Event geloggt
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app.config import get_settings
from app.core.ai_prompts import SALES_COACH_PROMPT, detect_action_from_text
from app.core.deps import get_current_user
from app.supabase_client import get_supabase_client
from ..core.security import get_current_user_dict
from ..core.ai_router import get_model_for_task, get_max_tokens_for_task

router = APIRouter(
    prefix="/copilot",
    tags=["copilot"],
    dependencies=[Depends(get_current_user_dict)]
)
settings = get_settings()
logger = logging.getLogger(__name__)

# DEV User ID für Tests wenn kein Header gesetzt
DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001"

LIVE_CALL_TRIGGERS = [
    "bin beim kunden",
    "bin im gespräch",
    "bin gerade bei",
    "sitze beim kunden",
    "live call",
    "im meeting",
    "kunde fragt gerade",
    "er sagt gerade",
    "sie fragt nach",
]

# ============================================
# A/B EXPERIMENT CONFIGURATION
# ============================================

# Aktuelle Experiment-Einstellungen (V1 - Defaults)
CURRENT_TEMPLATE_VERSION = "v1.0"
CURRENT_PERSONA_VARIANT = "default"


# ============================================
# MESSAGE EVENT LOGGING (Silent - no exceptions)
# ============================================

async def log_message_event(
    user_id: str,
    text: str,
    direction: str,
    detected_action: Optional[str] = None,
    template_version: Optional[str] = None,
    persona_variant: Optional[str] = None,
) -> None:
    """
    Loggt eine Nachricht als Message Event für Autopilot.
    Wirft KEINE Exception - bei Fehlern wird nur geloggt.
    
    A/B Experiment: Bei outbound Nachrichten werden template_version 
    und persona_variant mitgeloggt.
    """
    try:
        from app.supabase_client import get_supabase_client, SupabaseNotConfiguredError
        from app.schemas.message_events import MessageEventCreate
        from app.db.repositories.message_events import create_message_event
        
        db = get_supabase_client()
        
        event_data = MessageEventCreate(
            contact_id=None,
            channel="internal",
            direction=direction,
            text=text,
            raw_payload={"detected_action": detected_action} if detected_action else None,
            # A/B Experiment Fields (nur bei outbound relevant)
            template_version=template_version if direction == "outbound" else None,
            persona_variant=persona_variant if direction == "outbound" else None,
        )
        
        await create_message_event(db, user_id, event_data)
        logger.debug(
            f"Copilot message event logged: direction={direction}, "
            f"template={template_version}, persona={persona_variant}"
        )
        
    except SupabaseNotConfiguredError:
        # Supabase nicht konfiguriert - nicht kritisch
        logger.debug("Supabase not configured, skipping message event logging")
    except ValueError as e:
        # Validierungsfehler oder DB-Fehler (RLS, Tabelle fehlt) - loggen aber nicht werfen
        logger.warning(f"Could not log copilot message event (non-critical): {e}")
    except Exception as e:
        # Alle anderen Fehler - loggen aber nicht werfen
        logger.warning(f"Could not log copilot message event (non-critical): {e}", exc_info=True)


# ============================================
# SCHEMAS
# ============================================

class CopilotRequest(BaseModel):
    """Request für Copilot-Generierung."""
    message: str
    context: Optional[Dict[str, Any]] = {}
    lead_context: Optional[Dict[str, Any]] = {}
    conversation_history: Optional[List[Dict[str, str]]] = []
    vertical: Optional[str] = "mlm_sales"
    # NBA: Lead/Contact ID für Next Best Action
    lead_id: Optional[str] = None
    contact_id: Optional[str] = None


class LiveAssistRequest(BaseModel):
    """Request-Modell für Live Call Unterstützung."""
    text: str
    lead_id: Optional[str] = None


class CopilotOption(BaseModel):
    """Eine Antwort-Option."""
    id: str
    label: str
    tone: str
    content: str


class CopilotAnalysis(BaseModel):
    """Analyse der Anfrage."""
    sentiment: str
    intent: str
    disg_type: Optional[str] = None
    urgency: str


class NextBestActionInfo(BaseModel):
    """Next Best Action Empfehlung"""
    action_key: str
    reason: str
    suggested_channel: str
    priority: int


class CopilotResponse(BaseModel):
    """Response mit Analyse und Optionen."""
    response: str  # Hauptantwort für einfache Clients
    analysis: CopilotAnalysis
    options: List[CopilotOption]
    # Next Best Action (wenn Lead-Kontext vorhanden)
    next_best_action: Optional[NextBestActionInfo] = None


# ============================================
# SYSTEM PROMPT - Aus zentralem Prompt-Hub
# ============================================
# HINWEIS: SALES_COACH_PROMPT wird oben aus app.core.ai_prompts importiert
# Der alte FELLO_SYSTEM_PROMPT wurde in den zentralen Hub verschoben und
# mit BRAIN + MENTOR kombiniert zum einheitlichen SALES_COACH_PROMPT.

# Copilot-spezifische Erweiterung für 3-Optionen-Format
COPILOT_OPTIONS_INSTRUCTION = """

🔥 ANTWORT-FORMAT FÜR DIESEN MODUS:
Liefere IMMER 3 Antwort-Optionen:
1. SOFT (empathisch, beziehungsorientiert)
2. DIREKT (klar, handlungsorientiert)  
3. FRAGE (Gegenfrage, um mehr zu erfahren)

Jede Option soll konkret und Copy-Paste-bereit sein.
"""

# Kombinierter Prompt für den Copilot-Endpoint
COPILOT_SYSTEM_PROMPT = SALES_COACH_PROMPT + COPILOT_OPTIONS_INSTRUCTION


# ============================================
# NBA HELPER (Silent - no exceptions)
# ============================================

async def get_nba_for_lead(
    user_id: str,
    lead_id: Optional[str] = None,
    contact_id: Optional[str] = None,
) -> Optional[NextBestActionInfo]:
    """
    Holt NBA für einen Lead/Contact. Wirft KEINE Exception.
    """
    if not lead_id and not contact_id:
        return None
    
    try:
        from app.supabase_client import get_supabase_client
        from app.services.next_best_action import compute_next_best_action_for_lead
        
        db = get_supabase_client()
        nba = await compute_next_best_action_for_lead(
            db=db,
            user_id=user_id,
            lead_id=lead_id,
            contact_id=contact_id,
        )
        
        return NextBestActionInfo(
            action_key=nba["action_key"],
            reason=nba["reason"],
            suggested_channel=nba["suggested_channel"],
            priority=nba["priority"],
        )
    except Exception as e:
        logger.warning(f"Could not compute NBA (non-critical): {e}")
        return None


# ============================================
# MOCK RESPONSES (für Fallback)
# ============================================

def generate_mock_options(message: str) -> Dict[str, Any]:
    """
    Generiert intelligente Mock-Antworten basierend auf Keywords.
    Wird verwendet wenn kein AI-Key verfügbar ist.
    """
    
    msg_lower = message.lower()
    
    # Einwand: Zu teuer
    if any(word in msg_lower for word in ["teuer", "preis", "geld", "kosten", "budget"]):
        return {
            "response": "Preis-Einwand erkannt! Hier sind 3 bewährte Antwort-Strategien:",
            "analysis": {
                "sentiment": "HESITANT",
                "intent": "OBJECTION",
                "disg_type": "C",
                "urgency": "MEDIUM"
            },
            "options": [
                {
                    "id": "soft",
                    "label": "Verständnisvoll",
                    "tone": "EMPATHIC",
                    "content": "Ich verstehe total, dass du auf dein Budget achtest - das zeigt, dass du klug mit deinem Geld umgehst! 👍 Lass mich fragen: Was wäre es dir wert, wenn [konkreter Nutzen]?"
                },
                {
                    "id": "direct",
                    "label": "Direkt",
                    "tone": "DIRECT",
                    "content": "Verstanden. Lass uns kurz rechnen: Was kostet es dich, NICHTS zu ändern? 📊 Manchmal ist die Frage nicht 'Kann ich mir das leisten?' sondern 'Kann ich es mir leisten, es NICHT zu tun?'"
                },
                {
                    "id": "question",
                    "label": "Gegenfrage",
                    "tone": "INQUISITIVE",
                    "content": "Interessant! Ist es wirklich der Preis, oder gibt es noch etwas anderes, das dich zögern lässt? 🤔"
                }
            ]
        }
    
    # Ghosting / Keine Antwort
    if any(word in msg_lower for word in ["ghost", "antwortet nicht", "keine antwort", "meldet sich nicht"]):
        return {
            "response": "Anti-Ghosting Zeit! Hier sind 3 Strategien um den Kontakt wieder aufzubauen:",
            "analysis": {
                "sentiment": "COLD",
                "intent": "REACTIVATION",
                "disg_type": None,
                "urgency": "LOW"
            },
            "options": [
                {
                    "id": "soft",
                    "label": "Fürsorglich",
                    "tone": "EMPATHIC",
                    "content": "Hey [Name]! 🙋 Alles okay bei dir? Hab gerade an dich gedacht und wollte sichergehen, dass alles gut ist."
                },
                {
                    "id": "direct",
                    "label": "Ehrlich",
                    "tone": "DIRECT",
                    "content": "Hey [Name], ich merke das Timing passt gerade nicht - kein Problem! Soll ich mich in 2-3 Monaten nochmal melden, oder lieber ganz sein lassen? Sei ehrlich - ich nehm's nicht persönlich 🙂"
                },
                {
                    "id": "question",
                    "label": "Value-First",
                    "tone": "INQUISITIVE",
                    "content": "Hey! Ich hab hier einen Artikel gefunden, der perfekt zu unserem letzten Gespräch passt. Dachte, das könnte dich interessieren - soll ich dir den Link schicken?"
                }
            ]
        }
    
    # Closing / Abschluss
    if any(word in msg_lower for word in ["closing", "abschluss", "abschließen", "close", "deal"]):
        return {
            "response": "Closing-Zeit! 💪 Hier sind 3 Techniken für den Abschluss:",
            "analysis": {
                "sentiment": "POSITIVE",
                "intent": "CLOSING",
                "disg_type": "D",
                "urgency": "HIGH"
            },
            "options": [
                {
                    "id": "soft",
                    "label": "Zusammenfassung",
                    "tone": "EMPATHIC",
                    "content": "Lass mich kurz zusammenfassen: Du willst [Ziel], und unser Produkt löst genau das. Der einzige Schritt jetzt ist [Aktion]. Bereit? 🎯"
                },
                {
                    "id": "direct",
                    "label": "Assumptive",
                    "tone": "DIRECT",
                    "content": "Super, dann machen wir das so! 🎉 Startest du lieber mit [Paket A] oder [Paket B]?"
                },
                {
                    "id": "question",
                    "label": "Einwand-Check",
                    "tone": "INQUISITIVE",
                    "content": "Basierend auf allem was du mir erzählt hast, glaube ich wirklich, dass das zu dir passt. Was hält dich noch davon ab, heute zu starten?"
                }
            ]
        }
    
    # Opener / Erste Nachricht
    if any(word in msg_lower for word in ["opener", "erste nachricht", "anschreiben", "kalt", "cold"]):
        return {
            "response": "Cold Opener gefragt! Hier sind 3 Ansätze:",
            "analysis": {
                "sentiment": "NEUTRAL",
                "intent": "OUTREACH",
                "disg_type": "I",
                "urgency": "MEDIUM"
            },
            "options": [
                {
                    "id": "soft",
                    "label": "Persönlich",
                    "tone": "EMPATHIC",
                    "content": "Hey [Name]! 👋 Ich bin auf dein Profil gestoßen und finde [spezifisches Detail] echt spannend. Was ist dein Geheimnis?"
                },
                {
                    "id": "direct",
                    "label": "Value-First",
                    "tone": "DIRECT",
                    "content": "Hi [Name]! Ich hab eine Checkliste erstellt für [Problem]. Dachte, die könnte für dich interessant sein. Soll ich sie dir schicken?"
                },
                {
                    "id": "question",
                    "label": "Neugier",
                    "tone": "INQUISITIVE",
                    "content": "Hey! Ich muss dir was zeigen, was mein Leben verändert hat. Keine Sorge, kein Spam – aber hast du kurz Zeit?"
                }
            ]
        }
    
    # Einwand allgemein
    if any(word in msg_lower for word in ["einwand", "objection", "aber", "nein"]):
        return {
            "response": "Einwandbehandlung aktiviert! Das LIRA-Framework hilft:",
            "analysis": {
                "sentiment": "HESITANT",
                "intent": "OBJECTION",
                "disg_type": "S",
                "urgency": "MEDIUM"
            },
            "options": [
                {
                    "id": "soft",
                    "label": "Verstehen",
                    "tone": "EMPATHIC",
                    "content": "Das verstehe ich total! Viele in meinem Team hatten am Anfang ähnliche Bedenken. Was genau macht dir Sorgen?"
                },
                {
                    "id": "direct",
                    "label": "Reframe",
                    "tone": "DIRECT",
                    "content": "Interessant! Lass mich eine andere Perspektive zeigen: [Reframe des Einwands]"
                },
                {
                    "id": "question",
                    "label": "Isolieren",
                    "tone": "INQUISITIVE",
                    "content": "Ist das der einzige Punkt, oder gibt es noch etwas anderes, das dich beschäftigt? 🤔"
                }
            ]
        }
    
    # Default Response
    return {
        "response": "Gute Frage! Hier sind 3 Ansätze für deine Situation:",
        "analysis": {
            "sentiment": "NEUTRAL",
            "intent": "GENERAL",
            "disg_type": None,
            "urgency": "MEDIUM"
        },
        "options": [
            {
                "id": "soft",
                "label": "Empathisch",
                "tone": "EMPATHIC",
                "content": "Ich verstehe, was du meinst. Lass uns das gemeinsam anschauen - was ist dir dabei am wichtigsten?"
            },
            {
                "id": "direct",
                "label": "Direkt",
                "tone": "DIRECT",
                "content": "Klare Sache! Hier ist mein Vorschlag: [Konkrete Handlungsempfehlung]. Was meinst du?"
            },
            {
                "id": "question",
                "label": "Nachfrage",
                "tone": "INQUISITIVE",
                "content": "Interessant! Kannst du mir mehr dazu erzählen? Was genau möchtest du erreichen?"
            }
        ]
    }


# ============================================
# AI-POWERED RESPONSE (wenn API Key vorhanden)
# ============================================


def _extract_user_id(current_user: Any) -> str:
    """Ermittle eine user_id, egal ob Dict oder User-Objekt."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    if isinstance(current_user, dict):
        user_id = current_user.get("user_id") or current_user.get("id")
    else:
        user_id = getattr(current_user, "id", None) or getattr(current_user, "user_id", None)

    if not user_id:
        raise HTTPException(status_code=401, detail="Kein Benutzerkontext gefunden")

    return str(user_id)


def detect_live_call(text: str) -> bool:
    """Erkenne Live-Situationen basierend auf typischen Trigger-Formulierungen."""
    if not text:
        return False
    text_lower = text.lower()
    return any(trigger in text_lower for trigger in LIVE_CALL_TRIGGERS)


async def generate_ai_response(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generiert eine AI-Antwort mit OpenAI oder Anthropic.
    Fällt auf Mock zurück wenn kein Key vorhanden.
    """
    
    # Prüfe auf Anthropic Key (bevorzugt für Copilot)
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            
            model = get_model_for_task("generate_response")
            max_tokens = get_max_tokens_for_task("generate_response")
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=COPILOT_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": f"""
Anfrage: {message}

Kontext: {context}

Generiere eine Antwort mit:
1. Kurze Analyse (Sentiment, Intent, DISG-Typ wenn erkennbar)
2. Drei Antwort-Optionen (Soft, Direkt, Frage)

Jede Option soll Copy-Paste-bereit sein!
"""}]
            )
            
            # Parse AI Response und strukturiere es
            ai_text = response.content[0].text
            
            # Für jetzt: Nutze Mock-Logik + AI-Text als Hauptantwort
            mock_response = generate_mock_options(message)
            mock_response["response"] = ai_text
            return mock_response
            
        except Exception as e:
            logger.warning(f"Anthropic API Error: {e} - Fallback auf Mock")
            return generate_mock_options(message)
    
    # Prüfe auf OpenAI Key
    if settings.openai_api_key:
        try:
            from app.ai_client import AIClient
            from app.schemas import ChatMessage
            
            ai_client = AIClient(
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )
            
            messages = [ChatMessage(role="user", content=message)]
            ai_text = ai_client.generate(COPILOT_SYSTEM_PROMPT, messages)
            
            # Kombiniere AI-Text mit strukturierten Mock-Optionen
            mock_response = generate_mock_options(message)
            mock_response["response"] = ai_text
            return mock_response
            
        except Exception as e:
            logger.warning(f"OpenAI API Error: {e} - Fallback auf Mock")
            return generate_mock_options(message)
    
    # Kein API Key - Mock Modus
    logger.info("Kein AI API Key - Mock Modus aktiv")
    return generate_mock_options(message)


# ============================================
# API ENDPOINTS
# ============================================


@router.post("/live-assist")
async def live_call_assist(
    request: LiveAssistRequest,
    current_user=Depends(get_current_user),
):
    """Echtzeit-Unterstützung für Live-Calls mit kurzem, umsetzbarem Feedback."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(current_user)

    # Optional: Lead-Kontext laden
    lead_context = ""
    try:
        if request.lead_id:
            lead = (
                supabase.table("leads")
                .select("*")
                .eq("id", request.lead_id)
                .single()
                .execute()
            )
            if lead.data:
                lead_context = f"""
Lead: {lead.data.get('name')}
Firma: {lead.data.get('company')}
Status: {lead.data.get('status')}
Temperatur: {lead.data.get('temperature')}
Notizen: {lead.data.get('notes')}
Deal Value: {lead.data.get('deal_value')}
"""
    except Exception as exc:
        logger.warning(f"Lead-Kontext konnte nicht geladen werden: {exc}")

    # Objection-Templates abrufen
    objection_context = ""
    try:
        objections = (
            supabase.table("objection_templates")
            .select("objection_text, response_template, response_strategy")
            .limit(10)
            .execute()
        )
        for obj in objections.data or []:
            objection_context += f"- {obj['objection_text']}: {obj['response_template']}\n"
    except Exception as exc:
        logger.warning(f"Objection Templates konnten nicht geladen werden: {exc}")

    # Prompt vorbereiten
    prompt = f"""Du bist ein Live-Sales-Coach. Der Verkäufer ist GERADE im Kundengespräch und braucht sofortige Hilfe.

SITUATION: {request.text}

LEAD-KONTEXT:
{lead_context}

BEKANNTE EINWÄNDE & ANTWORTEN:
{objection_context}

Gib eine KURZE, SOFORT NUTZBARE Antwort:
1. 🎯 Direkte Antwort/Argument (max 2 Sätze)
2. ❓ Eine Rückfrage die der Verkäufer stellen kann
3. ⚡ Quick Tipp (wenn relevant)

Sei knapp und präzise - der User ist LIVE beim Kunden!"""

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")

    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=anthropic_key)
        model = get_model_for_task("generate_response")
        max_tokens = min(get_max_tokens_for_task("generate_response"), 300)
        message = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        assistance_text = message.content[0].text if message and message.content else ""
    except Exception as exc:
        logger.error(f"Live-Assist Fehler: {exc}")
        raise HTTPException(status_code=500, detail="Fehler bei der Live-Unterstützung")

    # Events loggen (non-blocking Fehlerbehandlung)
    try:
        is_live = detect_live_call(request.text)
        detected_action = "live_call" if is_live else detect_action_from_text(request.text)
        await log_message_event(
            user_id=user_id,
            text=request.text,
            direction="inbound",
            detected_action=detected_action,
        )
        await log_message_event(
            user_id=user_id,
            text=assistance_text[:500],
            direction="outbound",
            detected_action=detected_action,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
    except Exception as exc:
        logger.debug(f"Live-Assist Logging fehlgeschlagen (non-critical): {exc}")

    return {
        "success": True,
        "assistance": assistance_text,
        "lead_context": lead_context or None,
    }


@router.post("/generate", response_model=CopilotResponse)
async def generate_copilot_response(
    request: CopilotRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> CopilotResponse:
    """
    Generiert FELLO Copilot Antworten mit 3 Optionen (Soft, Direkt, Frage).
    
    - Nutzt Anthropic/OpenAI wenn Key vorhanden
    - Fällt auf intelligente Mock-Antworten zurück
    - AUTOPILOT: Loggt alle Nachrichten als Message Events
    """
    
    # User-ID aus Header oder DEV fallback
    user_id = x_user_id or DEV_USER_ID
    
    # Action Detection für Autopilot
    detected_action = detect_action_from_text(request.message)
    
    # AUTOPILOT: Inbound Message Event loggen (silent)
    await log_message_event(
        user_id=user_id,
        text=request.message,
        direction="inbound",
        detected_action=detected_action,
    )
    
    try:
        # NBA berechnen (silent, non-blocking)
        nba = await get_nba_for_lead(
            user_id=user_id,
            lead_id=request.lead_id,
            contact_id=request.contact_id,
        )
        
        # Kontext zusammenführen
        context = {
            **(request.context or {}),
            **(request.lead_context or {}),
            "history": request.conversation_history,
            "vertical": request.vertical,
        }
        
        # Response generieren
        response_data = await generate_ai_response(request.message, context)
        
        # AUTOPILOT: Outbound Message Event loggen (silent) mit A/B Tracking
        await log_message_event(
            user_id=user_id,
            text=response_data["response"][:500],  # Max 500 chars für Outbound
            direction="outbound",
            detected_action=detected_action,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
        
        return CopilotResponse(
            response=response_data["response"],
            analysis=CopilotAnalysis(**response_data["analysis"]),
            options=[CopilotOption(**opt) for opt in response_data["options"]],
            next_best_action=nba,
        )
        
    except Exception as e:
        logger.error(f"Copilot Generate Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Antwort-Generierung: {str(e)}"
        )


@router.post("/generate-anonymous")
async def generate_anonymous(
    request: dict,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """Generiert Nachricht ohne Auth - für Mobile App. Loggt trotzdem Message Events."""
    
    # User-ID aus Header oder DEV fallback
    user_id = x_user_id or DEV_USER_ID
    
    try:
        message = request.get("lead_message", request.get("message", ""))
        context = request.get("context", "")
        
        # Action Detection
        detected_action = detect_action_from_text(message) if message else None
        
        # AUTOPILOT: Inbound Message Event loggen (silent)
        if message:
            await log_message_event(
                user_id=user_id,
                text=message,
                direction="inbound",
                detected_action=detected_action,
            )
        
        response_data = await generate_ai_response(message, {"context": context})
        
        # AUTOPILOT: Outbound Message Event loggen (silent) mit A/B Tracking
        await log_message_event(
            user_id=user_id,
            text=response_data["response"][:500],
            direction="outbound",
            detected_action=detected_action,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
        
        return {
            "response": response_data["response"],
            "options": response_data["options"]
        }
    except Exception as e:
        logger.error(f"Generate Anonymous Error: {e}")
        return {
            "response": "Hey! Ich wollte mich kurz melden - hast du noch Fragen?",
            "options": [{"id": "default", "content": "Hey! Ich wollte mich kurz melden - hast du noch Fragen? 😊"}]
        }


@router.get("/health")
async def copilot_health():
    """Health-Check für den Copilot-Service."""
    
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
    has_openai = bool(settings.openai_api_key)
    
    return {
        "status": "ok",
        "service": "copilot",
        "ai_providers": {
            "anthropic": has_anthropic,
            "openai": has_openai,
            "mock_fallback": True
        },
        "mode": "ai" if (has_anthropic or has_openai) else "mock"
    }


@router.post("/analyze-screenshot")
async def analyze_screenshot(request: dict):
    """Analysiert Chat-Screenshot und extrahiert Lead-Daten."""
    import anthropic
    import json
    
    try:
        image_base64 = request.get("image_base64")
        
        if not image_base64:
            raise HTTPException(status_code=400, detail="image_base64 ist erforderlich")
        
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY nicht konfiguriert")
        
        client = anthropic.Anthropic(api_key=anthropic_key)
        model = get_model_for_task("vision_extraction")
        max_tokens = min(get_max_tokens_for_task("vision_extraction"), 1000)
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_base64}},
                    {"type": "text", "text": """Analysiere diesen Chat-Screenshot.

Extrahiere:
1. Name des Kontakts
2. Plattform (Instagram, WhatsApp, Facebook, LinkedIn, TikTok)
3. Letzte Nachricht des Kontakts
4. Status: NEW (neu), CONVERSATION (im Gespräch), INTERESTED (interessiert), SKEPTICAL (skeptisch), GHOSTING (antwortet nicht mehr)
5. Temperatur 0-100 (wie kaufbereit ist der Lead)
6. Tags (z.B. ["Instagram", "Mama", "Fitness"])

Antworte NUR als JSON:
{"name": "...", "platform": "...", "lastMessage": "...", "status": "...", "temperature": 50, "tags": [...]}"""}
                ]
            }]
        )
        
        result = json.loads(response.content[0].text)
        return result
        
    except json.JSONDecodeError as e:
        logger.exception(f"Screenshot JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Konnte AI-Antwort nicht parsen")
    except Exception as e:
        logger.exception(f"Screenshot analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]

