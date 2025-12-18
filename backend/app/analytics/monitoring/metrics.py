"""
SalesFlow AI - Custom Metrics Collection
=========================================

Comprehensive metrics collection for business and technical metrics.
Prometheus-compatible with custom aggregations.

Features:
- Counter, Gauge, Histogram, Summary metrics
- Label support for multi-dimensional data
- Time-series storage
- Prometheus exposition format
- Business metric helpers

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import asyncio
import logging
import math
import time
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional, Union
from collections import defaultdict
import re

logger = logging.getLogger(__name__)


# =============================================================================
# METRIC TYPES
# =============================================================================

class MetricType(str, Enum):
    """Types of metrics."""
    COUNTER = "counter"      # Monotonically increasing
    GAUGE = "gauge"          # Can go up or down
    HISTOGRAM = "histogram"  # Distribution of values
    SUMMARY = "summary"      # Similar to histogram with quantiles


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class MetricValue:
    """A single metric value with timestamp."""
    value: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class HistogramBucket:
    """A histogram bucket."""
    le: float  # less than or equal
    count: int


@dataclass
class MetricDefinition:
    """Definition of a metric."""
    name: str
    metric_type: MetricType
    description: str
    labels: list[str] = field(default_factory=list)
    buckets: list[float] = field(default_factory=list)  # For histograms
    quantiles: list[float] = field(default_factory=list)  # For summaries
    unit: str = ""


# =============================================================================
# METRIC BASE CLASS
# =============================================================================

class Metric(ABC):
    """Base class for all metrics."""
    
    def __init__(self, definition: MetricDefinition):
        self.definition = definition
        self._lock = threading.Lock()
    
    @property
    def name(self) -> str:
        return self.definition.name
    
    @property
    def metric_type(self) -> MetricType:
        return self.definition.metric_type
    
    @abstractmethod
    def get_prometheus_format(self) -> str:
        """Get metric in Prometheus exposition format."""
        pass
    
    @abstractmethod
    def reset(self) -> None:
        """Reset the metric."""
        pass
    
    def _labels_to_string(self, labels: dict[str, str]) -> str:
        """Convert labels dict to Prometheus format string."""
        if not labels:
            return ""
        parts = [f'{k}="{v}"' for k, v in sorted(labels.items())]
        return "{" + ",".join(parts) + "}"


# =============================================================================
# COUNTER
# =============================================================================

class Counter(Metric):
    """
    A counter that can only increase.
    
    Use for: requests, errors, events processed, etc.
    """
    
    def __init__(self, definition: MetricDefinition):
        super().__init__(definition)
        self._values: dict[str, float] = defaultdict(float)
    
    def inc(self, amount: float = 1, **labels) -> None:
        """Increment the counter."""
        if amount < 0:
            raise ValueError("Counter can only be incremented")
        key = self._labels_key(labels)
        with self._lock:
            self._values[key] += amount
    
    def get(self, **labels) -> float:
        """Get current counter value."""
        key = self._labels_key(labels)
        return self._values.get(key, 0)
    
    def reset(self) -> None:
        """Reset all counter values."""
        with self._lock:
            self._values.clear()
    
    def _labels_key(self, labels: dict) -> str:
        """Create a hashable key from labels."""
        return str(sorted(labels.items()))
    
    def get_prometheus_format(self) -> str:
        """Get Prometheus format output."""
        lines = [
            f"# HELP {self.name} {self.definition.description}",
            f"# TYPE {self.name} counter"
        ]
        
        for key, value in self._values.items():
            labels = dict(eval(key)) if key != "[]" else {}
            label_str = self._labels_to_string(labels)
            lines.append(f"{self.name}{label_str} {value}")
        
        return "\n".join(lines)


# =============================================================================
# GAUGE
# =============================================================================

class Gauge(Metric):
    """
    A gauge that can go up or down.
    
    Use for: current connections, queue depth, temperature, etc.
    """
    
    def __init__(self, definition: MetricDefinition):
        super().__init__(definition)
        self._values: dict[str, float] = {}
    
    def set(self, value: float, **labels) -> None:
        """Set the gauge value."""
        key = self._labels_key(labels)
        with self._lock:
            self._values[key] = value
    
    def inc(self, amount: float = 1, **labels) -> None:
        """Increment the gauge."""
        key = self._labels_key(labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0) + amount
    
    def dec(self, amount: float = 1, **labels) -> None:
        """Decrement the gauge."""
        key = self._labels_key(labels)
        with self._lock:
            self._values[key] = self._values.get(key, 0) - amount
    
    def get(self, **labels) -> float:
        """Get current gauge value."""
        key = self._labels_key(labels)
        return self._values.get(key, 0)
    
    def reset(self) -> None:
        """Reset all gauge values."""
        with self._lock:
            self._values.clear()
    
    def _labels_key(self, labels: dict) -> str:
        return str(sorted(labels.items()))
    
    def get_prometheus_format(self) -> str:
        lines = [
            f"# HELP {self.name} {self.definition.description}",
            f"# TYPE {self.name} gauge"
        ]
        
        for key, value in self._values.items():
            labels = dict(eval(key)) if key != "[]" else {}
            label_str = self._labels_to_string(labels)
            lines.append(f"{self.name}{label_str} {value}")
        
        return "\n".join(lines)


# =============================================================================
# HISTOGRAM
# =============================================================================

class Histogram(Metric):
    """
    A histogram for distribution of values.
    
    Use for: request latencies, response sizes, etc.
    """
    
    DEFAULT_BUCKETS = [
        0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75,
        1.0, 2.5, 5.0, 7.5, 10.0
    ]
    
    def __init__(self, definition: MetricDefinition):
        super().__init__(definition)
        self._buckets = definition.buckets or self.DEFAULT_BUCKETS
        self._values: dict[str, dict] = {}
    
    def observe(self, value: float, **labels) -> None:
        """Record a value in the histogram."""
        key = self._labels_key(labels)
        
        with self._lock:
            if key not in self._values:
                self._values[key] = {
                    "buckets": {b: 0 for b in self._buckets},
                    "sum": 0,
                    "count": 0
                }
            
            data = self._values[key]
            data["sum"] += value
            data["count"] += 1
            
            for bucket in self._buckets:
                if value <= bucket:
                    data["buckets"][bucket] += 1
    
    def get_percentile(self, percentile: float, **labels) -> Optional[float]:
        """Get approximate percentile value."""
        key = self._labels_key(labels)
        data = self._values.get(key)
        
        if not data or data["count"] == 0:
            return None
        
        target_count = data["count"] * percentile / 100
        cumulative = 0
        prev_bucket = 0
        
        for bucket in sorted(self._buckets):
            cumulative += data["buckets"].get(bucket, 0)
            if cumulative >= target_count:
                # Linear interpolation
                return prev_bucket + (bucket - prev_bucket) * (target_count / cumulative)
            prev_bucket = bucket
        
        return self._buckets[-1]
    
    def reset(self) -> None:
        with self._lock:
            self._values.clear()
    
    def _labels_key(self, labels: dict) -> str:
        return str(sorted(labels.items()))
    
    def get_prometheus_format(self) -> str:
        lines = [
            f"# HELP {self.name} {self.definition.description}",
            f"# TYPE {self.name} histogram"
        ]
        
        for key, data in self._values.items():
            labels = dict(eval(key)) if key != "[]" else {}
            base_label_str = self._labels_to_string(labels)
            
            cumulative = 0
            for bucket in sorted(self._buckets):
                cumulative += data["buckets"].get(bucket, 0)
                bucket_labels = {**labels, "le": str(bucket)}
                label_str = self._labels_to_string(bucket_labels)
                lines.append(f"{self.name}_bucket{label_str} {cumulative}")
            
            # +Inf bucket
            inf_labels = {**labels, "le": "+Inf"}
            label_str = self._labels_to_string(inf_labels)
            lines.append(f"{self.name}_bucket{label_str} {data['count']}")
            
            # Sum and count
            lines.append(f"{self.name}_sum{base_label_str} {data['sum']}")
            lines.append(f"{self.name}_count{base_label_str} {data['count']}")
        
        return "\n".join(lines)


# =============================================================================
# SUMMARY
# =============================================================================

class Summary(Metric):
    """
    A summary metric with configurable quantiles.
    
    Use for: precise percentile calculations over recent data.
    """
    
    DEFAULT_QUANTILES = [0.5, 0.9, 0.95, 0.99]
    
    def __init__(self, definition: MetricDefinition, max_age_seconds: int = 600):
        super().__init__(definition)
        self._quantiles = definition.quantiles or self.DEFAULT_QUANTILES
        self._max_age = max_age_seconds
        self._values: dict[str, list[tuple[float, float]]] = defaultdict(list)
    
    def observe(self, value: float, **labels) -> None:
        """Record a value."""
        key = self._labels_key(labels)
        now = time.time()
        
        with self._lock:
            self._values[key].append((now, value))
            self._cleanup(key)
    
    def _cleanup(self, key: str) -> None:
        """Remove old values."""
        cutoff = time.time() - self._max_age
        self._values[key] = [
            (t, v) for t, v in self._values[key]
            if t > cutoff
        ]
    
    def get_quantile(self, quantile: float, **labels) -> Optional[float]:
        """Get a specific quantile."""
        key = self._labels_key(labels)
        values = [v for _, v in self._values.get(key, [])]
        
        if not values:
            return None
        
        sorted_values = sorted(values)
        idx = int(len(sorted_values) * quantile)
        return sorted_values[min(idx, len(sorted_values) - 1)]
    
    def reset(self) -> None:
        with self._lock:
            self._values.clear()
    
    def _labels_key(self, labels: dict) -> str:
        return str(sorted(labels.items()))
    
    def get_prometheus_format(self) -> str:
        lines = [
            f"# HELP {self.name} {self.definition.description}",
            f"# TYPE {self.name} summary"
        ]
        
        for key in self._values:
            labels = dict(eval(key)) if key != "[]" else {}
            values = [v for _, v in self._values[key]]
            
            if values:
                for q in self._quantiles:
                    q_labels = {**labels, "quantile": str(q)}
                    label_str = self._labels_to_string(q_labels)
                    q_value = sorted(values)[int(len(values) * q)]
                    lines.append(f"{self.name}{label_str} {q_value}")
                
                base_label_str = self._labels_to_string(labels)
                lines.append(f"{self.name}_sum{base_label_str} {sum(values)}")
                lines.append(f"{self.name}_count{base_label_str} {len(values)}")
        
        return "\n".join(lines)


# =============================================================================
# METRICS REGISTRY
# =============================================================================

class MetricsRegistry:
    """
    Central registry for all metrics.
    
    Provides metric creation, lookup, and Prometheus export.
    """
    
    def __init__(self, prefix: str = "salesflow"):
        self._prefix = prefix
        self._metrics: dict[str, Metric] = {}
        self._lock = threading.Lock()
    
    def counter(
        self,
        name: str,
        description: str,
        labels: Optional[list[str]] = None
    ) -> Counter:
        """Create or get a counter metric."""
        full_name = f"{self._prefix}_{name}"
        
        with self._lock:
            if full_name in self._metrics:
                metric = self._metrics[full_name]
                if not isinstance(metric, Counter):
                    raise ValueError(f"Metric {name} exists but is not a Counter")
                return metric
            
            definition = MetricDefinition(
                name=full_name,
                metric_type=MetricType.COUNTER,
                description=description,
                labels=labels or []
            )
            metric = Counter(definition)
            self._metrics[full_name] = metric
            return metric
    
    def gauge(
        self,
        name: str,
        description: str,
        labels: Optional[list[str]] = None
    ) -> Gauge:
        """Create or get a gauge metric."""
        full_name = f"{self._prefix}_{name}"
        
        with self._lock:
            if full_name in self._metrics:
                metric = self._metrics[full_name]
                if not isinstance(metric, Gauge):
                    raise ValueError(f"Metric {name} exists but is not a Gauge")
                return metric
            
            definition = MetricDefinition(
                name=full_name,
                metric_type=MetricType.GAUGE,
                description=description,
                labels=labels or []
            )
            metric = Gauge(definition)
            self._metrics[full_name] = metric
            return metric
    
    def histogram(
        self,
        name: str,
        description: str,
        labels: Optional[list[str]] = None,
        buckets: Optional[list[float]] = None
    ) -> Histogram:
        """Create or get a histogram metric."""
        full_name = f"{self._prefix}_{name}"
        
        with self._lock:
            if full_name in self._metrics:
                metric = self._metrics[full_name]
                if not isinstance(metric, Histogram):
                    raise ValueError(f"Metric {name} exists but is not a Histogram")
                return metric
            
            definition = MetricDefinition(
                name=full_name,
                metric_type=MetricType.HISTOGRAM,
                description=description,
                labels=labels or [],
                buckets=buckets or []
            )
            metric = Histogram(definition)
            self._metrics[full_name] = metric
            return metric
    
    def summary(
        self,
        name: str,
        description: str,
        labels: Optional[list[str]] = None,
        quantiles: Optional[list[float]] = None
    ) -> Summary:
        """Create or get a summary metric."""
        full_name = f"{self._prefix}_{name}"
        
        with self._lock:
            if full_name in self._metrics:
                metric = self._metrics[full_name]
                if not isinstance(metric, Summary):
                    raise ValueError(f"Metric {name} exists but is not a Summary")
                return metric
            
            definition = MetricDefinition(
                name=full_name,
                metric_type=MetricType.SUMMARY,
                description=description,
                labels=labels or [],
                quantiles=quantiles or []
            )
            metric = Summary(definition)
            self._metrics[full_name] = metric
            return metric
    
    def get_prometheus_output(self) -> str:
        """Get all metrics in Prometheus exposition format."""
        lines = []
        for metric in self._metrics.values():
            lines.append(metric.get_prometheus_format())
        return "\n\n".join(lines)
    
    def reset_all(self) -> None:
        """Reset all metrics."""
        for metric in self._metrics.values():
            metric.reset()


# =============================================================================
# PRE-DEFINED SALESFLOW METRICS
# =============================================================================

class SalesFlowMetrics:
    """
    Pre-defined metrics for SalesFlow AI.
    
    Creates all standard metrics for the platform.
    """
    
    def __init__(self, registry: Optional[MetricsRegistry] = None):
        self.registry = registry or MetricsRegistry()
        self._create_metrics()
    
    def _create_metrics(self) -> None:
        """Create all standard metrics."""
        
        # Request metrics
        self.http_requests_total = self.registry.counter(
            "http_requests_total",
            "Total HTTP requests",
            labels=["method", "endpoint", "status"]
        )
        
        self.http_request_duration = self.registry.histogram(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
            labels=["method", "endpoint"],
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        )
        
        # AI metrics
        self.ai_requests_total = self.registry.counter(
            "ai_requests_total",
            "Total AI API requests",
            labels=["provider", "model", "scenario"]
        )
        
        self.ai_tokens_total = self.registry.counter(
            "ai_tokens_total",
            "Total AI tokens used",
            labels=["provider", "model", "type"]  # type: input/output
        )
        
        self.ai_request_duration = self.registry.histogram(
            "ai_request_duration_seconds",
            "AI request duration in seconds",
            labels=["provider", "model"],
            buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
        )
        
        self.ai_cost_dollars = self.registry.counter(
            "ai_cost_dollars_total",
            "Total AI cost in dollars",
            labels=["provider", "model", "tenant_id"]
        )
        
        self.ai_quality_score = self.registry.summary(
            "ai_quality_score",
            "AI response quality score",
            labels=["scenario"],
            quantiles=[0.5, 0.9, 0.95, 0.99]
        )
        
        # Business metrics
        self.leads_created_total = self.registry.counter(
            "leads_created_total",
            "Total leads created",
            labels=["source", "tenant_id"]
        )
        
        self.leads_converted_total = self.registry.counter(
            "leads_converted_total",
            "Total leads converted",
            labels=["source", "tenant_id"]
        )
        
        self.messages_sent_total = self.registry.counter(
            "messages_sent_total",
            "Total messages sent",
            labels=["channel", "type", "tenant_id"]
        )
        
        self.messages_received_total = self.registry.counter(
            "messages_received_total",
            "Total messages received",
            labels=["channel", "tenant_id"]
        )
        
        self.active_sequences = self.registry.gauge(
            "active_sequences",
            "Number of active sequences",
            labels=["tenant_id"]
        )
        
        self.active_autopilot_jobs = self.registry.gauge(
            "active_autopilot_jobs",
            "Number of active autopilot jobs",
            labels=["tenant_id"]
        )
        
        # Conversion funnel
        self.funnel_stage_total = self.registry.counter(
            "funnel_stage_total",
            "Leads reaching each funnel stage",
            labels=["stage", "source", "tenant_id"]
        )
        
        self.conversion_time_seconds = self.registry.histogram(
            "conversion_time_seconds",
            "Time to conversion in seconds",
            labels=["source", "tenant_id"],
            buckets=[3600, 86400, 604800, 2592000]  # 1h, 1d, 1w, 30d
        )
        
        # Queue metrics
        self.queue_depth = self.registry.gauge(
            "queue_depth",
            "Current queue depth",
            labels=["queue_name"]
        )
        
        self.queue_processing_duration = self.registry.histogram(
            "queue_processing_duration_seconds",
            "Queue message processing duration",
            labels=["queue_name"],
            buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 30.0, 60.0]
        )
        
        # Database metrics
        self.db_query_duration = self.registry.histogram(
            "db_query_duration_seconds",
            "Database query duration",
            labels=["operation", "table"],
            buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0]
        )
        
        self.db_connections_active = self.registry.gauge(
            "db_connections_active",
            "Active database connections"
        )
        
        # Cache metrics
        self.cache_hits_total = self.registry.counter(
            "cache_hits_total",
            "Total cache hits",
            labels=["cache_name"]
        )
        
        self.cache_misses_total = self.registry.counter(
            "cache_misses_total",
            "Total cache misses",
            labels=["cache_name"]
        )
        
        # Error metrics
        self.errors_total = self.registry.counter(
            "errors_total",
            "Total errors",
            labels=["type", "component"]
        )
        
        # User activity
        self.active_users = self.registry.gauge(
            "active_users",
            "Number of active users",
            labels=["tenant_id"]
        )
        
        self.user_actions_total = self.registry.counter(
            "user_actions_total",
            "Total user actions",
            labels=["action", "tenant_id"]
        )


# =============================================================================
# TIMING DECORATOR
# =============================================================================

class Timer:
    """
    Context manager and decorator for timing code.
    
    Example:
        with Timer(metrics.http_request_duration, method="GET", endpoint="/api"):
            process_request()
        
        @Timer.decorator(metrics.http_request_duration, method="POST")
        async def handle_post():
            ...
    """
    
    def __init__(self, histogram: Histogram, **labels):
        self._histogram = histogram
        self._labels = labels
        self._start: Optional[float] = None
    
    def __enter__(self):
        self._start = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._start:
            duration = time.time() - self._start
            self._histogram.observe(duration, **self._labels)
        return False
    
    async def __aenter__(self):
        self._start = time.time()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._start:
            duration = time.time() - self._start
            self._histogram.observe(duration, **self._labels)
        return False
    
    @staticmethod
    def decorator(histogram: Histogram, **labels):
        """Create a timing decorator."""
        def decorator_func(func):
            async def async_wrapper(*args, **kwargs):
                start = time.time()
                try:
                    return await func(*args, **kwargs)
                finally:
                    histogram.observe(time.time() - start, **labels)
            
            def sync_wrapper(*args, **kwargs):
                start = time.time()
                try:
                    return func(*args, **kwargs)
                finally:
                    histogram.observe(time.time() - start, **labels)
            
            if asyncio.iscoroutinefunction(func):
                return async_wrapper
            return sync_wrapper
        
        return decorator_func


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_metrics_system() -> SalesFlowMetrics:
    """
    Create metrics system for SalesFlow AI.
    
    Returns:
        Configured SalesFlowMetrics instance
    
    Example:
        metrics = create_metrics_system()
        
        # Record metrics
        metrics.http_requests_total.inc(method="GET", endpoint="/api/leads", status="200")
        metrics.ai_cost_dollars.inc(0.05, provider="anthropic", model="claude-3", tenant_id="t1")
        
        # Time operations
        with Timer(metrics.ai_request_duration, provider="anthropic", model="claude-3"):
            response = await call_ai()
        
        # Get Prometheus output
        print(metrics.registry.get_prometheus_output())
    """
    return SalesFlowMetrics()


# =============================================================================
# GLOBAL METRICS INSTANCE
# =============================================================================

# Singleton for easy import
_metrics: Optional[SalesFlowMetrics] = None


def get_metrics() -> SalesFlowMetrics:
    """Get the global metrics instance."""
    global _metrics
    if _metrics is None:
        _metrics = create_metrics_system()
    return _metrics
