"""
Cache Service für Business Logic Integration.

Stellt High-Level Cache Operations für:
- Lead Operations (CRUD mit Cache Invalidation)
- Dashboard Operations (mit Cache)
- User Session Data
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.cache import get_cache_service

logger = logging.getLogger(__name__)


class LeadCacheService:
    """Service für Lead-spezifische Cache Operations."""

    def __init__(self):
        self.cache = get_cache_service()

    async def get_lead_with_cache(self, lead_id: str, fetch_func) -> Optional[Dict[str, Any]]:
        """
        Get Lead mit Cache Fallback.

        Args:
            lead_id: Lead UUID
            fetch_func: Async function to fetch from DB if not cached

        Returns:
            Lead data or None
        """
        # Try cache first
        cached = await self.cache.get_cached_lead(lead_id)
        if cached:
            logger.debug(f"Cache hit for lead: {lead_id}")
            return cached

        # Fetch from DB
        lead_data = await fetch_func(lead_id)
        if lead_data:
            # Cache for future requests
            await self.cache.cache_lead_data(lead_id, lead_data)
            logger.debug(f"Cached lead data: {lead_id}")

        return lead_data

    async def invalidate_lead_cache(self, lead_id: str) -> None:
        """Invalidate Lead Cache bei Updates/Deletes."""
        await self.cache.invalidate_lead_cache(lead_id)
        logger.debug(f"Invalidated lead cache: {lead_id}")


class DashboardCacheService:
    """Service für Dashboard Cache Operations."""

    def __init__(self):
        self.cache = get_cache_service()

    async def get_dashboard_with_cache(self, user_id: str, fetch_func) -> Optional[Dict[str, Any]]:
        """
        Get Dashboard Data mit Cache Fallback.

        Args:
            user_id: User UUID
            fetch_func: Async function to fetch dashboard data

        Returns:
            Dashboard data or None
        """
        # Try cache first
        cached = await self.cache.get_cached_dashboard(user_id)
        if cached:
            logger.debug(f"Cache hit for dashboard: {user_id}")
            return cached

        # Fetch fresh data
        dashboard_data = await fetch_func(user_id)
        if dashboard_data:
            # Cache for future requests
            await self.cache.cache_dashboard_data(user_id, dashboard_data)
            logger.debug(f"Cached dashboard data: {user_id}")

        return dashboard_data

    async def invalidate_user_dashboard(self, user_id: str) -> None:
        """Invalidate Dashboard Cache bei Daten-Änderungen."""
        key = f"dashboard:{user_id}"
        await self.cache.delete_cache(key)
        logger.debug(f"Invalidated dashboard cache: {user_id}")


class AnalyticsCacheService:
    """Service für Analytics Cache Operations."""

    def __init__(self):
        self.cache = get_cache_service()

    async def get_analytics_with_cache(
        self,
        cache_key: str,
        fetch_func,
        ttl: int = 1800  # 30 minutes
    ) -> Optional[Any]:
        """
        Get Analytics Data mit Cache.

        Args:
            cache_key: Unique cache key
            fetch_func: Async function to fetch data
            ttl: Cache TTL in seconds

        Returns:
            Analytics data or None
        """
        # Try cache first
        cached = await self.cache.get_cache(cache_key)
        if cached:
            logger.debug(f"Cache hit for analytics: {cache_key}")
            return cached

        # Fetch fresh data
        data = await fetch_func()
        if data:
            # Cache for future requests
            await self.cache.set_cache(cache_key, data, ttl)
            logger.debug(f"Cached analytics data: {cache_key}")

        return data


# Global service instances
_lead_cache_service: Optional[LeadCacheService] = None
_dashboard_cache_service: Optional[DashboardCacheService] = None
_analytics_cache_service: Optional[AnalyticsCacheService] = None


def get_lead_cache_service() -> LeadCacheService:
    """Get Lead Cache Service instance."""
    global _lead_cache_service
    if _lead_cache_service is None:
        _lead_cache_service = LeadCacheService()
    return _lead_cache_service


def get_dashboard_cache_service() -> DashboardCacheService:
    """Get Dashboard Cache Service instance."""
    global _dashboard_cache_service
    if _dashboard_cache_service is None:
        _dashboard_cache_service = DashboardCacheService()
    return _dashboard_cache_service


def get_analytics_cache_service() -> AnalyticsCacheService:
    """Get Analytics Cache Service instance."""
    global _analytics_cache_service
    if _analytics_cache_service is None:
        _analytics_cache_service = AnalyticsCacheService()
    return _analytics_cache_service
