"""
AI Module - Vision & Prompts

Enthält alle AI-bezogenen Komponenten:
- Vision Prompts für GPT-4o
- Text Generation Prompts
"""

from .prompts.vision_prompts import (
    VISION_SCREENSHOT_PROMPT,
    VISION_WHATSAPP_PROMPT,
    VISION_INSTAGRAM_PROMPT,
    VISION_LINKEDIN_PROMPT,
    VISION_FALLBACK_PROMPT,
)

__all__ = [
    "VISION_SCREENSHOT_PROMPT",
    "VISION_WHATSAPP_PROMPT",
    "VISION_INSTAGRAM_PROMPT",
    "VISION_LINKEDIN_PROMPT",
    "VISION_FALLBACK_PROMPT",
]

