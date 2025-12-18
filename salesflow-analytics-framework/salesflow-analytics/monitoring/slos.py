"""
SalesFlow AI - Service Level Objectives (SLOs) Monitoring
==========================================================

Product-centric SLOs that tie technical metrics to business outcomes.
Implements Google's SRE best practices for SLO management.

Features:
- Core SLOs: Message processing, Autopilot, AI response times
- Business SLOs: Follow-up rates, lead analysis, sequence triggers
- Error budgets with burn rate alerting
- Rolling window calculations
- Multi-tenant SLO tracking

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional
from collections import defaultdict
import statistics
import json

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class SLOCategory(str, Enum):
    """Categories of SLOs for organization and reporting."""
    CORE_INFRASTRUCTURE = "core_infrastructure"
    MESSAGE_PROCESSING = "message_processing"
    AI_PERFORMANCE = "ai_performance"
    AUTOPILOT = "autopilot"
    BUSINESS_CONVERSION = "business_conversion"
    USER_EXPERIENCE = "user_experience"


class SLOStatus(str, Enum):
    """Current status of an SLO."""
    HEALTHY = "healthy"           # Within target
    WARNING = "warning"           # Approaching error budget exhaustion
    CRITICAL = "critical"         # Error budget exhausted
    UNKNOWN = "unknown"           # Insufficient data


class AlertSeverity(str, Enum):
    """Severity levels for SLO alerts."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    PAGE = "page"  # Wake someone up


class TimeWindow(Enum):
    """Standard time windows for SLO calculations."""
    MINUTE_1 = timedelta(minutes=1)
    MINUTE_5 = timedelta(minutes=5)
    MINUTE_15 = timedelta(minutes=15)
    HOUR_1 = timedelta(hours=1)
    HOUR_6 = timedelta(hours=6)
    DAY_1 = timedelta(days=1)
    DAY_7 = timedelta(days=7)
    DAY_30 = timedelta(days=30)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SLODefinition:
    """
    Definition of a Service Level Objective.
    
    Attributes:
        name: Unique identifier for the SLO
        description: Human-readable description
        category: Category for grouping
        target_percentage: Target success rate (e.g., 99.5)
        threshold_ms: Latency threshold in milliseconds (for latency SLOs)
        threshold_value: Generic threshold value (for count-based SLOs)
        measurement_window: Time window for measurement
        error_budget_window: Window for error budget calculation (usually 30 days)
        warning_threshold: Percentage of error budget to trigger warning
        critical_threshold: Percentage of error budget to trigger critical
    """
    name: str
    description: str
    category: SLOCategory
    target_percentage: float
    threshold_ms: Optional[int] = None
    threshold_value: Optional[float] = None
    measurement_window: TimeWindow = TimeWindow.HOUR_1
    error_budget_window: TimeWindow = TimeWindow.DAY_30
    warning_threshold: float = 50.0  # Alert when 50% of error budget consumed
    critical_threshold: float = 80.0  # Critical when 80% consumed
    metadata: dict = field(default_factory=dict)


@dataclass
class SLOEvent:
    """
    A single event for SLO measurement.
    
    Attributes:
        slo_name: Name of the SLO this event belongs to
        timestamp: When the event occurred
        success: Whether the event met the SLO criteria
        latency_ms: Latency in milliseconds (if applicable)
        value: Generic value for count-based SLOs
        tenant_id: Tenant identifier for multi-tenant tracking
        metadata: Additional context
    """
    slo_name: str
    timestamp: datetime
    success: bool
    latency_ms: Optional[int] = None
    value: Optional[float] = None
    tenant_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class SLOSnapshot:
    """
    Point-in-time snapshot of SLO performance.
    
    Attributes:
        slo_name: Name of the SLO
        timestamp: When this snapshot was taken
        window: Time window for this measurement
        total_events: Total number of events in window
        successful_events: Number of successful events
        current_percentage: Current success percentage
        target_percentage: Target success percentage
        status: Current SLO status
        error_budget_remaining: Remaining error budget percentage
        burn_rate: Rate of error budget consumption
        p50_latency_ms: 50th percentile latency
        p95_latency_ms: 95th percentile latency
        p99_latency_ms: 99th percentile latency
    """
    slo_name: str
    timestamp: datetime
    window: TimeWindow
    total_events: int
    successful_events: int
    current_percentage: float
    target_percentage: float
    status: SLOStatus
    error_budget_remaining: float
    burn_rate: float
    p50_latency_ms: Optional[float] = None
    p95_latency_ms: Optional[float] = None
    p99_latency_ms: Optional[float] = None
    tenant_breakdown: dict = field(default_factory=dict)


