"""
Enthält die Prompt-Logik für alle Actions.

WICHTIG: BASE_STYLE und ACTION_INSTRUCTIONS kommen aus dem zentralen Prompt-Hub.
Diese Datei enthält nur noch die build_system_prompt Logik.
"""

from __future__ import annotations

import json
from typing import List, Optional

from .schemas import ActionData, ActionType
from .scenario_service import fetch_scenarios, render_scenarios_as_knowledge
from .templates import FOLLOWUP_TEMPLATES
from .verticals import VERTICALS

# Import aus dem zentralen Prompt-Hub
from .core.ai_prompts import BASE_STYLE, ACTION_INSTRUCTIONS


DEFAULT_VERTICAL_KEY = "chief"
DEFAULT_USER_NAME = "dem Nutzer"
DEFAULT_USER_NICKNAME = "Chef"


def _format_lead_context(data: ActionData) -> str:
    if not data.lead:
        return "Kein Lead-Kontext vorhanden. Antworte allgemein, aber biete nächste Schritte an."

    lead_payload = data.lead.model_dump(exclude_none=True)
    return "Lead-Kontext (JSON):\n" + json.dumps(lead_payload, indent=2, ensure_ascii=False)


def _templated_hint() -> str:
    sample = "\n\n".join(
        f"- {key}: {value}" for key, value in FOLLOWUP_TEMPLATES.items()
    )
    return (
        "Nutze bevorzugt diese Follow-up-Strukturen (du darfst wording leicht anpassen, aber bleib im Stil):\n"
        f"{sample}"
    )


def _resolve_user_name(data: ActionData) -> str:
    raw = getattr(data, "user_name", None)
    if raw:
        candidate = raw.strip()
        if candidate:
            return candidate
    return DEFAULT_USER_NAME


def _resolve_user_nickname(data: ActionData) -> str:
    raw = getattr(data, "user_nickname", None)
    if raw:
        candidate = raw.strip()
        if candidate:
            return candidate
    return DEFAULT_USER_NICKNAME


def _inject_user_context(prompt: str, user_name: str, user_nickname: str) -> str:
    if not prompt:
        return prompt

    rendered = prompt
    replacements = {
        "{user_name}": user_name,
        "{userName}": user_name,
        "{user_nickname}": user_nickname,
        "{userNickname}": user_nickname,
    }

    for placeholder, value in replacements.items():
        rendered = rendered.replace(placeholder, value)

    return rendered


# ACTION_INSTRUCTIONS wird aus app.core.ai_prompts importiert (siehe oben)
# Die lokale Definition wurde entfernt - alle Actions sind jetzt zentral definiert.


def build_system_prompt(action: ActionType, data: ActionData) -> str:
    """
    Baut den Systemprompt für die übergebene Action.
    """

    industry_candidate = (getattr(data, "industry", None) or "").strip().lower()
    industry_key = industry_candidate or DEFAULT_VERTICAL_KEY
    vertical = VERTICALS.get(industry_key) or VERTICALS[DEFAULT_VERTICAL_KEY]
    user_name = _resolve_user_name(data)
    user_nickname = _resolve_user_nickname(data)
    base_prompt = _inject_user_context(vertical.system_prompt, user_name, user_nickname)

    sections: List[str] = [
        base_prompt.strip(),
        BASE_STYLE,
    ]

    action_instruction = ACTION_INSTRUCTIONS.get(
        action,
        "Bleib hilfreich und fokussiert auf Umsatz."
    )
    sections.append(action_instruction)

    if action in {"generate_message", "create_template"}:
        sections.append(_templated_hint())

    sections.append(_format_lead_context(data))

    scenario_knowledge = ""
    scenario_vertical = (getattr(data, "scenario_vertical", None) or "").strip()
    scenario_tags: Optional[List[str]] = getattr(data, "scenario_tags", None) or None

    if scenario_vertical:
        try:
            scenarios = fetch_scenarios(
                vertical=scenario_vertical,
                tag_filter=scenario_tags,
                limit=3,
            )
        except Exception:
            scenarios = []

        rendered = render_scenarios_as_knowledge(scenarios)
        if rendered:
            scenario_knowledge = rendered.strip()

    existing_knowledge = (data.knowledge or "").strip()
    combined_knowledge = existing_knowledge

    if scenario_knowledge:
        if combined_knowledge:
            combined_knowledge = f"{combined_knowledge}\n\n{scenario_knowledge}"
        else:
            combined_knowledge = scenario_knowledge

    if action == "knowledge_answer":
        if combined_knowledge:
            sections.append("Knowledge-Base:\n" + combined_knowledge)
        else:
            sections.append(
                "Es wurde kein Knowledge-Text geliefert; erkläre das kurz und bitte um mehr Details."
            )

    action_instructions = "\n\n".join(
        section.strip() for section in sections if section
    ).strip()

    if action_instructions:
        return base_prompt.rstrip() + "\n\n" + action_instructions.lstrip()

    return base_prompt


__all__ = ["build_system_prompt"]
