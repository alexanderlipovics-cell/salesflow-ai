"""
Verwaltet Vertikalen und deren Systemprompts.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .prompts_chief import CHIEF_SYSTEM_PROMPT


@dataclass(frozen=True)
class VerticalConfig:
    key: str
    label: str
    system_prompt: str
    default_followup_preset_key: Optional[str] = None


VERTICALS: Dict[str, VerticalConfig] = {
    "chief": VerticalConfig(
        key="chief",
        label="Sales Flow AI Chief",
        system_prompt=CHIEF_SYSTEM_PROMPT,
        default_followup_preset_key=None,
    ),
}

"""Spätere Erweiterungen:
- "immo_pro" (Immobilienmakler)
- "network_pro" (Network Marketing)
- "finance_pro" (Finanzvertrieb)
- "fitness_pro" (Coaches & Trainer)
"""

__all__ = ["VerticalConfig", "VERTICALS"]
