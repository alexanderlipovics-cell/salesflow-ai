# backend/app/events/handler.py

from __future__ import annotations

import asyncio
import uuid
from typing import Awaitable, Callable, Dict, List

import structlog
from sentry_sdk import capture_exception
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.events.models import Event
from app.events.repository import EventRepository
from app.events.types import EventType

logger = structlog.get_logger()

EventHandlerFn = Callable[[AsyncSession, Event], Awaitable[None]]

# Session factory wird lazy initialisiert, wenn DB verfügbar ist
_session_factory = None

def _get_session_factory():
    """Lazy initialization of session factory."""
    global _session_factory
    if _session_factory is None:
        try:
            from app.db.session import async_engine, db
            if async_engine is None and db._engine:
                # DB wurde initialisiert, aber async_engine noch nicht gesetzt
                from app.db.session import _set_async_engine
                _set_async_engine()
            if async_engine is None:
                # Fallback: Versuche db.engine zu verwenden
                if db._engine:
                    _session_factory = async_sessionmaker(db._engine, expire_on_commit=False)
                else:
                    raise RuntimeError("Database not initialized")
            else:
                _session_factory = async_sessionmaker(async_engine, expire_on_commit=False)
        except (ImportError, AttributeError) as e:
            logger.warning(f"Could not initialize session factory: {e}")
            # Fallback: Erstelle eine Dummy-Factory die Fehler wirft
            _session_factory = None
    return _session_factory


class EventHandlerRegistry:
    def __init__(self) -> None:
        self._handlers: Dict[EventType, List[EventHandlerFn]] = {}

    def register(self, event_type: EventType, handler: EventHandlerFn) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def get_handlers(self, event_type: EventType) -> List[EventHandlerFn]:
        return self._handlers.get(event_type, [])


registry = EventHandlerRegistry()


def register_event_handler(event_type: EventType) -> Callable[[EventHandlerFn], EventHandlerFn]:
    def decorator(fn: EventHandlerFn) -> EventHandlerFn:
        registry.register(event_type, fn)
        return fn
    return decorator


# Celery Task (falls Celery vorhanden, sonst async function)
try:
    from app.core.celery_app import celery_app

    @celery_app.task(name="events.process_event")
    def process_event_task(event_id: str) -> None:
        asyncio.run(_process_event_async(uuid.UUID(event_id)))
except ImportError:
    # Fallback: Direkte async Verarbeitung ohne Celery
    async def process_event_task(event_id: str) -> None:
        await _process_event_async(uuid.UUID(event_id))


async def _process_event_async(event_id: uuid.UUID) -> None:
    session_factory = _get_session_factory()
    if session_factory is None:
        logger.warning("Session factory not available, skipping event processing", event_id=str(event_id))
        return
    
    async with session_factory() as db:
        repo = EventRepository(db)
        event = await repo.get(event_id)
        if not event:
            logger.warning("Event not found", event_id=str(event_id))
            return

        handlers = registry.get_handlers(EventType(event.type))
        log = logger.bind(
            tenant_id=str(event.tenant_id),
            event_id=str(event.id),
            event_type=event.type,
            request_id=event.request_id,
        )

        if not handlers:
            log.info("No handlers registered, auto-mark processed")
            await repo.mark_processed(event.id)
            return

        for handler in handlers:
            try:
                await handler(db, event)
            except Exception as exc:
                capture_exception(exc)
                log.error("Event handler failed", handler=handler.__name__, error=str(exc))
                await repo.mark_failed(event.id, str(exc))
                break
        else:
            await repo.mark_processed(event.id)
            log.info("Event processed successfully")

