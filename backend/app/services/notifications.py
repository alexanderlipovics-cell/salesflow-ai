"""
Notification Helper Service

Handles notification creation, queuing, and delivery for background jobs.
"""

from datetime import datetime
from typing import Optional
import logging
from .firebase import send_push_to_user

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
    Create a notification and send push notification.
    """

    # Check preferences (existing code)
    prefs = await db.from_("user_notification_preferences").select(
        "*"
    ).eq("user_id", user_id).single().execute()

    prefs_data = prefs.data or {}

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

    # Check quiet hours (existing code)
    now = datetime.now().time()
    quiet_start = prefs_data.get("quiet_hours_start", "22:00")
    quiet_end = prefs_data.get("quiet_hours_end", "07:00")

    if isinstance(quiet_start, str):
        quiet_start = datetime.strptime(quiet_start, "%H:%M").time()
    if isinstance(quiet_end, str):
        quiet_end = datetime.strptime(quiet_end, "%H:%M").time()

    in_quiet_hours = False
    if type != "daily_briefing":
        if quiet_start > quiet_end:  # Spans midnight
            if now >= quiet_start or now <= quiet_end:
                in_quiet_hours = True
        else:
            if quiet_start <= now <= quiet_end:
                in_quiet_hours = True

    if in_quiet_hours:
        logger.info(f"Quiet hours active for user {user_id}")
        return {"skipped": True, "reason": "quiet_hours"}

    # Create notification in queue
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

    # ═══════════════════════════════════════════════════════════
    # NEW: Send Push Notification
    # ═══════════════════════════════════════════════════════════

    push_result = await send_push_to_user(
        db=db,
        user_id=user_id,
        title=title,
        body=body,
        data={
            "notification_id": notification_id,
            "type": type,
            **(data or {})
        }
    )

    # Update notification status based on push result
    if push_result.get("success"):
        await db.from_("notification_queue").update({
            "status": "sent",
            "sent_at": datetime.now().isoformat()
        }).eq("id", notification_id).execute()

    logger.info(f"Notification {notification_id}: push={'sent' if push_result.get('success') else 'failed'}")

    return {
        "success": True,
        "notification_id": notification_id,
        "push_result": push_result
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
