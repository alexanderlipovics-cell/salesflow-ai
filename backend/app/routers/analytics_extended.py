"""
SalesFlow AI - Extended Analytics Router
=========================================

Enterprise-level Analytics & Monitoring Endpoints.

Features:
- SLO Monitoring & Reports
- Business Metrics & Conversion Tracking
- Attribution Analysis
- Health Checks
- Prometheus Metrics Export
- Alert Management

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, Query, Header, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.core.security import get_current_user_dict
from app.analytics import (
    create_slo_monitor,
    create_alert_manager,
    create_health_check_manager,
    get_metrics,
    create_funnel_tracker,
    create_attribution_tracker,
    FunnelStage,
    LeadSource,
    Channel,
    AttributionModel,
)

router = APIRouter(prefix="/analytics", tags=["analytics-extended"])
logger = logging.getLogger(__name__)

# Singleton instances (wird beim ersten Request initialisiert)
_slo_monitor = None
_alert_manager = None
_health_manager = None
_metrics = None
_funnel_tracker = None
_attribution_tracker = None


def get_slo_monitor():
    """Get or create SLO monitor singleton."""
    global _slo_monitor
    if _slo_monitor is None:
        _slo_monitor, _ = create_slo_monitor()
    return _slo_monitor


def get_alert_manager():
    """Get or create alert manager singleton."""
    global _alert_manager
    if _alert_manager is None:
        # TODO: Load from config
        _alert_manager = create_alert_manager(
            slack_webhook=None,  # TODO: from settings
            pagerduty_key=None,  # TODO: from settings
        )
    return _alert_manager


def get_health_manager():
    """Get or create health check manager singleton."""
    global _health_manager
    if _health_manager is None:
        _health_manager, _ = create_health_check_manager()
    return _health_manager


def get_metrics_instance():
    """Get or create metrics singleton."""
    global _metrics
    if _metrics is None:
        _metrics = get_metrics()
    return _metrics


def get_funnel_tracker_instance():
    """Get or create funnel tracker singleton."""
    global _funnel_tracker
    if _funnel_tracker is None:
        _funnel_tracker = create_funnel_tracker()
    return _funnel_tracker


def get_attribution_tracker_instance():
    """Get or create attribution tracker singleton."""
    global _attribution_tracker
    if _attribution_tracker is None:
        _attribution_tracker = create_attribution_tracker()
    return _attribution_tracker


# =============================================================================
# SLO ENDPOINTS
# =============================================================================


@router.get("/slo/status")
async def get_slo_status(
    tenant_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get SLO health summary."""
    monitor = get_slo_monitor()
    summary = monitor.get_health_summary(tenant_id=tenant_id or current_user.get("tenant_id"))
    return summary


