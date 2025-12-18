# backend/app/domain/leads/repository.py

from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.leads.models import Lead
from app.domain.shared.types import TenantId


class LeadRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, tenant_id: TenantId, lead_id: uuid.UUID) -> Optional[Lead]:
        stmt = select(Lead).where(Lead.tenant_id == tenant_id, Lead.id == lead_id)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def add(self, lead: Lead) -> Lead:
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def list_recent(self, tenant_id: TenantId, limit: int = 50) -> List[Lead]:
        stmt = (
            select(Lead)
            .where(Lead.tenant_id == tenant_id)
            .order_by(Lead.created_at.desc())
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars())

