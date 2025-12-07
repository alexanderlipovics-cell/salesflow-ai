# backend/app/domain/ai_orchestrator/service.py

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.orchestrator import AIOrchestrator
from app.ai.scenarios import ScenarioId


class DomainAIService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def run_json(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        variables: Dict[str, Any],
        request_id: Optional[str],
    ) -> Dict[str, Any]:
        orchestrator = AIOrchestrator(self.db)
        return await orchestrator.run_json_scenario(
            tenant_id=tenant_id,
            scenario_id=scenario_id,
            variables=variables,
            request_id=request_id,
        )

    async def run_text(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        variables: Dict[str, Any],
        request_id: Optional[str],
    ) -> str:
        orchestrator = AIOrchestrator(self.db)
        return await orchestrator.run_scenario(
            tenant_id=tenant_id,
            scenario_id=scenario_id,
            variables=variables,
            request_id=request_id,
        )

