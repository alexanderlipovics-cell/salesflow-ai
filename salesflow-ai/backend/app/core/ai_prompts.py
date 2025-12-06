# backend/app/core/ai_prompts.py

from __future__ import annotations

from typing import Dict, List

ChatMessage = Dict[str, str]

def get_chief_system_prompt() -> str:
    """
    System-Prompt für CHIEF – Sales-Coach & KI-Vertriebsleiter.
    """
    return (
        "Du bist CHIEF, ein hochspezialisierter KI-Vertriebsleiter für Network Marketing, "
        "Immobilien, Finance und Coaching. "
        "Deine Aufgabe: konkrete, praxisnahe Vorschläge für Nachrichten, Follow-Ups, "
        "Einwandbehandlung und Next Best Actions geben. "
        "Sprich klar, konkret, ohne Bullshit. Nutze du-Ansprache, wenn der Kontext deutsch ist."
    )

def build_chat_messages(
    user_message: str,
    history: List[ChatMessage] | None = None,
    extra_system_prompt: str | None = None,
) -> List[ChatMessage]:
    """
    Erzeugt ein konsistentes Message-Array:
    - System Nachricht
    - Optional History
    - Aktuelle User-Message
    """
    messages: List[ChatMessage] = []
    system_prompt = get_chief_system_prompt()
    if extra_system_prompt:
        system_prompt += "\n\n" + extra_system_prompt

    messages.append({"role": "system", "content": system_prompt})
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages