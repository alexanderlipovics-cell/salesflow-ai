"""
============================================
🔍 SALESFLOW AI - SENTRY ERROR MONITORING
============================================

Comprehensive error tracking with:

- Exception capturing
- Performance monitoring
- User context
- Custom breadcrumbs
- Release tracking
"""

import os
from typing import Optional, Any, Dict
from functools import wraps
import traceback

import sentry_sdk
from sentry_sdk import capture_exception, capture_message, set_user, set_tag, set_context
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import structlog

logger = structlog.get_logger()

class SentryConfig:
    """Sentry configuration."""

    # Sampling rates
    TRACES_SAMPLE_RATE = 0.1        # 10% of transactions
    PROFILES_SAMPLE_RATE = 0.1     # 10% of profiled transactions
    ERROR_SAMPLE_RATE = 1.0        # 100% of errors

    # Performance
    ENABLE_TRACING = True
    ENABLE_PROFILING = True

    # Filtering
    IGNORED_ERRORS = [
        "ConnectionRefusedError",
        "CancelledError",
        "TimeoutError",
    ]

    IGNORED_TRANSACTIONS = [
        "/health",
        "/metrics",
        "/favicon.ico",
    ]

def init_sentry(
    dsn: str,
    environment: str = "production",
    release: str = None,
    debug: bool = False,
):
    """
    Initialize Sentry error monitoring.

    Args:
        dsn: Sentry DSN
        environment: Environment name (production, staging, development)
        release: Release version string
        debug: Enable Sentry debug mode
    """
    if not dsn:
        logger.warning("Sentry DSN not configured, error monitoring disabled")
        return

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release or os.getenv("APP_VERSION", "1.0.0"),
        debug=debug,

        # Sampling
        traces_sample_rate=SentryConfig.TRACES_SAMPLE_RATE if SentryConfig.ENABLE_TRACING else 0,
        profiles_sample_rate=SentryConfig.PROFILES_SAMPLE_RATE if SentryConfig.ENABLE_PROFILING else 0,

        # Integrations
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
            ),
            SqlalchemyIntegration(),
            RedisIntegration(),
            HttpxIntegration(),
            AsyncioIntegration(),
            LoggingIntegration(
                level=None,        # Don't capture logs by default
                event_level=None,  # Don't create events from logs
            ),
        ],

        # Event filtering
        before_send=_before_send,
        before_send_transaction=_before_send_transaction,

        # Data scrubbing
        send_default_pii=False,

        # Performance
        enable_tracing=SentryConfig.ENABLE_TRACING,

        # Attachments
        max_breadcrumbs=50,
        attach_stacktrace=True,

        # Request data
        request_bodies="medium",  # small, medium, always
        with_locals=True,

        # Server name
        server_name=os.getenv("HOSTNAME", "salesflow-api"),
    )

    logger.info(
        "Sentry initialized",
        environment=environment,
        release=release,
        traces_sample_rate=SentryConfig.TRACES_SAMPLE_RATE
    )

def _before_send(event: Dict, hint: Dict) -> Optional[Dict]:
    """
    Filter events before sending to Sentry.

    - Filter out ignored errors
    - Scrub sensitive data
    - Add custom context
    """
    # Get exception info
    exc_info = hint.get("exc_info")
    if exc_info:
        exc_type, exc_value, tb = exc_info
        exc_name = exc_type.__name__ if exc_type else ""

        # Filter ignored errors
        if exc_name in SentryConfig.IGNORED_ERRORS:
            return None

        # Filter HTTP 4xx errors (client errors)
        if hasattr(exc_value, "status_code"):
            status_code = exc_value.status_code
            if 400 <= status_code < 500:
                return None

    # Scrub sensitive data
    event = _scrub_sensitive_data(event)

    return event

def _before_send_transaction(event: Dict, hint: Dict) -> Optional[Dict]:
    """
    Filter transactions before sending.

    - Filter health checks
    - Filter static assets
    """
    transaction_name = event.get("transaction", "")

    # Filter ignored transactions
    for pattern in SentryConfig.IGNORED_TRANSACTIONS:
        if pattern in transaction_name:
            return None

    return event

def _scrub_sensitive_data(event: Dict) -> Dict:
    """Remove sensitive data from event."""
    sensitive_keys = [
        "password",
        "token",
        "secret",
        "api_key",
        "apikey",
        "authorization",
        "cookie",
        "session",
        "credit_card",
        "ssn",
    ]

    def scrub_dict(d: Dict) -> Dict:
        if not isinstance(d, dict):
            return d

        result = {}
        for key, value in d.items():
            key_lower = key.lower()

            if any(s in key_lower for s in sensitive_keys):
                result[key] = "[FILTERED]"
            elif isinstance(value, dict):
                result[key] = scrub_dict(value)
            elif isinstance(value, list):
                result[key] = [
                    scrub_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value

        return result

    # Scrub request data
    if "request" in event:
        event["request"] = scrub_dict(event["request"])

    # Scrub extra context
    if "extra" in event:
        event["extra"] = scrub_dict(event["extra"])

    return event

# ==================== USER CONTEXT ====================

def set_sentry_user(
    user_id: str,
    email: str = None,
    username: str = None,
    ip_address: str = None,
    extra: Dict = None
):
    """
    Set user context for Sentry events.

    Call this after authentication.
    """
    user_data = {"id": user_id}

    if email:
        user_data["email"] = email
    if username:
        user_data["username"] = username
    if ip_address:
        user_data["ip_address"] = ip_address

    set_user(user_data)

    if extra:
        set_context("user_extra", extra)

def clear_sentry_user():
    """Clear user context."""
    set_user(None)

# ==================== CUSTOM CONTEXT ====================

def add_context(name: str, data: Dict):
    """Add custom context to Sentry events."""
    set_context(name, data)

def add_tag(key: str, value: str):
    """Add tag to Sentry events."""
    set_tag(key, value)

def add_breadcrumb(
    message: str,
    category: str = "custom",
    level: str = "info",
    data: Dict = None
):
    """Add breadcrumb to event trail."""
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )

