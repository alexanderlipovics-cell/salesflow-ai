"""
============================================
📊 SALESFLOW AI - PROMETHEUS METRICS
============================================
Custom metrics for application monitoring:
- HTTP request metrics
- Business metrics (leads, followups)
- Cache metrics
- Database metrics
"""

import time
from typing import Callable
from functools import wraps

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    multiprocess,
    REGISTRY,
)
import structlog

logger = structlog.get_logger()

# ==================== METRICS REGISTRY ====================

# Use multiprocess mode for multiple workers
# registry = CollectorRegistry()
# multiprocess.MultiProcessCollector(registry)

# ==================== APPLICATION INFO ====================

app_info = Info(
    'salesflow_app',
    'Application information'
)

# ==================== HTTP METRICS ====================

http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

http_requests_in_progress = Gauge(
    'http_requests_in_progress',
    'HTTP requests currently in progress',
    ['method', 'endpoint']
)

http_request_size_bytes = Histogram(
    'http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'endpoint'],
    buckets=(100, 1000, 10000, 100000, 1000000)
)

http_response_size_bytes = Histogram(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'endpoint'],
    buckets=(100, 1000, 10000, 100000, 1000000)
)

# ==================== BUSINESS METRICS ====================

leads_total = Gauge(
    'leads_total',
    'Total number of leads',
    ['status', 'priority']
)

leads_created_total = Counter(
    'leads_created_total',
    'Total leads created',
    ['source']
)

leads_converted_total = Counter(
    'leads_converted_total',
    'Total leads converted to won'
)

followups_scheduled_total = Gauge(
    'followups_scheduled_total',
    'Total scheduled follow-ups'
)

followups_overdue_total = Gauge(
    'followups_overdue_total',
    'Total overdue follow-ups'
)

followups_sent_total = Counter(
    'followups_sent_total',
    'Total follow-ups sent',
    ['type']
)

active_users = Gauge(
    'active_users',
    'Number of active users',
    ['period']  # daily, weekly, monthly
)

# ==================== WEBHOOK METRICS ====================

webhook_requests_total = Counter(
    'webhook_requests_total',
    'Total webhook requests received',
    ['source']  # facebook, linkedin, instagram
)

webhook_failures_total = Counter(
    'webhook_failures_total',
    'Total webhook processing failures',
    ['source', 'error_type']
)

