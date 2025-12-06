# backend/app/services/ai_service.py

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

from app.ai_client import chat_completion, stream_chat_response
from app.core.ai_prompts import build_chat_messages

logger = logging.getLogger(__name__)

ChatMessage = Dict[str, str]

def estimate_query_complexity(message: str) -> float:
    """
    Sehr einfache Heuristik:
    - Länge
    - 'schwere' Begriffe
    → 0.0 bis 1.0
    """
    text = message.lower()
    length_score = min(len(text) / 1000.0, 1.0)
    complexity_keywords = [
        "strategie",
        "einwand",
        "objection",
        "vertriebsstruktur",
        "analyse",
        "multi-step",
        "pipeline",
        "forecast",
    ]
    keyword_score = 0.0
    if any(k in text for k in complexity_keywords):
        keyword_score = 0.4
    return min(1.0, length_score + keyword_score)

def select_optimal_model(query_complexity: float, budget_constraint: bool) -> str:
    """
    GPT-4 für komplexe Sales-Situationen
    GPT-4-turbo für mittlere Komplexität
    GPT-4o-mini (oder ähnliches) für Standard
    """
    if query_complexity > 0.8 or budget_constraint is False:
        return "gpt-4"
    elif query_complexity > 0.5:
        return "gpt-4-turbo"
    else:
        return "gpt-4o-mini"

@dataclass
class AiResponse:
    model: str
    content: str
    query_complexity: float

class AiService:
    """
    Orchestriert:
    - Prompt-Aufbau
    - Model-Wahl
    - Streaming / Non-Streaming
    """
    def __init__(self, budget_constraint: bool = True) -> None:
        self.budget_constraint = budget_constraint

    def _select_model_for_message(self, message: str) -> str:
        complexity = estimate_query_complexity(message)
        model = select_optimal_model(complexity, self.budget_constraint)
        logger.info("AI model selected: %s (complexity=%.2f)", model, complexity)
        return model

    async def chat(
        self,
        user_message: str,
        conversation_history: Optional[List[ChatMessage]] = None,
        extra_system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> AiResponse:
        complexity = estimate_query_complexity(user_message)
        model = select_optimal_model(complexity, self.budget_constraint)
        messages = build_chat_messages(
            user_message=user_message,
            history=conversation_history,
            extra_system_prompt=extra_system_prompt,
        )
        content = await chat_completion(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return AiResponse(
            model=model,
            content=content,
            query_complexity=complexity,
        )

    async def stream_chat(
        self,
        user_message: str,
        conversation_history: Optional[List[ChatMessage]] = None,
        extra_system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
    ):
        """
        Gibt einen Async-Generator zurück, der einzelne Text-Chunks liefert.
        (Wird vom Router in StreamingResponse eingehängt.)
        """
        complexity = estimate_query_complexity(user_message)
        model = select_optimal_model(complexity, self.budget_constraint)
        messages = build_chat_messages(
            user_message=user_message,
            history=conversation_history,
            extra_system_prompt=extra_system_prompt,
        )
        async for chunk in stream_chat_response(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        ):
            yield chunk
