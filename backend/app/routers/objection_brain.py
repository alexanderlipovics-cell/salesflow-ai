"""
Objection Brain Router - KI-gestützter Einwand-Coach
Endpoints für Einwand-Analyse und Nutzungs-Logging
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import os
from openai import OpenAI
from supabase import create_client, Client
from app.services.company_knowledge import get_company_knowledge_summary

router = APIRouter()

# ─────────────────────────────────────────────────────────────────
# Supabase Client
# ─────────────────────────────────────────────────────────────────

def get_supabase_client() -> Client:
    """Erstellt Supabase Client aus Umgebungsvariablen"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Supabase Konfiguration fehlt (SUPABASE_URL / SUPABASE_SERVICE_KEY)"
        )
    
    return create_client(url, key)

# ─────────────────────────────────────────────────────────────────
# Models - Generate
# ─────────────────────────────────────────────────────────────────

class ObjectionGenerateRequest(BaseModel):
    """Request für Einwand-Analyse"""
    vertical: Optional[str] = Field(default=None, description="Branche: network, real_estate, finance")
    channel: Optional[str] = Field(default=None, description="Kanal: whatsapp, instagram, phone, email")
    objection: str = Field(..., min_length=3, description="Der Einwand des Kunden")
    context: Optional[str] = Field(default=None, description="Zusätzlicher Kontext")
    language: Optional[str] = Field(default="de", description="Sprache der Antwort")
    persona_key: Optional[str] = Field(default=None, description="Sales Persona: speed, balanced, relationship")
    user_id: Optional[str] = Field(default=None, description="User ID für Company Knowledge (optional)")

class ObjectionVariant(BaseModel):
    """Eine Antwort-Variante"""
    label: str
    message: str
    summary: Optional[str] = None

class ObjectionGenerateResponse(BaseModel):
    """Response mit Antwort-Varianten"""
    primary: ObjectionVariant
    alternatives: list[ObjectionVariant]
    reasoning: Optional[str] = None

# ─────────────────────────────────────────────────────────────────
# Models - Logging
# ─────────────────────────────────────────────────────────────────

class ObjectionLogRequest(BaseModel):
    """Request zum Loggen einer verwendeten Antwort"""
    lead_id: Optional[str] = Field(default=None, description="UUID des Leads (optional)")
    vertical: Optional[str] = Field(default=None, description="Branche")
    channel: Optional[str] = Field(default=None, description="Kanal")
    objection_text: str = Field(..., min_length=1, description="Original-Einwand")
    chosen_variant_label: str = Field(..., min_length=1, description="Label der gewählten Variante")
    chosen_message: str = Field(..., min_length=1, description="Die gewählte Nachricht")
    model_reasoning: Optional[str] = Field(default=None, description="KI-Reasoning")
    outcome: Optional[str] = Field(default=None, description="Ergebnis: pending, positive, neutral, negative")
    source: Optional[str] = Field(default="objection_brain_page", description="Quelle der Nutzung")

