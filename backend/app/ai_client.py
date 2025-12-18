# backend/app/ai_client.py

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

from openai import AsyncOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Zentrale AI-Client-Instanz
client = AsyncOpenAI(api_key=get_settings().openai_api_key)

ChatMessage = Dict[str, str]  # {"role": "system|user|assistant", "content": "..."}


class AIClient:
    """
    Wrapper-Klasse für OpenAI API Calls.
    Unterstützt sowohl synchrone als auch asynchrone Aufrufe.
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self._client = AsyncOpenAI(api_key=api_key)
    
    def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        """
        Synchrone generate Methode für Kompatibilität.
        Nutzt intern asyncio.run für async OpenAI Calls.
        Funktioniert auch in async Kontexten durch Nutzung eines neuen Event Loops in einem Thread.
        """
        try:
            # Prüfe ob bereits ein Event Loop läuft
            try:
                loop = asyncio.get_running_loop()
                # Loop läuft bereits (z.B. in FastAPI) - nutze ThreadPoolExecutor mit neuer Event Loop
                import concurrent.futures
                def run_in_new_loop():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(
                            self._generate_async(system_prompt, messages, max_tokens, temperature)
                        )
                    finally:
                        new_loop.close()
                
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(run_in_new_loop)
                    return future.result()
            except RuntimeError:
                # Keine laufende Loop, nutze asyncio.run direkt
                return asyncio.run(self._generate_async(system_prompt, messages, max_tokens, temperature))
        except Exception as e:
            logger.error(f"Error in AIClient.generate: {e}")
            raise
    
    async def generate_async(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 512,
        temperature: float = 0.7,
    ) -> str:
        """
        Asynchrone generate Methode für async Kontexte (z.B. FastAPI).
        """
        return await self._generate_async(system_prompt, messages, max_tokens, temperature)
    
    async def _generate_async(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> str:
        """Interne async Methode für generate."""
        # Messages formatieren: System-Prompt hinzufügen
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Context optimieren
        optimized_messages = optimize_context_window(formatted_messages)
        
        # OpenAI API Call
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=optimized_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        return response.choices[0].message.content or ""

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
    from app.core.config import get_settings
    settings = get_settings()
    model_name = model or settings.openai_embedding_model or "text-embedding-3-small"
    resp = await client.embeddings.create(
        model=model_name,
        input=text,
    )
    return resp.data[0].embedding