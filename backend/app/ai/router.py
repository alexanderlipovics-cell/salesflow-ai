# backend/app/ai/router.py

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Dict

import structlog
from sqlalchemy import Column, Date, DateTime, BigInteger, Integer, String, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base_class import Base
from app.ai.scenarios import ScenarioDefinition, ScenarioId

logger = structlog.get_logger()


class TokenBudget(Base):
    __tablename__ = "ai_token_budgets"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    scenario_id = Column(String(64), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    monthly_token_limit = Column(BigInteger, nullable=False)
    tokens_used = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


MODEL_PRICES_USD: Dict[str, Dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.0005, "output": 0.00075},
    "gpt-4o": {"input": 0.0025, "output": 0.005},
}


class ModelRouter:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def select_model(
        self,
        tenant_id: uuid.UUID,
        scenario: ScenarioDefinition,
        expected_tokens: int,
    ) -> str:
        log = logger.bind(tenant_id=str(tenant_id), scenario=scenario.id.value)
        await self._ensure_budget(tenant_id, scenario.id, expected_tokens)

        if scenario.latency_sensitivity > 0.8 and scenario.cost_sensitivity < 0.9:
            model = "gpt-4o"
        else:
            model = "gpt-4o-mini"

        log.info("AI model selected", model=model, expected_tokens=expected_tokens)
        return model

    async def _ensure_budget(
        self,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        expected_tokens: int,
    ) -> None:
        today = date.today()
        period_start = date(today.year, today.month, 1)

        stmt = (
            select(TokenBudget)
            .where(
                TokenBudget.tenant_id == tenant_id,
                TokenBudget.scenario_id == scenario_id.value,
                TokenBudget.period_start == period_start,
            )
        )
        res = await self.db.execute(stmt)
        budget = res.scalar_one_or_none()

        if not budget:
            budget = TokenBudget(
                tenant_id=tenant_id,
                scenario_id=scenario_id.value,
                period_start=period_start,
                monthly_token_limit=1_000_000,
                tokens_used=0,
            )
            self.db.add(budget)
            await self.db.commit()
            await self.db.refresh(budget)

        if budget.tokens_used + expected_tokens > budget.monthly_token_limit:
            raise RuntimeError("AI token budget exceeded for this scenario/tenant")

    async def add_token_usage(
        self,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
        tokens: int,
    ) -> None:
        today = date.today()
        period_start = date(today.year, today.month, 1)

        stmt = (
            select(TokenBudget)
            .where(
                TokenBudget.tenant_id == tenant_id,
                TokenBudget.scenario_id == scenario_id.value,
                TokenBudget.period_start == period_start,
            )
        )
        res = await self.db.execute(stmt)
        budget = res.scalar_one_or_none()
        if not budget:
            return
        budget.tokens_used += tokens
        budget.updated_at = datetime.utcnow()
        self.db.add(budget)
        await self.db.commit()

