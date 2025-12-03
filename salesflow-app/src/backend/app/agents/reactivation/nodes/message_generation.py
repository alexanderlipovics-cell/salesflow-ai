"""
Reactivation Agent - Message Generation Node

Erstellt personalisierte Reaktivierungs-Nachrichten.
Nutzt Few-Shot Learning aus User-Feedback.
"""

import logging
from typing import Optional, List

from openai import AsyncOpenAI

from ..state import ReactivationState

logger = logging.getLogger(__name__)


# Message Generation Prompt Templates
MESSAGE_PROMPTS = {
    "signal_reference": """
Du schreibst eine Reaktivierungs-Nachricht für den DACH-Markt.

## Kontext
- **Empfänger:** {name} von {company}
- **Anrede:** {formality} ({"förmlich" if formality == "Sie" else "persönlich"})
- **Kanal:** {channel}
- **Letzte Interaktion:** vor {days_dormant} Tagen

## Signal (Reaktivierungsgrund)
{signal_title}
{signal_summary}

## Strategie: Signal Reference
Nimm direkt Bezug auf das aktuelle Ereignis. Zeige echtes Interesse, nicht verkäuferisch.

## Interaktionshistorie
{memory_summary}

## Few-Shot Beispiele (erfolgreiche Nachrichten)
{few_shot_examples}

## Anforderungen
1. Maximal 3-4 Sätze für LinkedIn, 5-6 für Email
2. Persönlich aber professionell
3. Konkreter Bezug zum Signal
4. Soft CTA (keine harte Terminanfrage)
5. KEINE Floskeln wie "Ich hoffe, es geht Ihnen gut"

Schreibe NUR die Nachricht, ohne Erklärung.
""",
    
    "value_reminder": """
Du schreibst eine Reaktivierungs-Nachricht für den DACH-Markt.

## Kontext
- **Empfänger:** {name} von {company}
- **Anrede:** {formality}
- **Kanal:** {channel}
- **Pain Points:** {pain_points}

## Strategie: Value Reminder
Erinnere subtil an den Nutzen ohne aufdringlich zu wirken.

## Interaktionshistorie
{memory_summary}

## Few-Shot Beispiele
{few_shot_examples}

## Anforderungen
1. Maximal 4 Sätze
2. Fokus auf Nutzen, nicht Features
3. Zeige Verständnis für ihre Situation
4. Leichte Neugierde wecken

Schreibe NUR die Nachricht.
""",
    
    "soft_check_in": """
Du schreibst eine sanfte Check-In Nachricht für den DACH-Markt.

## Kontext
- **Empfänger:** {name} von {company}
- **Anrede:** {formality}
- **Kanal:** {channel}

## Strategie: Soft Check-In
Einfach wieder in Kontakt treten, ohne Verkaufsdruck.

## Few-Shot Beispiele
{few_shot_examples}

## Anforderungen
1. Maximal 3 Sätze
2. Authentisch und menschlich
3. Kein Pitch, keine Agenda
4. Offene Frage zum Abschluss

Schreibe NUR die Nachricht.
"""
}


