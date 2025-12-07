# backend/app/ai/orchestrator.py

from __future__ import annotations

import json
import time
import uuid
from typing import Any, Dict, Optional

import structlog
from sentry_sdk import capture_exception
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.scenarios import SCENARIOS, ScenarioId
from app.ai.prompt_store import PromptStore
from app.ai.router import ModelRouter, MODEL_PRICES_USD
from app.ai.tracker import AiCallTracker
from app.ai.fallback import get_fallback_models
from app.ai_client import chat_completion  # dein OpenAI-Wrapper

logger = structlog.get_logger()


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


class AIOrchestrator:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.prompt_store = PromptStore(db)
        self.model_router = ModelRouter(db)
        self.tracker = AiCallTracker(db)

    async def run_scenario(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        variables: Dict[str, Any],
        request_id: Optional[str] = None,
        temperature: float = 0.7,
    ) -> str:
        scenario = SCENARIOS[scenario_id]
        log = logger.bind(
            tenant_id=str(tenant_id),
            scenario_id=scenario_id.value,
            request_id=request_id,
        )

        prompt_config = await self.prompt_store.get_active_prompt(tenant_id, scenario_id)
        if not prompt_config:
            msg = f"No prompt configured for scenario {scenario_id.value}"
            log.error(msg)
            raise RuntimeError(msg)

        user_content = prompt_config.user_template.format(**variables)
        system_content = prompt_config.system_prompt

        full_text = system_content + "\n\n" + user_content
        estimated_tokens = _estimate_tokens(full_text)

        model = await self.model_router.select_model(
            tenant_id=tenant_id,
            scenario=scenario,
            expected_tokens=estimated_tokens,
        )

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]

        start = time.monotonic()
        prompt_tokens = estimated_tokens
        completion_tokens = 0
        cost_usd = 0.0
        last_exc: Optional[Exception] = None

        for current_model in [model] + get_fallback_models(model):
            try:
                t0 = time.monotonic()
                content = await chat_completion(
                    messages=messages,
                    model=current_model,
                    max_tokens=scenario.max_tokens,
                    temperature=temperature,
                )
                latency_ms = int((time.monotonic() - t0) * 1000)

                completion_tokens = _estimate_tokens(content)
                total_input_k = prompt_tokens / 1000.0
                total_output_k = completion_tokens / 1000.0
                pricing = MODEL_PRICES_USD.get(current_model, {"input": 0.0, "output": 0.0})
                cost_usd = (
                    total_input_k * pricing["input"]
                    + total_output_k * pricing["output"]
                )

                await self.model_router.add_token_usage(
                    tenant_id=tenant_id,
                    scenario_id=scenario_id,
                    tokens=prompt_tokens + completion_tokens,
                )

                await self.tracker.log_success(
                    tenant_id=tenant_id,
                    scenario_id=scenario_id.value,
                    model=current_model,
                    request_id=request_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    cost_usd=cost_usd,
                    latency_ms=latency_ms,
                )

                log.info(
                    "AI scenario executed",
                    model=current_model,
                    latency_ms=latency_ms,
                    cost_usd=cost_usd,
                )
                return content

            except Exception as exc:
                capture_exception(exc)
                last_exc = exc
                latency_ms = int((time.monotonic() - start) * 1000)
                await self.tracker.log_failure(
                    tenant_id=tenant_id,
                    scenario_id=scenario_id.value,
                    model=current_model,
                    request_id=request_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    cost_usd=cost_usd,
                    latency_ms=latency_ms,
                    error_type=type(exc).__name__,
                )
                log.error("AI scenario failed", model=current_model, error=str(exc))
                continue

        raise RuntimeError(f"All models failed for scenario {scenario_id.value}") from last_exc

    async def run_json_scenario(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        variables: Dict[str, Any],
        request_id: Optional[str] = None,
        temperature: float = 0.3,
    ) -> Dict[str, Any]:
        content = await self.run_scenario(
            tenant_id=tenant_id,
            scenario_id=scenario_id,
            variables=variables,
            request_id=request_id,
            temperature=temperature,
        )
        return json.loads(content)

