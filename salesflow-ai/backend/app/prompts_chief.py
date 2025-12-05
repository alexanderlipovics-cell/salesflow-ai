"""
Systemprompts für die Sales Flow AI Chief Vertikale.

WICHTIG: Der CHIEF_SYSTEM_PROMPT wurde in den zentralen Prompt-Hub verschoben.
Diese Datei exportiert nur noch den Import für Abwärtskompatibilität.

Neuer Standort: app/core/ai_prompts.py → CHIEF_FOUNDER_PROMPT
"""

# Import aus dem zentralen Prompt-Hub
from .core.ai_prompts import CHIEF_FOUNDER_PROMPT

# Für Abwärtskompatibilität: Alias auf den zentralen Prompt
CHIEF_SYSTEM_PROMPT = CHIEF_FOUNDER_PROMPT

__all__ = ["CHIEF_SYSTEM_PROMPT", "CHIEF_FOUNDER_PROMPT"]
