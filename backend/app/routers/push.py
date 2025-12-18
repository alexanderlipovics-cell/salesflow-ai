"""
Push Subscription API Router

Endpoints for managing push notification subscriptions.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/api/push", tags=["Push"])


class PushSubscription(BaseModel):
    fcm_token: str
    device_type: str = "web"  # web, ios, android


class WebPushSubscription(BaseModel):
    endpoint: str
    keys: dict  # p256dh, auth


@router.post("/subscribe")
async def subscribe_push(
    subscription: PushSubscription,
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Register a push subscription for the current user."""

    # Upsert subscription
    await db.from_("push_subscriptions").upsert({
        "user_id": current_user["id"],
        "fcm_token": subscription.fcm_token,
        "device_type": subscription.device_type,
        "updated_at": datetime.now().isoformat()
    }, on_conflict="user_id,device_type").execute()

    return {"success": True}


@router.delete("/unsubscribe")
async def unsubscribe_push(
    device_type: str = "web",
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Remove push subscription."""

    await db.from_("push_subscriptions").delete().eq(
        "user_id", current_user["id"]
    ).eq("device_type", device_type).execute()

    return {"success": True}


@router.get("/status")
async def get_push_status(
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Check if user has active push subscriptions."""

    result = await db.from_("push_subscriptions").select(
        "device_type, updated_at"
    ).eq("user_id", current_user["id"]).execute()

    return {
        "subscribed": len(result.data) > 0,
        "devices": result.data
    }


@router.post("/test")
async def test_push(
    current_user = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Send a test push notification."""

    from ..services.firebase import send_push_to_user

    result = await send_push_to_user(
        db=db,
        user_id=current_user["id"],
        title="🧪 Test Notification",
        body="Push Notifications funktionieren!",
        data={"type": "test"}
    )

    return result
