"""
Einfacher In-Memory-Cache mit TTL.
Reduziert API- und Datenbank-Calls.
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Optional

# Globaler Cache-Speicher
_CACHE: dict = {}


def cache_key(prefix: str, *args, **kwargs) -> str:
    """Cache-Key aus Argumenten erzeugen."""
    data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    hash_val = hashlib.md5(data.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_val}"


def get_cached(key: str) -> Optional[Any]:
    """Wert aus Cache holen, falls nicht abgelaufen."""
    if key in _CACHE:
        entry = _CACHE[key]
        if datetime.now() < entry["expires"]:
            return entry["data"]
        # Abgelaufen – entfernen
        del _CACHE[key]
    return None


def set_cached(key: str, data: Any, ttl_seconds: int = 300) -> None:
    """Wert mit TTL (Standard 5 Minuten) cachen."""
    _CACHE[key] = {
        "data": data,
        "expires": datetime.now() + timedelta(seconds=ttl_seconds),
    }


def clear_cache(prefix: Optional[str] = None) -> int:
    """Cache leeren. Optional nur Keys mit Prefix entfernen."""
    global _CACHE
    if prefix is None:
        count = len(_CACHE)
        _CACHE = {}
        return count

    keys_to_delete = [k for k in _CACHE if k.startswith(prefix)]
    for key in keys_to_delete:
        del _CACHE[key]
    return len(keys_to_delete)


def cache_stats() -> dict:
    """Cache-Statistiken abrufen."""
    now = datetime.now()
    valid = sum(1 for v in _CACHE.values() if v["expires"] > now)
    expired = len(_CACHE) - valid
    return {
        "total_entries": len(_CACHE),
        "valid": valid,
        "expired": expired,
    }
"""
============================================
⚡ SALESFLOW AI - REDIS CACHE SERVICE
============================================

High-performance caching layer with Redis

- Lead data caching
- Dashboard stats caching
- Session management
- Cache invalidation patterns
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, TypeVar, Generic, Callable
from functools import wraps
import asyncio
from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import RedisError
import structlog

logger = structlog.get_logger()

T = TypeVar('T')

class CacheConfig:
    """Cache TTL configuration."""

    # Short-lived cache (frequently changing)
    LEAD_DATA_TTL = 300  # 5 minutes
    LEAD_LIST_TTL = 60   # 1 minute

    # Medium-lived cache
    DASHBOARD_STATS_TTL = 600  # 10 minutes
    USER_PROFILE_TTL = 900     # 15 minutes

    # Long-lived cache
    TEMPLATES_TTL = 3600       # 1 hour
    BLUEPRINTS_TTL = 3600      # 1 hour
    TEAM_DATA_TTL = 1800       # 30 minutes

    # Very long-lived cache
    STATIC_DATA_TTL = 86400    # 24 hours

