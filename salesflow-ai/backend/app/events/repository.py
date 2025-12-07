# backend/app/events/repository.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.models import Event, EventCreate


class EventRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: EventCreate) -> Event:
        event = Event(
            tenant_id=data.tenant_id,
            type=data.type,
            payload=data.payload,
            source=data.source,
            correlation_id=data.correlation_id,
            causation_id=data.causation_id,
            request_id=data.request_id,
            meta=data.meta,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get(self, event_id: uuid.UUID) -> Optional[Event]:
        return await self.db.get(Event, event_id)

    async def mark_processed(self, event_id: uuid.UUID) -> None:
        event = await self.db.get(Event, event_id)
        if not event:
            return
        event.status = "processed"
        event.processed_at = datetime.utcnow()
        event.error_message = None
        self.db.add(event)
        await self.db.commit()

    async def mark_failed(self, event_id: uuid.UUID, error_message: str) -> None:
        event = await self.db.get(Event, event_id)
        if not event:
            return
        event.status = "failed"
        event.error_message = error_message[:4000]
        event.processed_at = datetime.utcnow()
        self.db.add(event)
        await self.db.commit()

    async def list_for_replay(
        self,
        tenant_id: uuid.UUID,
        event_type: str | None = None,
        since: datetime | None = None,
        limit: int = 100,
    ) -> List[Event]:
        stmt = select(Event).where(Event.tenant_id == tenant_id)
        if event_type:
            stmt = stmt.where(Event.type == event_type)
        if since:
            stmt = stmt.where(Event.created_at >= since)
        stmt = stmt.order_by(Event.created_at.asc()).limit(limit)
        res = await self.db.execute(stmt)
        return list(res.scalars())

