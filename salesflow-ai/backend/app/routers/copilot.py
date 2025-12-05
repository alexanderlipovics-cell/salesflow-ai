"""
Copilot-Router für FELLO - Sales AI Copilot.

Dieser Router liefert intelligente Antwort-Optionen (Soft, Direkt, Frage)
basierend auf der Nutzeranfrage und dem Kontext.
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/copilot", tags=["copilot"])
settings = get_settings()
logger = logging.getLogger(__name__)


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


class CopilotResponse(BaseModel):
    """Response mit Analyse und Optionen."""
    response: str  # Hauptantwort für einfache Clients
    analysis: CopilotAnalysis
    options: List[CopilotOption]


# ============================================
# SYSTEM PROMPT - FELLO PERSONALITY
# ============================================

FELLO_SYSTEM_PROMPT = """Du bist FELLO, der KI-Copilot für Network Marketing & Direktvertrieb.

🎯 DEINE MISSION:
Du hilfst Vertriebspartnern, bessere Gespräche zu führen und mehr Abschlüsse zu erzielen.

💬 DEIN STIL:
- Kurz, knackig, auf den Punkt
- Praxisorientiert - sofort umsetzbare Tipps
- Du duzt den User
- Sales-Psychologie ist dein Werkzeug
- Motivierend, aber realistisch

📊 DEINE EXPERTISE:
- Einwandbehandlung (LIRA-Framework)
- Cold & Warm Outreach
- Follow-Up Strategien
- Closing Techniken
- DISG-Persönlichkeitstypen
- Network Marketing Best Practices

🔥 ANTWORT-FORMAT:
Liefere IMMER 3 Antwort-Optionen:
1. SOFT (empathisch, beziehungsorientiert)
2. DIREKT (klar, handlungsorientiert)  
3. FRAGE (Gegenfrage, um mehr zu erfahren)

Jede Option soll konkret und Copy-Paste-bereit sein.
"""


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
            
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                system=FELLO_SYSTEM_PROMPT,
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
            ai_text = ai_client.generate(FELLO_SYSTEM_PROMPT, messages)
            
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

@router.post("/generate", response_model=CopilotResponse)
async def generate_copilot_response(request: CopilotRequest) -> CopilotResponse:
    """
    Generiert FELLO Copilot Antworten mit 3 Optionen (Soft, Direkt, Frage).
    
    - Nutzt Anthropic/OpenAI wenn Key vorhanden
    - Fällt auf intelligente Mock-Antworten zurück
    """
    
    try:
        # Kontext zusammenführen
        context = {
            **(request.context or {}),
            **(request.lead_context or {}),
            "history": request.conversation_history,
            "vertical": request.vertical,
        }
        
        # Response generieren
        response_data = await generate_ai_response(request.message, context)
        
        return CopilotResponse(
            response=response_data["response"],
            analysis=CopilotAnalysis(**response_data["analysis"]),
            options=[CopilotOption(**opt) for opt in response_data["options"]]
        )
        
    except Exception as e:
        logger.error(f"Copilot Generate Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei der Antwort-Generierung: {str(e)}"
        )


@router.post("/generate-anonymous")
async def generate_anonymous(request: dict):
    """Generiert Nachricht ohne Auth - für Mobile App."""
    try:
        message = request.get("lead_message", request.get("message", ""))
        context = request.get("context", "")
        
        response_data = await generate_ai_response(message, {"context": context})
        
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
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
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

