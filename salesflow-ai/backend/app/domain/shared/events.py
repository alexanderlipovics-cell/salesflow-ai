# backend/app/domain/shared/events.py

from __future__ import annotations

import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, Protocol, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.shared.types import TenantId
from app.events.models import EventCreate
from app.events.repository import EventRepository
from app.events.handler import process_event_task
from app.events.types import EventType

logger = structlog.get_logger()


@dataclass(frozen=True)
class DomainEvent:
    tenant_id: TenantId
    occurred_at: datetime

    def to_payload(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LeadCreatedEvent(DomainEvent):
    lead_id: uuid.UUID
    source: str


@dataclass(frozen=True)
class LeadExtractionProposedEvent(DomainEvent):
    extraction_candidate_id: uuid.UUID
    confidence_overall: float


class DomainEventBus(Protocol):
    async def publish(self, event: DomainEvent, *, request_id: Optional[str] = None) -> None:
        ...


class EventBus(DomainEventBus):
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def publish(self, event: DomainEvent, *, request_id: Optional[str] = None) -> None:
        repo = EventRepository(self.db)
        if isinstance(event, LeadCreatedEvent):
            event_type = EventType.LEAD_CREATED
        elif isinstance(event, LeadExtractionProposedEvent):
            event_type = EventType.AUTOPILOT_ACTION_EXECUTED
        else:
            event_type = EventType.MESSAGE_SENT

        db_event = await repo.create(
            EventCreate(
                tenant_id=event.tenant_id,
                type=event_type.value,
                payload=event.to_payload(),
                source=f"domain.{event.__class__.__name__}",
                correlation_id=None,
                causation_id=None,
                request_id=request_id,
                meta={},
            )
        )
        
        # Celery Task asynchron starten
        try:
            process_event_task.delay(str(db_event.id))
        except AttributeError:
            # Fallback: Direkt async verarbeiten wenn kein Celery
            import asyncio
            from app.events.handler import _process_event_async
            asyncio.create_task(_process_event_async(db_event.id))
        
        logger.info(
            "Domain event published",
            event_type=event_type.value,
            tenant_id=str(event.tenant_id),
            request_id=request_id,
        )