webhook_processing_duration_seconds = Histogram(
    'webhook_processing_duration_seconds',
    'Webhook processing duration',
    ['source'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
)

# ==================== CACHE METRICS ====================

cache_hits_total = Counter(
    'cache_hits_total',
    'Total cache hits',
    ['cache_type']
)

cache_misses_total = Counter(
    'cache_misses_total',
    'Total cache misses',
    ['cache_type']
)

cache_operations_duration_seconds = Histogram(
    'cache_operations_duration_seconds',
    'Cache operation duration',
    ['operation', 'cache_type'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1)
)

# ==================== DATABASE METRICS ====================

db_connections_total = Gauge(
    'db_connections_total',
    'Total database connections'
)

db_connections_active = Gauge(
    'db_connections_active',
    'Active database connections'
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['query_type'],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
)

# ==================== AI METRICS ====================

ai_requests_total = Counter(
    'ai_requests_total',
    'Total AI API requests',
    ['model', 'operation']
)

ai_request_duration_seconds = Histogram(
    'ai_request_duration_seconds',
    'AI request duration',
    ['model'],
    buckets=(0.5, 1.0, 2.5, 5.0, 10.0, 30.0)
)

ai_tokens_used_total = Counter(
    'ai_tokens_used_total',
    'Total AI tokens used',
    ['model', 'type']  # prompt, completion
)

# ==================== MIDDLEWARE ====================

class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to collect HTTP metrics."""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ['/metrics', '/health']
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        method = request.method
        endpoint = self._get_endpoint(request)
        
        # Track in-progress requests
        http_requests_in_progress.labels(
            method=method,
            endpoint=endpoint
        ).inc()
        
        # Track request size
        content_length = request.headers.get('content-length')
        if content_length:
            http_request_size_bytes.labels(
                method=method,
                endpoint=endpoint
            ).observe(int(content_length))
        
        # Time the request
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as e:
            status = 500
            raise
        finally:
            # Record duration
            duration = time.perf_counter() - start_time
            http_request_duration_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
            
            # Record total requests
            http_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=status
            ).inc()
            
            # Decrement in-progress
            http_requests_in_progress.labels(
                method=method,
                endpoint=endpoint
            ).dec()
        
        # Track response size
        response_size = response.headers.get('content-length')
        if response_size:
            http_response_size_bytes.labels(
                method=method,
                endpoint=endpoint
            ).observe(int(response_size))
        
        return response
    
    def _get_endpoint(self, request: Request) -> str:
        """Get normalized endpoint path."""
        path = request.url.path
        
        # Normalize paths with IDs
        # /api/v1/leads/123 -> /api/v1/leads/{id}
        parts = path.split('/')
        normalized = []
        
        for part in parts:
            if self._is_uuid_or_id(part):
                normalized.append('{id}')
            else:
                normalized.append(part)
        
        return '/'.join(normalized)
    
    def _is_uuid_or_id(self, value: str) -> bool:
        """Check if value looks like an ID."""
        if not value:
            return False
        
        # UUID pattern
        if len(value) == 36 and value.count('-') == 4:
            return True
        
        # Numeric ID
        if value.isdigit():
            return True
        
        return False


# ==================== DECORATORS ====================

def track_time(metric: Histogram, labels: dict = None):
    """Decorator to track function execution time."""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start
                if labels:
                    metric.labels(**labels).observe(duration)
                else:
                    metric.observe(duration)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start
                if labels:
                    metric.labels(**labels).observe(duration)
                else:
                    metric.observe(duration)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


def count_calls(metric: Counter, labels: dict = None):
    """Decorator to count function calls."""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if labels:
                metric.labels(**labels).inc()
            else:
                metric.inc()
            return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if labels:
                metric.labels(**labels).inc()
            else:
                metric.inc()
            return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


# ==================== METRICS ENDPOINT ====================

async def metrics_endpoint():
    """Generate Prometheus metrics."""
    return Response(
        content=generate_latest(REGISTRY),
        media_type=CONTENT_TYPE_LATEST
    )


# ==================== BUSINESS METRICS COLLECTOR ====================

class BusinessMetricsCollector:
    """Collect business metrics from database."""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def collect(self):
        """Update all business metrics."""
        try:
            await self._collect_lead_metrics()
            await self._collect_followup_metrics()
            await self._collect_user_metrics()
        except Exception as e:
            logger.error("Failed to collect business metrics", error=str(e))
    
    async def _collect_lead_metrics(self):
        """Collect lead-related metrics."""
        from sqlalchemy import text
        
        # Get lead counts by status and priority
        query = text("""
            SELECT status, priority, COUNT(*) as count
            FROM leads
            GROUP BY status, priority
        """)
        
        async with self.db.session() as session:
            result = await session.execute(query)
            for row in result:
                leads_total.labels(
                    status=row.status,
                    priority=row.priority
                ).set(row.count)
    
    async def _collect_followup_metrics(self):
        """Collect follow-up metrics."""
        from sqlalchemy import text
        
        async with self.db.session() as session:
            # Scheduled count
            scheduled = await session.execute(
                text("SELECT COUNT(*) FROM followups WHERE status = 'scheduled'")
            )
            followups_scheduled_total.set(scheduled.scalar())
            
            # Overdue count
            overdue = await session.execute(
                text("SELECT COUNT(*) FROM followups WHERE status = 'scheduled' AND scheduled_at < NOW()")
            )
            followups_overdue_total.set(overdue.scalar())
    
    async def _collect_user_metrics(self):
        """Collect user activity metrics."""
        from sqlalchemy import text
        
        async with self.db.session() as session:
            # Daily active users
            daily = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id) FROM lead_activities
                    WHERE created_at > NOW() - INTERVAL '1 day'
                """)
            )
            active_users.labels(period='daily').set(daily.scalar())
            
            # Weekly active users
            weekly = await session.execute(
                text("""
                    SELECT COUNT(DISTINCT user_id) FROM lead_activities
                    WHERE created_at > NOW() - INTERVAL '7 days'
                """)
            )
            active_users.labels(period='weekly').set(weekly.scalar())


# ==================== INITIALIZATION ====================

def init_metrics(app_version: str, environment: str):
    """Initialize application metrics."""
    app_info.info({
        'version': app_version,
        'environment': environment,
        'python_version': '3.11'
    })
    logger.info("Metrics initialized", version=app_version)