# ==================== ERROR CAPTURING ====================

def capture_error(
    error: Exception,
    context: Dict = None,
    tags: Dict = None,
    level: str = "error"
) -> Optional[str]:
    """
    Capture exception with additional context.

    Returns: Sentry event ID or None
    """
    with sentry_sdk.push_scope() as scope:
        # Add context
        if context:
            for key, value in context.items():
                scope.set_context(key, value)

        # Add tags
        if tags:
            for key, value in tags.items():
                scope.set_tag(key, str(value))

        # Set level
        scope.level = level

        # Capture
        event_id = capture_exception(error)

        logger.error(
            "Error captured",
            error=str(error),
            sentry_event_id=event_id,
            traceback=traceback.format_exc()
        )

        return event_id

def capture_error_message(
    message: str,
    level: str = "error",
    context: Dict = None,
    tags: Dict = None
) -> Optional[str]:
    """Capture error message without exception."""
    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_context(key, value)

        if tags:
            for key, value in tags.items():
                scope.set_tag(key, str(value))

        scope.level = level

        return capture_message(message)

# ==================== DECORATORS ====================

def track_errors(
    operation_name: str = None,
    capture_args: bool = False,
    reraise: bool = True
):
    """
    Decorator to track errors in functions.

    Usage:
        @track_errors("process_lead")
        async def process_lead(lead_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__

            try:
                return await func(*args, **kwargs)
            except Exception as e:
                context = {"operation": op_name}

                if capture_args:
                    context["args"] = str(args)
                    context["kwargs"] = str(kwargs)

                capture_error(e, context=context)

                if reraise:
                    raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__

            try:
                return func(*args, **kwargs)
            except Exception as e:
                context = {"operation": op_name}

                if capture_args:
                    context["args"] = str(args)
                    context["kwargs"] = str(kwargs)

                capture_error(e, context=context)

                if reraise:
                    raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator

def track_performance(operation_name: str = None):
    """
    Decorator to track function performance.

    Creates a Sentry transaction span.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__

            with sentry_sdk.start_span(op=op_name) as span:
                span.set_tag("function", func.__name__)
                result = await func(*args, **kwargs)
                return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or func.__name__

            with sentry_sdk.start_span(op=op_name) as span:
                span.set_tag("function", func.__name__)
                result = func(*args, **kwargs)
                return result

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator

# ==================== PERFORMANCE MONITORING ====================

class PerformanceMonitor:
    """
    Monitor performance of critical operations.
    """

    @staticmethod
    def start_transaction(
        name: str,
        op: str = "task",
        description: str = None
    ):
        """Start a new performance transaction."""
        return sentry_sdk.start_transaction(
            name=name,
            op=op,
            description=description
        )

    @staticmethod
    def create_span(
        op: str,
        description: str = None
    ):
        """Create a span within current transaction."""
        return sentry_sdk.start_span(op=op, description=description)

    @staticmethod
    def measure_db_query(query_name: str):
        """Context manager for measuring database queries."""
        return sentry_sdk.start_span(
            op="db.query",
            description=query_name
        )

    @staticmethod
    def measure_http_request(url: str, method: str = "GET"):
        """Context manager for measuring HTTP requests."""
        return sentry_sdk.start_span(
            op="http.client",
            description=f"{method} {url}"
        )

    @staticmethod
    def measure_cache_operation(operation: str, key: str = None):
        """Context manager for measuring cache operations."""
        description = f"{operation}"
        if key:
            description += f" {key}"

        return sentry_sdk.start_span(
            op="cache",
            description=description
        )

# ==================== HEALTH CHECK ====================

def sentry_health_check() -> Dict[str, Any]:
    """Check if Sentry is properly configured."""
    client = sentry_sdk.Hub.current.client

    if not client:
        return {
            "status": "disabled",
            "message": "Sentry client not initialized"
        }

    return {
        "status": "enabled",
        "dsn_configured": bool(client.dsn),
        "environment": client.options.get("environment"),
        "release": client.options.get("release"),
        "traces_sample_rate": client.options.get("traces_sample_rate"),
    }

# ==================== LEGACY COMPATIBILITY ====================

def set_user_context(user_id: str, email: str = None, **kwargs) -> None:
    """Legacy compatibility function."""
    set_sentry_user(user_id, email, extra=kwargs)

def set_request_context(request_id: str, method: str, url: str, **kwargs) -> None:
    """Legacy compatibility function."""
    add_context("request", {
        "request_id": request_id,
        "method": method,
        "url": url,
        **kwargs
    })

def add_performance_measurement(name: str, value: float, unit: str = "ms") -> None:
    """Legacy compatibility function."""
    sentry_sdk.metrics.distribution(name, value, unit=unit)

# Initialize Sentry on import if configured
from app.config import get_settings
if get_settings().sentry_enabled:
    init_sentry(
        dsn=get_settings().sentry_dsn,
        environment=get_settings().environment,
        release=get_settings().app_version,
        debug=get_settings().debug
    )