# backend/app/ai/prompt_store.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, select
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base_class import Base
from app.ai.scenarios import ScenarioId


class PromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    scenario_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    system_prompt = Column(Text, nullable=False)
    user_template = Column(Text, nullable=False)
    extra_metadata = Column(JSONB, name="metadata", nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class PromptConfig(BaseModel):
    id: uuid.UUID
    tenant_id: Optional[uuid.UUID]
    scenario_id: ScenarioId
    version: int
    system_prompt: str
    user_template: str
    extra_metadata: Dict[str, Any]

    class Config:
        from_attributes = True


class PromptStore:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_active_prompt(
        self,
        tenant_id: uuid.UUID,
        scenario_id: ScenarioId,
    ) -> Optional[PromptConfig]:
        # 1) tenant-spezifisch
        stmt = (
            select(PromptTemplate)
            .where(
                PromptTemplate.tenant_id == tenant_id,
                PromptTemplate.scenario_id == scenario_id.value,
                PromptTemplate.is_active.is_(True),
            )
            .order_by(PromptTemplate.version.desc())
        )
        res = await self.db.execute(stmt)
        tenant_prompt = res.scalar_one_or_none()
        if tenant_prompt:
            return PromptConfig.model_validate(tenant_prompt)

        # 2) global
        stmt2 = (
            select(PromptTemplate)
            .where(
                PromptTemplate.tenant_id.is_(None),
                PromptTemplate.scenario_id == scenario_id.value,
                PromptTemplate.is_active.is_(True),
            )
            .order_by(PromptTemplate.version.desc())
        )
        res2 = await self.db.execute(stmt2)
        global_prompt = res2.scalar_one_or_none()
        if global_prompt:
            return PromptConfig.model_validate(global_prompt)

        return None