class ObjectionLogResponse(BaseModel):
    """Response nach erfolgreichem Logging"""
    id: str = Field(..., description="UUID des erstellten Eintrags")

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def get_demo_objection_response(objection: str, vertical: str | None) -> ObjectionGenerateResponse:
    """Demo-Antworten wenn kein OpenAI API Key vorhanden"""
    
    # Basis-Antworten je nach Einwand-Typ
    if any(word in objection.lower() for word in ["teuer", "preis", "geld", "kosten", "budget"]):
        return ObjectionGenerateResponse(
            primary=ObjectionVariant(
                label="Wert-Perspektive",
                message="Ich verstehe, dass der Preis wichtig ist. Lass mich fragen: Was wäre es dir wert, wenn du [konkreter Nutzen] erreichen könntest? Oft ist nicht der Preis das Problem, sondern ob der Wert klar ist. Was müsste passieren, damit sich das für dich lohnt?",
                summary="Fokussiert auf den Wert statt den Preis"
            ),
            alternatives=[
                ObjectionVariant(
                    label="ROI-Frage",
                    message="Verstehe ich total. Kurze Frage: Wenn du durch [Lösung] pro Monat [X€] mehr machst oder [Y Stunden] sparst - wie würdest du das dann sehen?",
                    summary="Konkretisiert den Return on Investment"
                ),
                ObjectionVariant(
                    label="Aufschub-Kosten",
                    message="Das höre ich öfter. Darf ich fragen: Was kostet es dich, wenn du noch 3 Monate wartest und [Problem] weiterhin hast?",
                    summary="Zeigt die Kosten des Nicht-Handelns auf"
                )
            ],
            reasoning="Bei Preis-Einwänden ist es wichtig, vom Preis zum Wert zu shiften. Der Kunde muss verstehen, was er bekommt - nicht was er zahlt."
        )
    
    elif any(word in objection.lower() for word in ["zeit", "später", "jetzt nicht", "moment"]):
        return ObjectionGenerateResponse(
            primary=ObjectionVariant(
                label="Timing-Shift",
                message="Verstehe ich. Nur kurz: Gibt es einen bestimmten Grund, warum später besser wäre? Oft ist 'nicht der richtige Zeitpunkt' eigentlich 'ich bin mir nicht sicher'. Was müsste passieren, damit es der richtige Zeitpunkt wäre?",
                summary="Hinterfragt das echte Problem hinter dem Timing"
            ),
            alternatives=[
                ObjectionVariant(
                    label="Micro-Commitment",
                    message="Kein Problem! Was hältst du davon: Ich schick dir kurz einen Link, du schaust es dir in Ruhe an, und wir sprechen Ende der Woche nochmal 5 Minuten?",
                    summary="Kleiner nächster Schritt statt großer Entscheidung"
                ),
                ObjectionVariant(
                    label="Realitäts-Check",
                    message="Alles klar. Hand aufs Herz: Wird es in 3 Monaten wirklich weniger stressig sein? Oder ist vielleicht gerade deshalb der beste Zeitpunkt?",
                    summary="Hinterfragt die Annahme direkt"
                )
            ],
            reasoning="'Keine Zeit' ist selten das echte Problem. Oft ist es Unsicherheit oder fehlende Priorität. Die Frage ist: Was ist das echte Hindernis?"
        )
    
    else:
        return ObjectionGenerateResponse(
            primary=ObjectionVariant(
                label="Verständnis-Frage",
                message=f"Danke, dass du das offen sagst. Hilf mir kurz zu verstehen: Was genau meinst du mit '{objection[:50]}...'? Was müsste passieren, damit es für dich Sinn macht?",
                summary="Vertieft das Verständnis des Einwands"
            ),
            alternatives=[
                ObjectionVariant(
                    label="Empathie + Frage",
                    message="Das kann ich nachvollziehen. Viele meiner besten Kunden hatten anfangs ähnliche Bedenken. Was wäre für dich der entscheidende Punkt?",
                    summary="Social Proof + offene Frage"
                ),
                ObjectionVariant(
                    label="Direkte Frage",
                    message="Verstehe. Mal ganz direkt gefragt: Liegt es am Angebot selbst, am Timing, oder ist es was anderes?",
                    summary="Kategorisiert den Einwand"
                )
            ],
            reasoning="Bei unklaren Einwänden ist es wichtig, erst zu verstehen, bevor man antwortet. Die richtige Frage bringt mehr als die falsche Antwort."
        )

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ObjectionGenerateResponse)
async def generate_objection_response(request: ObjectionGenerateRequest):
    """
    Generiert KI-gestützte Antworten auf einen Einwand.
    
    - Wenn OPENAI_API_KEY vorhanden: OpenAI GPT-4 Call
    - Wenn nicht: Intelligente Demo-Antworten
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    # ─────────────────────────────────────────────────────────────
    # DEMO MODE
    # ─────────────────────────────────────────────────────────────
    
    if not api_key:
        return get_demo_objection_response(request.objection, request.vertical)
    
    # ─────────────────────────────────────────────────────────────
    # PRODUCTION MODE (OpenAI)
    # ─────────────────────────────────────────────────────────────
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Company Knowledge laden
        knowledge_summary = await get_company_knowledge_summary(request.user_id)
        knowledge_block = f"""

FIRMENKONTEXT (wichtig, unbedingt berücksichtigen):

{knowledge_summary}

WICHTIG: Du darfst KEINE Aussagen treffen, die im Widerspruch zu diesen Informationen stehen.
Wenn etwas nicht klar ist, formuliere neutral und ohne rechtlich riskante Versprechen.
"""
        
        # System Prompt für Objection Handling
        vertical_context = f"Die Branche ist: {request.vertical}. " if request.vertical else ""
        channel_context = f"Der Kanal ist: {request.channel}. " if request.channel else ""
        extra_context = f"Zusätzlicher Kontext: {request.context}. " if request.context else ""
        
        # Persona-Modus
        persona = request.persona_key or "balanced"
        persona_instructions = ""
        if persona == "speed":
            persona_instructions = """
PERSONA-MODUS: SPEED
- Halte Antworten besonders kurz (1-2 Sätze).
- Fokus auf Klarheit und Tempo.
- Direkt auf den Punkt, keine Umschweife.
"""
        elif persona == "relationship":
            persona_instructions = """
