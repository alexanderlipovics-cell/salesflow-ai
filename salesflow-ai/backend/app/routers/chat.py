"""
Chat-Router für den Sales Flow AI Coach.

WICHTIG: 
- System-Prompt kommt aus dem zentralen Prompt-Hub (app.core.ai_prompts)
- Automatische Intent-Erkennung: detect_action_from_text analysiert User-Nachrichten
- Action kann auch explizit übergeben werden (überschreibt Auto-Detection)
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai_client import AIClient
from app.config import get_settings
from app.schemas import ChatMessage
from app.core.ai_prompts import (
    SALES_COACH_PROMPT,
    build_coach_prompt_with_action,
    detect_action_from_text,
)

router = APIRouter(prefix="/chat", tags=["chat"])
settings = get_settings()
logger = logging.getLogger(__name__)


class ChatCompletionRequest(BaseModel):
    """Request für Chat-Completion."""

    message: str
    history: Optional[List[ChatMessage]] = None
    # Optional: Explizite Action (überschreibt Auto-Detection)
    action: Optional[str] = None
    # Optional: Zusätzlicher Kontext (z.B. Lead-Name, Branche)
    context: Optional[str] = None


class ChatCompletionResponse(BaseModel):
    """Response mit AI-Antwort."""

    reply: str
    # Gibt an, welche Action erkannt/verwendet wurde
    detected_action: Optional[str] = None


# ============================================
# SYSTEM PROMPT - Aus zentralem Prompt-Hub
# ============================================
# HINWEIS: SALES_COACH_PROMPT wird oben aus app.core.ai_prompts importiert
# Der alte BRAIN_SYSTEM_PROMPT wurde in den zentralen Hub verschoben und
# mit FELLO + MENTOR kombiniert zum einheitlichen SALES_COACH_PROMPT.

# Für Abwärtskompatibilität: Alias auf den zentralen Prompt
BRAIN_SYSTEM_PROMPT = SALES_COACH_PROMPT


@router.post("", response_model=ChatCompletionResponse)
@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """
    Verarbeitet eine Chat-Nachricht und gibt eine AI-Antwort zurück.
    
    Features:
    - Automatische Intent-Erkennung aus der User-Nachricht
    - Explizite Action kann übergeben werden (überschreibt Auto-Detection)
    - Nutzt OpenAI API wenn Key vorhanden
    - Fällt auf Mock-Modus zurück wenn kein Key gesetzt ist
    
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
    
    # 1. Action bestimmen (explizit oder auto-detected)
    detected_action: Optional[str] = None
    
    if request.action:
        # Explizite Action übergeben
        detected_action = request.action
        logger.info(f"Explizite Action verwendet: {detected_action}")
    else:
        # Auto-Detection aus User-Nachricht
        detected_action = detect_action_from_text(request.message)
        if detected_action:
            logger.info(f"Action automatisch erkannt: {detected_action}")
    
    # 2. System-Prompt basierend auf Action bauen
    if detected_action:
        system_prompt = build_coach_prompt_with_action(detected_action)
    else:
        system_prompt = SALES_COACH_PROMPT
    
    # Optional: Kontext hinzufügen
    if request.context:
        system_prompt += f"\n\n═══════════════════════════════════════\nKONTEXT:\n{request.context}"
    
    # Mock-Modus: Wenn kein OpenAI Key vorhanden ist
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus aktiv")
        mock_reply = generate_mock_response(request.message, detected_action)
        return ChatCompletionResponse(
            reply=mock_reply,
            detected_action=detected_action
        )
    
    # Normaler Modus: OpenAI API nutzen
    try:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        # History vorbereiten
        history = request.history or []
        
        # Aktuelle Nachricht hinzufügen
        messages = history + [
            ChatMessage(role="user", content=request.message)
        ]
        
        # AI-Antwort generieren
        reply = ai_client.generate(system_prompt, messages)
        
        return ChatCompletionResponse(
            reply=reply,
            detected_action=detected_action
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


__all__ = ["router"]
