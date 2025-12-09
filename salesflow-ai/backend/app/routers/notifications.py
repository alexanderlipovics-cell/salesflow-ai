"""
Notifications API Router

Endpoints for managing user notifications and preferences.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    data: dict
    status: str
    created_at: str
    read_at: Optional[str]


class NotificationPreferences(BaseModel):
    daily_briefing: bool = True
    overdue_followups: bool = True
    hot_lead_alerts: bool = True
    churn_alerts: bool = True
    goal_updates: bool = True
    power_hour_enabled: bool = True
    power_hour_times: List[int] = [10, 15]
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    status: Optional[str] = None,
    limit: int = 20,
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Get user's notifications."""

    query = db.from_("notification_queue").select(
        "*"
    ).eq("user_id", current_user["id"]).order(
        "created_at", desc=True
    ).limit(limit)

    if status:
        query = query.eq("status", status)

    result = await query.execute()

    return result.data


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Mark a notification as read."""

    await db.from_("notification_queue").update({
        "status": "read",
        "read_at": datetime.now().isoformat()
    }).eq("id", notification_id).eq(
        "user_id", current_user["id"]
    ).execute()

    return {"success": True}


@router.post("/read-all")
async def mark_all_as_read(
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Mark all notifications as read."""

    await db.from_("notification_queue").update({
        "status": "read",
        "read_at": datetime.now().isoformat()
    }).eq("user_id", current_user["id"]).eq(
        "status", "pending"
    ).execute()

    return {"success": True}


@router.get("/preferences", response_model=NotificationPreferences)
async def get_preferences(
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Get notification preferences."""

    result = await db.from_("user_notification_preferences").select(
        "*"
    ).eq("user_id", current_user["id"]).single().execute()

    if not result.data:
        # Return defaults
        return NotificationPreferences()

    return result.data


@router.put("/preferences")
async def update_preferences(
    preferences: NotificationPreferences,
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Update notification preferences."""

    # Upsert preferences
    await db.from_("user_notification_preferences").upsert({
        "user_id": current_user["id"],
        **preferences.dict(),
        "updated_at": datetime.now().isoformat()
    }).execute()

    return {"success": True}


@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Get count of unread notifications."""

    result = await db.from_("notification_queue").select(
        "id", count="exact"
    ).eq("user_id", current_user["id"]).eq(
        "status", "pending"
    ).execute()

    return {"count": result.count or 0}


__all__ = ["router"]
