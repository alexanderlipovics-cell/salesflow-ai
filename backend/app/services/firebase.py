"""
Firebase Cloud Messaging Service

Handles push notification sending via Firebase Cloud Messaging (FCM).
"""

import firebase_admin
from firebase_admin import credentials, messaging
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
_firebase_app = None


def get_firebase_app():
    global _firebase_app

    if _firebase_app is not None:
        return _firebase_app

    try:
        # Check if already initialized
        _firebase_app = firebase_admin.get_app()
    except ValueError:
        # Not initialized, create new
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })

        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized")

    return _firebase_app


async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: dict = None,
    image_url: str = None
) -> dict:
    """
    Send a push notification to a specific device.
    """

    # Ensure Firebase is initialized
    get_firebase_app()

    try:
        # Build notification
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url
        )

        # Build message
        message = messaging.Message(
            notification=notification,
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icon-192.png",
                    badge="/badge-72.png",
                    vibrate=[200, 100, 200]
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link="https://aura-os-git-main-sales-flow-ais-projects.vercel.app/chat"
                )
            )
        )

        # Send
        response = messaging.send(message)
        logger.info(f"Push notification sent: {response}")

        return {"success": True, "message_id": response}

    except messaging.UnregisteredError:
        logger.warning(f"Token unregistered: {token[:20]}...")
        return {"success": False, "error": "token_unregistered"}

    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return {"success": False, "error": str(e)}


async def send_push_to_user(
    db,
    user_id: str,
    title: str,
    body: str,
    data: dict = None
) -> dict:
    """
    Send push notification to all devices of a user.
    """

    # Get user's push subscriptions
    subscriptions = await db.from_("push_subscriptions").select(
        "fcm_token, device_type"
    ).eq("user_id", user_id).not_.is_("fcm_token", "null").execute()

    if not subscriptions.data:
        return {"success": False, "error": "no_subscriptions"}

    results = []

    for sub in subscriptions.data:
        if sub.get("fcm_token"):
            result = await send_push_notification(
                token=sub["fcm_token"],
                title=title,
                body=body,
                data=data
            )
            results.append({
                "device_type": sub["device_type"],
                **result
            })

            # Remove unregistered tokens
            if result.get("error") == "token_unregistered":
                await db.from_("push_subscriptions").delete().eq(
                    "fcm_token", sub["fcm_token"]
                ).execute()

    return {
        "success": any(r.get("success") for r in results),
        "results": results
    }
