# backend/app/ai/fallback.py

from __future__ import annotations
from typing import List


def get_fallback_models(original_model: str) -> List[str]:
    if original_model == "gpt-4o":
        return ["gpt-4o-mini"]
    if original_model == "gpt-4o-mini":
        return []
    return ["gpt-4o-mini"]

