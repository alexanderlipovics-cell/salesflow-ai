"""
AI Model Router - Route tasks to cheapest capable model.

Haiku: $0.001/1K tokens (simple tasks)
Sonnet: $0.015/1K tokens (complex tasks)
"""

# Simple tasks → Haiku (90% günstiger)
HAIKU_TASKS = {
    "extract_name",           # Screenshot name extraction
    "detect_intent",          # Voice command intent
    "categorize_objection",   # Match objection to template
    "parse_contact_list",     # Simple list parsing
    "sentiment_analysis",     # Basic sentiment
    "extract_phone",          # Phone number extraction
    "extract_email",          # Email extraction
    "language_detection",     # Detect language
}


# Complex tasks → Sonnet
SONNET_TASKS = {
    "analyze_conversation",   # Full chat analysis
    "generate_response",      # Objection response generation
    "meeting_prep",           # Research synthesis
    "proposal_intro",         # Creative writing
    "stakeholder_inference",  # Complex reasoning
    "personality_analysis",   # DISG profiling
}

# Vision-Spezialfälle (benötigen Vision-Modell)
VISION_TASKS = {
    "vision_extraction",
    "receipt_vision",
}

VISION_MODEL = "claude-sonnet-4-20250514"


def get_model_for_task(task_type: str) -> str:
    """Route to günstigstes Modell, das den Task beherrscht."""
    if task_type in VISION_TASKS:
        return VISION_MODEL
    if task_type in HAIKU_TASKS:
        # Aktualisiertes Haiku-Modell
        return "claude-haiku-4-5-20251001"
    return "claude-sonnet-4-20250514"


def get_max_tokens_for_task(task_type: str) -> int:
    """Limit Tokens basierend auf Komplexität."""
    if task_type in VISION_TASKS:
        return 2000
    if task_type in HAIKU_TASKS:
        return 500  # Simple Tasks brauchen weniger
    return 2000  # Komplexe Tasks brauchen mehr
