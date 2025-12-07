# backend/app/events/replay.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.events.repository import EventRepository
from app.events.handler import _process_event_async


async def replay_event(db: AsyncSession, event_id: uuid.UUID) -> None:
    await _process_event_async(event_id)


async def replay_events(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    event_type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 100,
) -> int:
    repo = EventRepository(db)
    events = await repo.list_for_replay(
        tenant_id=tenant_id,
        event_type=event_type,
        since=since,
        limit=limit,
    )
    for ev in events:
        await _process_event_async(ev.id)
    return len(events)