@dataclass
class ErrorBudget:
    """
    Error budget tracking for an SLO.
    
    Error Budget = (100% - Target%) * Total Events in Window
    """
    slo_name: str
    window_start: datetime
    window_end: datetime
    total_budget: float  # Total allowed failures
    consumed: float      # Failures so far
    remaining: float     # Remaining budget
    remaining_percentage: float
    burn_rate_1h: float  # Consumption rate over last hour
    burn_rate_6h: float  # Consumption rate over last 6 hours
    burn_rate_24h: float # Consumption rate over last 24 hours
    projected_exhaustion: Optional[datetime] = None  # When budget will be exhausted


# =============================================================================
# SLO DEFINITIONS - SALESFLOW AI SPECIFIC
# =============================================================================

class SalesFlowSLOs:
    """Pre-defined SLOs for SalesFlow AI platform."""
    
    # Core Infrastructure SLOs
    MESSAGE_PROCESSING = SLODefinition(
        name="message_processing_latency",
        description="99.5% aller message.sent Events innerhalb 5s verarbeitet",
        category=SLOCategory.MESSAGE_PROCESSING,
        target_percentage=99.5,
        threshold_ms=5000,
        measurement_window=TimeWindow.HOUR_1,
        metadata={"criticality": "high", "team": "platform"}
    )
    
    AUTOPILOT_EXECUTION = SLODefinition(
        name="autopilot_job_execution",
        description="99% aller Autopilot-Jobs innerhalb 60s nach Fälligkeit",
        category=SLOCategory.AUTOPILOT,
        target_percentage=99.0,
        threshold_ms=60000,
        measurement_window=TimeWindow.HOUR_1,
        metadata={"criticality": "high", "team": "automation"}
    )
    
    AI_RESPONSE_TIME = SLODefinition(
        name="ai_response_latency",
        description="95% aller AI-Responses innerhalb 2s generiert",
        category=SLOCategory.AI_PERFORMANCE,
        target_percentage=95.0,
        threshold_ms=2000,
        measurement_window=TimeWindow.HOUR_1,
        metadata={"criticality": "medium", "team": "ai"}
    )
    
    LEAD_CRUD_AVAILABILITY = SLODefinition(
        name="lead_crud_availability",
        description="99.9% Uptime für Lead-Erstellung und -Updates",
        category=SLOCategory.CORE_INFRASTRUCTURE,
        target_percentage=99.9,
        measurement_window=TimeWindow.DAY_1,
        metadata={"criticality": "critical", "team": "platform"}
    )
    
    # Business SLOs
    FOLLOWUP_TIMELINESS = SLODefinition(
        name="followup_within_24h",
        description="98% aller Follow-ups innerhalb 24h versendet",
        category=SLOCategory.BUSINESS_CONVERSION,
        target_percentage=98.0,
        threshold_ms=86400000,  # 24 hours in ms
        measurement_window=TimeWindow.DAY_1,
        metadata={"criticality": "high", "team": "automation", "business_impact": "conversion"}
    )
    
    LEAD_ANALYSIS_SPEED = SLODefinition(
        name="lead_initial_analysis",
        description="95% aller Leads haben innerhalb 1h erste AI-Analyse",
        category=SLOCategory.AI_PERFORMANCE,
        target_percentage=95.0,
        threshold_ms=3600000,  # 1 hour in ms
        measurement_window=TimeWindow.DAY_1,
        metadata={"criticality": "medium", "team": "ai", "business_impact": "engagement"}
    )
    
    SEQUENCE_START_TIME = SLODefinition(
        name="sequence_trigger_latency",
        description="99% aller Sequences starten innerhalb 5min nach Trigger",
        category=SLOCategory.AUTOPILOT,
        target_percentage=99.0,
        threshold_ms=300000,  # 5 minutes in ms
        measurement_window=TimeWindow.HOUR_1,
        metadata={"criticality": "high", "team": "automation", "business_impact": "engagement"}
    )
    
    # Additional Business SLOs
    WEBHOOK_DELIVERY = SLODefinition(
        name="webhook_delivery_success",
        description="99.5% aller Webhooks erfolgreich zugestellt",
        category=SLOCategory.CORE_INFRASTRUCTURE,
        target_percentage=99.5,
        measurement_window=TimeWindow.HOUR_1,
        metadata={"criticality": "high", "team": "integrations"}
    )
    
    AI_QUALITY_SCORE = SLODefinition(
        name="ai_response_quality",
        description="90% aller AI-Responses mit Quality Score > 0.8",
        category=SLOCategory.AI_PERFORMANCE,
        target_percentage=90.0,
        threshold_value=0.8,
        measurement_window=TimeWindow.DAY_1,
        metadata={"criticality": "medium", "team": "ai"}
    )
    
    CHANNEL_SYNC_FRESHNESS = SLODefinition(
        name="channel_sync_freshness",
        description="99% aller Channel-Syncs innerhalb 15min",
        category=SLOCategory.MESSAGE_PROCESSING,
        target_percentage=99.0,
        threshold_ms=900000,  # 15 minutes in ms
        measurement_window=TimeWindow.HOUR_6,
        metadata={"criticality": "medium", "team": "integrations"}
    )
    
    @classmethod
    def get_all_slos(cls) -> list[SLODefinition]:
        """Get all pre-defined SLOs."""
        return [
            cls.MESSAGE_PROCESSING,
            cls.AUTOPILOT_EXECUTION,
            cls.AI_RESPONSE_TIME,
            cls.LEAD_CRUD_AVAILABILITY,
            cls.FOLLOWUP_TIMELINESS,
            cls.LEAD_ANALYSIS_SPEED,
            cls.SEQUENCE_START_TIME,
            cls.WEBHOOK_DELIVERY,
            cls.AI_QUALITY_SCORE,
            cls.CHANNEL_SYNC_FRESHNESS,
        ]
    
    @classmethod
    def get_critical_slos(cls) -> list[SLODefinition]:
        """Get only critical SLOs for priority alerting."""
        return [
            slo for slo in cls.get_all_slos()
            if slo.metadata.get("criticality") == "critical"
        ]
    
    @classmethod
    def get_business_slos(cls) -> list[SLODefinition]:
        """Get business-impact SLOs."""
        return [
            slo for slo in cls.get_all_slos()
            if slo.category == SLOCategory.BUSINESS_CONVERSION
            or slo.metadata.get("business_impact")
        ]


