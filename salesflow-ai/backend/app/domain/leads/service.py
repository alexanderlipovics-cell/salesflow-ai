# backend/app/domain/leads/service.py

from __future__ import annotations

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.leads.models import Lead
from app.domain.leads.repository import LeadRepository
from app.domain.leads.extraction import LeadExtractionService, LeadExtractionResult
from app.domain.leads.review import ReviewRepository
from app.domain.shared.events import (
    EventBus,
    LeadCreatedEvent,
    LeadExtractionProposedEvent,
)
from app.domain.shared.types import RequestContext

logger = structlog.get_logger()


class LeadService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = LeadRepository(db)
        self.extraction = LeadExtractionService(db)
        self.review_repo = ReviewRepository(db)
        self.event_bus = EventBus(db)

    async def create_lead_from_zero_input(
        self,
        ctx: RequestContext,
        *,
        source_type: str,
        content: dict,
        auto_confirm_threshold: float = 0.8,
    ) -> Lead:
        log = logger.bind(
            tenant_id=str(ctx.tenant_id),
            user_id=str(ctx.user_id) if ctx.user_id else None,
            request_id=ctx.request_id,
        )
        extraction: LeadExtractionResult = await self.extraction.extract_from_unstructured(
            tenant_id=ctx.tenant_id,
            source_type=source_type,
            content=content,
            request_id=ctx.request_id,
        )

        if extraction.confidence.overall >= auto_confirm_threshold:
            lead = Lead(
                tenant_id=ctx.tenant_id,
                full_name=extraction.lead_input.full_name,
                email=extraction.lead_input.email,
                phone=extraction.lead_input.phone,
                company=extraction.lead_input.company,
                source=source_type,
                raw_context=content,
                is_confirmed=True,
            )
            lead = await self.repo.add(lead)

            await self.event_bus.publish(
                LeadCreatedEvent(
                    tenant_id=ctx.tenant_id,
                    occurred_at=lead.created_at,
                    lead_id=lead.id,
                    source=source_type,
                ),
                request_id=ctx.request_id,
            )

            log.info("Lead auto-confirmed", lead_id=str(lead.id), confidence=extraction.confidence.as_dict())
            return lead

        task = await self.review_repo.create_task(
            tenant_id=ctx.tenant_id,
            extraction_payload=extraction.raw,
            confidence=extraction.confidence,
        )

        await self.event_bus.publish(
            LeadExtractionProposedEvent(
                tenant_id=ctx.tenant_id,
                occurred_at=task.created_at,
                extraction_candidate_id=task.id,
                confidence_overall=extraction.confidence.overall,
            ),
            request_id=ctx.request_id,
        )

        log.info("Lead sent to review queue", review_task_id=str(task.id))

        lead = Lead(
            tenant_id=ctx.tenant_id,
            full_name=extraction.lead_input.full_name,
            email=extraction.lead_input.email,
            phone=extraction.lead_input.phone,
            company=extraction.lead_input.company,
            source=source_type,
            raw_context=content,
            is_confirmed=False,
        )
        lead = await self.repo.add(lead)
        return lead