"""
AI Router für SalesFlow AI.

Zentraler Entry-Point für alle AI-Anfragen mit:
- Smart Model Routing
- Fallback-Handling
- Retry-Logic
- Monitoring & Metrics
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any
from uuid import uuid4

from .ai_types import (
    AIModelName,
    AITaskType,
    ImportanceLevel,
    CostSensitivity,
    AIRequestConfig,
    AIRequestResult,
)
from .ai_policies import select_model, get_fallback_models
from .ai_clients import AIClientManager, estimate_cost
from .ai_metrics import get_metrics

logger = logging.getLogger(__name__)




class AIRouter:
    """
    Zentraler Router für alle AI-Anfragen.
    
    Features:
    - Smart Model Selection basierend auf Task Type
    - Automatisches Fallback bei Fehlern
    - Retry mit Exponential Backoff
    - Metrics Collection
    """
    
    def __init__(
        self,
        client_manager: AIClientManager,
        default_temperature: float = 0.35,
        default_max_tokens: int = 600,
        default_timeout: float = 30.0,
        default_retry_count: int = 3,
    ):
        self.client_manager = client_manager
        self.default_temperature = default_temperature
        self.default_max_tokens = default_max_tokens
        self.default_timeout = default_timeout
        self.default_retry_count = default_retry_count
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        task_type: AITaskType,
        config: Optional[AIRequestConfig] = None,
        prompt_key: str = "default",
        prompt_version: str = "v1",
        prompt_variant: str = "A",
    ) -> AIRequestResult:
        """
        Generiert AI-Antwort mit Smart Routing und Fallback.
        
        Args:
            system_prompt: System-Prompt
            messages: Chat-Verlauf
            task_type: Task-Kategorie für Routing
            config: Optionale Request-Konfiguration
            prompt_key: Prompt-Schlüssel für Tracking
            prompt_version: Version für Tracking
            prompt_variant: Variante für A/B-Testing
        
        Returns:
            AIRequestResult mit Antwort und Metriken
        """
        config = config or {}
        request_id = str(uuid4())
        
        # Konfiguration auflösen
        importance = ImportanceLevel(config.get("importance", ImportanceLevel.MEDIUM))
        cost_sensitivity = CostSensitivity(config.get("cost_sensitivity", CostSensitivity.MEDIUM))
        explicit_model = config.get("model")
        temperature = config.get("temperature", self.default_temperature)
        max_tokens = config.get("max_tokens", self.default_max_tokens)
        timeout = config.get("timeout", self.default_timeout)
        retry_count = config.get("retry_count", self.default_retry_count)
        enable_fallback = config.get("enable_fallback", True)
        
        # Modell auswählen
        primary_model = select_model(
            task_type=task_type,
            importance=importance,
            cost_sensitivity=cost_sensitivity,
            explicit_model=explicit_model,
        )
        
        # Fallback-Liste erstellen
        models_to_try = [primary_model]
        if enable_fallback:
            models_to_try.extend(get_fallback_models(primary_model))
        
        # Request ausführen mit Fallback
        last_error = None
        total_retries = 0
        fallback_used = False
        
        for model in models_to_try:
            if not self.client_manager.is_model_available(model):
                logger.debug(f"Model {model} not available, skipping")
                continue
            
            for attempt in range(retry_count):
                try:
                    start_time = time.time()
                    
                    result = await self.client_manager.generate(
                        system_prompt=system_prompt,
                        messages=messages,
                        model=model,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        timeout=timeout,
                    )
                    
                    latency_ms = (time.time() - start_time) * 1000
                    cost = estimate_cost(
                        model,
                        result["tokens_prompt"],
                        result["tokens_completion"]
                    )
                    
                    # Erfolg - Metriken aufzeichnen
                    get_metrics().record_request_success(
                        request_id=request_id,
                        task_type=task_type,
                        model_requested=primary_model,
                        model_used=model,
                        latency_ms=latency_ms,
                        tokens_prompt=result["tokens_prompt"],
                        tokens_completion=result["tokens_completion"],
                        fallback_used=model != primary_model,
                        retry_count=total_retries,
                        prompt_key=prompt_key,
                        prompt_version=prompt_version,
                        prompt_variant=prompt_variant,
                    )
                    
                    return AIRequestResult(
                        text=result["text"],
                        model_used=model,
                        prompt_key=prompt_key,
                        prompt_version=prompt_version,
                        prompt_variant=prompt_variant,
                        tokens_prompt=result["tokens_prompt"],
                        tokens_completion=result["tokens_completion"],
                        cost_estimate=cost,
                        latency_ms=latency_ms,
                        fallback_used=model != primary_model,
                        retry_count=total_retries,
                        metadata={
                            "request_id": request_id,
                            "primary_model": primary_model.value,
                            "task_type": task_type.value,
                        }
                    )
                    
                except asyncio.TimeoutError:
                    last_error = f"Timeout ({timeout}s)"
                    total_retries += 1
                    logger.warning(f"Request timeout for {model}, attempt {attempt + 1}/{retry_count}")
                    
                except Exception as e:
                    last_error = str(e)
                    total_retries += 1
                    logger.warning(f"Request failed for {model}: {e}, attempt {attempt + 1}/{retry_count}")
                
                # Exponential backoff between retries
                if attempt < retry_count - 1:
                    await asyncio.sleep(0.5 * (2 ** attempt))
            
            # Dieses Modell hat nicht funktioniert, nächstes versuchen
            fallback_used = True
            logger.info(f"Falling back from {model} to next model")
        
        # Alle Modelle fehlgeschlagen
        get_metrics().record_request_failure(
            request_id=request_id,
            task_type=task_type,
            model_requested=primary_model,
            model_used=primary_model,
            latency_ms=0,
            error_type="all_models_failed",
            error_message=last_error or "Unknown error",
            retry_count=total_retries,
        )
        
        raise RuntimeError(f"All AI models failed. Last error: {last_error}")
    
    def get_metrics_summary(self, last_n: int = 100) -> Dict[str, Any]:
        """Gibt Metrics-Summary zurück."""
        return get_metrics().get_summary(last_n)


# Factory für AIRouter
def create_ai_router(
    openai_key: Optional[str] = None,
    anthropic_key: Optional[str] = None,
) -> AIRouter:
    """
    Erstellt einen konfigurierten AIRouter.
    
    Args:
        openai_key: OpenAI API Key
        anthropic_key: Anthropic API Key
    
    Returns:
        Konfigurierter AIRouter
    """
    client_manager = AIClientManager(
        openai_key=openai_key,
        anthropic_key=anthropic_key,
    )
    
    return AIRouter(client_manager=client_manager)


__all__ = [
    "AIRouter",
    "create_ai_router",
]

