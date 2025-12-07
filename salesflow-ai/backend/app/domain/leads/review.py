# backend/app/domain/leads/review.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Column, DateTime, String, Text, select
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base_class import Base
from app.domain.shared.types import TenantId
from app.domain.leads.confidence import LeadConfidenceVector


class ReviewStatus:
    PENDING = "pending"
    COMPLETED = "completed"
    DISCARDED = "discarded"


class LeadReviewTask(Base):
    __tablename__ = "lead_review_tasks"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    lead_id = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    extraction_payload = Column(JSONB, nullable=False)
    confidence = Column(JSONB, nullable=False)
    status = Column(String(32), nullable=False, default=ReviewStatus.PENDING)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(PGUUID(as_uuid=True), nullable=True)


class ReviewRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_task(
        self,
        tenant_id: TenantId,
        extraction_payload: Dict[str, any],
        confidence: LeadConfidenceVector,
    ) -> LeadReviewTask:
        task = LeadReviewTask(
            tenant_id=tenant_id,
            extraction_payload=extraction_payload,
            confidence=confidence.as_dict(),
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def list_pending(self, tenant_id: TenantId, limit: int = 50) -> List[LeadReviewTask]:
        stmt = (
            select(LeadReviewTask)
            .where(
                LeadReviewTask.tenant_id == tenant_id,
                LeadReviewTask.status == ReviewStatus.PENDING,
            )
            .order_by(LeadReviewTask.created_at.asc())
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars())

    async def mark_completed(
        self,
        task: LeadReviewTask,
        *,
        notes: Optional[str],
        reviewed_by: uuid.UUID,
        lead_id: uuid.UUID,
    ) -> LeadReviewTask:
        task.status = ReviewStatus.COMPLETED
        task.notes = notes
        task.reviewed_by = reviewed_by
        task.reviewed_at = datetime.utcnow()
        task.lead_id = lead_id
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

