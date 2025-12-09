"""
SalesFlow AI - Events API Router
=================================

Endpoints für Event-Management:
- Event Replay
- Event Status
- Event History
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_async_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.events.repository import EventRepository
from app.events.replay import replay_event, replay_events
from app.events.models import EventRead

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)


@router.get("/{event_id}")
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    """Hole ein einzelnes Event."""
    repo = EventRepository(db)
    event = await repo.get(event_id)
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return EventRead.model_validate(event)


@router.post("/{event_id}/replay")
async def replay_single_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    """Replay ein einzelnes Event (für Debugging/Testing)."""
    try:
        await replay_event(db, event_id)
        return {"status": "success", "message": f"Event {event_id} replayed"}
    except Exception as e:
        logger.exception(f"Error replaying event {event_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/replay/batch")
async def replay_batch_events(
    tenant_id: Optional[uuid.UUID] = Query(None),
    event_type: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    """Replay mehrere Events (für Debugging/Testing)."""
    try:
        count = await replay_events(
            db,
            tenant_id=tenant_id or current_user.get("tenant_id"),
            event_type=event_type,
            since=since,
            limit=limit,
        )
        return {
            "status": "success",
            "message": f"{count} events replayed",
            "count": count,
        }
    except Exception as e:
        logger.exception(f"Error replaying events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/pending")
async def get_pending_events(
    tenant_id: Optional[uuid.UUID] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user),
):
    """Hole pending Events (für Monitoring)."""
    repo = EventRepository(db)
    events = await repo.list_for_replay(
        tenant_id=tenant_id or current_user.tenant_id,
        event_type=None,
        since=None,
        limit=limit,
    )
    
    # Filter nur pending
    pending = [e for e in events if e.status == "pending"]
    
    return {
        "count": len(pending),
        "events": [EventRead.model_validate(e) for e in pending],
    }