async def run(state: ReactivationState) -> dict:
    """
    Message Generation Node: Erstellt personalisierte Nachricht.
    
    Aufgaben:
    1. Strategie-spezifischen Prompt laden
    2. Few-Shot Beispiele einfügen
    3. LLM Call für Message
    4. Kanal und Ton bestimmen
    
    Output:
    - draft_message: Die generierte Nachricht
    - suggested_channel: linkedin oder email
    - message_tone: professional, casual, urgent
    """
    run_id = state.get("run_id", "unknown")
    lead_context = state.get("lead_context", {})
    strategy = state.get("reactivation_strategy", "soft_check_in")
    
    logger.info(
        f"[{run_id}] Message Generation: "
        f"Strategy '{strategy}' for {lead_context.get('name', 'Lead')}"
    )
    
    try:
        # 1. Kanal bestimmen
        channel = _determine_channel(lead_context, state)
        
        # 2. Few-Shot Beispiele laden
        few_shot_examples = await _get_few_shot_examples(
            user_id=state.get("user_id"),
            strategy=strategy
        )
        
        # 3. Prompt zusammenstellen
        prompt = _build_message_prompt(
            state=state,
            strategy=strategy,
            channel=channel,
            few_shot_examples=few_shot_examples
        )
        
        # 4. LLM Call
        message = await _generate_message(prompt, channel)
        
        if not message:
            logger.warning(f"[{run_id}] Message generation returned empty")
            return {
                "draft_message": None,
                "suggested_channel": channel,
                "message_tone": "professional",
                "error": "Message generation failed",
            }
        
        # 5. Ton analysieren
        tone = _analyze_tone(message, strategy)
        
        logger.info(
            f"[{run_id}] Message generated: "
            f"{len(message)} chars, channel={channel}, tone={tone}"
        )
        
        return {
            "draft_message": message,
            "suggested_channel": channel,
            "message_tone": tone,
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Message Generation failed: {e}")
        return {
            "draft_message": None,
            "suggested_channel": "email",
            "message_tone": "professional",
            "error": str(e),
        }


def _determine_channel(
    lead_context: dict,
    state: ReactivationState
) -> str:
    """
    Bestimmt den optimalen Kommunikationskanal.
    
    Priorität:
    1. Explizite Präferenz des Leads
    2. LinkedIn wenn verbunden
    3. Email wenn Consent vorhanden
    4. LinkedIn als Fallback
    """
    # Explizite Präferenz
    preferred = lead_context.get("preferred_channel")
    if preferred and preferred != "unknown":
        return preferred
    
    # LinkedIn Connection?
    if lead_context.get("has_linkedin_connection"):
        return "linkedin"
    
    # Email Consent?
    if lead_context.get("has_email_consent"):
        return "email"
    
    # Fallback: LinkedIn (weniger DSGVO-kritisch)
    return "linkedin"


async def _get_few_shot_examples(
    user_id: str,
    strategy: str,
    limit: int = 2
) -> str:
    """
    Lädt erfolgreiche Beispiele für Few-Shot Learning.
    """
    # TODO: Implementiere Datenbankabfrage
    
    from ....services.reactivation.feedback_service import FeedbackService
    from ....db.supabase import get_supabase
    
    try:
        supabase = get_supabase()
        feedback_service = FeedbackService(supabase)
        
        examples = await feedback_service.get_few_shot_examples(
            user_id=user_id,
            signal_type=strategy,  # Kann angepasst werden
            limit=limit
        )
        
        if not examples:
            return "Keine Beispiele verfügbar."
        
        formatted = []
        for i, ex in enumerate(examples, 1):
            formatted.append(f"**Beispiel {i}:**\n{ex.get('message', '')}")
        
        return "\n\n".join(formatted)
        
    except Exception as e:
        logger.warning(f"Failed to load few-shot examples: {e}")
        return "Keine Beispiele verfügbar."


def _build_message_prompt(
    state: ReactivationState,
    strategy: str,
    channel: str,
    few_shot_examples: str
) -> str:
    """
    Baut den Message Generation Prompt zusammen.
    """
    lead_context = state.get("lead_context", {})
    primary_signal = state.get("primary_signal", {})
    
    # Template wählen
    template = MESSAGE_PROMPTS.get(strategy, MESSAGE_PROMPTS["soft_check_in"])
    
    # Variablen füllen
    return template.format(
        name=lead_context.get("name", "Kontakt"),
        company=lead_context.get("company", "Ihrem Unternehmen"),
        formality=lead_context.get("preferred_formality", "Sie"),
        channel=channel.upper(),
        days_dormant=lead_context.get("days_dormant", "einiger Zeit"),
        signal_title=primary_signal.get("title", ""),
        signal_summary=primary_signal.get("summary", ""),
        pain_points=", ".join(lead_context.get("top_pain_points", [])),
        memory_summary=state.get("memory_summary", "Keine Historie."),
        few_shot_examples=few_shot_examples
    )


async def _generate_message(prompt: str, channel: str) -> Optional[str]:
    """
    Generiert die Nachricht via LLM.
    """
    from ....core.config import settings
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Max Länge basierend auf Kanal
    max_tokens = 200 if channel == "linkedin" else 400
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Du bist ein erfahrener Sales-Texter für den DACH-Markt. "
                        "Du schreibst persönliche, authentische Nachrichten. "
                        "Vermeide Marketing-Floskeln und Buzzwords. "
                        "Schreibe wie ein Mensch, nicht wie eine Maschine."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,  # Etwas Kreativität
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"Message generation LLM call failed: {e}")
        return None


def _analyze_tone(message: str, strategy: str) -> str:
    """
    Analysiert den Ton der generierten Nachricht.
    """
    message_lower = message.lower()
    
    # Urgente Indikatoren
    if any(word in message_lower for word in ["dringend", "schnell", "sofort", "wichtig"]):
        return "urgent"
    
    # Casual Indikatoren
    if any(word in message_lower for word in ["hey", "hi", "kurze frage", "mal"]):
        return "casual"
    
    # Default basierend auf Strategie
    return "casual" if strategy == "soft_check_in" else "professional"

