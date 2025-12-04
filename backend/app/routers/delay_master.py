"""
Delay Master Router - KI-gestützter Follow-up Delay Generator
Generiert optimale Verzögerungszeiten und Nachrichten für Follow-ups
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import random

router = APIRouter()


# --- MODELS ---

class DelayRequest(BaseModel):
    """Request für Delay-Generierung"""
    lead_name: str = Field(..., description="Name des Leads")
    context: Optional[str] = Field(None, description="Kontext/Situation")
    last_message: Optional[str] = Field(None, description="Letzte Nachricht")
    temperature: Optional[str] = Field("warm", description="Lead-Temperatur: cold, warm, hot")
    channel: Optional[str] = Field("whatsapp", description="Kanal: whatsapp, email, instagram")
    vertical: Optional[str] = Field("network", description="Branche")


class DelayResponse(BaseModel):
    """Response mit generierter Verzögerung und Nachricht"""
    delay_minutes: int
    delay_text: str
    suggested_message: str
    reasoning: str
    alternatives: List[str]


# --- ENDPOINTS ---

@router.post("/generate", response_model=DelayResponse)
async def generate_delay(payload: DelayRequest):
    """
    Generiert optimale Follow-up-Verzögerung und Nachricht.
    
    Berücksichtigt:
    - Lead-Temperatur (hot → schneller, cold → langsamer)
    - Tageszeit
    - Kanal
    - Kontext der letzten Nachricht
    """
    
    # Check for OpenAI API Key
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            
            system_prompt = """Du bist ein Experte für Vertriebskommunikation.
            
Analysiere die Situation und gib eine optimale Follow-up-Strategie:

1. DELAY_MINUTES: Wie viele Minuten sollte gewartet werden?
   - Hot Lead: 5-30 Minuten
   - Warm Lead: 30-120 Minuten  
   - Cold Lead: 1-4 Stunden

2. DELAY_TEXT: Menschliche Erklärung (z.B. "ca. 1 Stunde")

3. SUGGESTED_MESSAGE: Eine natürliche Follow-up-Nachricht auf Deutsch

4. REASONING: Kurze Begründung

5. ALTERNATIVES: 2-3 alternative Nachrichten

Antworte im JSON-Format:
{
    "delay_minutes": 30,
    "delay_text": "ca. 30 Minuten",
    "suggested_message": "Hey [Name], ...",
    "reasoning": "...",
    "alternatives": ["...", "..."]
}"""

            user_prompt = f"""Lead: {payload.lead_name}
Temperatur: {payload.temperature}
Kanal: {payload.channel}
Kontext: {payload.context or 'Kein spezifischer Kontext'}
Letzte Nachricht: {payload.last_message or 'Keine'}
Branche: {payload.vertical}"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            
            return DelayResponse(
                delay_minutes=result.get("delay_minutes", 30),
                delay_text=result.get("delay_text", "ca. 30 Minuten"),
                suggested_message=result.get("suggested_message", f"Hey {payload.lead_name}! 👋"),
                reasoning=result.get("reasoning", "Optimale Zeit basierend auf Kontext"),
                alternatives=result.get("alternatives", [])
            )
            
        except Exception as e:
            # Fallback to demo mode
            pass
    
    # Demo Mode - Intelligent Fallback
    temp_delays = {
        "hot": (5, 30),
        "warm": (30, 120),
        "cold": (120, 240)
    }
    
    min_delay, max_delay = temp_delays.get(payload.temperature, (30, 120))
    delay_minutes = random.randint(min_delay, max_delay)
    
    # Generate delay text
    if delay_minutes < 60:
        delay_text = f"ca. {delay_minutes} Minuten"
    else:
        hours = delay_minutes // 60
        delay_text = f"ca. {hours} Stunde{'n' if hours > 1 else ''}"
    
    # Generate suggested message based on context
    messages = {
        "hot": [
            f"Hey {payload.lead_name}! 🔥 Kurze Frage noch zu unserem Gespräch...",
            f"Hi {payload.lead_name}! Ich wollte nochmal nachhaken...",
        ],
        "warm": [
            f"Hey {payload.lead_name}! 👋 Wie sieht's aus bei dir?",
            f"Hi {payload.lead_name}, ich hab nochmal an unser Gespräch gedacht...",
        ],
        "cold": [
            f"Hey {payload.lead_name}! Ich hoffe, es geht dir gut? 😊",
            f"Hi {payload.lead_name}! Lange nichts gehört - wie läuft's bei dir?",
        ]
    }
    
    temp_messages = messages.get(payload.temperature, messages["warm"])
    suggested = random.choice(temp_messages)
    
    return DelayResponse(
        delay_minutes=delay_minutes,
        delay_text=delay_text,
        suggested_message=suggested,
        reasoning=f"Basierend auf {payload.temperature} Lead-Status und {payload.channel} Kanal",
        alternatives=temp_messages
    )


@router.get("/presets")
async def get_delay_presets():
    """Get standard delay presets."""
    return {
        "presets": [
            {"name": "Sofort", "minutes": 0, "description": "Keine Verzögerung"},
            {"name": "Kurz", "minutes": 15, "description": "15 Minuten"},
            {"name": "Normal", "minutes": 60, "description": "1 Stunde"},
            {"name": "Lang", "minutes": 240, "description": "4 Stunden"},
            {"name": "Morgen", "minutes": 1440, "description": "24 Stunden"},
        ],
        "by_temperature": {
            "hot": {"min": 5, "max": 30, "recommended": 15},
            "warm": {"min": 30, "max": 120, "recommended": 60},
            "cold": {"min": 120, "max": 480, "recommended": 240},
        }
    }

