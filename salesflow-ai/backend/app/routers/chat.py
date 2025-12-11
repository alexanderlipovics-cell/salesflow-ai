"""
Chat-Router für den Sales Flow AI Coach.

WICHTIG: 
- System-Prompt kommt aus dem zentralen Prompt-Hub (app.core.ai_prompts)
- Automatische Intent-Erkennung: detect_action_from_text analysiert User-Nachrichten
- Action kann auch explizit übergeben werden (überschreibt Auto-Detection)
- AUTOPILOT: Jede Nachricht wird als Message Event geloggt
- NBA: Next Best Action wird bei vorhandenem Lead-Kontext mitgeliefert
"""

from __future__ import annotations

import logging
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field

from app.ai_client import AIClient
from app.config import get_settings
from app.schemas import ChatMessage
from app.core.ai_prompts import (
    SALES_COACH_PROMPT,
    build_coach_prompt_with_action,
    detect_action_from_text,
)
from app.core.vertical_prompts import build_vertical_prompt_addition
from app.core.user_adaptive_prompts import (
    get_adaptive_chat_prompt,
    load_user_learning_context,
    build_user_adaptive_prompt,
)
from app.supabase_client import get_supabase_client
from app.services.chat_intents import ChatIntentHandler, CHAT_INTENTS
from ..db.session import get_db  # added for dependency availability
from ..core.security import get_current_user_dict
from ..services.ai_service import AiService
from ..services.conversation_service import ConversationMemoryService
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
    dependencies=[Depends(get_current_user_dict)]
)
settings = get_settings()
logger = logging.getLogger(__name__)

# DEV User ID für Tests wenn kein Header gesetzt
DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001"


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
        from ..core.deps import get_supabase
        from app.schemas.message_events import MessageEventCreate
        from app.db.repositories.message_events import create_message_event
        
        db = get_supabase()
        
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
            f"Message event logged: direction={direction}, action={detected_action}, "
            f"template={template_version}, persona={persona_variant}"
        )
        
    except Exception as e:
        # NIEMALS Exception werfen - nur loggen
        logger.debug(f"Could not log message event (non-critical): {e}")


class ChatCompletionRequest(BaseModel):
    """Request für Chat-Completion."""

    message: str
    # history UND conversation_history für Kompatibilität
    history: Optional[List[ChatMessage]] = None
    conversation_history: Optional[List[ChatMessage]] = None  # Alias für Mobile-App
    # action UND mode für Kompatibilität
    action: Optional[str] = None
    mode: Optional[str] = None  # Alias für Mobile-App (cold_call, closing, etc.)
    # Optional: Zusätzlicher Kontext (z.B. Lead-Name, Branche)
    context: Optional[str] = None
    # NBA: Lead/Contact ID für Next Best Action
    lead_id: Optional[str] = Field(default=None, description="Lead UUID für NBA-Berechnung")
    contact_id: Optional[str] = Field(default=None, description="Contact UUID für NBA-Berechnung")
    
    @property
    def effective_history(self) -> Optional[List[ChatMessage]]:
        """Gibt history oder conversation_history zurück."""
        return self.history or self.conversation_history
    
    @property
    def effective_action(self) -> Optional[str]:
        """Gibt action oder mode zurück."""
        return self.action or self.mode


class NextBestActionInfo(BaseModel):
    """Next Best Action Empfehlung"""
    action_key: str = Field(description="Action: follow_up, call_script, offer_create, closing_helper, nurture, wait")
    reason: str = Field(description="Begründung auf Deutsch")
    suggested_channel: str = Field(description="Empfohlener Kanal")
    priority: int = Field(ge=1, le=5, description="Priorität 1-5")


class ChatCompletionResponse(BaseModel):
    """Response mit AI-Antwort."""

    reply: str
    # Aliase für verschiedene Frontend-Versionen
    response: Optional[str] = None  # Alias für Mobile-App
    message: Optional[str] = None   # Weiterer Alias
    # Gibt an, welche Action erkannt/verwendet wurde
    detected_action: Optional[str] = None
    # Next Best Action (wenn Lead-Kontext vorhanden)
    next_best_action: Optional[NextBestActionInfo] = Field(
        default=None,
        description="NBA Empfehlung basierend auf P-Score und Events"
    )
    # Intent-Erkennung (Smart Intents)
    intent_detected: Optional[str] = None
    intent_description: Optional[str] = None


