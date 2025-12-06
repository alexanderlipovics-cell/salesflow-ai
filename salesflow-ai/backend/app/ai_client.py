# backend/app/ai_client.py

from __future__ import annotations

import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Zentrale AI-Client-Instanz
client = AsyncOpenAI(api_key=settings.openai_api_key)

ChatMessage = Dict[str, str]  # {"role": "system|user|assistant", "content": "..."}

def estimate_token_count(messages: List[ChatMessage]) -> int:
    """
    Grobe Heuristik: ~4 Zeichen pro Token + etwas Overhead.
    Für produktiven Einsatz kannst du tiktoken integrieren.
    """
    total_chars = sum(len(m.get("content", "")) for m in messages)
    return total_chars // 4 + len(messages) * 10

def optimize_context_window(
    messages: List[ChatMessage],
    max_tokens: int = 6000,
    preserve_system: bool = True,
    keep_last_n: int = 10,
) -> List[ChatMessage]:
    """
    Intelligente Context-Komprimierung:
    - Behalte System-Prompts
    - Behalte die letzten N Nachrichten
    - Entferne ältere User/Assistant-Paare, bis Tokenlimit passt
    (später kannst du hier Summaries einbauen)
    """
    if not messages:
        return []
    # System-Messages separieren
    system_msgs: List[ChatMessage] = []
    non_system_msgs: List[ChatMessage] = []
    for m in messages:
        if preserve_system and m.get("role") == "system":
            system_msgs.append(m)
        else:
            non_system_msgs.append(m)

    # Letzte N nicht-System-Messages behalten
    base_context = system_msgs + non_system_msgs[-keep_last_n:]

    current_tokens = estimate_token_count(base_context)

    # Falls immer noch zu groß: ältere Messages weiter wegschneiden
    while current_tokens > max_tokens and len(non_system_msgs) > keep_last_n:
        # schneide vom Anfang weg
        non_system_msgs = non_system_msgs[1:]
        base_context = system_msgs + non_system_msgs[-keep_last_n:]
        current_tokens = estimate_token_count(base_context)

    if current_tokens > max_tokens:
        # als Fallback: nur System + allerletzte Nachricht
        logger.warning("Context immer noch zu groß – harte Kürzung auf letzte Nachricht.")
        last_user = next((m for m in reversed(messages) if m["role"] == "user"), None)
        base_context = system_msgs + ([last_user] if last_user else [])

    return base_context

async def chat_completion(
    messages: List[ChatMessage],
    model: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
) -> str:
    """
    Einmaliger Chat-Call ohne Streaming.
    """
    optimized_messages = optimize_context_window(messages)
    resp = await client.chat.completions.create(
        model=model,
        messages=optimized_messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return resp.choices[0].message.content or ""

async def stream_chat_response(
    messages: List[ChatMessage],
    model: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """
    Stream GPT-Antwort in Echtzeit.
    Wird in FastAPI über StreamingResponse ausgespielt.
    """
    optimized_messages = optimize_context_window(messages)
    stream = await client.chat.completions.create(
        model=model,
        messages=optimized_messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content

async def get_embedding(text: str, model: Optional[str] = None) -> List[float]:
    """
    Embedding-Wrapper für pgvector (z. B. für Conversation Memory).
    """
    model_name = model or settings.openai_embedding_model or "text-embedding-3-small"
    resp = await client.embeddings.create(
        model=model_name,
        input=text,
    )
    return resp.data[0].embedding