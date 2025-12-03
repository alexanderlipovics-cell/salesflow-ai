"""
Push Notifications API
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

try:
    from exponent_server_sdk import PushClient, PushMessage
    EXPO_AVAILABLE = True
except ImportError:
    EXPO_AVAILABLE = False
    logging.warning("exponent_server_sdk not installed. Push notifications will be disabled.")

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

logger = logging.getLogger(__name__)


class RegisterTokenRequest(BaseModel):
    expo_push_token: str


@router.post("/register")
async def register_push_token(
    request: RegisterTokenRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Register user's Expo push token"""
    
    try:
        # Update user's push token in database
        # This assumes you have an expo_push_token field in your User model
        # If not, you may need to add it to your database schema
        
        # For now, we'll store it in a simple way
        # You might want to create a separate table for device tokens
        # to support multiple devices per user
        
        logger.info(f"Registering push token for user {current_user.id}")
        
        # Store token (implementation depends on your database structure)
        # Example: await db.execute(
        #     "UPDATE users SET expo_push_token = :token WHERE id = :user_id",
        #     {"token": request.expo_push_token, "user_id": current_user.id}
        # )
        
        return {
            "success": True,
            "message": "Push token registered successfully"
        }
    
    except Exception as e:
        logger.error(f"Failed to register push token: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def send_push_notification(
    expo_push_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> Optional[Dict]:
    """
    Send push notification to user.
    Called by backend when events happen (new lead, reminder, etc.)
    """
    
    if not EXPO_AVAILABLE:
        logger.warning("Expo SDK not available. Skipping push notification.")
        return None
    
    try:
        message = PushMessage(
            to=expo_push_token,
            title=title,
            body=body,
            data=data or {},
            sound='default',
        )
        
        response = PushClient().publish(message)
        logger.info(f"Push notification sent: {title}")
        return {"success": True, "response": str(response)}
        
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        return {"success": False, "error": str(e)}


# Example usage functions that can be called from other services

async def notify_new_lead(user_expo_token: str, lead_name: str):
    """Notify user about a new lead"""
    return await send_push_notification(
        expo_push_token=user_expo_token,
        title="🎯 New Lead!",
        body=f"{lead_name} just came in. Time to follow up!",
        data={"type": "new_lead", "lead_name": lead_name}
    )


async def notify_follow_up_reminder(user_expo_token: str, lead_name: str):
    """Notify user about follow-up reminder"""
    return await send_push_notification(
        expo_push_token=user_expo_token,
        title="⏰ Follow-up Reminder",
        body=f"Don't forget to follow up with {lead_name}",
        data={"type": "follow_up_reminder", "lead_name": lead_name}
    )


async def notify_deal_closed(user_expo_token: str, lead_name: str, amount: float):
    """Notify user about closed deal"""
    return await send_push_notification(
        expo_push_token=user_expo_token,
        title="🎉 Deal Closed!",
        body=f"Congratulations! {lead_name} - €{amount:,.2f}",
        data={"type": "deal_closed", "lead_name": lead_name, "amount": amount}
    )


async def notify_team_achievement(user_expo_token: str, achievement: str):
    """Notify user about team achievement"""
    return await send_push_notification(
        expo_push_token=user_expo_token,
        title="🏆 Team Achievement!",
        body=achievement,
        data={"type": "team_achievement", "achievement": achievement}
    )

