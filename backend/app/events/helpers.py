"""
SalesFlow AI - Event Publishing Helpers
======================================

Einfache Helper-Funktionen für Event-Publishing in bestehenden Services.
"""

from __future__ import annotations

import uuid
import time
from typing import Optional, Dict, Any
import structlog

from app.events.models import EventCreate
from app.events.repository import EventRepository
from app.events.handler import process_event_task
from app.events.types import EventType
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()


async def publish_lead_created_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
    source: str = "manual",
    request_id: Optional[str] = None,
) -> None:
    """
    Publisht ein lead.created Event.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        lead_id: Lead ID
        source: Source of the lead (e.g., "manual", "screenshot", "chat")
        request_id: Optional request ID for tracing
    """
    try:
        repo = EventRepository(db)
        event = await repo.create(
            EventCreate(
                tenant_id=tenant_id,
                type=EventType.LEAD_CREATED.value,
                payload={
                    "lead_id": str(lead_id),
                    "source": source,
                },
                source="router.leads",
                correlation_id=None,
                causation_id=None,
                request_id=request_id,
                meta={},
            )
        )
        
        # Celery Task asynchron starten
        try:
            process_event_task.delay(str(event.id))
        except AttributeError:
            # Fallback: Direkt async verarbeiten wenn kein Celery
            import asyncio
            from app.events.handler import _process_event_async
            asyncio.create_task(_process_event_async(event.id))
        
        logger.info(
            "Lead created event published",
            event_id=str(event.id),
            lead_id=str(lead_id),
            tenant_id=str(tenant_id),
        )
    except Exception as e:
        # NIEMALS Exception werfen - nur loggen
        logger.warning("Could not publish lead created event", error=str(e))


async def publish_message_sent_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: Optional[uuid.UUID] = None,
    channel: str = "internal",
    message_type: str = "text",
    latency_ms: int = 0,
    success: bool = True,
    request_id: Optional[str] = None,
) -> None:
    """
    Publisht ein message.sent Event.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        lead_id: Optional Lead ID
        channel: Channel (e.g., "whatsapp", "email", "internal")
        message_type: Message type (e.g., "text", "image")
        latency_ms: Processing latency in milliseconds
        success: Whether the message was sent successfully
        request_id: Optional request ID for tracing
    """
    try:
        repo = EventRepository(db)
        payload: Dict[str, Any] = {
            "channel": channel,
            "message_type": message_type,
            "latency_ms": latency_ms,
            "success": success,
        }
        if lead_id:
            payload["lead_id"] = str(lead_id)
        
        event = await repo.create(
            EventCreate(
                tenant_id=tenant_id,
                type=EventType.MESSAGE_SENT.value,
                payload=payload,
                source=f"channel.{channel}",
                correlation_id=None,
                causation_id=None,
                request_id=request_id,
                meta={},
            )
        )
        
        # Celery Task asynchron starten
        try:
            process_event_task.delay(str(event.id))
        except AttributeError:
            # Fallback: Direkt async verarbeiten wenn kein Celery
            import asyncio
            from app.events.handler import _process_event_async
            asyncio.create_task(_process_event_async(event.id))
        
        logger.debug(
            "Message sent event published",
            event_id=str(event.id),
            channel=channel,
            tenant_id=str(tenant_id),
        )
    except Exception as e:
        # NIEMALS Exception werfen - nur loggen
        logger.debug("Could not publish message sent event", error=str(e))


async def publish_autopilot_action_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    action_type: str,
    lead_id: Optional[uuid.UUID] = None,
    cost: float = 0.0,
    latency_ms: int = 0,
    request_id: Optional[str] = None,
) -> None:
    """
    Publisht ein autopilot.action_executed Event.
    
    Args:
        db: Database session
        tenant_id: Tenant ID
        action_type: Type of action (e.g., "ai_response_generation")
        lead_id: Optional Lead ID
        cost: Cost in USD
        latency_ms: Processing latency in milliseconds
        request_id: Optional request ID for tracing
    """
    try:
        repo = EventRepository(db)
        payload: Dict[str, Any] = {
            "action_type": action_type,
            "cost": cost,
            "latency_ms": latency_ms,
        }
        if lead_id:
            payload["lead_id"] = str(lead_id)
        
        event = await repo.create(
            EventCreate(
                tenant_id=tenant_id,
                type=EventType.AUTOPILOT_ACTION_EXECUTED.value,
                payload=payload,
                source="autopilot",
                correlation_id=None,
                causation_id=None,
                request_id=request_id,
                meta={},
            )
        )
        
        # Celery Task asynchron starten
        try:
            process_event_task.delay(str(event.id))
        except AttributeError:
            # Fallback: Direkt async verarbeiten wenn kein Celery
            import asyncio
            from app.events.handler import _process_event_async
            asyncio.create_task(_process_event_async(event.id))
        
        logger.debug(
            "Autopilot action event published",
            event_id=str(event.id),
            action_type=action_type,
            tenant_id=str(tenant_id),
        )
    except Exception as e:
        # NIEMALS Exception werfen - nur loggen
        logger.debug("Could not publish autopilot action event", error=str(e))

