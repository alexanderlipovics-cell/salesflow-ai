"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LLM CLIENT                                                                ║
║  Unified Client für OpenAI, Anthropic und Supabase Edge Functions          ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.services.llm_client import get_llm_client, LLMClient
    
    client = get_llm_client()
    response = await client.chat(messages=[
        {"role": "system", "content": "Du bist ein hilfreicher Assistent."},
        {"role": "user", "content": "Hallo!"},
    ])
    print(response)  # "Hallo! Wie kann ich dir helfen?"
"""

from typing import Optional, Literal
from dataclasses import dataclass
import httpx

from ..core.config import settings


# ═══════════════════════════════════════════════════════════════════════════
# TYPES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class LLMResponse:
    """Response von einem LLM Call."""
    content: str
    model: str
    provider: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# BASE CLIENT
# ═══════════════════════════════════════════════════════════════════════════

class LLMClient:
    """
    Unified LLM Client.
    
    Unterstützt:
    - OpenAI (GPT-4o, GPT-4o-mini, etc.)
    - Anthropic (Claude 3.5 Sonnet, etc.)
    - Supabase Edge Function (als Proxy)
    """
    
    def __init__(
        self,
        provider: Literal["openai", "anthropic", "supabase_edge"] = None,
        model: str = None,
        temperature: float = None,
        max_tokens: int = None,
    ):
        self.provider = provider or settings.LLM_PROVIDER
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.max_tokens = max_tokens or settings.LLM_MAX_TOKENS
        
        # Set model based on provider
        if model:
            self.model = model
        elif self.provider == "anthropic":
            self.model = settings.ANTHROPIC_MODEL
        else:
            self.model = settings.OPENAI_MODEL
    
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        model: str = None,
        temperature: float = None,
        max_tokens: int = None,
    ) -> str:
        """
        Einfache Generate-Methode für System+User Prompt.
        
        Args:
            system_prompt: System-Prompt
            user_message: User-Nachricht
            model: Override für Model
            temperature: Override für Temperature
            max_tokens: Override für Max Tokens
            
        Returns:
            Response Content als String
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        return await self.chat(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def chat(
        self,
        messages: list[dict],
        model: str = None,
        temperature: float = None,
        max_tokens: int = None,
        json_mode: bool = False,
    ) -> str:
        """
        Sendet Chat-Completion Request an den konfigurierten Provider.
        
        Args:
            messages: Liste von Message-Dicts [{role, content}, ...]
            model: Override für Model
            temperature: Override für Temperature
            max_tokens: Override für Max Tokens
            json_mode: JSON Response erzwingen (nur OpenAI)
            
        Returns:
            Response Content als String
        """
        model = model or self.model
        temperature = temperature if temperature is not None else self.temperature
        max_tokens = max_tokens or self.max_tokens
        
        if self.provider == "supabase_edge":
            return await self._call_supabase_edge(
                messages, model, temperature, max_tokens, json_mode
            )
        elif self.provider == "anthropic":
            return await self._call_anthropic(
                messages, model, temperature, max_tokens
            )
        else:
            return await self._call_openai(
                messages, model, temperature, max_tokens, json_mode
            )
    
    async def _call_openai(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool = False,
    ) -> str:
        """Direct OpenAI API Call."""
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            
            if response.status_code != 200:
                error_detail = response.text
                raise Exception(f"OpenAI API error ({response.status_code}): {error_detail}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def _call_anthropic(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Direct Anthropic API Call."""
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        
        # Anthropic braucht System-Messages separat
        system_content = ""
        user_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_content += msg["content"] + "\n\n"
            else:
                user_messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                })
        
        # Anthropic braucht mindestens eine User Message
        if not user_messages:
            user_messages = [{"role": "user", "content": "Hallo"}]
        
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": user_messages,
        }
        
        if system_content.strip():
            payload["system"] = system_content.strip()
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            
            if response.status_code != 200:
                error_detail = response.text
                raise Exception(f"Anthropic API error ({response.status_code}): {error_detail}")
            
            data = response.json()
            return data["content"][0]["text"]
    
    async def _call_supabase_edge(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool = False,
    ) -> str:
        """Call via Supabase Edge Function (ai-chat)."""
        edge_url = settings.SUPABASE_EDGE_FUNCTION_URL
        if not edge_url:
            # Fallback: Konstruiere URL aus Supabase URL
            edge_url = f"{settings.SUPABASE_URL}/functions/v1/ai-chat"
        
        payload = {
            "messages": messages,
            "model": model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "json_mode": json_mode,
            "mode": "chief-chat",
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                edge_url,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            
            if response.status_code != 200:
                error_detail = response.text
                raise Exception(f"Supabase Edge Function error ({response.status_code}): {error_detail}")
            
            data = response.json()
            
            if not data.get("success"):
                raise Exception(f"Edge Function failed: {data.get('error', 'Unknown error')}")
            
            return data.get("content", "")


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════

_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """
    Gibt den konfigurierten LLM Client zurück.
    
    Singleton-Pattern für Performance.
    """
    global _llm_client
    
    if _llm_client is None:
        _llm_client = LLMClient()
    
    return _llm_client


async def call_llm(
    messages: list[dict],
    model: str = None,
    temperature: float = None,
    max_tokens: int = None,
) -> str:
    """
    Convenience Function für einfache LLM Calls.
    
    Usage:
        response = await call_llm([
            {"role": "system", "content": "Du bist ein Sales Coach."},
            {"role": "user", "content": "Wie starte ich meinen Tag?"},
        ])
    """
    client = get_llm_client()
    return await client.chat(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )

