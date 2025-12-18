"""
Objection Brain Router - KI-gestützter Einwand-Coach für Sales Flow AI.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai_client import AIClient
from app.config import get_settings
from app.schemas import ChatMessage

router = APIRouter(prefix="/objection-brain", tags=["objection_brain"])
settings = get_settings()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────────────────────────


class ObjectionBrainRequest(BaseModel):
    """Request für Objection Brain - Einwand-Analyse."""

    vertical: Optional[str] = Field(None, description="Branche (network, real_estate, finance, etc.)")
    channel: Optional[str] = Field(None, description="Kanal (whatsapp, phone, instagram, email)")
    objection: str = Field(..., min_length=3, description="Original-Einwand des Kunden")
    context: Optional[str] = Field(None, description="Zusätzlicher Kontext (Stage, Angebot, Preis, etc.)")
    language: str = Field(default="de", description="Sprache für die Antwort")


class ObjectionVariant(BaseModel):
    """Eine Variante für die Einwand-Behandlung."""

    label: str = Field(..., description="z.B. 'Variante A: Weich'")
    message: str = Field(..., description="Ausformulierte Antwort")
    summary: Optional[str] = Field(None, description="Kurze Zusammenfassung der Strategie")


class ObjectionBrainResponse(BaseModel):
    """Response mit primärer Antwort und Alternativen."""

    primary: ObjectionVariant
    alternatives: list[ObjectionVariant] = Field(default_factory=list)
    reasoning: Optional[str] = Field(None, description="Kurze Erklärung der Strategie")


# ─────────────────────────────────────────────────────────────────
# System Prompt
# ─────────────────────────────────────────────────────────────────

OBJECTION_BRAIN_SYSTEM_PROMPT = """Du bist ein erfahrener Vertriebscoach für Einwandbehandlung (Objection Handling).
Du hilfst deutschsprachigen Verkäufern dabei, auf Einwände kurz, klar und respektvoll zu antworten.

WICHTIGE REGELN:
- Sprich den Kunden mit "du" an
- Bleib ruhig, wertschätzend, kein Druck
- Struktur jeder Antwort:
  1) Einwand spiegeln / Verständnis zeigen
  2) Klarer Reframe oder Info
  3) Eine Rückfrage oder ein kleiner Call-to-Action

DEINE AUFGABE:
Erstelle genau 3 Varianten für die Einwandbehandlung:
- Variante A: Empathisch und weich, baut Vertrauen auf
- Variante B: Direkter aber respektvoll, klar auf den Punkt
- Variante C: No-Pressure Fallback, lässt dem Kunden Raum

AUSGABEFORMAT (JSON):
{
  "primary": {
    "label": "Variante A: Empathisch",
    "message": "Die ausformulierte Nachricht...",
    "summary": "Kurze Strategie-Erklärung"
  },
  "alternatives": [
    {
      "label": "Variante B: Direkt",
      "message": "Die ausformulierte Nachricht...",
      "summary": "Kurze Strategie-Erklärung"
    },
    {
      "label": "Variante C: No Pressure",
      "message": "Die ausformulierte Nachricht...",
      "summary": "Kurze Strategie-Erklärung"
    }
  ],
  "reasoning": "Warum dieser Ansatz bei diesem Einwand funktioniert"
}

Antworte IMMER mit validem JSON in diesem Format. Keine Markdown-Codeblocks, nur das reine JSON.
"""


# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────


def build_context_string(payload: ObjectionBrainRequest) -> str:
    """Baut einen kompakten Kontext-String aus den Request-Daten."""
    
    parts = []
    
    if payload.vertical:
        vertical_display = {
            "network": "Network Marketing",
            "real_estate": "Immobilien",
            "finance": "Finance/Versicherung",
            "coaching": "Coaching",
            "generic": "Allgemein",
        }.get(payload.vertical, payload.vertical)
        parts.append(f"Branche: {vertical_display}")
    
    if payload.channel:
        channel_display = {
            "whatsapp": "WhatsApp",
            "instagram": "Instagram DM",
            "phone": "Telefon",
            "email": "E-Mail",
        }.get(payload.channel, payload.channel)
        parts.append(f"Kanal: {channel_display}")
    
    if payload.context:
        parts.append(f"Zusatz-Kontext: {payload.context}")
    
    return " | ".join(parts) if parts else "Kein spezifischer Kontext"


def build_user_prompt(payload: ObjectionBrainRequest) -> str:
    """Erstellt den User-Prompt für die KI."""
    
    context_str = build_context_string(payload)
    
    prompt = f"""KONTEXT:
{context_str}

