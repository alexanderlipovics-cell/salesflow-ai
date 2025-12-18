from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.supabase_client import get_supabase_client
from app.core.security import get_current_active_user
from app.services.google_auth_service import google_auth_service

router = APIRouter(prefix="/api/auth/google", tags=["Google Auth"])


def _extract_user_id(user) -> str:
    if isinstance(user, dict):
        return str(user.get("id") or user.get("user_id") or user.get("sub"))
    if hasattr(user, "id"):
        return str(getattr(user, "id"))
    return str(user)


@router.get("/connect")
async def initiate_google_connect(
    user=Depends(get_current_active_user),
    redirect_url: Optional[str] = Query(default=None),
):
    """Initiate Google OAuth flow."""
    user_id = _extract_user_id(user)
    state = f"{user_id}:{redirect_url or '/settings'}"
    auth_url = google_auth_service.get_authorization_url(state=state)
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(default=""),
):
    """Handle Google OAuth callback."""
    frontend_url = "https://alsales.ai"

    try:
        parts = state.split(":", 1)
        user_id = parts[0] if parts else None
        redirect_url = parts[1] if len(parts) > 1 else "/settings"

        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid state")

        tokens = await google_auth_service.exchange_code_for_tokens(code)
        user_info = await google_auth_service.get_user_info(tokens["access_token"])

        expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))

        supabase = get_supabase_client()
        supabase.table("email_accounts").upsert(
            {
                "user_id": user_id,
                "provider": "google",
                "email": user_info["email"],
                "access_token": tokens["access_token"],
                "refresh_token": tokens.get("refresh_token"),
                "token_expires_at": expires_at.isoformat(),
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id,email",
        ).execute()

        return RedirectResponse(url=f"{frontend_url}{redirect_url}?gmail_connected=true")

    except Exception as e:
        print(f"Google callback error: {e}")
        return RedirectResponse(url=f"{frontend_url}/settings?gmail_error={str(e)}")


@router.get("/status")
async def get_connection_status(user=Depends(get_current_active_user)):
    """Check if user has connected Gmail."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(user)

    result = (
        supabase.table("email_accounts")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )

    if result.data:
        account = result.data[0]
        return {
            "connected": True,
            "email": account["email"],
            "last_sync": account.get("last_sync_at"),
        }

    return {"connected": False}


@router.delete("/disconnect")
async def disconnect_gmail(user=Depends(get_current_active_user)):
    """Disconnect Gmail account."""
    supabase = get_supabase_client()
    user_id = _extract_user_id(user)

    supabase.table("email_accounts").update(
        {"is_active": False, "access_token": None, "refresh_token": None}
    ).eq("user_id", user_id).execute()

    return {"success": True, "message": "Gmail disconnected"}

