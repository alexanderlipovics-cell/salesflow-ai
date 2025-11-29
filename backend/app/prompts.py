"""
Enthält die Prompt-Logik für alle Actions.
"""

from __future__ import annotations

import json
from textwrap import dedent
from typing import List, Optional

from .schemas import ActionData, ActionType, LeadHunterConfig
from .scenario_service import fetch_scenarios, render_scenarios_as_knowledge
from .templates import FOLLOWUP_TEMPLATES
from .verticals import VERTICALS

BASE_STYLE = dedent(
    """
    Du bist Sales Flow AI – ein freundlicher, direkter Revenue-Coach.
    Sprich Nutzer immer mit "du" an, antworte knapp, WhatsApp-tauglich, ohne Floskeln.
    Lieber praxisnah als akademisch. Nutze Emojis sparsam und nur wenn sie Mehrwert bringen.
    """
).strip()


DEFAULT_VERTICAL_KEY = "chief"


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


ACTION_INSTRUCTIONS: dict[ActionType, str] = {
    "chat": (
        "Modus: Coaching/Chat.\n"
        "Beantworte Fragen, teile Taktiken und nenne konkrete nächste Schritte."
    ),
    "generate_message": (
        "Modus: Direktnachricht.\n"
        "Erstelle 1 kurze Nachricht (max. 4 Zeilen) für WhatsApp/DM, direkt adressiert, locker."
    ),
    "analyze_lead": (
        "Modus: Lead-Analyse.\n"
        "Bewerte den Lead (kalt / warm / heiß), nenne die Begründung und schlage den nächsten Schritt vor."
    ),
    "create_template": (
        "Modus: Template-Studio.\n"
        "Baue wiederverwendbare Vorlagen mit Platzhaltern in eckigen Klammern, z. B. [NAME], [THEMA]."
    ),
    "knowledge_answer": (
        "Modus: Knowledge Q&A.\n"
        "Nutze ausschließlich den gelieferten Knowledge-Text. Wenn etwas fehlt, sag das ehrlich."
    ),
}


def build_system_prompt(action: ActionType, data: ActionData) -> str:
    """
    Baut den Systemprompt für die übergebene Action.
    """

    industry_candidate = (getattr(data, "industry", None) or "").strip().lower()
    industry_key = industry_candidate or DEFAULT_VERTICAL_KEY
    vertical = VERTICALS.get(industry_key) or VERTICALS[DEFAULT_VERTICAL_KEY]
    base_prompt = vertical.system_prompt

    sections: List[str] = [BASE_STYLE]
    industry_key = (data.industry or "").strip().lower() or "chief"
    vertical: VerticalConfig = VERTICALS.get(industry_key, VERTICALS["chief"])

    sections: List[str] = [
        vertical.system_prompt.strip(),
        BASE_STYLE,
    ]

    action_instruction = ACTION_INSTRUCTIONS.get(
        action,
        "Bleib hilfreich und fokussiert auf Umsatz."
    )

    if action == "lead_hunter":
        cfg: Optional[LeadHunterConfig] = getattr(data, "lead_hunter", None)
        query = (cfg.query or "").strip() if cfg and cfg.query else ""
        industry_hint = (cfg.industry or data.industry or "unbekannt").strip() or "unbekannt"
        region_hint = (cfg.region or "DACH").strip() or "DACH"
        max_results = cfg.max_results if cfg else 20
        min_team_size = cfg.min_team_size if cfg and cfg.min_team_size else None
        min_team_hint = (
            f"\n- Bevorzugte Teamgröße: mindestens {min_team_size} Personen."
            if min_team_size
            else ""
        )
        lead_hunter_prompt = dedent(
            f"""
            Du bist ein Research-Assistent für Lead-Generierung.

            ZIEL:
            Finde reale Firmen oder Personen, die zum Briefing passen.
            Fokus: Branche {industry_hint} in Region {region_hint}.
            Maximal {max_results} Vorschläge.{min_team_hint}

            REGELN:
            - Nutze nur öffentlich verfügbare Quellen (Webseiten, Branchenverzeichnisse, Presse).
            - Gib wenn möglich eine Impressums- oder Kontakt-URL an (z. B. /impressum, /imprint, /kontakt).
            - Erfinde keine Personen oder Firmen; lasse Felder leer, wenn du dir nicht sicher bist.
            - Jeder Eintrag sollte Quelle oder Hinweis enthalten (z. B. "Google Search").

            ANTWORTFORMAT:
            Gib deine Antwort ausschließlich als JSON im folgenden Format zurück (keine zusätzlichen Erklärungen!):
            {{
              "candidates": [
                {{
                  "name": "...",
                  "company": "...",
                  "role": "...",
                  "website_url": "https://...",
                  "impressum_url": "https://.../impressum",
                  "region": "...",
                  "source": "Google Search",
                  "notes": "Warum dieser Lead passt, max. 1 Satz"
                }}
              ]
            }}

            TEXT AUSSERHALB DES JSON IST VERBOTEN.

            QUERY:
            "{query}"
            """
        ).strip()
        sections.append(lead_hunter_prompt)
    else:
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
