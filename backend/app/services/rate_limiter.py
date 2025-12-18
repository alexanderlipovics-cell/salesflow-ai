"""
Rate Limiting Service for Autopilot Engine V2

Prevents spam by limiting:
- Messages per day per contact
- Messages per day per channel
- Global user limits
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Tuple

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# RATE LIMIT CHECKS
# ============================================================================


async def check_rate_limit(
    db: Client,
    user_id: str,
    contact_id: str,
    channel: str,
    max_per_day: int = 10
) -> Tuple[bool, int]:
    """
    Check if rate limit has been reached.
    
    Args:
        db: Supabase client
        user_id: User UUID
        contact_id: Contact UUID
        channel: Channel name
        max_per_day: Maximum messages per day
        
    Returns:
        (allowed: bool, current_count: int)
    """
    today = date.today()
    
    try:
        # Get or create counter
        result = db.table("rate_limit_counters")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("contact_id", contact_id)\
            .eq("channel", channel)\
            .eq("date", today.isoformat())\
            .execute()
        
        if not result.data:
            # First message today
            logger.debug(f"No rate limit counter found - first send today")
            return (True, 0)
        
        counter = result.data[0]
        current_count = counter["count"]
        
        if current_count >= max_per_day:
            logger.warning(
                f"Rate limit reached: user={user_id}, contact={contact_id}, "
                f"channel={channel}, count={current_count}/{max_per_day}"
            )
            return (False, current_count)
        
        logger.debug(f"Rate limit check passed: {current_count}/{max_per_day}")
        return (True, current_count)
    
    except Exception as e:
        logger.error(f"Error checking rate limit: {e}")
        # On error, allow (fail open, not closed)
        return (True, 0)


async def increment_rate_limit(
    db: Client,
    user_id: str,
    contact_id: str,
    channel: str
) -> int:
    """
    Increment rate limit counter after successful send.
    
    Args:
        db: Supabase client
        user_id: User UUID
        contact_id: Contact UUID
        channel: Channel name
        
    Returns:
        New count value
    """
    today = date.today()
    
    try:
        # Try to increment existing counter
        result = db.table("rate_limit_counters")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("contact_id", contact_id)\
            .eq("channel", channel)\
            .eq("date", today.isoformat())\
            .execute()
        
        if result.data:
            # Update existing
            counter_id = result.data[0]["id"]
            new_count = result.data[0]["count"] + 1
            
            db.table("rate_limit_counters").update({
                "count": new_count,
                "last_increment_at": datetime.utcnow().isoformat()
            }).eq("id", counter_id).execute()
            
            logger.debug(f"Incremented rate limit counter to {new_count}")
            return new_count
        else:
            # Create new counter
            db.table("rate_limit_counters").insert({
                "user_id": user_id,
                "contact_id": contact_id,
                "channel": channel,
                "date": today.isoformat(),
                "count": 1,
                "last_increment_at": datetime.utcnow().isoformat()
            }).execute()
            
            logger.debug("Created new rate limit counter")
            return 1
    
    except Exception as e:
        logger.error(f"Error incrementing rate limit: {e}")
        return 0


async def get_daily_send_count(
    db: Client,
    user_id: str,
    contact_id: Optional[str] = None,
    channel: Optional[str] = None
) -> int:
    """
    Get total messages sent today.
    
    Args:
        db: Supabase client
        user_id: User UUID
        contact_id: Optional contact filter
        channel: Optional channel filter
        
    Returns:
        Total count for today
    """
    today = date.today()
    
    try:
        query = db.table("rate_limit_counters")\
            .select("count")\
            .eq("user_id", user_id)\
            .eq("date", today.isoformat())
        
        if contact_id:
            query = query.eq("contact_id", contact_id)
        
        if channel:
            query = query.eq("channel", channel)
        
        result = query.execute()
        
        if result.data:
            total = sum(item["count"] for item in result.data)
            return total
        
        return 0
    
    except Exception as e:
        logger.error(f"Error getting daily send count: {e}")
        return 0


__all__ = [
    "check_rate_limit",
    "increment_rate_limit",
    "get_daily_send_count",
    "calculate_best_send_time",
]