PERSONA-MODUS: RELATIONSHIP
- Etwas mehr Wärme und Kontext, aber trotzdem präzise.
- Beziehungsebene betonen, ohne zu ausschweifend zu sein.
- Empathischer Ton, mehr "Wir gemeinsam" statt "Ich verkaufe dir".
"""
        else:  # balanced
            persona_instructions = """
PERSONA-MODUS: BALANCED
- Mittelweg zwischen Effizienz und Beziehung.
- Prägnant aber nicht zu knapp, freundlich aber nicht zu weich.
"""
        
        system_prompt = f"""Du bist ein Elite-Sales-Coach, spezialisiert auf Einwand-Handling.
{vertical_context}{channel_context}{extra_context}{knowledge_block}

Deine Aufgabe: Analysiere den Einwand und liefere 3 verschiedene Antwort-Varianten.

WICHTIGE REGELN:
1. Antworte auf {request.language.upper() if request.language else 'Deutsch'}
2. Jede Variante muss einen anderen Ansatz verfolgen
3. Sei empathisch aber direkt - kein Geschwafel
4. Nutze Fragen, um das Gespräch zu öffnen
5. Die Antworten müssen sofort per {request.channel or 'Nachricht'} nutzbar sein
6. Kurz und prägnant - max. 3 Sätze pro Nachricht

{persona_instructions}

ANTWORT-FORMAT (JSON):
{{
  "primary": {{
    "label": "Kurzer Titel",
    "message": "Die Nachricht zum Kopieren",
    "summary": "1 Satz Erklärung der Strategie"
  }},
  "alternatives": [
    {{
      "label": "...",
      "message": "...",
      "summary": "..."
    }},
    {{
      "label": "...",
      "message": "...",
      "summary": "..."
    }}
  ],
  "reasoning": "Kurze Erklärung, warum diese Einwand-Kategorie so behandelt werden sollte"
}}"""

        user_message = f'Der Kunde sagt: "{request.objection}"\nPersona: {persona}'
        
        completion = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        import json
        response_data = json.loads(completion.choices[0].message.content)
        
        return ObjectionGenerateResponse(
            primary=ObjectionVariant(**response_data["primary"]),
            alternatives=[ObjectionVariant(**alt) for alt in response_data.get("alternatives", [])],
            reasoning=response_data.get("reasoning")
        )
        
    except Exception as e:
        # Fallback zu Demo-Antworten bei Fehler
        print(f"OpenAI Error, using demo response: {e}")
        return get_demo_objection_response(request.objection, request.vertical)


@router.post("/log", response_model=ObjectionLogResponse)
async def log_objection_session(payload: ObjectionLogRequest):
    """
    Loggt die Nutzung einer Einwand-Antwort für Analytics.
    
    Speichert in public.objection_sessions:
    - Welcher Einwand wurde behandelt
    - Welche Variante wurde gewählt
    - Kontext (Vertical, Channel, Lead)
    """
    
    # ─────────────────────────────────────────────────────────────
    # Validierung
    # ─────────────────────────────────────────────────────────────
    
    if not payload.objection_text.strip():
        raise HTTPException(
            status_code=400,
            detail="objection_text darf nicht leer sein"
        )
    
    if not payload.chosen_message.strip():
        raise HTTPException(
            status_code=400,
            detail="chosen_message darf nicht leer sein"
        )
    
    # ─────────────────────────────────────────────────────────────
    # Datenbank-Insert
    # ─────────────────────────────────────────────────────────────
    
    try:
        supabase = get_supabase_client()
        
        # Daten für Insert vorbereiten
        insert_data = {
            "vertical": payload.vertical,
            "channel": payload.channel,
            "objection_text": payload.objection_text.strip(),
            "chosen_variant_label": payload.chosen_variant_label.strip(),
            "chosen_message": payload.chosen_message.strip(),
            "model_reasoning": payload.model_reasoning,
            "outcome": payload.outcome,
            "source": payload.source or "objection_brain_page",
        }
        
        # Lead ID nur hinzufügen wenn vorhanden und gültig
        if payload.lead_id:
            insert_data["lead_id"] = payload.lead_id
        
        # Insert ausführen
        result = supabase.table("objection_sessions").insert(insert_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=500,
                detail="Datensatz konnte nicht erstellt werden"
            )
        
        new_id = result.data[0]["id"]
        
        return ObjectionLogResponse(id=new_id)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Objection Log Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Datenbankfehler beim Logging: {str(e)}"
        )


@router.get("/status")
async def objection_brain_status():
    """Status Check für Objection Brain Service"""
    api_key = os.getenv("OPENAI_API_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    
    return {
        "service": "objection_brain",
        "status": "operational",
        "mode": "production" if api_key else "demo",
        "has_openai_key": bool(api_key),
        "has_supabase": bool(supabase_url),
    }

