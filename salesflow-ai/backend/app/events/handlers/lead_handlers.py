"""
SalesFlow AI - Lead Event Handlers
===================================

Beispiel-Event-Handler für Lead-bezogene Events.

Diese Handler werden automatisch beim App-Start registriert.
"""

from __future__ import annotations

import logging
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.models import Event
from app.events.types import EventType
from app.events.handler import register_event_handler

logger = structlog.get_logger()


@register_event_handler(EventType.LEAD_CREATED)
async def handle_lead_created(db: AsyncSession, event: Event) -> None:
    """
    Handler für lead.created Events.
    
    Aktionen:
    - Analytics Tracking (Funnel, Attribution)
    - Autopilot Trigger (wenn konfiguriert)
    - Notification (optional)
    """
    log = logger.bind(
        event_id=str(event.id),
        tenant_id=str(event.tenant_id),
        event_type=event.type,
    )
    
    payload = event.payload
    lead_id = payload.get("lead_id")
    source = payload.get("source", "unknown")
    
    log.info("Lead created event received", lead_id=lead_id, source=source)
    
    try:
        # 1. Analytics Tracking
        try:
            from app.services.analytics_integration import (
                track_lead_created,
                track_lead_created_funnel,
            )
            from app.analytics.business.conversion import LeadSource
            
            # Map source to LeadSource enum
            lead_source = LeadSource.UNKNOWN
            if "paid_ads" in source.lower() or "facebook" in source.lower():
                lead_source = LeadSource.PAID_ADS
            elif "referral" in source.lower():
                lead_source = LeadSource.REFERRAL
            elif "organic" in source.lower():
                lead_source = LeadSource.ORGANIC
            
            track_lead_created(source=source, tenant_id=str(event.tenant_id))
            track_lead_created_funnel(
                lead_id=str(lead_id),
                tenant_id=str(event.tenant_id),
                source=lead_source,
            )
            log.info("Analytics tracked", lead_id=lead_id)
        except ImportError:
            log.warning("Analytics integration not available")
        except Exception as e:
            log.error("Analytics tracking failed", error=str(e))
        
        # 2. Autopilot Trigger (wenn konfiguriert)
        # Hier könnte ein Autopilot-Job getriggert werden
        # z.B. "Wenn Lead erstellt wurde, starte Welcome-Sequence"
        
        # 3. Notification (optional)
        # Hier könnte eine Push-Notification oder Email gesendet werden
        
        log.info("Lead created event processed successfully", lead_id=lead_id)
        
    except Exception as e:
        log.error("Error processing lead created event", error=str(e), exc_info=True)
        raise


@register_event_handler(EventType.AUTOPILOT_ACTION_EXECUTED)
async def handle_autopilot_action(db: AsyncSession, event: Event) -> None:
    """
    Handler für autopilot.action_executed Events.
    
    Aktionen:
    - Analytics Tracking
    - Logging für Debugging
    """
    log = logger.bind(
        event_id=str(event.id),
        tenant_id=str(event.tenant_id),
        event_type=event.type,
    )
    
    payload = event.payload
    action_type = payload.get("action_type", "unknown")
    
    log.info("Autopilot action executed", action_type=action_type)
    
    try:
        # Analytics Tracking
        try:
            from app.services.analytics_integration import track_ai_request
            from app.analytics.business.attribution import TouchType, FeatureCategory
            
            # Track als AI-Feature-Nutzung
            track_touchpoint = None
            try:
                from app.services.analytics_integration import track_touchpoint
            except ImportError:
                pass
            
            if track_touchpoint and payload.get("lead_id"):
                track_touchpoint(
                    lead_id=str(payload.get("lead_id")),
                    tenant_id=str(event.tenant_id),
                    touch_type=TouchType.AI_ASSISTED_ACTION,
                    channel="autopilot",
                    feature_used=FeatureCategory.AUTOPILOT,
                    ai_assisted=True,
                    cost=payload.get("cost", 0.0),
                )
        except ImportError:
            log.warning("Analytics integration not available")
        except Exception as e:
            log.error("Analytics tracking failed", error=str(e))
        
        log.info("Autopilot action event processed", action_type=action_type)
        
    except Exception as e:
        log.error("Error processing autopilot action event", error=str(e), exc_info=True)
        raise


@register_event_handler(EventType.MESSAGE_SENT)
async def handle_message_sent(db: AsyncSession, event: Event) -> None:
    """
    Handler für message.sent Events.
    
    Aktionen:
    - Analytics Tracking
    - SLO Tracking (Message Processing Latency)
    """
    log = logger.bind(
        event_id=str(event.id),
        tenant_id=str(event.tenant_id),
        event_type=event.type,
    )
    
    payload = event.payload
    channel = payload.get("channel", "unknown")
    message_type = payload.get("message_type", "text")
    latency_ms = payload.get("latency_ms", 0)
    
    log.info("Message sent event received", channel=channel, latency_ms=latency_ms)
    
    try:
        # 1. SLO Tracking
        try:
            from app.services.analytics_integration import track_message_processing_latency
            
            await track_message_processing_latency(
                latency_ms=latency_ms,
                tenant_id=str(event.tenant_id),
                success=payload.get("success", True),
            )
        except ImportError:
            log.warning("Analytics integration not available")
        except Exception as e:
            log.error("SLO tracking failed", error=str(e))
        
        # 2. Metrics Tracking
        try:
            from app.services.analytics_integration import track_message_sent
            
            track_message_sent(
                channel=channel,
                message_type=message_type,
                tenant_id=str(event.tenant_id),
            )
        except ImportError:
            log.warning("Analytics integration not available")
        except Exception as e:
            log.error("Metrics tracking failed", error=str(e))
        
        log.info("Message sent event processed", channel=channel)
        
    except Exception as e:
        log.error("Error processing message sent event", error=str(e), exc_info=True)
        raise


@register_event_handler(EventType.SEQUENCE_STEP_EXECUTED)
async def handle_sequence_step(db: AsyncSession, event: Event) -> None:
    """
    Handler für sequence.step_executed Events.
    
    Aktionen:
    - Analytics Tracking
    - Funnel Tracking
    """
    log = logger.bind(
        event_id=str(event.id),
        tenant_id=str(event.tenant_id),
        event_type=event.type,
    )
    
    payload = event.payload
    sequence_id = payload.get("sequence_id")
    step_number = payload.get("step_number")
    lead_id = payload.get("lead_id")
    
    log.info(
        "Sequence step executed",
        sequence_id=sequence_id,
        step_number=step_number,
        lead_id=lead_id,
    )
    
    try:
        # Analytics Tracking
        try:
            from app.services.analytics_integration import track_touchpoint
            from app.analytics.business.attribution import TouchType, FeatureCategory
            
            if lead_id:
                track_touchpoint(
                    lead_id=str(lead_id),
                    tenant_id=str(event.tenant_id),
                    touch_type=TouchType.EMAIL_SEQUENCE,
                    channel="email",
                    feature_used=FeatureCategory.MARKETING_AUTOMATION,
                    ai_assisted=payload.get("ai_personalized", False),
                    cost=0.0,
                )
        except ImportError:
            log.warning("Analytics integration not available")
        except Exception as e:
            log.error("Analytics tracking failed", error=str(e))
        
        log.info("Sequence step event processed", sequence_id=sequence_id)
        
    except Exception as e:
        log.error("Error processing sequence step event", error=str(e), exc_info=True)
        raise

