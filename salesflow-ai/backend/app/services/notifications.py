"""
Notification Helper Service

Handles notification creation, queuing, and delivery for background jobs.
"""

from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def create_notification(
    db,
    user_id: str,
    type: str,
    title: str,
    body: str,
    data: dict = None
) -> dict:
    """
    Create a notification in the queue.
    In Week 3, this will also send push notifications.

    Args:
        db: Supabase client
        user_id: User UUID
        type: Notification type (overdue_followups, hot_lead, churn_risk, etc.)
        title: Notification title
        body: Notification body text
        data: Additional data (optional)

    Returns:
        Dict with success status and notification_id
    """

    # Check if user has this notification type enabled
    prefs = await db.from_("user_notification_preferences").select(
        "*"
    ).eq("user_id", user_id).single().execute()

    # Default preferences if not set
    if not prefs.data:
        prefs_data = {}
    else:
        prefs_data = prefs.data

    # Check notification type preference
    type_mapping = {
        "overdue_followups": "overdue_followups",
        "hot_lead": "hot_lead_alerts",
        "churn_risk": "churn_alerts",
        "goal_ahead": "goal_updates",
        "goal_behind": "goal_updates",
        "daily_briefing": "daily_briefing",
        "power_hour": "power_hour_enabled"
    }

    pref_key = type_mapping.get(type)
    if pref_key and not prefs_data.get(pref_key, True):
        logger.info(f"Notification type {type} disabled for user {user_id}")
        return {"skipped": True, "reason": "notification_disabled"}

    # Check quiet hours
    now = datetime.now().time()
    quiet_start = prefs_data.get("quiet_hours_start", "22:00")
    quiet_end = prefs_data.get("quiet_hours_end", "07:00")

    if isinstance(quiet_start, str):
        quiet_start = datetime.strptime(quiet_start, "%H:%M").time()
    if isinstance(quiet_end, str):
        quiet_end = datetime.strptime(quiet_end, "%H:%M").time()

    # Check if in quiet hours (skip daily_briefing from quiet hours check)
    if type != "daily_briefing":
        if quiet_start > quiet_end:  # Spans midnight
            if now >= quiet_start or now <= quiet_end:
                logger.info(f"Quiet hours active for user {user_id}")
                return {"skipped": True, "reason": "quiet_hours"}
        else:
            if quiet_start <= now <= quiet_end:
                logger.info(f"Quiet hours active for user {user_id}")
                return {"skipped": True, "reason": "quiet_hours"}

    # Create notification
    result = await db.from_("notification_queue").insert({
        "user_id": user_id,
        "type": type,
        "title": title,
        "body": body,
        "data": data or {},
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }).execute()

    notification_id = result.data[0]["id"] if result.data else None

    logger.info(f"Created notification {notification_id} for user {user_id}: {title}")

    # TODO Week 3: Send push notification here
    # await send_push_notification(user_id, title, body, data)

    return {
        "success": True,
        "notification_id": notification_id
    }


async def log_job_start(db, job_name: str) -> str:
    """Log the start of a background job."""
    result = await db.from_("background_job_logs").insert({
        "job_name": job_name,
        "started_at": datetime.now().isoformat(),
        "status": "running"
    }).execute()

    return result.data[0]["id"] if result.data else None


async def log_job_complete(
    db,
    job_id: str,
    records_processed: int = 0,
    error: str = None,
    metadata: dict = None
):
    """Log the completion of a background job."""
    await db.from_("background_job_logs").update({
        "completed_at": datetime.now().isoformat(),
        "status": "failed" if error else "completed",
        "records_processed": records_processed,
        "error": error,
        "metadata": metadata or {}
    }).eq("id", job_id).execute()


__all__ = ["create_notification", "log_job_start", "log_job_complete"]