EINWAND DES KUNDEN:
"{payload.objection}"

AUFGABE:
Erstelle 3 professionelle Antwort-Varianten (A: Empathisch, B: Direkt, C: No Pressure) für diesen Einwand.
Beachte den Kontext (Branche, Kanal) und gib die Antwort als JSON zurück wie im System-Prompt beschrieben.
"""
    
    return prompt


def parse_ai_response(response_text: str) -> ObjectionBrainResponse:
    """
    Parsed die KI-Antwort zu einem ObjectionBrainResponse.
    Versucht zuerst JSON-Parsing, dann Fallback auf Text-Parsing.
    """
    
    # Entferne mögliche Markdown-Codeblocks
    cleaned = response_text.strip()
    if cleaned.startswith("```"):
        # Entferne ```json ... ``` wrapper
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        cleaned = cleaned.strip()
    
    # Versuche JSON-Parsing
    try:
        data = json.loads(cleaned)
        
        # Validiere Struktur
        if "primary" not in data:
            raise ValueError("JSON fehlt 'primary' key")
        
        return ObjectionBrainResponse(
            primary=ObjectionVariant(**data["primary"]),
            alternatives=[
                ObjectionVariant(**alt) for alt in data.get("alternatives", [])
            ],
            reasoning=data.get("reasoning"),
        )
    
    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        logger.warning(f"JSON-Parsing fehlgeschlagen: {exc}, versuche Fallback-Parsing")
        
        # Fallback: Versuche, aus Text 3 Varianten zu extrahieren
        return parse_text_response_fallback(response_text)


def parse_text_response_fallback(text: str) -> ObjectionBrainResponse:
    """
    Fallback-Parser wenn KI kein JSON liefert.
    Versucht, aus dem Text Varianten zu extrahieren.
    """
    
    # Suche nach Variante A, B, C im Text
    variant_pattern = r'(?:Variante\s+([ABC])[:\s]+)(.*?)(?=Variante\s+[ABC]|$)'
    matches = re.findall(variant_pattern, text, re.DOTALL | re.IGNORECASE)
    
    variants = []
    for label, content in matches:
        # Bereinige Content
        content = content.strip()
        # Versuche Summary zu extrahieren (falls vorhanden)
        summary_match = re.search(r'\(([^)]+)\)', content)
        summary = summary_match.group(1) if summary_match else None
        
        # Message ist der Hauptteil
        message = re.sub(r'\([^)]+\)', '', content).strip()
        
        variants.append(
            ObjectionVariant(
                label=f"Variante {label}",
                message=message[:500],  # Limit message length
                summary=summary,
            )
        )
    
    if not variants:
        # Wenn gar nichts gefunden, nutze den gesamten Text als primary
        variants = [
            ObjectionVariant(
                label="Vorschlag",
                message=text[:500],
                summary="Automatisch extrahiert",
            )
        ]
    
    return ObjectionBrainResponse(
        primary=variants[0],
        alternatives=variants[1:] if len(variants) > 1 else [],
        reasoning="Automatisch aus KI-Antwort extrahiert",
    )


# ─────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────


@router.post("/generate", response_model=ObjectionBrainResponse)
async def generate_objection_answer(
    payload: ObjectionBrainRequest,
) -> ObjectionBrainResponse:
    """
    Generiert 3 Varianten zur Einwandbehandlung basierend auf dem Einwand.
    
    - Nutzt OpenAI API wenn Key vorhanden
    - Fällt auf Mock-Modus zurück wenn kein Key gesetzt ist
    """
    
    # Validierung: Einwand muss mindestens 3 Zeichen haben
    if len(payload.objection.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Der Einwand muss mindestens 3 Zeichen lang sein.",
        )
    
    # Mock-Modus: Wenn kein OpenAI Key vorhanden ist
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY nicht gesetzt - Mock-Modus aktiv")
        return generate_mock_objection_response(payload)
    
    # Normaler Modus: OpenAI API nutzen
    try:
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
        
        # User-Prompt erstellen
        user_prompt = build_user_prompt(payload)
        
        # Nachricht als ChatMessage
        messages = [ChatMessage(role="user", content=user_prompt)]
        
        # KI-Antwort generieren
        response_text = ai_client.generate(OBJECTION_BRAIN_SYSTEM_PROMPT, messages)
        
        # Response parsen
        result = parse_ai_response(response_text)
        
        return result
    
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Fehler bei Objection Brain: {exc}")
        raise HTTPException(
            status_code=502,
            detail=f"KI-Provider-Fehler: {exc}",
        ) from exc


def generate_mock_objection_response(
    payload: ObjectionBrainRequest,
) -> ObjectionBrainResponse:
    """
    Generiert Mock-Antworten für Development ohne OpenAI Key.
    """
    
    einwand_lower = payload.objection.lower()
    
    # Preis-Einwand
    if any(word in einwand_lower for word in ["teuer", "preis", "kostet", "budget", "geld"]):
        return ObjectionBrainResponse(
            primary=ObjectionVariant(
                label="Variante A: Empathisch",
                message="Verstehe total, dass das Thema Budget wichtig ist. Lass uns kurz schauen: Was würde es dich kosten, wenn du weiterhin ohne diese Lösung arbeitest? Oft ist das viel mehr als die Investition hier. Magst du mir kurz sagen, was dein größter Pain-Point gerade ist?",
                summary="Verständnis zeigen → ROI-Perspektive → Rückfrage",
            ),
            alternatives=[
                ObjectionVariant(
                    label="Variante B: Direkt",
                    message="Fair Point! Hier die Realität: Du zahlst entweder jetzt oder später – nur später mit Zinsen (verlorene Zeit, Umsatz, Nerven). Die meisten unserer Kunden haben die Investition in 2-3 Monaten wieder drin. Wollen wir kurz durchrechnen, was das für dich bedeutet?",
                    summary="Klartext → Realitätscheck → Konkrete Zahlen",
                ),
                ObjectionVariant(
                    label="Variante C: No Pressure",
                    message="Alles gut, Budget-Thema ist wichtig! Keine Eile von meiner Seite. Falls du später nochmal darüber nachdenken willst, meld dich einfach. Ich schick dir noch ein paar Insights, wie andere das Thema gelöst haben. Deal?",
                    summary="Verständnis → Tür offen lassen → Wert nachliefern",
                ),
            ],
            reasoning="Preis-Einwände sind meist kein echtes Budget-Problem, sondern fehlende Value-Clarity. Die Varianten adressieren das auf verschiedenen Intensitätsstufen.",
        )
    
    # Zeit-Einwand
    if any(word in einwand_lower for word in ["zeit", "später", "jetzt nicht", "beschäftigt", "stress"]):
        return ObjectionBrainResponse(
            primary=ObjectionVariant(
                label="Variante A: Empathisch",
                message="Verstehe ich komplett – du hast viel auf dem Tisch. Ehrlich gesagt: Genau deswegen macht es Sinn, jetzt zu starten. Je länger du wartest, desto mehr Zeit verlierst du mit dem alten System. Was, wenn wir uns 15 Minuten nehmen und ich zeig dir, wie du sofort Zeit sparst?",
                summary="Verständnis → Paradox aufzeigen → Mini-Commitment",
            ),
            alternatives=[
                ObjectionVariant(
                    label="Variante B: Direkt",
                    message="Real Talk: 'Keine Zeit' heißt meistens 'keine Priorität'. Aber genau das hier könnte dir 5-10h pro Woche zurückgeben. Die Frage ist: Willst du weiter im Hamsterrad laufen oder investierst du jetzt 20 Minuten für mehr Freiheit?",
                    summary="Direkte Konfrontation → Benefit betonen → Entscheidung fordern",
                ),
                ObjectionVariant(
                    label="Variante C: No Pressure",
                    message="Alles klar, verstehe ich! Wann würde es denn besser passen? Ich block dir schonmal einen Slot in 2-3 Wochen, dann schauen wir ob's passt. Kein Stress, du entscheidest. Cool?",
                    summary="Akzeptieren → Future Pacing → Commitment später",
                ),
            ],
            reasoning="Zeit-Einwände verschleiern oft andere Bedenken oder sind ein Prioritäten-Problem. Die Strategien helfen, das zu entlarven oder aufzulösen.",
        )
    
    # Bedenkzeit-Einwand
    if any(word in einwand_lower for word in ["überlegen", "nachdenken", "bedenkzeit", "entscheiden"]):
        return ObjectionBrainResponse(
            primary=ObjectionVariant(
                label="Variante A: Empathisch",
                message="Total fair, wichtige Entscheidungen brauchen Klarheit! Lass mich dir helfen: Was genau fehlt dir noch für eine Entscheidung? Gibt's noch offene Fragen oder Zweifel, die wir klären können?",
                summary="Akzeptieren → Echte Gründe erfragen → Einwände auflösen",
            ),
            alternatives=[
                ObjectionVariant(
                    label="Variante B: Direkt",
                    message="Verstehe! Aber mal ehrlich: Was könnte sich in den nächsten Tagen ändern, das hier nicht schon klar ist? Meistens heißt 'Bedenkzeit' entweder 'ich hab noch Zweifel' oder 'ich will es eigentlich nicht'. Was ist es bei dir?",
                    summary="Challenge → Echte Gründe aufdecken → Klarheit schaffen",
                ),
                ObjectionVariant(
                    label="Variante C: No Pressure",
                    message="Klar, kein Problem! Nimm dir die Zeit, die du brauchst. Ich schick dir nochmal alle Infos zusammengefasst. Falls Fragen aufkommen, schreib mir einfach. Ich bin da!",
                    summary="Respektieren → Infos nachliefern → Tür offen lassen",
                ),
            ],
            reasoning="'Ich muss überlegen' ist oft ein versteckter Einwand. Die Strategien helfen, entweder die echten Gründe zu finden oder den Lead zu qualifizieren.",
        )
    
    # Default / Generischer Einwand
    return ObjectionBrainResponse(
        primary=ObjectionVariant(
            label="Variante A: Empathisch",
            message="Verstehe deinen Punkt total! Lass uns das kurz durchgehen: Was genau ist deine größte Sorge dabei? Oft ist das gar nicht so wild, wie es auf den ersten Blick wirkt. Magst du mir mehr erzählen?",
            summary="Verständnis zeigen → Sorge erfragen → Dialog öffnen",
        ),
        alternatives=[
            ObjectionVariant(
                label="Variante B: Direkt",
                message="Fair! Aber lass mich dir eine Frage stellen: Wenn wir diesen Punkt lösen könnten – wäre das dann ein Go für dich? Oder gibt's noch andere Bedenken?",
                summary="Challenge → Commitment-Test → Einwände sammeln",
            ),
            ObjectionVariant(
                label="Variante C: No Pressure",
                message="Alles gut, verstehe ich! Nimm dir die Zeit, die du brauchst. Falls du später nochmal reden willst, meld dich einfach. Kein Druck!",
                summary="Akzeptieren → Raum geben → Tür offen lassen",
            ),
        ],
        reasoning="Bei unklaren Einwänden ist es wichtig, erstmal die echten Gründe zu verstehen, bevor man antwortet.",
    )


__all__ = ["router"]
