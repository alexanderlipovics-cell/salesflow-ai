"""
OpenAI Client Wrapper für das Sales Flow AI Backend.
"""

from __future__ import annotations

from typing import Any, List

from openai import OpenAI

from .config import get_settings
from .schemas import ActionData, ActionType, ChatMessage


class AIClient:
    """
    Dünne Abstraktion über die OpenAI Responses API.
    Alle vendor-spezifischen Details bleiben hier gekapselt.
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        if not api_key:
            raise ValueError("OPENAI_API_KEY fehlt.")
        self._model = model
        self._client = OpenAI(api_key=api_key)

    def generate(self, system_prompt: str, messages: List[ChatMessage]) -> str:
        """
        Erzeugt eine Antwort basierend auf Systemprompt + Chatverlauf.
        """

        input_payload = self._build_payload(system_prompt, messages)
        response = self._client.responses.create(
            model=self._model,
            temperature=0.35,
            max_output_tokens=600,
            input=input_payload,
        )
        return self._extract_text(response)

    @staticmethod
    def _build_payload(system_prompt: str, messages: List[ChatMessage]):
        payload = []
        if system_prompt:
            payload.append(
                {
                    "role": "system",
                    "content": [{"type": "text", "text": system_prompt}],
                }
            )
        for message in messages:
            payload.append(
                {
                    "role": message.role,
                    "content": [{"type": "text", "text": message.content}],
                }
            )
        return payload

    @staticmethod
    def _extract_text(response: Any) -> str:
        chunks: List[str] = []
        for item in getattr(response, "output", []):
            for content in getattr(item, "content", []):
                if getattr(content, "type", None) == "text":
                    text = getattr(content, "text", "").strip()
                    if text:
                        chunks.append(text)
        return "\n".join(chunks).strip() or "Ich habe dazu gerade keine Idee."


def choose_model_for_action(action: ActionType, data: ActionData) -> str:
    """
    Wählt ein Modell in Abhängigkeit von Action-Typ und Payload.
    Aktuell: Platzhalter-Logik für zukünftige Research-Modelle.
    """

    settings = get_settings()
    gemini_model = getattr(settings, "gemini_model", None)

    if action == "lead_hunter" and gemini_model:
        return gemini_model

    return settings.openai_model


__all__ = ["AIClient", "choose_model_for_action"]
