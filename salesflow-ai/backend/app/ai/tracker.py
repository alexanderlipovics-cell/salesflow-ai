# backend/app/ai/tracker.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base_class import Base


class AiCallLog(Base):
    __tablename__ = "ai_call_logs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    scenario_id = Column(String(64), nullable=False, index=True)
    model = Column(String(64), nullable=False)
    request_id = Column(String(64), nullable=True)
    prompt_tokens = Column(Integer, nullable=False)
    completion_tokens = Column(Integer, nullable=False)
    cost_usd = Column(Numeric(12, 6), nullable=False)
    latency_ms = Column(Integer, nullable=False)
    success = Column(Boolean, nullable=False)
    error_type = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class AiCallTracker:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log_success(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: str,
        model: str,
        request_id: Optional[str],
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        latency_ms: int,
    ) -> None:
        log = AiCallLog(
            tenant_id=tenant_id,
            scenario_id=scenario_id,
            model=model,
            request_id=request_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost_usd,
            latency_ms=latency_ms,
            success=True,
            error_type=None,
        )
        self.db.add(log)
        await self.db.commit()

    async def log_failure(
        self,
        *,
        tenant_id: uuid.UUID,
        scenario_id: str,
        model: str,
        request_id: Optional[str],
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        latency_ms: int,
        error_type: str,
    ) -> None:
        log = AiCallLog(
            tenant_id=tenant_id,
            scenario_id=scenario_id,
            model=model,
            request_id=request_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost_usd,
            latency_ms=latency_ms,
            success=False,
            error_type=error_type,
        )
        self.db.add(log)
        await self.db.commit()

