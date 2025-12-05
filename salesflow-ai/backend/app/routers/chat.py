"""
Chat-Router für den Sales Flow AI "BRAIN" Assistenten.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai_client import AIClient
from app.config import get_settings
from app.schemas import ChatMessage

router = APIRouter(prefix="/chat", tags=["chat"])
settings = get_settings()
logger = logging.getLogger(__name__)


class ChatCompletionRequest(BaseModel):
    """Request für Chat-Completion."""

    message: str
    history: Optional[List[ChatMessage]] = None


class ChatCompletionResponse(BaseModel):
    """Response mit AI-Antwort."""

    reply: str


# System Prompt für die Sales Flow AI Persönlichkeit
BRAIN_SYSTEM_PROMPT = """Du bist Sales Flow AI, der strategische Vertriebs-Copilot.

Deine Persönlichkeit:
- Antworte kurz, knackig und umsatzorientiert
- Du hilfst bei Einwandbehandlung, Skripten und Strategie
- Du duzt den User (Alex)
- Keine langen Romane, nur Resultate
- Du bist direkt, ehrlich und auf Performance fokussiert
- Du kennst dich mit Vertriebspsychologie aus

Dein Stil:
- Konkrete, sofort umsetzbare Tipps
- Authentisch und auf den Punkt
- Motivierend, aber realistisch
- Sales-Slang ist ok, aber nicht übertrieben

Fokus:
- Lead-Qualifizierung & Scoring
- Follow-up-Strategien
- Einwandbehandlung
- Pipeline-Management
- Abschluss-Techniken
"""


@router.post("", response_model=ChatCompletionResponse)
@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """
    Verarbeitet eine Chat-Nachricht und gibt eine AI-Antwort zurück.
    
    - Nutzt OpenAI API wenn Key vorhanden
    - Fällt auf Mock-Modus zurück wenn kein Key gesetzt ist
    """
    
    # Mock-Modus: Wenn kein OpenAI Key vorhanden ist
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus aktiv")
        mock_reply = generate_mock_response(request.message)
        return ChatCompletionResponse(reply=mock_reply)
    
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
        reply = ai_client.generate(BRAIN_SYSTEM_PROMPT, messages)
        
        return ChatCompletionResponse(reply=reply)
        
    except Exception as exc:
        logger.error(f"Fehler bei Chat-Completion: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"KI-Provider-Fehler: {exc}",
        ) from exc


def generate_mock_response(message: str) -> str:
    """
    Generiert intelligente Mock-Antworten basierend auf Keywords.
    Damit die App auch ohne OpenAI Key funktioniert.
    """
    
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

Sag mir einfach, wo du gerade steckst!"""
    
    # Default
    return "Verstehe! 🤔 Gib mir mehr Details, dann kann ich dir konkret helfen. Worum geht's genau?"


__all__ = ["router"]

