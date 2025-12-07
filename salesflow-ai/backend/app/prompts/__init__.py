"""Prompt stubs package."""

from .cold_call_prompts import get_cold_call_gpt_prompt
from .performance_coach_prompts import get_performance_coach_gpt_prompt

__all__ = [
    "get_cold_call_gpt_prompt",
    "get_performance_coach_gpt_prompt",
]

