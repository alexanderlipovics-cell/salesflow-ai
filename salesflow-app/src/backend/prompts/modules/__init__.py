"""Module Prompts Package"""

from .phoenix import get_phoenix_prompt, detect_phoenix_trigger
from .delay_master import get_delay_master_prompt
from .dmo_tracker import get_dmo_tracker_prompt
from .ghostbuster import get_ghostbuster_prompt

__all__ = [
    "get_phoenix_prompt",
    "detect_phoenix_trigger",
    "get_delay_master_prompt",
    "get_dmo_tracker_prompt",
    "get_ghostbuster_prompt",
]