class CacheKeyBuilder:
    """Build consistent cache keys."""

    PREFIX = "salesflow"

    @staticmethod
    def lead(lead_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:lead:{lead_id}"

    @staticmethod
    def lead_list(user_id: str, filters_hash: str = "") -> str:
        return f"{CacheKeyBuilder.PREFIX}:leads:{user_id}:{filters_hash}"

    @staticmethod
    def hot_leads(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:hot_leads:{user_id}"

    @staticmethod
    def dashboard_stats(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:dashboard:{user_id}"

    @staticmethod
    def user_profile(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:user:{user_id}"

    @staticmethod
    def followups_scheduled(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:followups:scheduled:{user_id}"

    @staticmethod
    def followups_overdue(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:followups:overdue:{user_id}"

    @staticmethod
    def notifications_unread(user_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:notifications:unread:{user_id}"

    @staticmethod
    def conversation(conversation_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:conversation:{conversation_id}"

    @staticmethod
    def template(template_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:template:{template_id}"

    @staticmethod
    def blueprint(blueprint_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:blueprint:{blueprint_id}"

    @staticmethod
    def team(team_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:team:{team_id}"

    @staticmethod
    def rate_limit(identifier: str, endpoint: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:ratelimit:{endpoint}:{identifier}"

    @staticmethod
    def session(session_id: str) -> str:
        return f"{CacheKeyBuilder.PREFIX}:session:{session_id}"

    @staticmethod
    def hash_filters(filters: dict) -> str:
        """Create deterministic hash of filter parameters."""
        sorted_filters = json.dumps(filters, sort_keys=True)
        return hashlib.md5(sorted_filters.encode()).hexdigest()[:8]

class CacheService:
    """
    Redis-based caching service for SalesFlow AI.

    Features:
    - Async operations
    - Automatic serialization
    - TTL management
    - Pattern-based invalidation
    - Cache stampede protection
    """

    def __init__(self, redis_url: str, max_connections: int = 50):
        self.pool = ConnectionPool.from_url(
            redis_url,
            max_connections=max_connections,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5,
        )
        self.redis: Optional[Redis] = None
        self._lock_ttl = 10  # Lock timeout in seconds

    async def connect(self):
        """Initialize Redis connection."""
        self.redis = Redis(connection_pool=self.pool)
        try:
            await self.redis.ping()
            logger.info("Redis connected successfully")
        except RedisError as e:
            logger.error("Redis connection failed", error=str(e))
            raise

    async def disconnect(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            logger.info("Redis disconnected")

    async def _serialize(self, value: Any) -> str:
        """Serialize value to JSON string."""
        if isinstance(value, datetime):
            return json.dumps(value.isoformat())
        return json.dumps(value, default=str)

    async def _deserialize(self, value: str) -> Any:
        """Deserialize JSON string to Python object."""
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    # ==================== BASIC OPERATIONS ====================

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            value = await self.redis.get(key)
            if value:
                return await self._deserialize(value)
            return None
        except RedisError as e:
            logger.warning("Cache get failed", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = CacheConfig.LEAD_DATA_TTL
    ) -> bool:
        """Set value in cache with TTL."""
        try:
            serialized = await self._serialize(value)
            await self.redis.setex(key, ttl, serialized)
            return True
        except RedisError as e:
            logger.warning("Cache set failed", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            await self.redis.delete(key)
            return True
        except RedisError as e:
            logger.warning("Cache delete failed", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            keys = []
            async for key in self.redis.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                deleted = await self.redis.delete(*keys)
                logger.info("Cache pattern deleted", pattern=pattern, count=deleted)
                return deleted
            return 0
        except RedisError as e:
            logger.warning("Cache pattern delete failed", pattern=pattern, error=str(e))
            return 0

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        try:
            return await self.redis.exists(key) > 0
        except RedisError:
            return False

    # ==================== LEAD CACHING ====================

    async def cache_lead(self, lead_id: str, lead_data: dict) -> bool:
        """Cache lead data."""
        key = CacheKeyBuilder.lead(lead_id)
        return await self.set(key, lead_data, CacheConfig.LEAD_DATA_TTL)

    async def get_cached_lead(self, lead_id: str) -> Optional[dict]:
        """Get cached lead data."""
        key = CacheKeyBuilder.lead(lead_id)
        return await self.get(key)

    async def cache_lead_list(
        self,
        user_id: str,
        leads: list,
        filters: dict = None
    ) -> bool:
        """Cache lead list for user."""
        filters_hash = CacheKeyBuilder.hash_filters(filters or {})
        key = CacheKeyBuilder.lead_list(user_id, filters_hash)
        return await self.set(key, leads, CacheConfig.LEAD_LIST_TTL)

    async def get_cached_lead_list(
        self,
        user_id: str,
        filters: dict = None
    ) -> Optional[list]:
        """Get cached lead list."""
        filters_hash = CacheKeyBuilder.hash_filters(filters or {})
        key = CacheKeyBuilder.lead_list(user_id, filters_hash)
        return await self.get(key)

    async def cache_hot_leads(self, user_id: str, leads: list) -> bool:
        """Cache hot leads for dashboard."""
        key = CacheKeyBuilder.hot_leads(user_id)
        return await self.set(key, leads, CacheConfig.LEAD_LIST_TTL)

    async def get_cached_hot_leads(self, user_id: str) -> Optional[list]:
        """Get cached hot leads."""
        key = CacheKeyBuilder.hot_leads(user_id)
        return await self.get(key)

    async def invalidate_lead(self, lead_id: str, user_id: str):
        """Invalidate lead and related caches."""
        await self.delete(CacheKeyBuilder.lead(lead_id))
        await self.delete_pattern(f"{CacheKeyBuilder.PREFIX}:leads:{user_id}:*")
        await self.delete(CacheKeyBuilder.hot_leads(user_id))
        await self.delete(CacheKeyBuilder.dashboard_stats(user_id))
        logger.debug("Lead cache invalidated", lead_id=lead_id)

    # ==================== DASHBOARD CACHING ====================

    async def cache_dashboard_stats(self, user_id: str, stats: dict) -> bool:
        """Cache dashboard statistics."""
        key = CacheKeyBuilder.dashboard_stats(user_id)
        return await self.set(key, stats, CacheConfig.DASHBOARD_STATS_TTL)

    async def get_cached_dashboard_stats(self, user_id: str) -> Optional[dict]:
        """Get cached dashboard statistics."""
        key = CacheKeyBuilder.dashboard_stats(user_id)
        return await self.get(key)

    async def invalidate_dashboard(self, user_id: str):
        """Invalidate dashboard cache."""
        await self.delete(CacheKeyBuilder.dashboard_stats(user_id))

    # ==================== FOLLOW-UP CACHING ====================

    async def cache_scheduled_followups(
        self,
        user_id: str,
        followups: list
    ) -> bool:
        """Cache scheduled follow-ups."""
        key = CacheKeyBuilder.followups_scheduled(user_id)
        return await self.set(key, followups, CacheConfig.LEAD_LIST_TTL)

    async def get_cached_scheduled_followups(
        self,
        user_id: str
    ) -> Optional[list]:
        """Get cached scheduled follow-ups."""
        key = CacheKeyBuilder.followups_scheduled(user_id)
        return await self.get(key)

    async def invalidate_followups(self, user_id: str):
        """Invalidate follow-up caches."""
        await self.delete(CacheKeyBuilder.followups_scheduled(user_id))
        await self.delete(CacheKeyBuilder.followups_overdue(user_id))
        await self.delete(CacheKeyBuilder.dashboard_stats(user_id))

    # ==================== USER CACHING ====================

    async def cache_user_profile(self, user_id: str, profile: dict) -> bool:
        """Cache user profile."""
        key = CacheKeyBuilder.user_profile(user_id)
        return await self.set(key, profile, CacheConfig.USER_PROFILE_TTL)

    async def get_cached_user_profile(self, user_id: str) -> Optional[dict]:
        """Get cached user profile."""
        key = CacheKeyBuilder.user_profile(user_id)
        return await self.get(key)

    async def invalidate_user(self, user_id: str):
        """Invalidate all user-related caches."""
        pattern = f"{CacheKeyBuilder.PREFIX}:*{user_id}*"
        await self.delete_pattern(pattern)
        logger.info("User cache invalidated", user_id=user_id)

    # ==================== NOTIFICATIONS CACHING ====================

    async def cache_unread_count(self, user_id: str, count: int) -> bool:
        """Cache unread notification count."""
        key = CacheKeyBuilder.notifications_unread(user_id)
        return await self.set(key, {"count": count}, CacheConfig.LEAD_LIST_TTL)

    async def get_cached_unread_count(self, user_id: str) -> Optional[int]:
        """Get cached unread count."""
        key = CacheKeyBuilder.notifications_unread(user_id)
        data = await self.get(key)
        return data.get("count") if data else None

    async def invalidate_notifications(self, user_id: str):
        """Invalidate notification caches."""
        await self.delete(CacheKeyBuilder.notifications_unread(user_id))

    # ==================== RATE LIMITING ====================

    async def check_rate_limit(
        self,
        identifier: str,
        endpoint: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, int]:
        """
        Check rate limit using sliding window.
        Returns: (is_allowed, remaining_requests)
        """
        key = CacheKeyBuilder.rate_limit(identifier, endpoint)
        try:
            current = await self.redis.get(key)

            if current is None:
                # First request
                await self.redis.setex(key, window_seconds, 1)
                return True, max_requests - 1

            count = int(current)
            if count >= max_requests:
                # Rate limit exceeded
                return False, 0

            # Increment counter
            await self.redis.incr(key)
            return True, max_requests - count - 1

        except RedisError as e:
            logger.warning("Rate limit check failed", error=str(e))
            return True, max_requests  # Fail open

    async def get_rate_limit_reset(
        self,
        identifier: str,
        endpoint: str
    ) -> int:
        """Get seconds until rate limit resets."""
        key = CacheKeyBuilder.rate_limit(identifier, endpoint)
        try:
            ttl = await self.redis.ttl(key)
            return max(0, ttl)
        except RedisError:
            return 0

    # ==================== CACHE STAMPEDE PROTECTION ====================

    async def get_or_set(
        self,
        key: str,
        factory: Callable,
        ttl: int = CacheConfig.LEAD_DATA_TTL
    ) -> Any:
        """
        Get from cache or compute and cache.
        Includes lock to prevent cache stampede.
        """
        # Try cache first
        cached = await self.get(key)
        if cached is not None:
            return cached

        # Acquire lock
        lock_key = f"{key}:lock"
        lock_acquired = await self.redis.set(
            lock_key,
            "1",
            nx=True,
            ex=self._lock_ttl
        )

        if not lock_acquired:
            # Another process is computing, wait and retry
            await asyncio.sleep(0.1)
            cached = await self.get(key)
            if cached is not None:
                return cached

        try:
            # Compute value
            if asyncio.iscoroutinefunction(factory):
                value = await factory()
            else:
                value = factory()

            # Cache result
            await self.set(key, value, ttl)
            return value
        finally:
            # Release lock
            await self.redis.delete(lock_key)

    # ==================== METRICS ====================

    async def get_stats(self) -> dict:
        """Get cache statistics."""
        try:
            info = await self.redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "total_keys": await self.redis.dbsize(),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": round(
                    info.get("keyspace_hits", 0) /
                    max(1, info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)) * 100,
                    2
                ),
            }
        except RedisError as e:
            logger.error("Failed to get cache stats", error=str(e))
            return {}

# ==================== DECORATOR ====================

def cached(
    key_builder: Callable[..., str],
    ttl: int = CacheConfig.LEAD_DATA_TTL,
    cache_service: CacheService = None
):
    """
    Decorator for caching function results.

    Usage:
        @cached(lambda user_id: f"user:{user_id}", ttl=300)
        async def get_user(user_id: str) -> dict:
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if cache_service is None:
                return await func(*args, **kwargs)

            # Build cache key
            cache_key = key_builder(*args, **kwargs)

            # Check cache
            cached_value = await cache_service.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            await cache_service.set(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

# ==================== SINGLETON ====================

_cache_service: Optional[CacheService] = None

async def get_cache_service() -> CacheService:
    """Get or create cache service singleton."""
    global _cache_service
    if _cache_service is None:
        from app.core.config import get_settings
        _cache_service = CacheService(get_settings().redis_url)
        await _cache_service.connect()
    return _cache_service

async def close_cache_service():
    """Close cache service connection."""
    global _cache_service
    if _cache_service:
        await _cache_service.disconnect()
        _cache_service = None