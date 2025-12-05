"""
Scheduling Service for Autopilot Engine V2

Handles intelligent message scheduling with:
- Timezone-awareness
- Best send time calculation
- Contact preferences
- Historical pattern analysis
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# BEST SEND TIME CALCULATION
# ============================================================================


async def calculate_best_send_time(
    contact_id: str,
    db: Client,
    channel: str,
    min_delay_minutes: int = 5
) -> datetime:
    """
    Calculate optimal send time for a contact.
    
    Algorithm:
    1. Check contact preference (best_contact_time)
    2. Analyze historical response patterns
    3. Fall back to channel-specific defaults
    4. Apply timezone conversion
    
    Args:
        contact_id: Contact UUID
        db: Supabase client
        channel: Channel name (email, whatsapp, etc.)
        min_delay_minutes: Minimum delay from now (default: 5 min)
        
    Returns:
        UTC datetime for optimal send time
    """
    
    # 1. Load contact data
    contact = await _get_contact(db, contact_id)
    
    if not contact:
        # Fallback: Now + min_delay
        return datetime.utcnow() + timedelta(minutes=min_delay_minutes)
    
    contact_tz = contact.get("timezone", "UTC")
    
    # 2. Check contact preference
    if contact.get("best_contact_time"):
        preferred_time = contact["best_contact_time"]  # time object from DB
        return _next_occurrence_of_time(preferred_time, contact_tz, min_delay_minutes)
    
    # 3. Analyze historical patterns
    historical_hour = await _analyze_response_patterns(db, contact_id)
    if historical_hour is not None:
        target_time = time(hour=historical_hour, minute=0)
        return _next_occurrence_of_time(target_time, contact_tz, min_delay_minutes)
    
    # 4. Fallback: Channel-specific defaults
    default_hour = _get_channel_default_hour(channel)
    target_time = time(hour=default_hour, minute=0)
    return _next_occurrence_of_time(target_time, contact_tz, min_delay_minutes)


def _next_occurrence_of_time(
    target_time: time,
    timezone_str: str,
    min_delay_minutes: int
) -> datetime:
    """
    Get next occurrence of a specific time in a timezone.
    
    Args:
        target_time: Target time (e.g., 14:00)
        timezone_str: IANA timezone (e.g., "Europe/Berlin")
        min_delay_minutes: Minimum delay from now
        
    Returns:
        UTC datetime
    """
    try:
        tz = ZoneInfo(timezone_str)
    except Exception as e:
        logger.warning(f"Invalid timezone '{timezone_str}': {e}. Falling back to UTC")
        tz = ZoneInfo("UTC")
    
    # Current time in contact's timezone
    now_in_tz = datetime.now(tz)
    min_send_time = now_in_tz + timedelta(minutes=min_delay_minutes)
    
    # Target time today
    target_dt = now_in_tz.replace(
        hour=target_time.hour,
        minute=target_time.minute,
        second=0,
        microsecond=0
    )
    
    # If target time is in the past or too soon, use tomorrow
    if target_dt < min_send_time:
        target_dt += timedelta(days=1)
    
    # Convert to UTC
    return target_dt.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)


async def _get_contact(db: Client, contact_id: str) -> Optional[Dict[str, Any]]:
    """Load contact from database"""
    try:
        result = db.table("contacts").select("*").eq("id", contact_id).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"Error loading contact {contact_id}: {e}")
    
    return None


async def _analyze_response_patterns(db: Client, contact_id: str) -> Optional[int]:
    """
    Analyze historical response patterns to find best hour.
    
    Returns:
        Hour (0-23) or None if insufficient data
    """
    try:
        # Get recent outbound messages where contact replied
        result = db.table("message_events")\
            .select("created_at")\
            .eq("contact_id", contact_id)\
            .eq("direction", "outbound")\
            .limit(20)\
            .execute()
        
        if not result.data or len(result.data) < 5:
            # Insufficient data
            return None
        
        # Extract hours
        hours = []
        for event in result.data:
            dt = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
            hours.append(dt.hour)
        
        # Calculate average hour
        avg_hour = int(sum(hours) / len(hours))
        
        logger.debug(f"Historical pattern for contact {contact_id}: avg hour {avg_hour}")
        
        return avg_hour
    
    except Exception as e:
        logger.error(f"Error analyzing patterns: {e}")
        return None


def _get_channel_default_hour(channel: str) -> int:
    """
    Get default send hour for a channel.
    
    Based on best practices:
    - Email: 10 AM (business hours)
    - WhatsApp: 2 PM (after lunch)
    - LinkedIn: 9 AM (business hours)
    - Instagram: 6 PM (after work, leisure time)
    
    Returns:
        Hour (0-23)
    """
    defaults = {
        "email": 10,
        "whatsapp": 14,
        "linkedin": 9,
        "instagram": 18,
    }
    
    return defaults.get(channel, 12)  # Fallback: Noon


# ============================================================================
# JOB CREATION
# ============================================================================


async def create_autopilot_job(
    db: Client,
    user_id: str,
    contact_id: str,
    channel: str,
    message_text: str,
    scheduled_for: datetime,
    message_event_id: Optional[str] = None,
    experiment_id: Optional[str] = None,
    variant_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create scheduled autopilot job.
    
    Args:
        db: Supabase client
        user_id: User UUID
        contact_id: Contact UUID
        channel: Channel name
        message_text: Message to send
        scheduled_for: When to send (UTC)
        message_event_id: Link to triggering message event
        experiment_id: A/B test experiment ID
        variant_id: A/B test variant ID
        metadata: Additional metadata
        
    Returns:
        Created job dict
    """
    job_data = {
        "user_id": user_id,
        "contact_id": contact_id,
        "message_event_id": message_event_id,
        "channel": channel,
        "message_text": message_text,
        "scheduled_for": scheduled_for.isoformat(),
        "status": "pending",
        "attempts": 0,
        "max_attempts": 3,
        "experiment_id": experiment_id,
        "variant_id": variant_id,
        "metadata": metadata or {},
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = db.table("autopilot_jobs").insert(job_data).execute()
    
    if result.data:
        job = result.data[0]
        logger.info(f"Created autopilot job: {job['id']} scheduled for {scheduled_for}")
        return job
    
    raise Exception("Failed to create autopilot job")


__all__ = [
    "calculate_best_send_time",
    "create_autopilot_job",
]

