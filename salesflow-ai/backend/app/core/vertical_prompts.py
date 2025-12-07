"""
Vertical Prompts - Erweitert System-Prompts mit Vertical-spezifischem Kontext
"""

from __future__ import annotations

from ..schemas.vertical import VerticalConfig


def build_vertical_prompt_addition(config: VerticalConfig) -> str:
    """
    Baut einen Prompt-Zusatz basierend auf der Vertical-Config.
    Wird in den System-Prompt injiziert.
    """
    ai_context = config.ai_context
    terminology = config.terminology
    
    # 1. Persona
    persona_section = f"VERTICAL PERSONA:\n{ai_context.persona}\n"
    
    # 2. Terminologie-Mapping
    terminology_list = []
    for key, value in terminology.model_dump().items():
        if key != value:  # Nur wenn unterschiedlich
            terminology_list.append(f"- {key.capitalize()} = {value}")
    
    terminology_section = ""
    if terminology_list:
        terminology_section = (
            "\nTERMINOLOGIE (nutze diese Begriffe konsequent):\n"
            + "\n".join(terminology_list)
            + "\n"
        )
    
    # 3. Focus Topics
    focus_section = ""
    if ai_context.focus_topics:
        focus_section = (
            "\nFOKUS-THEMEN (konzentriere dich auf diese Bereiche):\n"
            + "\n".join(f"- {topic}" for topic in ai_context.focus_topics)
            + "\n"
        )
    
    # 4. Industry Terms
    terms_section = ""
    if ai_context.industry_terms:
        terms_section = (
            "\nBRANCHENSPEZIFISCHE BEGRIFFE (nutze diese aktiv):\n"
            + ", ".join(ai_context.industry_terms)
            + "\n"
        )
    
    # 5. Tone
    tone_section = f"\nKOMMUNIKATIONSTON: {ai_context.tone}\n"
    
    # 6. Avoid Topics
    avoid_section = ""
    if ai_context.avoid_topics:
        avoid_section = (
            "\nVERMEIDE DIESE THEMEN:\n"
            + "\n".join(f"- {topic}" for topic in ai_context.avoid_topics)
            + "\n"
        )
    
    # Zusammenfügen
    prompt_addition = (
        "═══════════════════════════════════════\n"
        "VERTICAL-SPEZIFISCHER KONTEXT:\n"
        "═══════════════════════════════════════\n"
        + persona_section
        + terminology_section
        + focus_section
        + terms_section
        + tone_section
        + avoid_section
        + "═══════════════════════════════════════\n"
    )
    
    return prompt_addition


__all__ = ["build_vertical_prompt_addition"]

