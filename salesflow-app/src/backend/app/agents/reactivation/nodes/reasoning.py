"""
Reactivation Agent - Reasoning Node

Entscheidungslogik: Soll der Lead reaktiviert werden?
Bestimmt die Strategie basierend auf Signalen und Kontext.
"""

import logging
from typing import Optional, Tuple

from openai import AsyncOpenAI

from ..state import ReactivationState

logger = logging.getLogger(__name__)


# Reasoning Prompt Template
REASONING_PROMPT = """Du bist ein erfahrener Sales-Stratege für den DACH-Markt.

## Aufgabe
Analysiere die folgenden Informationen und entscheide, ob und wie dieser dormante Lead reaktiviert werden sollte.

## Lead-Kontext
{lead_context}

## Interaktionshistorie
{memory_summary}

## Erkannte Signale
{signal_summary}

## Entscheidungskriterien
1. **Relevanz der Signale**: Sind die Signale stark genug für eine Kontaktaufnahme?
2. **Timing**: Ist jetzt der richtige Zeitpunkt?
3. **Beziehungshistorie**: Wie war die letzte Interaktion?
4. **Strategie**: Welcher Ansatz ist am erfolgversprechendsten?

## Output Format (JSON)
{{
    "should_reactivate": true/false,
    "confidence_score": 0.0-1.0,
    "reasoning": "Kurze Begründung (max 2 Sätze)",
    "strategy": "signal_reference | value_reminder | relationship_rebuild | soft_check_in",
    "key_talking_points": ["Punkt 1", "Punkt 2"]
}}

Antworte NUR mit dem JSON, ohne zusätzlichen Text.
"""


async def run(state: ReactivationState) -> dict:
    """
    Reasoning Node: Entscheidet über Reaktivierung und Strategie.
    
    Aufgaben:
    1. Kontext aggregieren
    2. LLM für Entscheidung konsultieren
    3. Strategie bestimmen
    
    Output:
    - should_reactivate: Bool
    - confidence_score: 0-1
    - reactivation_strategy: str
    - reasoning_explanation: str
    """
    run_id = state.get("run_id", "unknown")
    lead_context = state.get("lead_context", {})
    
    logger.info(f"[{run_id}] Reasoning: Analyzing reactivation opportunity")
    
    try:
        # 1. Prompt zusammenstellen
        prompt = _build_reasoning_prompt(state)
        
        # 2. LLM Call
        decision = await _call_reasoning_llm(prompt)
        
        if not decision:
            logger.warning(f"[{run_id}] Reasoning LLM returned empty response")
            return {
                "should_reactivate": False,
                "confidence_score": 0.0,
                "reactivation_strategy": None,
                "reasoning_explanation": "Keine Entscheidung möglich",
            }
        
        # 3. Ergebnis validieren
        should_reactivate = decision.get("should_reactivate", False)
        confidence = min(1.0, max(0.0, decision.get("confidence_score", 0.0)))
        strategy = decision.get("strategy")
        reasoning = decision.get("reasoning", "")
        
        logger.info(
            f"[{run_id}] Reasoning complete: "
            f"reactivate={should_reactivate}, "
            f"confidence={confidence:.2f}, "
            f"strategy={strategy}"
        )
        
        return {
            "should_reactivate": should_reactivate,
            "confidence_score": confidence,
            "reactivation_strategy": strategy,
            "reasoning_explanation": reasoning,
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Reasoning failed: {e}")
        return {
            "should_reactivate": False,
            "confidence_score": 0.0,
            "reactivation_strategy": None,
            "reasoning_explanation": f"Fehler: {str(e)}",
            "error": str(e),
        }


def _build_reasoning_prompt(state: ReactivationState) -> str:
    """
    Baut den Reasoning Prompt zusammen.
    """
    lead_context = state.get("lead_context", {})
    
    # Lead Context formatieren
    lead_context_str = f"""
- **Name:** {lead_context.get('name', 'Unbekannt')}
- **Unternehmen:** {lead_context.get('company', 'Unbekannt')}
- **Persona:** {lead_context.get('persona_type', 'unknown')}
- **Anrede:** {lead_context.get('preferred_formality', 'Sie')}
- **Tage dormant:** {lead_context.get('days_dormant', '?')}
- **Interaktionen:** {lead_context.get('interaction_count', 0)}
- **Pain Points:** {', '.join(lead_context.get('top_pain_points', []))}
- **Frühere Einwände:** {', '.join(lead_context.get('previous_objections', []))}
    """.strip()
    
    # Memory Summary
    memory_summary = state.get("memory_summary") or "Keine Historie verfügbar."
    
    # Signal Summary
    signal_summary = state.get("signal_summary") or "Keine Signale gefunden."
    
    return REASONING_PROMPT.format(
        lead_context=lead_context_str,
        memory_summary=memory_summary,
        signal_summary=signal_summary
    )


async def _call_reasoning_llm(prompt: str) -> Optional[dict]:
    """
    Ruft das LLM für die Reasoning-Entscheidung auf.
    """
    from ....core.config import settings
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",  # Oder gpt-4o-mini für Cost-Saving
            messages=[
                {
                    "role": "system",
                    "content": "Du bist ein strategischer Sales-Berater für den DACH-Markt. "
                               "Antworte immer im geforderten JSON-Format."
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,  # Niedrig für konsistente Entscheidungen
            max_tokens=500
        )
        
        import json
        return json.loads(response.choices[0].message.content)
        
    except Exception as e:
        logger.error(f"Reasoning LLM call failed: {e}")
        return None


def _validate_strategy(strategy: Optional[str]) -> str:
    """
    Validiert und normalisiert die Strategie.
    """
    valid_strategies = [
        "signal_reference",    # Bezug auf aktuelles Signal
        "value_reminder",      # Erinnerung an Nutzen
        "relationship_rebuild", # Beziehung wiederaufbauen
        "soft_check_in"        # Sanfter Check-In
    ]
    
    if strategy in valid_strategies:
        return strategy
    
    # Fuzzy Match
    strategy_lower = (strategy or "").lower()
    for valid in valid_strategies:
        if valid.replace("_", "") in strategy_lower.replace("_", ""):
            return valid
    
    # Default
    return "soft_check_in"