@router.get("/slo/{slo_name}")
async def get_slo_snapshot(
    slo_name: str,
    tenant_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get snapshot for specific SLO."""
    monitor = get_slo_monitor()
    snapshot = monitor.get_snapshot(slo_name, tenant_id=tenant_id or current_user.get("tenant_id"))
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"SLO '{slo_name}' not found")
    
    return {
        "slo_name": snapshot.slo_name,
        "status": snapshot.status.value,
        "current_percentage": snapshot.current_percentage,
        "target_percentage": snapshot.target_percentage,
        "error_budget_remaining": snapshot.error_budget_remaining,
        "burn_rate": snapshot.burn_rate,
        "total_events": snapshot.total_events,
        "successful_events": snapshot.successful_events,
        "latency": {
            "p50_ms": snapshot.p50_latency_ms,
            "p95_ms": snapshot.p95_latency_ms,
            "p99_ms": snapshot.p99_latency_ms,
        },
    }


@router.get("/slo/report/json")
async def get_slo_report_json(
    tenant_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get SLO report in JSON format."""
    monitor = get_slo_monitor()
    from app.analytics.monitoring.slos import SLOReporter
    reporter = SLOReporter(monitor)
    report_json = reporter.generate_json_report(tenant_id=tenant_id or current_user.get("tenant_id"))
    return report_json


@router.get("/slo/report/markdown")
async def get_slo_report_markdown(
    tenant_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get SLO report in Markdown format."""
    monitor = get_slo_monitor()
    from app.analytics.monitoring.slos import SLOReporter
    reporter = SLOReporter(monitor)
    report_md = reporter.generate_markdown_report(tenant_id=tenant_id or current_user.get("tenant_id"))
    return PlainTextResponse(report_md, media_type="text/markdown")


# =============================================================================
# METRICS ENDPOINTS
# =============================================================================


@router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """Export metrics in Prometheus format."""
    metrics = get_metrics_instance()
    output = metrics.registry.get_prometheus_output()
    return PlainTextResponse(output, media_type="text/plain")


# =============================================================================
# HEALTH CHECK ENDPOINTS
# =============================================================================


@router.get("/health/check")
async def health_check_all():
    """Run all health checks."""
    manager = get_health_manager()
    system_health = await manager.check_all()
    
    return {
        "status": system_health.status.value,
        "timestamp": system_health.timestamp.isoformat(),
        "message": system_health.message,
        "components": {
            name: {
                "status": health.current_status.value,
                "latency_ms": round(health.average_latency_ms, 1),
                "last_check": health.last_check.isoformat(),
            }
            for name, health in system_health.components.items()
        },
        "summary": {
            "healthy": system_health.healthy_count,
            "degraded": system_health.degraded_count,
            "unhealthy": system_health.unhealthy_count,
        },
    }


@router.get("/health/kubernetes/{probe_type}")
async def kubernetes_probe(probe_type: str = "liveness"):
    """Kubernetes-compatible health probe."""
    manager = get_health_manager()
    response = manager.get_kubernetes_response(probe_type)
    return response


# =============================================================================
# ALERTS ENDPOINTS
# =============================================================================


@router.get("/alerts/active")
async def get_active_alerts(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    tenant_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get active alerts."""
    manager = get_alert_manager()
    
    from app.analytics.monitoring.alerts import AlertCategory, AlertSeverity
    
    alerts = manager.get_active_alerts(
        category=AlertCategory(category) if category else None,
        severity=AlertSeverity(severity) if severity else None,
        tenant_id=tenant_id or current_user.get("tenant_id"),
    )
    
    return {
        "count": len(alerts),
        "alerts": [alert.to_dict() for alert in alerts],
    }


@router.get("/alerts/stats")
async def get_alert_stats():
    """Get alert statistics."""
    manager = get_alert_manager()
    stats = manager.get_alert_stats()
    return stats


# =============================================================================
# FUNNEL & CONVERSION ENDPOINTS
# =============================================================================


@router.get("/funnel/snapshot")
async def get_funnel_snapshot(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get conversion funnel snapshot."""
    tracker = get_funnel_tracker_instance()
    
    period_start = datetime.utcnow() - timedelta(days=period_days)
    snapshot = tracker.get_funnel_snapshot(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_start=period_start,
    )
    
    return {
        "timestamp": snapshot.timestamp.isoformat(),
        "period_days": period_days,
        "total_leads": snapshot.total_leads,
        "converted_leads": snapshot.converted_leads,
        "overall_conversion_rate": snapshot.overall_conversion_rate,
        "avg_conversion_time_seconds": snapshot.avg_conversion_time_seconds,
        "top_sources": [
            {"source": source.value, "conversion_rate": rate}
            for source, rate in snapshot.top_converting_sources
        ],
        "top_channels": [
            {"channel": channel.value, "conversion_rate": rate}
            for channel, rate in snapshot.top_converting_channels
        ],
        "stage_metrics": {
            stage.value: {
                "total_entries": metrics.total_entries,
                "conversion_rate": metrics.conversion_rate,
                "drop_off_rate": metrics.drop_off_rate,
                "avg_time_seconds": metrics.avg_time_in_stage_seconds,
            }
            for stage, metrics in snapshot.stage_metrics.items()
        },
    }


@router.get("/funnel/visualization")
async def get_funnel_visualization(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get funnel data for visualization."""
    tracker = get_funnel_tracker_instance()
    funnel_data = tracker.get_stage_funnel(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_days=period_days,
    )
    return funnel_data


@router.get("/funnel/dropoff")
async def get_dropoff_analysis(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Analyze where leads drop off in funnel."""
    tracker = get_funnel_tracker_instance()
    analysis = tracker.get_drop_off_analysis(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_days=period_days,
    )
    return analysis


# =============================================================================
# ATTRIBUTION ENDPOINTS
# =============================================================================


@router.get("/attribution/report")
async def get_attribution_report(
    model: str = Query("linear", regex="^(first_touch|last_touch|linear|time_decay|position_based)$"),
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get revenue attribution report."""
    tracker = get_attribution_tracker_instance()
    
    period_start = datetime.utcnow() - timedelta(days=period_days)
    report = tracker.generate_report(
        model=AttributionModel(model),
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_start=period_start,
    )
    
    return {
        "model": report.model.value,
        "period_days": period_days,
        "total_revenue": report.total_revenue,
        "total_conversions": report.total_conversions,
        "by_channel": [
            {
                "channel": r.entity_value,
                "attributed_revenue": r.attributed_revenue,
                "conversions": r.attributed_conversions,
                "conversion_rate": r.conversion_rate,
                "roi": r.roi,
            }
            for r in report.by_channel
        ],
        "by_feature": [
            {
                "feature": r.entity_value,
                "attributed_revenue": r.attributed_revenue,
                "conversions": r.attributed_conversions,
                "roi": r.roi,
                "cost": r.total_cost,
            }
            for r in report.by_feature
        ],
        "ai_roi_summary": report.ai_roi_summary,
        "top_paths": report.top_conversion_paths[:5],
    }


@router.get("/attribution/channels")
async def get_channel_comparison(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Compare performance across channels."""
    tracker = get_attribution_tracker_instance()
    comparison = tracker.get_channel_comparison(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_days=period_days,
    )
    return comparison


@router.get("/attribution/features")
async def get_feature_impact(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Analyze impact of SalesFlow features on conversions."""
    tracker = get_attribution_tracker_instance()
    impact = tracker.get_feature_impact(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_days=period_days,
    )
    return impact


@router.get("/attribution/ai-roi")
async def get_ai_roi_analysis(
    tenant_id: Optional[str] = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
):
    """Get detailed AI ROI analysis by feature."""
    tracker = get_attribution_tracker_instance()
    roi_analysis = tracker.get_ai_roi_analysis(
        tenant_id=tenant_id or current_user.get("tenant_id"),
        period_days=period_days,
    )
    
    return {
        "period_days": period_days,
        "features": [
            {
                "feature": r.feature.value,
                "total_cost": r.total_cost,
                "attributed_revenue": r.attributed_revenue,
                "roi_percentage": r.roi_percentage,
                "conversions_assisted": r.conversions_assisted,
                "avg_cost_per_conversion": r.avg_cost_per_conversion,
            }
            for r in roi_analysis
        ],
    }


__all__ = ["router"]

