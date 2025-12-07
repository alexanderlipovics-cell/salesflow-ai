"""
SalesFlow AI - Analytics Integration Service
============================================

Integration-Beispiele für Analytics-Framework in bestehende Services.

Zeigt wie man:
- SLO Events trackt
- Metrics aufzeichnet
- Funnel Events loggt
- Attribution Touchpoints erfasst
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from app.analytics import (
    get_slo_monitor,
    get_metrics,
    get_funnel_tracker,
    get_attribution_tracker,
    FunnelStage,
    LeadSource,
    Channel,
    TouchType,
    FeatureCategory,
)

logger = logging.getLogger(__name__)


# =============================================================================
# SLO TRACKING INTEGRATION
# =============================================================================

async def track_message_processing_latency(
    latency_ms: int,
    tenant_id: Optional[str] = None,
    success: bool = True,
):
    """Track message processing latency for SLO."""
    monitor = get_slo_monitor()
    monitor.record_latency_event(
        "message_processing_latency",
        latency_ms=latency_ms,
        tenant_id=tenant_id,
        metadata={"success": success},
    )


async def track_ai_response_latency(
    latency_ms: int,
    tenant_id: Optional[str] = None,
    model: Optional[str] = None,
):
    """Track AI response latency for SLO."""
    monitor = get_slo_monitor()
    monitor.record_latency_event(
        "ai_response_latency",
        latency_ms=latency_ms,
        tenant_id=tenant_id,
        metadata={"model": model},
    )


async def track_autopilot_job_execution(
    execution_time_ms: int,
    tenant_id: Optional[str] = None,
    success: bool = True,
):
    """Track autopilot job execution for SLO."""
    monitor = get_slo_monitor()
    monitor.record_latency_event(
        "autopilot_job_execution",
        latency_ms=execution_time_ms,
        tenant_id=tenant_id,
        metadata={"success": success},
    )


# =============================================================================
# METRICS TRACKING INTEGRATION
# =============================================================================

def track_lead_created(source: str, tenant_id: Optional[str] = None):
    """Track lead creation metric."""
    metrics = get_metrics()
    metrics.leads_created_total.inc(source=source, tenant_id=tenant_id or "unknown")


def track_ai_request(
    provider: str,
    model: str,
    scenario: str,
    tokens_input: int = 0,
    tokens_output: int = 0,
    cost_usd: float = 0.0,
    duration_seconds: float = 0.0,
    tenant_id: Optional[str] = None,
):
    """Track AI request metrics."""
    metrics = get_metrics()
    
    metrics.ai_requests_total.inc(
        provider=provider,
        model=model,
        scenario=scenario,
    )
    
    if tokens_input > 0:
        metrics.ai_tokens_total.inc(
            amount=tokens_input,
            provider=provider,
            model=model,
            type="input",
        )
    
    if tokens_output > 0:
        metrics.ai_tokens_total.inc(
            amount=tokens_output,
            provider=provider,
            model=model,
            type="output",
        )
    
    if cost_usd > 0:
        metrics.ai_cost_dollars.inc(
            amount=cost_usd,
            provider=provider,
            model=model,
            tenant_id=tenant_id or "unknown",
        )
    
    if duration_seconds > 0:
        metrics.ai_request_duration.observe(
            duration_seconds,
            provider=provider,
            model=model,
        )


def track_message_sent(
    channel: str,
    message_type: str,
    tenant_id: Optional[str] = None,
):
    """Track message sent metric."""
    metrics = get_metrics()
    metrics.messages_sent_total.inc(
        channel=channel,
        type=message_type,
        tenant_id=tenant_id or "unknown",
    )


# =============================================================================
# FUNNEL TRACKING INTEGRATION
# =============================================================================

def track_lead_created_funnel(
    lead_id: str,
    tenant_id: str,
    source: LeadSource = LeadSource.UNKNOWN,
    channel: Optional[Channel] = None,
):
    """Track lead creation in funnel."""
    tracker = get_funnel_tracker()
    tracker.record_stage_transition(
        lead_id=lead_id,
        tenant_id=tenant_id,
        stage=FunnelStage.LEAD_CREATED,
        source=source,
        channel=channel,
    )


def track_first_contact(
    lead_id: str,
    tenant_id: str,
    channel: Channel,
):
    """Track first contact in funnel."""
    tracker = get_funnel_tracker()
    tracker.record_stage_transition(
        lead_id=lead_id,
        tenant_id=tenant_id,
        stage=FunnelStage.FIRST_CONTACT,
        channel=channel,
    )


def track_deal_closed(
    lead_id: str,
    tenant_id: str,
    won: bool = True,
    deal_value: Optional[float] = None,
):
    """Track deal closure in funnel."""
    tracker = get_funnel_tracker()
    stage = FunnelStage.DEAL_CLOSED_WON if won else FunnelStage.DEAL_CLOSED_LOST
    
    tracker.record_stage_transition(
        lead_id=lead_id,
        tenant_id=tenant_id,
        stage=stage,
        metadata={"deal_value": deal_value} if deal_value else {},
    )


# =============================================================================
# ATTRIBUTION TRACKING INTEGRATION
# =============================================================================

def track_touchpoint(
    lead_id: str,
    tenant_id: str,
    touch_type: TouchType,
    channel: str,
    feature_used: Optional[FeatureCategory] = None,
    ai_assisted: bool = False,
    cost: float = 0.0,
):
    """Track customer touchpoint for attribution."""
    tracker = get_attribution_tracker()
    tracker.record_touchpoint(
        lead_id=lead_id,
        tenant_id=tenant_id,
        touch_type=touch_type,
        channel=channel,
        feature_used=feature_used,
        ai_assisted=ai_assisted,
        cost=cost,
    )


def track_conversion(
    lead_id: str,
    tenant_id: str,
    revenue: float,
    conversion_type: str = "deal_closed",
):
    """Track conversion with revenue for attribution."""
    tracker = get_attribution_tracker()
    tracker.record_conversion(
        lead_id=lead_id,
        tenant_id=tenant_id,
        revenue=revenue,
        conversion_type=conversion_type,
    )


# =============================================================================
# BEISPIEL: INTEGRATION IN LEAD SERVICE
# =============================================================================

"""
Beispiel-Integration in backend/app/services/lead_service.py:

