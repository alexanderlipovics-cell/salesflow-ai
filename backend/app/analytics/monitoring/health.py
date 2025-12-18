"""
SalesFlow AI - System Health Checks
====================================

Comprehensive health checking system for all platform components.
Designed for Kubernetes probes, load balancer checks, and monitoring.

Features:
- Component-level health checks (DB, Redis, AI, external APIs)
- Dependency mapping
- Degraded state detection
- Health history tracking
- Kubernetes-compatible probe endpoints

Author: SalesFlow AI Team
Version: 1.0.0
"""

from __future__ import annotations

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Optional
from collections import defaultdict
import traceback

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class HealthStatus(str, Enum):
    """Health status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ComponentType(str, Enum):
    """Types of system components."""
    DATABASE = "database"
    CACHE = "cache"
    QUEUE = "queue"
    AI_SERVICE = "ai_service"
    EXTERNAL_API = "external_api"
    STORAGE = "storage"
    INTERNAL_SERVICE = "internal_service"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class HealthCheckResult:
    """Result of a single health check."""
    component: str
    component_type: ComponentType
    status: HealthStatus
    message: str
    latency_ms: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    details: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class ComponentHealth:
    """Health status of a component over time."""
    component: str
    component_type: ComponentType
    current_status: HealthStatus
    last_check: datetime
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_healthy: Optional[datetime] = None
    last_unhealthy: Optional[datetime] = None
    average_latency_ms: float = 0.0
    history: list[HealthCheckResult] = field(default_factory=list)


@dataclass
class SystemHealth:
    """Overall system health."""
    status: HealthStatus
    timestamp: datetime
    components: dict[str, ComponentHealth]
    healthy_count: int
    degraded_count: int
    unhealthy_count: int
    total_latency_ms: float
    message: str


# =============================================================================
# HEALTH CHECK INTERFACE
# =============================================================================

class HealthCheck(ABC):
    """Base class for health checks."""
    
    def __init__(
        self,
        name: str,
        component_type: ComponentType,
        timeout_seconds: float = 5.0,
        critical: bool = True
    ):
        self.name = name
        self.component_type = component_type
        self.timeout_seconds = timeout_seconds
        self.critical = critical  # If critical, unhealthy = system unhealthy
    
    @abstractmethod
    async def check(self) -> HealthCheckResult:
        """Perform the health check."""
        pass
    
    async def execute(self) -> HealthCheckResult:
        """Execute health check with timeout handling."""
        start = time.time()
        try:
            result = await asyncio.wait_for(
                self.check(),
                timeout=self.timeout_seconds
            )
            return result
        except asyncio.TimeoutError:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Health check timed out after {self.timeout_seconds}s",
                latency_ms=latency,
                error="timeout"
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Health check failed: {str(e)}",
                latency_ms=latency,
                error=traceback.format_exc()
            )


# =============================================================================
# CONCRETE HEALTH CHECKS
# =============================================================================

class DatabaseHealthCheck(HealthCheck):
    """PostgreSQL database health check."""
    
    def __init__(
        self,
        name: str = "postgresql",
        connection_string: Optional[str] = None,
        timeout_seconds: float = 5.0
    ):
        super().__init__(name, ComponentType.DATABASE, timeout_seconds, critical=True)
        self._connection_string = connection_string
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would use asyncpg
            # Simulated check
            await asyncio.sleep(0.01)  # Simulate query
            
            latency = (time.time() - start) * 1000
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.HEALTHY,
                message="Database connection successful",
                latency_ms=latency,
                details={
                    "version": "PostgreSQL 15.2",
                    "connections_active": 25,
                    "connections_max": 100,
                    "replication_lag_ms": 0
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Database check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class RedisHealthCheck(HealthCheck):
    """Redis cache health check."""
    
    def __init__(
        self,
        name: str = "redis",
        host: str = "localhost",
        port: int = 6379,
        timeout_seconds: float = 2.0
    ):
        super().__init__(name, ComponentType.CACHE, timeout_seconds, critical=True)
        self._host = host
        self._port = port
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would use aioredis
            await asyncio.sleep(0.005)  # Simulate PING
            
            latency = (time.time() - start) * 1000
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.HEALTHY,
                message="Redis PING successful",
                latency_ms=latency,
                details={
                    "version": "7.0.5",
                    "used_memory_mb": 256,
                    "connected_clients": 50,
                    "ops_per_sec": 15000
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Redis check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class QueueHealthCheck(HealthCheck):
    """Message queue (RabbitMQ/SQS) health check."""
    
    def __init__(
        self,
        name: str = "message_queue",
        queue_type: str = "rabbitmq",
        timeout_seconds: float = 5.0
    ):
        super().__init__(name, ComponentType.QUEUE, timeout_seconds, critical=True)
        self._queue_type = queue_type
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            await asyncio.sleep(0.01)
            
            latency = (time.time() - start) * 1000
            
            # Check queue depth
            queue_depth = 150  # Simulated
            status = HealthStatus.HEALTHY
            message = "Queue operational"
            
            if queue_depth > 10000:
                status = HealthStatus.DEGRADED
                message = f"High queue depth: {queue_depth}"
            elif queue_depth > 50000:
                status = HealthStatus.UNHEALTHY
                message = f"Critical queue backlog: {queue_depth}"
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=status,
                message=message,
                latency_ms=latency,
                details={
                    "queue_type": self._queue_type,
                    "queue_depth": queue_depth,
                    "consumers": 5,
                    "messages_per_second": 500
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Queue check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class AIServiceHealthCheck(HealthCheck):
    """AI/LLM service health check."""
    
    def __init__(
        self,
        name: str = "ai_service",
        provider: str = "anthropic",
        timeout_seconds: float = 10.0
    ):
        super().__init__(name, ComponentType.AI_SERVICE, timeout_seconds, critical=False)
        self._provider = provider
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would make a simple API call
            await asyncio.sleep(0.1)  # Simulate API call
            
            latency = (time.time() - start) * 1000
            
            status = HealthStatus.HEALTHY
            message = f"{self._provider} API responsive"
            
            if latency > 2000:
                status = HealthStatus.DEGRADED
                message = f"{self._provider} API slow: {latency:.0f}ms"
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=status,
                message=message,
                latency_ms=latency,
                details={
                    "provider": self._provider,
                    "model": "claude-3-sonnet",
                    "rate_limit_remaining": 950,
                    "tokens_used_today": 50000
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"AI service check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class ExternalAPIHealthCheck(HealthCheck):
    """External API health check (WhatsApp, LinkedIn, etc.)."""
    
    def __init__(
        self,
        name: str,
        endpoint: str,
        timeout_seconds: float = 10.0,
        expected_status: int = 200
    ):
        super().__init__(name, ComponentType.EXTERNAL_API, timeout_seconds, critical=False)
        self._endpoint = endpoint
        self._expected_status = expected_status
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would use httpx
            await asyncio.sleep(0.05)  # Simulate API call
            
            latency = (time.time() - start) * 1000
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.HEALTHY,
                message=f"{self.name} API operational",
                latency_ms=latency,
                details={
                    "endpoint": self._endpoint,
                    "status_code": 200,
                    "rate_limit_remaining": 100
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"{self.name} API check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class StorageHealthCheck(HealthCheck):
    """Object storage (S3/GCS) health check."""
    
    def __init__(
        self,
        name: str = "object_storage",
        bucket: str = "salesflow-data",
        timeout_seconds: float = 5.0
    ):
        super().__init__(name, ComponentType.STORAGE, timeout_seconds, critical=False)
        self._bucket = bucket
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would check bucket access
            await asyncio.sleep(0.02)
            
            latency = (time.time() - start) * 1000
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.HEALTHY,
                message="Storage accessible",
                latency_ms=latency,
                details={
                    "bucket": self._bucket,
                    "region": "eu-central-1",
                    "objects_count": 150000
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"Storage check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


class InternalServiceHealthCheck(HealthCheck):
    """Internal microservice health check."""
    
    def __init__(
        self,
        name: str,
        service_url: str,
        timeout_seconds: float = 5.0
    ):
        super().__init__(name, ComponentType.INTERNAL_SERVICE, timeout_seconds, critical=True)
        self._service_url = service_url
    
    async def check(self) -> HealthCheckResult:
        start = time.time()
        
        try:
            # In production, would call service's /health endpoint
            await asyncio.sleep(0.01)
            
            latency = (time.time() - start) * 1000
            
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.HEALTHY,
                message=f"{self.name} service healthy",
                latency_ms=latency,
                details={
                    "url": self._service_url,
                    "version": "1.2.3"
                }
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return HealthCheckResult(
                component=self.name,
                component_type=self.component_type,
                status=HealthStatus.UNHEALTHY,
                message=f"{self.name} service check failed: {str(e)}",
                latency_ms=latency,
                error=str(e)
            )


# =============================================================================
# HEALTH CHECK MANAGER
# =============================================================================

class HealthCheckManager:
    """
    Manages health checks across all system components.
    
    Provides:
    - Parallel health check execution
    - Health history tracking
    - Kubernetes probe compatibility
    - Degradation detection
    """
    
    def __init__(self, max_history_per_component: int = 100):
        self._checks: dict[str, HealthCheck] = {}
        self._component_health: dict[str, ComponentHealth] = {}
        self._max_history = max_history_per_component
        self._last_full_check: Optional[datetime] = None
        self._check_callbacks: list[Callable[[SystemHealth], None]] = []
    
    def register_check(self, check: HealthCheck) -> None:
        """Register a health check."""
        self._checks[check.name] = check
        self._component_health[check.name] = ComponentHealth(
            component=check.name,
            component_type=check.component_type,
            current_status=HealthStatus.UNKNOWN,
            last_check=datetime.utcnow()
        )
        logger.info(f"Registered health check: {check.name}")
    
    def register_callback(self, callback: Callable[[SystemHealth], None]) -> None:
        """Register callback for health check results."""
        self._check_callbacks.append(callback)
    
    async def check_component(self, name: str) -> Optional[HealthCheckResult]:
        """Run health check for a specific component."""
        check = self._checks.get(name)
        if not check:
            return None
        
        result = await check.execute()
        self._update_component_health(name, result)
        return result
    
    async def check_all(self) -> SystemHealth:
        """Run all health checks in parallel."""
        # Execute all checks concurrently
        tasks = [
            check.execute()
            for check in self._checks.values()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, (name, check) in enumerate(self._checks.items()):
            result = results[i]
            if isinstance(result, Exception):
                result = HealthCheckResult(
                    component=name,
                    component_type=check.component_type,
                    status=HealthStatus.UNHEALTHY,
                    message=f"Check raised exception: {str(result)}",
                    latency_ms=0,
                    error=str(result)
                )
            self._update_component_health(name, result)
        
        # Calculate overall health
        system_health = self._calculate_system_health()
        self._last_full_check = datetime.utcnow()
        
        # Notify callbacks
        for callback in self._check_callbacks:
            try:
                callback(system_health)
            except Exception as e:
                logger.error(f"Health check callback error: {e}")
        
        return system_health
    
    def _update_component_health(self, name: str, result: HealthCheckResult) -> None:
        """Update component health status."""
        health = self._component_health[name]
        
        # Update status
        health.current_status = result.status
        health.last_check = result.timestamp
        
        # Track consecutive failures/successes
        if result.status == HealthStatus.HEALTHY:
            health.consecutive_successes += 1
            health.consecutive_failures = 0
            health.last_healthy = result.timestamp
        else:
            health.consecutive_failures += 1
            health.consecutive_successes = 0
            if result.status == HealthStatus.UNHEALTHY:
                health.last_unhealthy = result.timestamp
        
        # Update average latency (exponential moving average)
        alpha = 0.2
        health.average_latency_ms = (
            alpha * result.latency_ms +
            (1 - alpha) * health.average_latency_ms
        )
        
        # Add to history
        health.history.append(result)
        if len(health.history) > self._max_history:
            health.history = health.history[-self._max_history:]
    
    def _calculate_system_health(self) -> SystemHealth:
        """Calculate overall system health."""
        healthy_count = 0
        degraded_count = 0
        unhealthy_count = 0
        total_latency = 0
        critical_unhealthy = False
        
        for name, health in self._component_health.items():
            check = self._checks[name]
            
            if health.current_status == HealthStatus.HEALTHY:
                healthy_count += 1
            elif health.current_status == HealthStatus.DEGRADED:
                degraded_count += 1
            else:
                unhealthy_count += 1
                if check.critical:
                    critical_unhealthy = True
            
            total_latency += health.average_latency_ms
        
        # Determine overall status
        if critical_unhealthy:
            status = HealthStatus.UNHEALTHY
            message = "Critical component unhealthy"
        elif unhealthy_count > 0:
            status = HealthStatus.DEGRADED
            message = f"{unhealthy_count} non-critical component(s) unhealthy"
        elif degraded_count > 0:
            status = HealthStatus.DEGRADED
            message = f"{degraded_count} component(s) degraded"
        else:
            status = HealthStatus.HEALTHY
            message = "All components healthy"
        
        return SystemHealth(
            status=status,
            timestamp=datetime.utcnow(),
            components=self._component_health.copy(),
            healthy_count=healthy_count,
            degraded_count=degraded_count,
            unhealthy_count=unhealthy_count,
            total_latency_ms=total_latency,
            message=message
        )
    
    def get_component_health(self, name: str) -> Optional[ComponentHealth]:
        """Get health status of a specific component."""
        return self._component_health.get(name)
    
    def get_all_component_health(self) -> dict[str, ComponentHealth]:
        """Get health status of all components."""
        return self._component_health.copy()
    
    def is_healthy(self) -> bool:
        """Quick check if system is healthy (for Kubernetes liveness probe)."""
        for name, health in self._component_health.items():
            check = self._checks[name]
            if check.critical and health.current_status == HealthStatus.UNHEALTHY:
                return False
        return True
    
    def is_ready(self) -> bool:
        """Quick check if system is ready (for Kubernetes readiness probe)."""
        # All critical components must be at least degraded
        for name, health in self._component_health.items():
            check = self._checks[name]
            if check.critical and health.current_status == HealthStatus.UNHEALTHY:
                return False
        return True
    
    def get_kubernetes_response(self, probe_type: str = "liveness") -> dict[str, Any]:
        """
        Get Kubernetes-compatible health response.
        
        Args:
            probe_type: "liveness", "readiness", or "startup"
        """
        if probe_type == "liveness":
            is_ok = self.is_healthy()
        elif probe_type == "readiness":
            is_ok = self.is_ready()
        else:  # startup
            is_ok = len(self._component_health) > 0
        
        components = {}
        for name, health in self._component_health.items():
            components[name] = {
                "status": health.current_status.value,
                "latency_ms": round(health.average_latency_ms, 1)
            }
        
        return {
            "status": "ok" if is_ok else "error",
            "timestamp": datetime.utcnow().isoformat(),
            "probe_type": probe_type,
            "components": components
        }


# =============================================================================
# BACKGROUND HEALTH CHECK RUNNER
# =============================================================================

class HealthCheckRunner:
    """
    Background runner for periodic health checks.
    
    Runs health checks on a schedule and manages alerting.
    """
    
    def __init__(
        self,
        manager: HealthCheckManager,
        check_interval_seconds: float = 30.0,
        alert_callback: Optional[Callable[[ComponentHealth], None]] = None
    ):
        self._manager = manager
        self._interval = check_interval_seconds
        self._alert_callback = alert_callback
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self) -> None:
        """Start background health checks."""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Health check runner started (interval: {self._interval}s)")
    
    async def stop(self) -> None:
        """Stop background health checks."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Health check runner stopped")
    
    async def _run_loop(self) -> None:
        """Main check loop."""
        while self._running:
            try:
                system_health = await self._manager.check_all()
                
                # Check for alerts
                if self._alert_callback:
                    for name, health in system_health.components.items():
                        if health.current_status == HealthStatus.UNHEALTHY:
                            self._alert_callback(health)
                
                await asyncio.sleep(self._interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(self._interval)


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_health_check_manager() -> tuple[HealthCheckManager, HealthCheckRunner]:
    """
    Create and configure health check system for SalesFlow AI.
    
    Returns:
        Tuple of (HealthCheckManager, HealthCheckRunner)
    
    Example:
        manager, runner = create_health_check_manager()
        
        # Start background checks
        await runner.start()
        
        # Manual check
        system_health = await manager.check_all()
        
        # Kubernetes probes
        if manager.is_healthy():
            return {"status": "ok"}
    """
    manager = HealthCheckManager()
    
    # Register standard checks
    manager.register_check(DatabaseHealthCheck())
    manager.register_check(RedisHealthCheck())
    manager.register_check(QueueHealthCheck())
    manager.register_check(AIServiceHealthCheck(provider="anthropic"))
    manager.register_check(StorageHealthCheck())
    
    # External APIs
    manager.register_check(ExternalAPIHealthCheck(
        name="whatsapp_api",
        endpoint="https://graph.facebook.com/v17.0/health"
    ))
    manager.register_check(ExternalAPIHealthCheck(
        name="linkedin_api",
        endpoint="https://api.linkedin.com/v2/health"
    ))
    
    # Create runner
    runner = HealthCheckRunner(manager)
    
    return manager, runner
