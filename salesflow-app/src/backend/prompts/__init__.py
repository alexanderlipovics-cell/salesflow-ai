"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PROMPTS PACKAGE                                                           ║
║  Zentrale Prompt-Struktur für CHIEF AI                                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from .chief_core import (
    CHIEF_CORE_PROMPT,
    SKILL_LEVEL_PROMPTS,
    CHIEF_CONTEXT_TEMPLATE,
    get_full_prompt,
    get_skill_level_label,
    format_context,
)

# Vertical Prompts
from .verticals.network_marketing import get_network_marketing_prompt
from .verticals.field_sales import get_field_sales_prompt
from .verticals.general import get_general_prompt

# Action Prompts
from .actions.chat import get_chat_prompt
from .actions.analyze_lead import get_analyze_lead_prompt
from .actions.generate_message import get_generate_message_prompt
from .actions.handle_objection import get_handle_objection_prompt
from .actions.daily_flow import get_daily_flow_prompt

# Module Prompts
from .modules.phoenix import get_phoenix_prompt, detect_phoenix_trigger
from .modules.delay_master import get_delay_master_prompt
from .modules.dmo_tracker import get_dmo_tracker_prompt
from .modules.ghostbuster import get_ghostbuster_prompt

__all__ = [
    # Core
    "CHIEF_CORE_PROMPT",
    "SKILL_LEVEL_PROMPTS",
    "CHIEF_CONTEXT_TEMPLATE",
    "get_full_prompt",
    "get_skill_level_label",
    "format_context",
    # Verticals
    "get_network_marketing_prompt",
    "get_field_sales_prompt",
    "get_general_prompt",
    # Actions
    "get_chat_prompt",
    "get_analyze_lead_prompt",
    "get_generate_message_prompt",
    "get_handle_objection_prompt",
    "get_daily_flow_prompt",
    # Modules
    "get_phoenix_prompt",
    "detect_phoenix_trigger",
    "get_delay_master_prompt",
    "get_dmo_tracker_prompt",
    "get_ghostbuster_prompt",
]