# =============================================================================
# SLO CALCULATOR
# =============================================================================

class SLOCalculator:
    """
    Calculates SLO metrics from raw events.
    
    Implements sliding window calculations, percentile latencies,
    and error budget tracking.
    """
    
    def __init__(self):
        self._events: dict[str, list[SLOEvent]] = defaultdict(list)
        self._max_events_per_slo = 100000  # Limit memory usage
    
    def record_event(self, event: SLOEvent) -> None:
        """Record a new SLO event."""
        events = self._events[event.slo_name]
        events.append(event)
        
        # Trim old events to prevent memory bloat
        if len(events) > self._max_events_per_slo:
            # Keep only last 30 days
            cutoff = datetime.utcnow() - timedelta(days=30)
            self._events[event.slo_name] = [
                e for e in events if e.timestamp > cutoff
            ]
    
    def get_events_in_window(
        self,
        slo_name: str,
        window: TimeWindow,
        tenant_id: Optional[str] = None
    ) -> list[SLOEvent]:
        """Get events within a time window."""
        cutoff = datetime.utcnow() - window.value
        events = self._events.get(slo_name, [])
        
        filtered = [e for e in events if e.timestamp > cutoff]
        
        if tenant_id:
            filtered = [e for e in filtered if e.tenant_id == tenant_id]
        
        return filtered
    
    def calculate_snapshot(
        self,
        slo: SLODefinition,
        tenant_id: Optional[str] = None
    ) -> SLOSnapshot:
        """Calculate current SLO snapshot."""
        events = self.get_events_in_window(slo.name, slo.measurement_window, tenant_id)
        
        total = len(events)
        successful = sum(1 for e in events if e.success)
        
        # Calculate percentage
        current_pct = (successful / total * 100) if total > 0 else 100.0
        
        # Calculate latency percentiles if applicable
        latencies = [e.latency_ms for e in events if e.latency_ms is not None]
        p50 = p95 = p99 = None
        if latencies:
            sorted_latencies = sorted(latencies)
            p50 = self._percentile(sorted_latencies, 50)
            p95 = self._percentile(sorted_latencies, 95)
            p99 = self._percentile(sorted_latencies, 99)
        
        # Calculate error budget
        error_budget = self.calculate_error_budget(slo, tenant_id)
        
        # Determine status
        status = self._determine_status(slo, current_pct, error_budget)
        
        # Calculate tenant breakdown if no specific tenant
        tenant_breakdown = {}
        if not tenant_id:
            tenant_ids = set(e.tenant_id for e in events if e.tenant_id)
            for tid in tenant_ids:
                tenant_events = [e for e in events if e.tenant_id == tid]
                tenant_successful = sum(1 for e in tenant_events if e.success)
                tenant_pct = (tenant_successful / len(tenant_events) * 100) if tenant_events else 100.0
                tenant_breakdown[tid] = {
                    "total": len(tenant_events),
                    "successful": tenant_successful,
                    "percentage": round(tenant_pct, 2)
                }
        
        return SLOSnapshot(
            slo_name=slo.name,
            timestamp=datetime.utcnow(),
            window=slo.measurement_window,
            total_events=total,
            successful_events=successful,
            current_percentage=round(current_pct, 2),
            target_percentage=slo.target_percentage,
            status=status,
            error_budget_remaining=round(error_budget.remaining_percentage, 2),
            burn_rate=round(error_budget.burn_rate_1h, 2),
            p50_latency_ms=round(p50, 1) if p50 else None,
            p95_latency_ms=round(p95, 1) if p95 else None,
            p99_latency_ms=round(p99, 1) if p99 else None,
            tenant_breakdown=tenant_breakdown
        )
    
    def calculate_error_budget(
        self,
        slo: SLODefinition,
        tenant_id: Optional[str] = None
    ) -> ErrorBudget:
        """Calculate error budget for an SLO."""
        window = slo.error_budget_window
        events = self.get_events_in_window(slo.name, window, tenant_id)
        
        total = len(events)
        failures = sum(1 for e in events if not e.success)
        
        # Error budget = allowed failure rate * total events
        allowed_failure_rate = (100 - slo.target_percentage) / 100
        total_budget = total * allowed_failure_rate if total > 0 else 0
        
        consumed = failures
        remaining = max(0, total_budget - consumed)
        remaining_pct = (remaining / total_budget * 100) if total_budget > 0 else 100.0
        
        # Calculate burn rates
        burn_rate_1h = self._calculate_burn_rate(slo, TimeWindow.HOUR_1, tenant_id)
        burn_rate_6h = self._calculate_burn_rate(slo, TimeWindow.HOUR_6, tenant_id)
        burn_rate_24h = self._calculate_burn_rate(slo, TimeWindow.DAY_1, tenant_id)
        
        # Project exhaustion
        projected_exhaustion = None
        if burn_rate_1h > 0 and remaining > 0:
            hours_until_exhaustion = remaining / burn_rate_1h
            projected_exhaustion = datetime.utcnow() + timedelta(hours=hours_until_exhaustion)
        
        return ErrorBudget(
            slo_name=slo.name,
            window_start=datetime.utcnow() - window.value,
            window_end=datetime.utcnow(),
            total_budget=round(total_budget, 2),
            consumed=consumed,
            remaining=round(remaining, 2),
            remaining_percentage=round(remaining_pct, 2),
            burn_rate_1h=round(burn_rate_1h, 4),
            burn_rate_6h=round(burn_rate_6h, 4),
            burn_rate_24h=round(burn_rate_24h, 4),
            projected_exhaustion=projected_exhaustion
        )
    
    def _calculate_burn_rate(
        self,
        slo: SLODefinition,
        window: TimeWindow,
        tenant_id: Optional[str] = None
    ) -> float:
        """
        Calculate burn rate for a window.
        
        Burn rate = actual error rate / allowed error rate
        A burn rate of 1 means we're consuming budget at expected rate
        A burn rate of 2 means we're consuming at 2x the expected rate
        """
        events = self.get_events_in_window(slo.name, window, tenant_id)
        
        if not events:
            return 0.0
        
        total = len(events)
        failures = sum(1 for e in events if not e.success)
        
        actual_error_rate = failures / total if total > 0 else 0
        allowed_error_rate = (100 - slo.target_percentage) / 100
        
        if allowed_error_rate == 0:
            return float('inf') if actual_error_rate > 0 else 0
        
        return actual_error_rate / allowed_error_rate
    
    def _determine_status(
        self,
        slo: SLODefinition,
        current_pct: float,
        error_budget: ErrorBudget
    ) -> SLOStatus:
        """Determine SLO status based on current metrics."""
        if error_budget.remaining_percentage <= (100 - slo.critical_threshold):
            return SLOStatus.CRITICAL
        elif error_budget.remaining_percentage <= (100 - slo.warning_threshold):
            return SLOStatus.WARNING
        elif current_pct >= slo.target_percentage:
            return SLOStatus.HEALTHY
        else:
            return SLOStatus.WARNING
    
    @staticmethod
    def _percentile(sorted_data: list[float], percentile: float) -> float:
        """Calculate percentile from sorted data."""
        if not sorted_data:
            return 0.0
        k = (len(sorted_data) - 1) * percentile / 100
        f = int(k)
        c = f + 1 if f + 1 < len(sorted_data) else f
        return sorted_data[f] + (sorted_data[c] - sorted_data[f]) * (k - f)


