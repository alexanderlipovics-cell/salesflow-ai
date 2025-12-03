"""
Chat Router - KI-Assistent Endpoints
Kommuniziert mit OpenAI API oder gibt Mock-Antworten zurück
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from openai import OpenAI

router = APIRouter()

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class Message(BaseModel):
    """Chat Message Model"""
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")

class ChatCompletionRequest(BaseModel):
    """Request für Chat Completion"""
    messages: List[Message] = Field(..., description="Conversation history")
    model: Optional[str] = Field(default="gpt-4", description="OpenAI Model")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=500, gt=0)

class ChatCompletionResponse(BaseModel):
    """Response von Chat Completion"""
    response: str = Field(..., description="AI response")
    mode: str = Field(..., description="'openai' oder 'demo'")
    model: Optional[str] = None

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def get_demo_response(messages: List[Message]) -> str:
    """
    Gibt intelligente Demo-Antworten basierend auf User-Input zurück
    (wenn kein OpenAI API Key vorhanden ist)
    """
    if not messages:
        return "Hallo! Ich bin Sales Flow AI im Demo-Modus. Wie kann ich dir helfen?"
    
    last_message = messages[-1].content.lower()
    
    # Keyword-basierte Demo-Antworten
    if "einwand" in last_message or "objection" in last_message:
        return (
            "🧠 **Einwand-Handling**\n\n"
            "Ich kann dir helfen, Einwände professionell zu meistern! "
            "Nutze das **Objection Brain** Feature in der Sidebar.\n\n"
            "Typische Einwände:\n"
            "- 💰 Preis: 'Das ist mir zu teuer'\n"
            "- ⏰ Timing: 'Jetzt ist nicht der richtige Zeitpunkt'\n"
            "- 🎯 Bedarf: 'Wir brauchen das nicht'\n\n"
            "Für jeden Einwand gibt es bewährte Antworten!"
        )
    
    elif "follow" in last_message or "nachfassen" in last_message:
        return (
            "📬 **Follow-up Strategie**\n\n"
            "Follow-ups sind der Schlüssel zum Erfolg!\n\n"
            "Best Practices:\n"
            "1. **Timing**: Halte dich an die Sequenz (Day 1, 3, 7, 14)\n"
            "2. **Personalisierung**: Nutze branchenspezifische Templates\n"
            "3. **Mehrwert**: Jede Nachricht muss einen Nutzen bieten\n"
            "4. **Kanal-Mix**: WhatsApp → Instagram → Email\n\n"
            "Schau ins Follow-ups Board für deine offenen Tasks!"
        )
    
    elif "hunter" in last_message or "kaltakquise" in last_message:
        return (
            "🎯 **Hunter Mode Tipps**\n\n"
            "Kaltakquise meistern:\n\n"
            "1. **Stapel-Logik**: Ein Lead = volle Konzentration\n"
            "2. **Schneller Kontakt**: 5 Minuten Regel nach Lead-Eingang\n"
            "3. **WhatsApp First**: 90% Öffnungsrate\n"
            "4. **Skript nutzen**: 'Hi [Name], kurze Frage: Hast du 2 Minuten?'\n\n"
            "💡 Tipp: Die ersten 10 Sekunden entscheiden!"
        )
    
    elif "deal" in last_message or "close" in last_message or "abschluss" in last_message:
        return (
            "🏆 **Closing Strategien**\n\n"
            "So bringst du Deals über die Linie:\n\n"
            "1. **Trial Close**: 'Wenn ich das richtig verstehe, dann...'\n"
            "2. **Assumptive Close**: 'Wann können wir starten?'\n"
            "3. **Alternative Close**: 'Montag oder Mittwoch?'\n"
            "4. **Urgency**: 'Diese Woche noch Sonderkonditionen'\n\n"
            "⚠️ Wichtig: Frag nach der Entscheidung, nicht nach Interesse!"
        )
    
    elif any(word in last_message for word in ["hallo", "hi", "hey", "guten"]):
        return (
            "👋 Hallo! Ich bin Sales Flow AI im **Demo-Modus**.\n\n"
            "Das Backend läuft erfolgreich, aber ich habe keinen OpenAI API-Key.\n\n"
            "**Was ich kann:**\n"
            "✅ Einwand-Handling Tipps\n"
            "✅ Follow-up Strategien\n"
            "✅ Closing-Techniken\n"
            "✅ Hunter Mode Guidance\n\n"
            "Frag mich einfach etwas über Sales! 🚀"
        )
    
    else:
        return (
            "💬 Ich bin im Demo-Modus (kein OpenAI API-Key).\n\n"
            "**Themen, über die ich sprechen kann:**\n"
            "- Einwände meistern\n"
            "- Follow-up Strategien\n"
            "- Hunter Mode & Kaltakquise\n"
            "- Closing Techniken\n\n"
            "Oder füge einen OpenAI API-Key in `.env` hinzu für volle KI-Power! 🔥"
        )

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(request: ChatCompletionRequest):
    """
    Chat Completion Endpoint
    
    - Wenn OPENAI_API_KEY vorhanden: OpenAI API Call
    - Wenn nicht: Intelligente Demo-Antwort
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    # ─────────────────────────────────────────────────────────────
    # DEMO MODE (kein API Key)
    # ─────────────────────────────────────────────────────────────
    
    if not api_key:
        demo_response = get_demo_response(request.messages)
        return ChatCompletionResponse(
            response=demo_response,
            mode="demo",
            model="demo-mode"
        )
    
    # ─────────────────────────────────────────────────────────────
    # PRODUCTION MODE (mit OpenAI API)
    # ─────────────────────────────────────────────────────────────
    
    try:
        client = OpenAI(api_key=api_key)
        
        # System Prompt für Sales Flow AI
        system_message = {
            "role": "system",
            "content": (
                "Du bist Sales Flow AI, ein KI-Assistent für Vertriebsprofis. "
                "Du hilfst bei Einwänden, Follow-ups, Kaltakquise und Closing. "
                "Deine Antworten sind präzise, praxisnah und motivierend. "
                "Du sprichst direkt und auf Augenhöhe. Nutze Emojis sparsam aber wirkungsvoll."
            )
        }
        
        # Messages für OpenAI vorbereiten
        openai_messages = [system_message] + [
            {"role": msg.role, "content": msg.content}
            for msg in request.messages
        ]
        
        # OpenAI API Call
        completion = client.chat.completions.create(
            model=request.model,
            messages=openai_messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        ai_response = completion.choices[0].message.content
        
        return ChatCompletionResponse(
            response=ai_response,
            mode="openai",
            model=request.model
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI API Fehler: {str(e)}"
        )

@router.get("/status")
async def chat_status():
    """Status Check für Chat Service"""
    api_key = os.getenv("OPENAI_API_KEY")
    
    return {
        "service": "chat",
        "status": "operational",
        "mode": "production" if api_key else "demo",
        "has_api_key": bool(api_key),
    }

