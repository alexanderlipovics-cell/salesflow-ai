"""
Verwaltet Vertikalen und deren Systemprompts.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .prompts_chief import CHIEF_SYSTEM_PROMPT


@dataclass(frozen=True)
class VerticalConfig:
@dataclass
class VerticalConfig:
    """Konfiguration für eine Branchen-Vertikale von Sales Flow AI."""
    key: str
    label: str
    system_prompt: str
    default_followup_preset_key: Optional[str] = None


# Aktuell nur die Master-Vertikale für Alex selbst:
# SALES FLOW AI CHIEF – dein persönlicher God-Mode-Assistent.
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
    # Später können hier weitere Vertikalen ergänzt werden, z.B.:
    # "immo_pro": VerticalConfig(...),
    # "network_pro": VerticalConfig(...),
    # "finance_pro": VerticalConfig(...),
}

