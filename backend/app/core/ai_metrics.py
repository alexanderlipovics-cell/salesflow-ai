"""
AI Metrics & Monitoring Layer für SalesFlow AI.

Trackt:
- Token Usage (prompt/completion)
- Cost per Request/Model/Feature
- Latenz (p50/p95/p99)
- Error & Fallback Rates
- A/B Test Performance
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import statistics

from .ai_types import AIModelName, AITaskType

logger = logging.getLogger(__name__)


# Token-Preise pro 1M Tokens (USD) - Stand Dez 2024
TOKEN_PRICES: Dict[AIModelName, Dict[str, float]] = {
    AIModelName.GPT_4O: {"input": 2.50, "output": 10.00},
    AIModelName.GPT_4O_MINI: {"input": 0.15, "output": 0.60},
    AIModelName.CLAUDE_35_SONNET: {"input": 3.00, "output": 15.00},
    AIModelName.CLAUDE_35_HAIKU: {"input": 0.25, "output": 1.25},
}


class MetricEventType(str, Enum):
    """Event-Typen für Metrics"""
    REQUEST_STARTED = "ai_request_started"
    REQUEST_SUCCEEDED = "ai_request_succeeded"
    REQUEST_FAILED = "ai_request_failed"
    FALLBACK_USED = "ai_request_fallback_used"
    RATE_LIMIT_HIT = "ai_rate_limit_hit"
    TIMEOUT = "ai_timeout"


@dataclass
class AIRequestMetric:
    """Einzelne Request-Metrik"""
    request_id: str
    timestamp: datetime
    task_type: AITaskType
    model_requested: AIModelName
    model_used: AIModelName
    
    # Timing
    latency_ms: float
    
    # Tokens
    tokens_prompt: int
    tokens_completion: int
    
    # Cost
    cost_usd: float
    
    # Status
    success: bool
    fallback_used: bool
    retry_count: int
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    
    # A/B Testing
    prompt_key: Optional[str] = None
    prompt_version: Optional[str] = None
    prompt_variant: Optional[str] = None
    
    # User Context
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None


@dataclass
class AggregatedMetrics:
    """Aggregierte Metriken für Dashboard"""
    period_start: datetime
    period_end: datetime
    
    # Volume
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    # Tokens
    total_tokens_prompt: int = 0
    total_tokens_completion: int = 0
    
    # Cost
    total_cost_usd: float = 0.0
    
    # Latency (ms)
    latency_p50: float = 0.0
    latency_p95: float = 0.0
    latency_p99: float = 0.0
    avg_latency: float = 0.0
    
    # Rates
    success_rate: float = 0.0
    fallback_rate: float = 0.0
    error_rate: float = 0.0
    
    # By Model
    requests_by_model: Dict[str, int] = field(default_factory=dict)
    cost_by_model: Dict[str, float] = field(default_factory=dict)
    
    # By Task
    requests_by_task: Dict[str, int] = field(default_factory=dict)
    cost_by_task: Dict[str, float] = field(default_factory=dict)


class AIMetricsCollector:
    """
    Sammelt und aggregiert AI-Metriken.
    
    In-Memory Implementation für schnelles Prototyping.
    Für Production: Ersetzen durch TimescaleDB/InfluxDB/Prometheus.
    """
    
    def __init__(self, max_history: int = 10000, retention_hours: int = 168):
        """
        Args:
            max_history: Maximale Anzahl gespeicherter Requests
            retention_hours: Aufbewahrungsdauer in Stunden (default: 7 Tage)
        """
        self._metrics: List[AIRequestMetric] = []
        self._max_history = max_history
        self._retention_hours = retention_hours
        
        # Quick-Access Counters (für Real-Time Dashboard)
        self._counters = {
            "total_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
        }
        
        # Rate Tracking (sliding window)
        self._recent_errors: List[datetime] = []
        self._recent_fallbacks: List[datetime] = []
    
    # ==================== Recording Methods ====================
    
    def record_request_start(
        self,
        request_id: str,
        task_type: AITaskType,
        model: AIModelName,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ) -> None:
        """Zeichnet Start eines AI-Requests auf."""
        logger.debug(f"AI Request started: {request_id} | Task: {task_type} | Model: {model}")
        # Hier könnte ein Event an einen Event-Stream gesendet werden
    
    def record_request_success(
        self,
        request_id: str,
        task_type: AITaskType,
        model_requested: AIModelName,
        model_used: AIModelName,
        latency_ms: float,
        tokens_prompt: int,
        tokens_completion: int,
        fallback_used: bool = False,
        retry_count: int = 0,
        prompt_key: Optional[str] = None,
        prompt_version: Optional[str] = None,
        prompt_variant: Optional[str] = None,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ) -> AIRequestMetric:
        """Zeichnet erfolgreichen Request auf."""
        cost = self._calculate_cost(model_used, tokens_prompt, tokens_completion)
        
        metric = AIRequestMetric(
            request_id=request_id,
            timestamp=datetime.utcnow(),
            task_type=task_type,
            model_requested=model_requested,
            model_used=model_used,
            latency_ms=latency_ms,
            tokens_prompt=tokens_prompt,
            tokens_completion=tokens_completion,
            cost_usd=cost,
            success=True,
            fallback_used=fallback_used,
            retry_count=retry_count,
            prompt_key=prompt_key,
            prompt_version=prompt_version,
            prompt_variant=prompt_variant,
            user_id=user_id,
            workspace_id=workspace_id,
        )
        
        self._store_metric(metric)
        
        if fallback_used:
            self._recent_fallbacks.append(datetime.utcnow())
        
        logger.info(
            f"AI Request success: {request_id} | "
            f"Model: {model_used.value} | "
            f"Latency: {latency_ms:.0f}ms | "
            f"Tokens: {tokens_prompt}+{tokens_completion} | "
            f"Cost: ${cost:.4f}"
        )
        
        return metric
    
    def record_request_failure(
        self,
        request_id: str,
        task_type: AITaskType,
        model_requested: AIModelName,
        model_used: AIModelName,
        latency_ms: float,
        error_type: str,
        error_message: str,
        retry_count: int = 0,
        user_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
    ) -> AIRequestMetric:
        """Zeichnet fehlgeschlagenen Request auf."""
        metric = AIRequestMetric(
            request_id=request_id,
            timestamp=datetime.utcnow(),
            task_type=task_type,
            model_requested=model_requested,
            model_used=model_used,
            latency_ms=latency_ms,
            tokens_prompt=0,
            tokens_completion=0,
            cost_usd=0.0,
            success=False,
            fallback_used=False,
            retry_count=retry_count,
            error_type=error_type,
            error_message=error_message,
            user_id=user_id,
            workspace_id=workspace_id,
        )
        
        self._store_metric(metric)
        self._recent_errors.append(datetime.utcnow())
        
        logger.warning(
            f"AI Request failed: {request_id} | "
            f"Model: {model_used.value} | "
            f"Error: {error_type} - {error_message}"
        )
        
        return metric
    
    # ==================== Query Methods ====================
    
    def get_summary(self, last_n: int = 100) -> Dict[str, Any]:
        """Quick Summary für Dashboard."""
        recent = self._metrics[-last_n:] if self._metrics else []
        
        if not recent:
            return {
                "total_requests": 0,
                "success_rate": 0.0,
                "avg_latency_ms": 0.0,
                "total_cost_usd": 0.0,
                "total_tokens": 0,
                "fallback_rate": 0.0,
                "model_distribution": {},
            }
        
        successful = [m for m in recent if m.success]
        
        return {
            "total_requests": len(recent),
            "success_rate": len(successful) / len(recent) if recent else 0,
            "avg_latency_ms": statistics.mean([m.latency_ms for m in successful]) if successful else 0,
            "total_cost_usd": sum(m.cost_usd for m in recent),
            "total_tokens": sum(m.tokens_prompt + m.tokens_completion for m in recent),
            "fallback_rate": sum(1 for m in recent if m.fallback_used) / len(recent) if recent else 0,
            "model_distribution": self._count_by_field(recent, lambda m: m.model_used.value),
            "task_distribution": self._count_by_field(recent, lambda m: m.task_type.value),
            "error_types": self._count_by_field([m for m in recent if m.error_type], lambda m: m.error_type),
        }
    
    def get_aggregated_metrics(
        self,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> AggregatedMetrics:
        """Aggregierte Metriken für einen Zeitraum."""
        if period_end is None:
            period_end = datetime.utcnow()
        if period_start is None:
            period_start = period_end - timedelta(hours=24)
        
        # Filter metrics by period
        metrics = [
            m for m in self._metrics
            if period_start <= m.timestamp <= period_end
        ]
        
        if not metrics:
            return AggregatedMetrics(period_start=period_start, period_end=period_end)
        
        successful = [m for m in metrics if m.success]
        latencies = [m.latency_ms for m in successful]
        
        agg = AggregatedMetrics(
            period_start=period_start,
            period_end=period_end,
            total_requests=len(metrics),
            successful_requests=len(successful),
            failed_requests=len(metrics) - len(successful),
            total_tokens_prompt=sum(m.tokens_prompt for m in metrics),
            total_tokens_completion=sum(m.tokens_completion for m in metrics),
            total_cost_usd=sum(m.cost_usd for m in metrics),
            success_rate=len(successful) / len(metrics) if metrics else 0,
            fallback_rate=sum(1 for m in metrics if m.fallback_used) / len(metrics) if metrics else 0,
            error_rate=(len(metrics) - len(successful)) / len(metrics) if metrics else 0,
            requests_by_model=self._count_by_field(metrics, lambda m: m.model_used.value),
            cost_by_model=self._sum_by_field(metrics, lambda m: m.model_used.value, lambda m: m.cost_usd),
            requests_by_task=self._count_by_field(metrics, lambda m: m.task_type.value),
            cost_by_task=self._sum_by_field(metrics, lambda m: m.task_type.value, lambda m: m.cost_usd),
        )
        
        if latencies:
            sorted_latencies = sorted(latencies)
            agg.avg_latency = statistics.mean(latencies)
            agg.latency_p50 = self._percentile(sorted_latencies, 50)
            agg.latency_p95 = self._percentile(sorted_latencies, 95)
            agg.latency_p99 = self._percentile(sorted_latencies, 99)
        
        return agg
    
    def get_ab_test_metrics(
        self,
        prompt_key: str,
        period_start: Optional[datetime] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """Metriken für A/B-Test nach Prompt-Key."""
        if period_start is None:
            period_start = datetime.utcnow() - timedelta(days=7)
        
        metrics = [
            m for m in self._metrics
            if m.prompt_key == prompt_key and m.timestamp >= period_start
        ]
        
        # Group by variant
        by_variant: Dict[str, List[AIRequestMetric]] = defaultdict(list)
        for m in metrics:
            variant = m.prompt_variant or "control"
            by_variant[variant].append(m)
        
        results = {}
        for variant, variant_metrics in by_variant.items():
            successful = [m for m in variant_metrics if m.success]
            results[variant] = {
                "total_requests": len(variant_metrics),
                "success_rate": len(successful) / len(variant_metrics) if variant_metrics else 0,
                "avg_latency_ms": statistics.mean([m.latency_ms for m in successful]) if successful else 0,
                "avg_cost_usd": statistics.mean([m.cost_usd for m in variant_metrics]) if variant_metrics else 0,
            }
        
        return results
    
    def get_cost_breakdown(
        self,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        group_by: str = "model",  # "model", "task", "user", "workspace"
    ) -> Dict[str, float]:
        """Kostenaufschlüsselung nach Dimension."""
        if period_end is None:
            period_end = datetime.utcnow()
        if period_start is None:
            period_start = period_end - timedelta(days=30)
        
        metrics = [
            m for m in self._metrics
            if period_start <= m.timestamp <= period_end
        ]
        
        if group_by == "model":
            return self._sum_by_field(metrics, lambda m: m.model_used.value, lambda m: m.cost_usd)
        elif group_by == "task":
            return self._sum_by_field(metrics, lambda m: m.task_type.value, lambda m: m.cost_usd)
        elif group_by == "user":
            return self._sum_by_field(metrics, lambda m: m.user_id or "unknown", lambda m: m.cost_usd)
        elif group_by == "workspace":
            return self._sum_by_field(metrics, lambda m: m.workspace_id or "unknown", lambda m: m.cost_usd)
        else:
            return {}
    
    def get_error_breakdown(self, last_hours: int = 24) -> Dict[str, int]:
        """Fehleraufschlüsselung der letzten N Stunden."""
        cutoff = datetime.utcnow() - timedelta(hours=last_hours)
        errors = [m for m in self._metrics if not m.success and m.timestamp >= cutoff]
        return self._count_by_field(errors, lambda m: m.error_type or "unknown")
    
    def get_current_error_rate(self, window_minutes: int = 5) -> float:
        """Aktuelle Error-Rate (sliding window)."""
        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        self._recent_errors = [t for t in self._recent_errors if t >= cutoff]
        
        recent_metrics = [m for m in self._metrics if m.timestamp >= cutoff]
        if not recent_metrics:
            return 0.0
        
        return len(self._recent_errors) / len(recent_metrics)
    
    def get_current_fallback_rate(self, window_minutes: int = 5) -> float:
        """Aktuelle Fallback-Rate (sliding window)."""
        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        self._recent_fallbacks = [t for t in self._recent_fallbacks if t >= cutoff]
        
        recent_metrics = [m for m in self._metrics if m.timestamp >= cutoff]
        if not recent_metrics:
            return 0.0
        
        return len(self._recent_fallbacks) / len(recent_metrics)
    
    # ==================== Private Helpers ====================
    
    def _store_metric(self, metric: AIRequestMetric) -> None:
        """Speichert Metrik und bereinigt alte Einträge."""
        self._metrics.append(metric)
        
        # Update counters
        self._counters["total_requests"] += 1
        self._counters["total_tokens"] += metric.tokens_prompt + metric.tokens_completion
        self._counters["total_cost"] += metric.cost_usd
        
        # Cleanup old entries
        if len(self._metrics) > self._max_history:
            self._metrics = self._metrics[-self._max_history:]
        
        # Cleanup by retention
        cutoff = datetime.utcnow() - timedelta(hours=self._retention_hours)
        self._metrics = [m for m in self._metrics if m.timestamp >= cutoff]
    
    def _calculate_cost(self, model: AIModelName, prompt_tokens: int, completion_tokens: int) -> float:
        """Berechnet Kosten für einen Request."""
        prices = TOKEN_PRICES.get(model, {"input": 0, "output": 0})
        input_cost = (prompt_tokens / 1_000_000) * prices["input"]
        output_cost = (completion_tokens / 1_000_000) * prices["output"]
        return round(input_cost + output_cost, 6)
    
    def _count_by_field(self, metrics: List[AIRequestMetric], key_fn) -> Dict[str, int]:
        """Zählt Metriken nach Feld."""
        counts: Dict[str, int] = {}
        for m in metrics:
            key = key_fn(m)
            if key:
                counts[key] = counts.get(key, 0) + 1
        return counts
    
    def _sum_by_field(self, metrics: List[AIRequestMetric], key_fn, value_fn) -> Dict[str, float]:
        """Summiert Werte nach Feld."""
        sums: Dict[str, float] = {}
        for m in metrics:
            key = key_fn(m)
            if key:
                sums[key] = sums.get(key, 0.0) + value_fn(m)
        return sums
    
    def _percentile(self, sorted_data: List[float], percentile: int) -> float:
        """Berechnet Perzentil."""
        if not sorted_data:
            return 0.0
        k = (len(sorted_data) - 1) * percentile / 100
        f = int(k)
        c = f + 1 if f + 1 < len(sorted_data) else f
        return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


# Global Metrics Instance
_metrics_instance: Optional[AIMetricsCollector] = None


def get_metrics() -> AIMetricsCollector:
    """Returns global metrics collector instance."""
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = AIMetricsCollector()
    return _metrics_instance


def reset_metrics() -> None:
    """Resets metrics (for testing)."""
    global _metrics_instance
    _metrics_instance = None


__all__ = [
    "AIMetricsCollector",
    "AIRequestMetric",
    "AggregatedMetrics",
    "MetricEventType",
    "get_metrics",
    "reset_metrics",
    "TOKEN_PRICES",
]