from app.services.analytics_integration import (
    track_lead_created,
    track_lead_created_funnel,
    track_touchpoint,
    LeadSource,
    Channel,
    TouchType,
)

async def create_lead(lead_data: dict, tenant_id: str):
    # Lead erstellen
    lead = await db.leads.create(lead_data)
    
    # Analytics tracken
    track_lead_created(source=lead_data.get("source", "manual"), tenant_id=tenant_id)
    track_lead_created_funnel(
        lead_id=lead.id,
        tenant_id=tenant_id,
        source=LeadSource(lead_data.get("source", "unknown")),
    )
    
    # Touchpoint tracken (wenn von Ad/Referral)
    if lead_data.get("source") == "paid_ads":
        track_touchpoint(
            lead_id=lead.id,
            tenant_id=tenant_id,
            touch_type=TouchType.AD_CLICK,
            channel="facebook",
        )
    
    return lead
"""


# =============================================================================
# BEISPIEL: INTEGRATION IN AI SERVICE
# =============================================================================

"""
Beispiel-Integration in backend/app/services/ai_service.py:

from app.services.analytics_integration import (
    track_ai_response_latency,
    track_ai_request,
    FeatureCategory,
)

async def generate_response(prompt: str, model: str):
    start = time.time()
    
    try:
        response = await openai_client.chat.completions.create(...)
        duration = (time.time() - start) * 1000
        
        # SLO Tracking
        await track_ai_response_latency(
            latency_ms=int(duration),
            tenant_id=tenant_id,
            model=model,
        )
        
        # Metrics Tracking
        track_ai_request(
            provider="openai",
            model=model,
            scenario="chat_completion",
            tokens_input=response.usage.prompt_tokens,
            tokens_output=response.usage.completion_tokens,
            cost_usd=calculate_cost(response),
            duration_seconds=duration / 1000,
            tenant_id=tenant_id,
        )
        
        return response
    except Exception as e:
        # Track failure
        await track_ai_response_latency(
            latency_ms=int((time.time() - start) * 1000),
            tenant_id=tenant_id,
            model=model,
        )
        raise
"""


# =============================================================================
# BEISPIEL: INTEGRATION IN MESSAGE SERVICE
# =============================================================================

"""
Beispiel-Integration in backend/app/services/channels/whatsapp_adapter.py:

from app.services.analytics_integration import (
    track_message_processing_latency,
    track_message_sent,
    track_touchpoint,
    track_first_contact,
    TouchType,
    Channel,
    FeatureCategory,
)

async def send_message(lead_id: str, message: str, tenant_id: str):
    start = time.time()
    
    try:
        # Message senden
        result = await whatsapp_api.send(message)
        duration = (time.time() - start) * 1000
        
        # SLO Tracking
        await track_message_processing_latency(
            latency_ms=int(duration),
            tenant_id=tenant_id,
            success=True,
        )
        
        # Metrics Tracking
        track_message_sent(
            channel="whatsapp",
            message_type="outbound",
            tenant_id=tenant_id,
        )
        
        # Attribution Tracking
        track_touchpoint(
            lead_id=lead_id,
            tenant_id=tenant_id,
            touch_type=TouchType.WHATSAPP_MESSAGE,
            channel="whatsapp",
            feature_used=FeatureCategory.AI_RESPONSE_GENERATION,
            ai_assisted=True,
            cost=0.02,  # AI cost for message generation
        )
        
        # Funnel Tracking (wenn erster Kontakt)
        track_first_contact(lead_id, tenant_id, Channel.WHATSAPP)
        
        return result
    except Exception as e:
        await track_message_processing_latency(
            latency_ms=int((time.time() - start) * 1000),
            tenant_id=tenant_id,
            success=False,
        )
        raise
"""