# =============================================================================
# SLO MONITOR
# =============================================================================

class SLOMonitor:
    """
    Central SLO monitoring system.
    
    Manages SLO definitions, records events, calculates metrics,
    and triggers alerts when thresholds are breached.
    """
    
    def __init__(self):
        self._slos: dict[str, SLODefinition] = {}
        self._calculator = SLOCalculator()
        self._alert_callbacks: list[Callable[[str, SLOSnapshot, AlertSeverity], None]] = []
        self._last_alert_time: dict[str, datetime] = {}
        self._alert_cooldown = timedelta(minutes=5)
        
        # Register default SalesFlow SLOs
        for slo in SalesFlowSLOs.get_all_slos():
            self.register_slo(slo)
    
    def register_slo(self, slo: SLODefinition) -> None:
        """Register an SLO for monitoring."""
        self._slos[slo.name] = slo
        logger.info(f"Registered SLO: {slo.name} (target: {slo.target_percentage}%)")
    
    def unregister_slo(self, name: str) -> None:
        """Unregister an SLO."""
        if name in self._slos:
            del self._slos[name]
            logger.info(f"Unregistered SLO: {name}")
    
    def record_latency_event(
        self,
        slo_name: str,
        latency_ms: int,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> None:
        """
        Record a latency-based SLO event.
        
        Automatically determines success based on threshold.
        """
        slo = self._slos.get(slo_name)
        if not slo:
            logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        success = latency_ms <= slo.threshold_ms if slo.threshold_ms else True
        
        event = SLOEvent(
            slo_name=slo_name,
            timestamp=datetime.utcnow(),
            success=success,
            latency_ms=latency_ms,
            tenant_id=tenant_id,
            metadata=metadata or {}
        )
        
        self._calculator.record_event(event)
        self._check_alert(slo)
    
    def record_success_event(
        self,
        slo_name: str,
        success: bool,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> None:
        """Record a success/failure SLO event."""
        slo = self._slos.get(slo_name)
        if not slo:
            logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        event = SLOEvent(
            slo_name=slo_name,
            timestamp=datetime.utcnow(),
            success=success,
            tenant_id=tenant_id,
            metadata=metadata or {}
        )
        
        self._calculator.record_event(event)
        self._check_alert(slo)
    
    def record_value_event(
        self,
        slo_name: str,
        value: float,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> None:
        """
        Record a value-based SLO event.
        
        Success determined by comparing value to threshold.
        """
        slo = self._slos.get(slo_name)
        if not slo:
            logger.warning(f"Unknown SLO: {slo_name}")
            return
        
        success = value >= slo.threshold_value if slo.threshold_value else True
        
        event = SLOEvent(
            slo_name=slo_name,
            timestamp=datetime.utcnow(),
            success=success,
            value=value,
            tenant_id=tenant_id,
            metadata=metadata or {}
        )
        
        self._calculator.record_event(event)
        self._check_alert(slo)
    
    def get_snapshot(
        self,
        slo_name: str,
        tenant_id: Optional[str] = None
    ) -> Optional[SLOSnapshot]:
        """Get current snapshot for an SLO."""
        slo = self._slos.get(slo_name)
        if not slo:
            return None
        return self._calculator.calculate_snapshot(slo, tenant_id)
    
    def get_all_snapshots(
        self,
        tenant_id: Optional[str] = None,
        category: Optional[SLOCategory] = None
    ) -> list[SLOSnapshot]:
        """Get snapshots for all SLOs."""
        snapshots = []
        for slo in self._slos.values():
            if category and slo.category != category:
                continue
            snapshot = self._calculator.calculate_snapshot(slo, tenant_id)
            snapshots.append(snapshot)
        return snapshots
    
    def get_error_budget(
        self,
        slo_name: str,
        tenant_id: Optional[str] = None
    ) -> Optional[ErrorBudget]:
        """Get error budget for an SLO."""
        slo = self._slos.get(slo_name)
        if not slo:
            return None
        return self._calculator.calculate_error_budget(slo, tenant_id)
    
    def get_health_summary(self, tenant_id: Optional[str] = None) -> dict[str, Any]:
        """Get overall SLO health summary."""
        snapshots = self.get_all_snapshots(tenant_id)
        
        status_counts = {s.value: 0 for s in SLOStatus}
        category_health = defaultdict(list)
        
        for snapshot in snapshots:
            status_counts[snapshot.status.value] += 1
            slo = self._slos[snapshot.slo_name]
            category_health[slo.category.value].append({
                "name": snapshot.slo_name,
                "status": snapshot.status.value,
                "current": snapshot.current_percentage,
                "target": snapshot.target_percentage,
                "error_budget_remaining": snapshot.error_budget_remaining
            })
        
        # Overall status
        if status_counts[SLOStatus.CRITICAL.value] > 0:
            overall_status = SLOStatus.CRITICAL
        elif status_counts[SLOStatus.WARNING.value] > 0:
            overall_status = SLOStatus.WARNING
        else:
            overall_status = SLOStatus.HEALTHY
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": overall_status.value,
            "status_counts": status_counts,
            "category_health": dict(category_health),
            "total_slos": len(snapshots),
            "healthy_slos": status_counts[SLOStatus.HEALTHY.value],
            "tenant_id": tenant_id
        }
    
    def register_alert_callback(
        self,
        callback: Callable[[str, SLOSnapshot, AlertSeverity], None]
    ) -> None:
        """Register callback for SLO alerts."""
        self._alert_callbacks.append(callback)
    
    def _check_alert(self, slo: SLODefinition) -> None:
        """Check if alert should be triggered for SLO."""
        # Check cooldown
        last_alert = self._last_alert_time.get(slo.name)
        if last_alert and datetime.utcnow() - last_alert < self._alert_cooldown:
            return
        
        snapshot = self._calculator.calculate_snapshot(slo)
        
        # Determine alert severity
        severity = None
        if snapshot.status == SLOStatus.CRITICAL:
            severity = AlertSeverity.CRITICAL
        elif snapshot.status == SLOStatus.WARNING:
            severity = AlertSeverity.WARNING
        
        if severity and self._alert_callbacks:
            self._last_alert_time[slo.name] = datetime.utcnow()
            for callback in self._alert_callbacks:
                try:
                    callback(slo.name, snapshot, severity)
                except Exception as e:
                    logger.error(f"Alert callback error: {e}")


# =============================================================================
# SLO REPORTER
# =============================================================================

class SLOReporter:
    """
    Generates SLO reports and exports.
    
    Supports various formats: JSON, Markdown, Prometheus metrics.
    """
    
    def __init__(self, monitor: SLOMonitor):
        self._monitor = monitor
    
    def generate_json_report(
        self,
        tenant_id: Optional[str] = None,
        include_tenant_breakdown: bool = True
    ) -> str:
        """Generate JSON report of all SLOs."""
        snapshots = self._monitor.get_all_snapshots(tenant_id)
        
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "tenant_id": tenant_id,
            "summary": self._monitor.get_health_summary(tenant_id),
            "slos": []
        }
        
        for snapshot in snapshots:
            slo_data = {
                "name": snapshot.slo_name,
                "status": snapshot.status.value,
                "current_percentage": snapshot.current_percentage,
                "target_percentage": snapshot.target_percentage,
                "total_events": snapshot.total_events,
                "successful_events": snapshot.successful_events,
                "error_budget_remaining": snapshot.error_budget_remaining,
                "burn_rate": snapshot.burn_rate,
                "window": snapshot.window.name,
                "latency": {
                    "p50_ms": snapshot.p50_latency_ms,
                    "p95_ms": snapshot.p95_latency_ms,
                    "p99_ms": snapshot.p99_latency_ms
                }
            }
            
            if include_tenant_breakdown and snapshot.tenant_breakdown:
                slo_data["tenant_breakdown"] = snapshot.tenant_breakdown
            
            report["slos"].append(slo_data)
        
        return json.dumps(report, indent=2, default=str)
    
    def generate_markdown_report(self, tenant_id: Optional[str] = None) -> str:
        """Generate Markdown report of all SLOs."""
        summary = self._monitor.get_health_summary(tenant_id)
        snapshots = self._monitor.get_all_snapshots(tenant_id)
        
        lines = [
            "# SLO Status Report",
            f"",
            f"**Generated:** {datetime.utcnow().isoformat()}",
            f"**Overall Status:** {summary['overall_status'].upper()}",
            f"",
            "## Summary",
            f"",
            f"| Status | Count |",
            f"|--------|-------|",
        ]
        
        for status, count in summary['status_counts'].items():
            emoji = {"healthy": "✅", "warning": "⚠️", "critical": "🚨", "unknown": "❓"}.get(status, "")
            lines.append(f"| {emoji} {status.title()} | {count} |")
        
        lines.extend([
            "",
            "## SLO Details",
            "",
            "| SLO | Status | Current | Target | Error Budget | Burn Rate |",
            "|-----|--------|---------|--------|--------------|-----------|"
        ])
        
        for snapshot in snapshots:
            status_emoji = {
                SLOStatus.HEALTHY: "✅",
                SLOStatus.WARNING: "⚠️",
                SLOStatus.CRITICAL: "🚨",
                SLOStatus.UNKNOWN: "❓"
            }.get(snapshot.status, "")
            
            lines.append(
                f"| {snapshot.slo_name} | {status_emoji} {snapshot.status.value} | "
                f"{snapshot.current_percentage}% | {snapshot.target_percentage}% | "
                f"{snapshot.error_budget_remaining}% | {snapshot.burn_rate}x |"
            )
        
        return "\n".join(lines)
    
    def generate_prometheus_metrics(self, tenant_id: Optional[str] = None) -> str:
        """Generate Prometheus exposition format metrics."""
        snapshots = self._monitor.get_all_snapshots(tenant_id)
        lines = []
        
        for snapshot in snapshots:
            labels = f'slo="{snapshot.slo_name}"'
            if tenant_id:
                labels += f',tenant="{tenant_id}"'
            
            lines.extend([
                f'# HELP slo_current_percentage Current SLO percentage',
                f'slo_current_percentage{{{labels}}} {snapshot.current_percentage}',
                f'# HELP slo_target_percentage Target SLO percentage',
                f'slo_target_percentage{{{labels}}} {snapshot.target_percentage}',
                f'# HELP slo_error_budget_remaining Remaining error budget percentage',
                f'slo_error_budget_remaining{{{labels}}} {snapshot.error_budget_remaining}',
                f'# HELP slo_burn_rate Current burn rate multiplier',
                f'slo_burn_rate{{{labels}}} {snapshot.burn_rate}',
                f'# HELP slo_total_events Total events in window',
                f'slo_total_events{{{labels}}} {snapshot.total_events}',
            ])
            
            if snapshot.p95_latency_ms:
                lines.extend([
                    f'# HELP slo_latency_p95_ms 95th percentile latency in ms',
                    f'slo_latency_p95_ms{{{labels}}} {snapshot.p95_latency_ms}',
                ])
        
        return "\n".join(lines)


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_slo_monitor() -> tuple[SLOMonitor, SLOReporter]:
    """
    Create and configure SLO monitoring system.
    
    Returns:
        Tuple of (SLOMonitor, SLOReporter)
    
    Example:
        monitor, reporter = create_slo_monitor()
        
        # Record events
        monitor.record_latency_event("message_processing_latency", 1500, "tenant-123")
        
        # Get snapshot
        snapshot = monitor.get_snapshot("message_processing_latency")
        
        # Generate report
        print(reporter.generate_markdown_report())
    """
    monitor = SLOMonitor()
    reporter = SLOReporter(monitor)
    
    return monitor, reporter


# =============================================================================
# CONTEXT MANAGER FOR LATENCY TRACKING
# =============================================================================

class SLOLatencyTracker:
    """
    Context manager for automatic latency tracking.
    
    Example:
        async with SLOLatencyTracker(monitor, "ai_response_latency", "tenant-123"):
            response = await generate_ai_response()
    """
    
    def __init__(
        self,
        monitor: SLOMonitor,
        slo_name: str,
        tenant_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        self._monitor = monitor
        self._slo_name = slo_name
        self._tenant_id = tenant_id
        self._metadata = metadata or {}
        self._start_time: Optional[datetime] = None
    
    async def __aenter__(self):
        self._start_time = datetime.utcnow()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._start_time:
            latency_ms = int((datetime.utcnow() - self._start_time).total_seconds() * 1000)
            self._metadata["success"] = exc_type is None
            self._monitor.record_latency_event(
                self._slo_name,
                latency_ms,
                self._tenant_id,
                self._metadata
            )
        return False  # Don't suppress exceptions
    
    def __enter__(self):
        self._start_time = datetime.utcnow()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._start_time:
            latency_ms = int((datetime.utcnow() - self._start_time).total_seconds() * 1000)
            self._metadata["success"] = exc_type is None
            self._monitor.record_latency_event(
                self._slo_name,
                latency_ms,
                self._tenant_id,
                self._metadata
            )
        return False
