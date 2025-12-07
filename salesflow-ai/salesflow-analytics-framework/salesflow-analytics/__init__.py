"""
SalesFlow AI - Product Monitoring & Analytics Framework
========================================================

Enterprise-level monitoring and business intelligence for Network Marketing.

Modules:
- monitoring: SLOs, Alerts, Health Checks, Metrics
- business: Conversion Tracking, Attribution, Predictions, Forecasting
- dashboards: Real-time Dashboards, Reports, APIs

Author: SalesFlow AI Team
Version: 1.0.0
"""

from .monitoring.slos import (
    SLOMonitor,
    SLOReporter,
    SalesFlowSLOs,
    create_slo_monitor,
    SLOLatencyTracker,
)
from .monitoring.alerts import (
    AlertManager,
    SalesFlowAlertRules,
    create_alert_manager,
)
from .monitoring.health import (
    HealthCheckManager,
    HealthCheckRunner,
    create_health_check_manager,
)
from .monitoring.metrics import (
    SalesFlowMetrics,
    MetricsRegistry,
    create_metrics_system,
    get_metrics,
    Timer,
)
from .business.conversion import (
    FunnelTracker,
    FunnelStage,
    LeadSource,
    Channel,
    create_funnel_tracker,
)
from .business.attribution import (
    AttributionEngine,
    AttributionModel,
    create_attribution_engine,
)

__all__ = [
    # Monitoring
    "SLOMonitor",
    "SLOReporter", 
    "SalesFlowSLOs",
    "create_slo_monitor",
    "SLOLatencyTracker",
    "AlertManager",
    "SalesFlowAlertRules",
    "create_alert_manager",
    "HealthCheckManager",
    "HealthCheckRunner",
    "create_health_check_manager",
    "SalesFlowMetrics",
    "MetricsRegistry",
    "create_metrics_system",
    "get_metrics",
    "Timer",
    # Business
    "FunnelTracker",
    "FunnelStage",
    "LeadSource",
    "Channel",
    "create_funnel_tracker",
    "AttributionEngine",
    "AttributionModel",
    "create_attribution_engine",
]
