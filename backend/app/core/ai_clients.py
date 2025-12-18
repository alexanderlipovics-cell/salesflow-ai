"""
AI Model Clients für SalesFlow AI.

Abstrakte Schnittstelle für verschiedene AI-Provider (OpenAI, Anthropic).
"""

import asyncio
import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any

from .ai_types import AIModelName, AIRequestResult

logger = logging.getLogger(__name__)


# Token-Preise pro 1M Tokens (USD) - Stand Dez 2024
TOKEN_PRICES: Dict[AIModelName, Dict[str, float]] = {
    AIModelName.GPT_4O: {"input": 2.50, "output": 10.00},
    AIModelName.GPT_4O_MINI: {"input": 0.15, "output": 0.60},
    AIModelName.CLAUDE_35_SONNET: {"input": 3.00, "output": 15.00},
    AIModelName.CLAUDE_35_HAIKU: {"input": 0.25, "output": 1.25},
}


def estimate_cost(model: AIModelName, input_tokens: int, output_tokens: int) -> float:
    """Schätzt Kosten für einen API-Call in USD."""
    prices = TOKEN_PRICES.get(model, {"input": 0, "output": 0})
    input_cost = (input_tokens / 1_000_000) * prices["input"]
    output_cost = (output_tokens / 1_000_000) * prices["output"]
    return round(input_cost + output_cost, 6)


class BaseAIClient(ABC):
    """Abstrakte Basis-Klasse für AI-Clients."""
    
    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: AIModelName,
        temperature: float = 0.35,
        max_tokens: int = 600,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Generiert eine AI-Antwort.
        
        Args:
            system_prompt: System-Prompt
            messages: Chat-Verlauf [{"role": "user/assistant", "content": "..."}]
            model: Zu verwendendes Modell
            temperature: Kreativität (0-1)
            max_tokens: Max Tokens für Antwort
            timeout: Timeout in Sekunden
        
        Returns:
            {
                "text": str,
                "tokens_prompt": int,
                "tokens_completion": int,
                "latency_ms": float
            }
        """
        pass
    
    @abstractmethod
    def supports_model(self, model: AIModelName) -> bool:
        """Prüft ob der Client das Modell unterstützt."""
        pass


class OpenAIClient(BaseAIClient):
    """Client für OpenAI API (GPT-4o, GPT-4o-mini)."""
    
    SUPPORTED_MODELS = {AIModelName.GPT_4O, AIModelName.GPT_4O_MINI}
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
    
    def _get_client(self):
        """Lazy-Load OpenAI Client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("openai package not installed")
        return self._client
    
    def supports_model(self, model: AIModelName) -> bool:
        return model in self.SUPPORTED_MODELS
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: AIModelName,
        temperature: float = 0.35,
        max_tokens: int = 600,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        if not self.supports_model(model):
            raise ValueError(f"OpenAI does not support {model}")
        
        client = self._get_client()
        start_time = time.time()
        
        # Messages für OpenAI formatieren
        openai_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            openai_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model.value,
                    messages=openai_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ),
                timeout=timeout
            )
            
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "text": response.choices[0].message.content or "",
                "tokens_prompt": response.usage.prompt_tokens if response.usage else 0,
                "tokens_completion": response.usage.completion_tokens if response.usage else 0,
                "latency_ms": latency_ms,
            }
            
        except asyncio.TimeoutError:
            logger.warning(f"OpenAI timeout after {timeout}s for model {model}")
            raise
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            raise


class AnthropicClient(BaseAIClient):
    """Client für Anthropic API (Claude 3.5)."""
    
    SUPPORTED_MODELS = {AIModelName.CLAUDE_35_SONNET, AIModelName.CLAUDE_35_HAIKU}
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = None
    
    def _get_client(self):
        """Lazy-Load Anthropic Client."""
        if self._client is None:
            try:
                from anthropic import AsyncAnthropic
                self._client = AsyncAnthropic(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("anthropic package not installed")
        return self._client
    
    def supports_model(self, model: AIModelName) -> bool:
        return model in self.SUPPORTED_MODELS
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: AIModelName,
        temperature: float = 0.35,
        max_tokens: int = 600,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        if not self.supports_model(model):
            raise ValueError(f"Anthropic does not support {model}")
        
        client = self._get_client()
        start_time = time.time()
        
        # Messages für Anthropic formatieren
        anthropic_messages = []
        for msg in messages:
            anthropic_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        try:
            response = await asyncio.wait_for(
                client.messages.create(
                    model=model.value,
                    system=system_prompt,
                    messages=anthropic_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ),
                timeout=timeout
            )
            
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "text": response.content[0].text if response.content else "",
                "tokens_prompt": response.usage.input_tokens if response.usage else 0,
                "tokens_completion": response.usage.output_tokens if response.usage else 0,
                "latency_ms": latency_ms,
            }
            
        except asyncio.TimeoutError:
            logger.warning(f"Anthropic timeout after {timeout}s for model {model}")
            raise
        except Exception as e:
            logger.error(f"Anthropic error: {e}")
            raise


class AIClientManager:
    """
    Verwaltet alle AI-Clients und bietet einheitliche Schnittstelle.
    """
    
    def __init__(self, openai_key: Optional[str] = None, anthropic_key: Optional[str] = None):
        self._clients: List[BaseAIClient] = []
        
        if openai_key:
            self._clients.append(OpenAIClient(openai_key))
            logger.info("OpenAI client initialized")
        
        if anthropic_key:
            self._clients.append(AnthropicClient(anthropic_key))
            logger.info("Anthropic client initialized")
        
        if not self._clients:
            logger.warning("No AI clients configured - using mock responses")
    
    def get_client_for_model(self, model: AIModelName) -> Optional[BaseAIClient]:
        """Findet den passenden Client für ein Modell."""
        for client in self._clients:
            if client.supports_model(model):
                return client
        return None
    
    def is_model_available(self, model: AIModelName) -> bool:
        """Prüft ob ein Modell verfügbar ist."""
        return self.get_client_for_model(model) is not None
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        model: AIModelName,
        temperature: float = 0.35,
        max_tokens: int = 600,
        timeout: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Generiert AI-Antwort mit dem passenden Client.
        
        Raises:
            ValueError: Wenn kein Client für das Modell verfügbar ist
        """
        client = self.get_client_for_model(model)
        
        if not client:
            # Fallback: Mock-Response wenn kein Client
            logger.warning(f"No client for {model}, returning mock response")
            return {
                "text": f"[Mock Response - {model.value} not configured]",
                "tokens_prompt": 0,
                "tokens_completion": 0,
                "latency_ms": 0,
            }
        
        return await client.generate(
            system_prompt=system_prompt,
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
        )


__all__ = [
    "BaseAIClient",
    "OpenAIClient",
    "AnthropicClient",
    "AIClientManager",
    "estimate_cost",
    "TOKEN_PRICES",
]