# ============================================
# SYSTEM PROMPT - Aus zentralem Prompt-Hub
# ============================================
# HINWEIS: SALES_COACH_PROMPT wird oben aus app.core.ai_prompts importiert
# Der alte BRAIN_SYSTEM_PROMPT wurde in den zentralen Hub verschoben und
# mit FELLO + MENTOR kombiniert zum einheitlichen SALES_COACH_PROMPT.

# Für Abwärtskompatibilität: Alias auf den zentralen Prompt
BRAIN_SYSTEM_PROMPT = SALES_COACH_PROMPT


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
        
        db = get_supabase()
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


@router.post("", response_model=ChatCompletionResponse)
@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(
    request: ChatCompletionRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> ChatCompletionResponse:
    """
    Verarbeitet eine Chat-Nachricht und gibt eine AI-Antwort zurück.
    
    Features:
    - Automatische Intent-Erkennung aus der User-Nachricht
    - Explizite Action kann übergeben werden (überschreibt Auto-Detection)
    - Nutzt OpenAI API wenn Key vorhanden
    - Fällt auf Mock-Modus zurück wenn kein Key gesetzt ist
    - AUTOPILOT: Loggt alle Nachrichten als Message Events
    
    Erkannte Actions:
    - offer_create: Angebot erstellen
    - research_person: Recherche/Dossier
    - call_script: Gesprächsleitfaden
    - closing_helper: Abschluss-Hilfe
    - follow_up: Follow-up-Nachricht
    - daily_plan: Tagesplan
    - summary_coaching: Zusammenfassung & Feedback
    - objection_handler: Einwandbehandlung
    - analyze_lead: Lead-Analyse
    - generate_message: Nachricht generieren
    """
    
    # User-ID aus Header oder DEV fallback
    user_id = x_user_id or DEV_USER_ID
    context_payload = {"lead_id": request.lead_id, "contact_id": request.contact_id}
    message_lower = request.message.lower()
    
    # 1. Action bestimmen (explizit oder auto-detected)
    detected_action: Optional[str] = None
    intent_detected: Optional[str] = None
    intent_description: Optional[str] = None
    
    # Nutze effective_action für Kompatibilität mit action UND mode
    effective_action = request.effective_action
    if effective_action:
        # Explizite Action übergeben
        detected_action = effective_action
        logger.info(f"Explizite Action/Mode verwendet: {detected_action}")
    else:
        # Auto-Detection aus User-Nachricht
        detected_action = detect_action_from_text(request.message)
        if detected_action:
            logger.info(f"Action automatisch erkannt: {detected_action}")
    
    # AUTOPILOT: Inbound Message Event loggen (silent)
    await log_message_event(
        user_id=user_id,
        text=request.message,
        direction="inbound",
        detected_action=detected_action,
    )

    # 1.5 Smart Intents (Intent-Handler)
    intent_reply: Optional[str] = None
    try:
        from app.supabase_client import get_supabase_client

        db = get_supabase()
        intent_handler = ChatIntentHandler(db=db, user_id=str(user_id))

        for intent_name, intent_config in CHAT_INTENTS.items():
            if any(trigger in message_lower for trigger in intent_config["triggers"]):
                handler_method = getattr(intent_handler, intent_config["handler"], None)
                if handler_method:
                    intent_reply = await handler_method(request.message, context_payload)
                    intent_detected = intent_name
                    intent_description = intent_config.get("description")
                break
    except Exception as e:
        logger.debug(f"Intent-Erkennung übersprungen: {e}")

    # Kurzschluss, wenn Intent bedient wurde
    if intent_reply:
        # NBA optional laden, damit Frontend weiterhin Tipps erhält
        nba = await get_nba_for_lead(
            user_id=user_id,
            lead_id=request.lead_id,
            contact_id=request.contact_id,
        )
        # Outbound loggen
        await log_message_event(
            user_id=user_id,
            text=intent_reply,
            direction="outbound",
            detected_action=intent_detected,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
        return ChatCompletionResponse(
            reply=intent_reply,
            response=intent_reply,
            message=intent_reply,
            detected_action=intent_detected,
            next_best_action=nba,
            intent_detected=intent_detected,
            intent_description=intent_description,
        )
    
    # Event-Backbone: Message Event publishen (non-blocking)
    try:
        from app.events.helpers import publish_message_sent_event
        from app.db.deps import get_async_db
        import uuid
        
        # Versuche tenant_id zu extrahieren (aus User oder Context)
        tenant_id = uuid.uuid4()  # Placeholder - sollte aus User kommen
        lead_id = uuid.UUID(request.lead_id) if request.lead_id else None
        
        # Event publishen (silent on error)
        # await publish_message_sent_event(
        #     db=await get_async_db(),
        #     tenant_id=tenant_id,
        #     lead_id=lead_id,
        #     channel="internal",
        #     message_type="text",
        #     latency_ms=0,
        #     success=True,
        # )
    except Exception as e:
        logger.debug(f"Could not publish message event (non-critical): {e}")
    
    # 2. System-Prompt basierend auf Action bauen
    if detected_action:
        base_prompt = build_coach_prompt_with_action(detected_action)
    else:
        base_prompt = SALES_COACH_PROMPT
    
    # 2.5. Vertical Context injizieren
    try:
        from app.services.vertical_service import get_user_vertical_id, get_vertical_config
        vertical_id = get_user_vertical_id(user_id)
        vertical_config = get_vertical_config(vertical_id)
        
        # Erweitere System-Prompt mit Vertical Context
        vertical_prompt_addition = build_vertical_prompt_addition(vertical_config)
        base_prompt = base_prompt + "\n\n" + vertical_prompt_addition
    except Exception as e:
        logger.debug(f"Could not load vertical context (non-critical): {e}")
        # Weiter mit base_prompt ohne Vertical Context
    
    user_context = None
    user_display_name: Optional[str] = None

    # 3. User-Adaptive Prompt: Personalisiere basierend auf User-Learning-Profile
    try:
        from app.supabase_client import get_supabase_client
        db_client = get_supabase_client()
        user_context = await load_user_learning_context(user_id, db_client)
        user_display_name = getattr(user_context, "user_name", None)
        
        # Lead-Kontext für Personalisierung
        lead_context = None
        if request.lead_id:
            try:
                lead_result = db_client.table("leads").select("*").eq("id", request.lead_id).maybe_single().execute()
                if lead_result.data:
                    lead_context = {
                        "name": lead_result.data.get("name"),
                        "status": lead_result.data.get("status"),
                        "score": lead_result.data.get("score"),
                        "last_contact": str(lead_result.data.get("last_contact")) if lead_result.data.get("last_contact") else None,
                        "notes": lead_result.data.get("notes"),
                    }
            except Exception as e:
                logger.debug(f"Could not load lead context: {e}")
        
        # Personalisierten Prompt bauen
        system_prompt = build_user_adaptive_prompt(
            base_prompt=base_prompt,
            user_context=user_context,
            lead_context=lead_context,
        )
    except Exception as e:
        # Fallback: Standard-Prompt wenn Personalisierung fehlschlägt
        logger.warning(f"Could not personalize prompt, using base: {e}")
        system_prompt = base_prompt
    
    # Optional: Zusätzlicher Kontext hinzufügen
    if request.context:
        system_prompt += f"\n\n═══════════════════════════════════════\nZUSÄTZLICHER KONTEXT:\n{request.context}"
    
    # NBA berechnen (silent, non-blocking)
    nba = await get_nba_for_lead(
        user_id=user_id,
        lead_id=request.lead_id,
        contact_id=request.contact_id,
    )
    
    # Mock-Modus: Wenn kein OpenAI Key vorhanden ist
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus aktiv")
        mock_reply = generate_mock_response(request.message, detected_action)
        
        # AUTOPILOT: Outbound Message Event loggen (silent) mit A/B Tracking
        await log_message_event(
            user_id=user_id,
            text=mock_reply,
            direction="outbound",
            detected_action=detected_action,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
        
        return ChatCompletionResponse(
            reply=mock_reply,
            response=mock_reply,  # Alias für Mobile-App
            message=mock_reply,   # Weiterer Alias
            detected_action=detected_action,
            next_best_action=nba,
            intent_detected=intent_detected,
            intent_description=intent_description,
        )
    
    # Normaler Modus: OpenAI API nutzen
    try:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        # History vorbereiten (nutze effective_history für Kompatibilität)
        history = request.effective_history or []
        
        # Aktuelle Nachricht hinzufügen
        messages = history + [
            ChatMessage(role="user", content=request.message)
        ]
        
        # AI-Antwort generieren
        reply = ai_client.generate(system_prompt, messages)

        # Placeholder [Nutzer] durch echten Namen ersetzen, falls bekannt
        if not user_display_name:
            try:
                db = get_supabase_client()
                profile = (
                    db.table("user_profiles")
                    .select("full_name,name,first_name,last_name")
                    .eq("user_id", user_id)
                    .maybe_single()
                    .execute()
                )
                if profile and profile.data:
                    user_display_name = (
                        profile.data.get("full_name")
                        or profile.data.get("name")
                        or profile.data.get("first_name")
                        or None
                    )
            except Exception as e:
                logger.debug(f"Could not load user name for placeholder: {e}")

        if user_display_name:
            reply = reply.replace("[Nutzer]", user_display_name)
        
        # AUTOPILOT: Outbound Message Event loggen (silent) mit A/B Tracking
        await log_message_event(
            user_id=user_id,
            text=reply,
            direction="outbound",
            detected_action=detected_action,
            template_version=CURRENT_TEMPLATE_VERSION,
            persona_variant=CURRENT_PERSONA_VARIANT,
        )
        
        # USER LEARNING: Track AI Response für automatisches Learning (non-blocking)
        try:
            from app.services.user_learning_service import UserLearningService
            from app.supabase_client import get_supabase_client
            
            db = get_supabase()
            learning_service = UserLearningService(db)
            
            # Track Response (wird später für Learning verwendet)
            # TODO: Speichere in user_interactions oder ähnlicher Tabelle
            logger.debug(f"AI Response tracked for user {user_id} (learning)")
        except Exception as e:
            logger.debug(f"Could not track response for learning: {e}")
        
        return ChatCompletionResponse(
            reply=reply,
            response=reply,  # Alias für Mobile-App
            message=reply,   # Weiterer Alias
            detected_action=detected_action,
            next_best_action=nba,
            intent_detected=intent_detected,
            intent_description=intent_description,
        )
        
    except Exception as exc:
        logger.error(f"Fehler bei Chat-Completion: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"KI-Provider-Fehler: {exc}",
        ) from exc


def generate_mock_response(message: str, action: Optional[str] = None) -> str:
    """
    Generiert intelligente Mock-Antworten basierend auf Action und Keywords.
    Damit die App auch ohne OpenAI Key funktioniert.
    """
    
    # Action-spezifische Mock-Antworten
    if action:
        action_responses = {
            "offer_create": (
                "📋 **Angebots-Entwurf**\n\n"
                "**Langversion:**\n"
                "Ich erstelle dir gerne ein strukturiertes Angebot. Dafür brauche ich:\n"
                "1. Wer ist der Kunde? (Name, Branche)\n"
                "2. Was ist das Problem/Bedarf?\n"
                "3. Welche Lösung/Produkt bietest du an?\n\n"
                "**Kurze DM-Version:**\n"
                "'Hey [Name], ich hab mir Gedanken gemacht, wie du [Problem] lösen kannst. Kurz: [Lösung] für [Preis]. Interesse an Details?'"
            ),
            "research_person": (
                "🔍 **Recherche-Dossier**\n\n"
                "Gib mir mehr Infos zur Person/Firma:\n"
                "- Name?\n"
                "- Branche?\n"
                "- Bekannte Infos?\n\n"
                "Ich erstelle dir dann: Kurzprofil + Talking Points + Ansprache-Strategie."
            ),
            "call_script": (
                "📞 **Gesprächsleitfaden**\n\n"
                "**1. Eröffnung (30 Sek)**\n"
                "'Hey [Name], danke fürs Gespräch! Ich halte es kurz...'\n\n"
                "**2. Discovery (2-3 Min)**\n"
                "- Was ist aktuell deine größte Herausforderung bei [Thema]?\n"
                "- Wie gehst du das momentan an?\n\n"
                "**3. Argumentation**\n"
                "'Genau da kann ich helfen...'\n\n"
                "**4. Abschluss**\n"
                "'Wollen wir das einfach mal ausprobieren?'"
            ),
            "closing_helper": (
                "🎯 **Closing-Strategien**\n\n"
                "Wenn der Kunde schwankt, nutze:\n\n"
                "**Assumptive Close:**\n"
                "'Wann wollen wir starten - diese oder nächste Woche?'\n\n"
                "**Alternative Close:**\n"
                "'Passt dir das Starter- oder Pro-Paket besser?'\n\n"
                "**Zusammenfassung:**\n"
                "'Also, du willst X erreichen, Y ist dein Problem, und meine Lösung ist Z. Was fehlt dir noch?'"
            ),
            "follow_up": (
                "📨 **Follow-up Nachricht**\n\n"
                "Hey [Name]! 👋\n\n"
                "Wollte kurz nachhaken – hattest du Zeit, über unser Gespräch nachzudenken?\n\n"
                "Falls du Fragen hast oder nochmal reden willst, sag Bescheid. Bin flexibel diese Woche.\n\n"
                "LG"
            ),
            "daily_plan": (
                "📅 **Dein Tagesplan**\n\n"
                "**Prio 1: Follow-ups (30 Min)**\n"
                "- Wer hat sich länger nicht gemeldet?\n"
                "- 3-5 kurze Nachrichten rausschicken\n\n"
                "**Prio 2: Warme Kontakte (1h)**\n"
                "- Leads mit Kaufsignalen bearbeiten\n\n"
                "**Prio 3: Cold Outreach (45 Min)**\n"
                "- 10-15 neue Kontakte ansprechen\n\n"
                "**Prio 4: Admin (30 Min)**\n"
                "- CRM updaten, Notizen machen"
            ),
            "summary_coaching": (
                "📊 **Zusammenfassung & Feedback**\n\n"
                "Teile mir das Gespräch/die Notizen mit, dann analysiere ich:\n"
                "1. Was wurde besprochen?\n"
                "2. Was lief gut?\n"
                "3. Was kann besser werden?\n"
                "4. Konkreter Tipp fürs nächste Mal"
            ),
            "objection_handler": (
                "💪 **Einwand-Handling**\n\n"
                "Welcher Einwand kam? Ich gebe dir 3 Varianten:\n\n"
                "**SOFT:** Empathisch, beziehungsorientiert\n"
                "**DIREKT:** Klar, handlungsorientiert\n"
                "**FRAGE:** Gegenfrage, um mehr zu erfahren\n\n"
                "Sag mir den genauen Einwand!"
            ),
        }
        
        if action in action_responses:
            return action_responses[action]
    
    # Fallback: Keyword-basierte Antworten
    message_lower = message.lower()
    
    # Begrüßungen
    if any(word in message_lower for word in ["hallo", "hey", "hi", "moin"]):
        return "Hey! 👋 Ich bin dein Sales Flow Copilot. Was können wir heute in deiner Pipeline bewegen?"
    
    # Lead-Analyse
    if any(word in message_lower for word in ["lead", "kontakt", "prospect"]):
        return "Zeig mir den Lead! Ich analysiere Status, Deal-Value und schlage dir die beste Follow-up-Strategie vor. Hast du schon einen ersten Kontakt gehabt?"
    
    # Follow-up
    if any(word in message_lower for word in ["follow", "nachfass", "sequence"]):
        return "Follow-ups sind der Game-Changer! 🎯 Die meisten Deals passieren zwischen Tag 3-7. Ich empfehle: Tag 1 (Wert), Tag 3 (Social Proof), Tag 7 (Dringlichkeit). Welche Stage ist dein Lead?"
    
    # Einwandbehandlung
    if any(word in message_lower for word in ["einwand", "zu teuer", "preis", "budget"]):
        return "Classic Preis-Einwand! 💰 Hier der Move: 'Verstehe ich. Lass uns kurz schauen, was es dich kostet, NICHTS zu machen.' Dann ROI rechnen. Funktioniert bei 80% der Cases."
    
    # Strategie
    if any(word in message_lower for word in ["strateg", "plan", "vorgehen"]):
        return "Strategie = Clarity + Speed. 🚀 Mein Framework: 1) Lead qualifizieren (Budget? Authority? Need?), 2) Value zeigen, 3) Next Step committen. Wo hängst du gerade?"
    
    # Script / Nachricht
    if any(word in message_lower for word in ["script", "nachricht", "text", "schreib"]):
        return "Gerne! Gib mir mehr Context: Kanal (WhatsApp/Email/DM), Stadium (First Contact/Follow-up), und was du erreichen willst. Ich schreib dir was Knackiges."
    
    # Abschluss
    if any(word in message_lower for word in ["abschluss", "close", "deal", "verkauf"]):
        return "Closing-Time! 💪 Der beste Closer ist Klarheit. Frag direkt: 'Wollen wir das machen?' Falls Zögern kommt: 'Was fehlt dir noch für eine Entscheidung?' Dann objection crushen."
    
    # Hunter / Akquise
    if any(word in message_lower for word in ["hunter", "akquise", "kaltakqu", "outreach"]):
        return "Hunter-Modus! 🎯 Cold Outreach braucht 3 Dinge: 1) Personalisierung (no copy-paste), 2) Wert vorweg, 3) Leichte CTA. Speed + Volume = Results. Wie viele Leads hast du im Target?"
    
    # Phoenix / Reaktivierung
    if any(word in message_lower for word in ["phoenix", "reaktiv", "alte", "ghost"]):
        return "Phoenix-Engine! 🔥 Ghosted Leads sind Gold. Ansatz: 'Hey [Name], hatte neulich an dich gedacht wegen [konkreter Wert]. Passt das aktuell wieder?' Kein Sales-Talk, nur Wert. 30% kommen zurück!"
    
    # Hilfe / Was kannst du
    if any(word in message_lower for word in ["hilfe", "was kannst", "help", "können"]):
        return """Ich kann dir helfen bei:
        
🎯 Lead-Analyse & Scoring
📨 Follow-up-Sequenzen
💬 Einwandbehandlung
🚀 Abschluss-Strategien
📝 Skripte & Nachrichten schreiben
🔥 Reaktivierungs-Kampagnen
📋 Angebote erstellen
📞 Gesprächsleitfäden
📅 Tagesplanung

Sag mir einfach, wo du gerade steckst!"""
    
    # Default
    return "Verstehe! 🤔 Gib mir mehr Details, dann kann ich dir konkret helfen. Worum geht's genau?"


# ============================================
# NEW STREAMING CHAT ENDPOINT (Tag 2)
# ============================================

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    lead_id: Optional[str] = None

@router.post("/stream")
async def stream_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """
    Streaming-Endpoint:
    - Holt Memory-Kontext
    - streamt AI-Response
    - speichert Interaction im Memory
    """
    memory_service = ConversationMemoryService(db=db)
    ai_service = AiService(budget_constraint=True)

    # Memory als context messages
    context_messages = await memory_service.get_context_as_messages(
        user_id=current_user["user_id"],
        lead_id=payload.lead_id,
        query=payload.message,
        top_k=5,
    )

    async def event_generator():
        async for chunk in ai_service.stream_chat(
            user_message=payload.message,
            conversation_history=context_messages,
        ):
            # SSE oder plain text – hier very simple:
            yield chunk

    # User-Interaction speichern (Fire-and-forget)
    interaction_user = {
        "role": "user",
        "content": payload.message,
        "type": "input",
        "channel": "in_app",
        "conversation_id": payload.conversation_id,
    }
    interaction_assistant = {
        "role": "assistant",
        "content": "[STREAMED_RESPONSE]",  # kannst du später ersetzen, wenn du alles gesammelt hast
        "type": "ai_response",
        "channel": "in_app",
        "conversation_id": payload.conversation_id,
    }

    # hier nicht awaited, wenn du BackgroundTasks nutzen willst; für MVP kannst du sie normal awaiten
    await memory_service.store_interaction(
        user_id=current_user["user_id"],
        lead_id=payload.lead_id,
        interaction=interaction_user,
        conversation_id=payload.conversation_id,
    )
    await memory_service.store_interaction(
        user_id=current_user["user_id"],
        lead_id=payload.lead_id,
        interaction=interaction_assistant,
        conversation_id=payload.conversation_id,
    )

    return StreamingResponse(event_generator(), media_type="text/plain")

# Missing imports
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.session import get_db

__all__ = ["router"]
