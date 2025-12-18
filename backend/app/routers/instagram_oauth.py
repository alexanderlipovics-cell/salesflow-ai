"""
Instagram OAuth Router
Handles Instagram OAuth flow for user account connection.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import RedirectResponse
from app.supabase_client import get_supabase_client
from app.core.security import get_current_user_dict
from datetime import datetime, timedelta, timezone
import httpx
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/instagram", tags=["instagram"])

# Meta App Credentials
INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
REDIRECT_URI = os.getenv("INSTAGRAM_REDIRECT_URI", "https://salesflow-ai.onrender.com/api/instagram/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://alsales.ai")

# Facebook OAuth URLs (required for Instagram Business API)
AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"
TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token"
GRAPH_URL = "https://graph.instagram.com"
FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v18.0"


def _extract_user_id(user) -> str:
    """Extract user ID from user object (dict or User model)"""
    if isinstance(user, dict):
        return str(user.get("sub") or user.get("user_id") or user.get("id") or user.get("team_member_id"))
    if hasattr(user, "id"):
        return str(getattr(user, "id"))
    return str(user)


@router.get("/auth")
async def instagram_auth(
    request: Request,
    current_user: dict = Depends(get_current_user_dict),
    redirect_url: str = Query(default="/settings")
):
    """
    Start Instagram OAuth flow.
    
    Returns authorization URL that user should be redirected to.
    """
    if not INSTAGRAM_APP_ID or not INSTAGRAM_APP_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Instagram OAuth not configured. Please set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET."
        )
    
    user_id = _extract_user_id(current_user)
    
    # Store user_id and redirect_url in state for callback
    state = f"{user_id}:{redirect_url}"
    
    # Build authorization URL (Facebook OAuth for Instagram Business API)
    # Required scopes for Instagram Business API:
    # - pages_show_list: List user's Facebook Pages
    # - pages_read_engagement: Read engagement data
    # - instagram_basic: Basic Instagram profile info
    # - instagram_manage_messages: Send/receive DMs
    # - business_management: Manage business assets
    scope = "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_messages,business_management"
    auth_url = (
        f"{AUTH_URL}"
        f"?client_id={INSTAGRAM_APP_ID}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={scope}"
        f"&response_type=code"
        f"&state={state}"
    )
    
    logger.info(f"Redirecting user {user_id} to Instagram OAuth")
    return {"auth_url": auth_url}


@router.get("/callback")
async def instagram_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None)
):
    """
    Handle Instagram OAuth callback.
    
    Exchanges authorization code for access token and stores it in database.
    """
    if error:
        logger.error(f"Instagram OAuth error: {error}")
        return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error={error}")
    
    if not code or not state:
        logger.error("Instagram OAuth callback missing code or state")
        return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error=missing_params")
    
    try:
        # Parse state (format: "user_id:redirect_url")
        parts = state.split(":", 1)
        user_id = parts[0] if parts else None
        redirect_url = parts[1] if len(parts) > 1 else "/settings"
        
        if not user_id:
            logger.error("Invalid state: missing user_id")
            return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error=invalid_state")
        
        async with httpx.AsyncClient() as client:
            # Exchange code for access token (Facebook OAuth uses GET)
            token_response = await client.get(
                TOKEN_URL,
                params={
                    "client_id": INSTAGRAM_APP_ID,
                    "client_secret": INSTAGRAM_APP_SECRET,
                    "redirect_uri": REDIRECT_URI,
                    "code": code
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.status_code} - {token_response.text}")
                return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error=token_failed")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            if not access_token:
                logger.error(f"Missing access_token in response: {token_data}")
                return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error=invalid_token")
            
            # Get long-lived token (60 days) - Facebook tokens can be exchanged
            expires_in = token_data.get("expires_in", 3600)  # Default: 1 hour for short-lived token
            
            # Exchange for long-lived token
            try:
                long_token_response = await client.get(
                    f"{FACEBOOK_GRAPH_URL}/oauth/access_token",
                    params={
                        "grant_type": "fb_exchange_token",
                        "client_id": INSTAGRAM_APP_ID,
                        "client_secret": INSTAGRAM_APP_SECRET,
                        "fb_exchange_token": access_token
                    }
                )
                
                if long_token_response.status_code == 200:
                    long_token_data = long_token_response.json()
                    access_token = long_token_data.get("access_token", access_token)
                    expires_in = long_token_data.get("expires_in", 5184000)  # 60 days default
                    logger.info(f"Got long-lived Facebook token, expires in {expires_in} seconds")
            except Exception as e:
                logger.warning(f"Could not exchange for long-lived token: {e}, using short-lived token")
            
            # Get user's Facebook Pages (needed to find Instagram Business Account)
            pages = []
            instagram_user_id = ""
            username = ""
            
            try:
                # Get user's pages
                pages_response = await client.get(
                    f"{FACEBOOK_GRAPH_URL}/me/accounts",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,instagram_business_account"
                    }
                )
                
                if pages_response.status_code == 200:
                    pages_data = pages_response.json()
                    pages = pages_data.get("data", [])
                    logger.info(f"Found {len(pages)} Facebook pages")
                    
                    # Find page with Instagram Business Account
                    for page in pages:
                        ig_account = page.get("instagram_business_account")
                        if ig_account:
                            instagram_user_id = str(ig_account.get("id", ""))
                            logger.info(f"Found Instagram Business Account: {instagram_user_id} for page {page.get('name')}")
                            break
            except Exception as e:
                logger.warning(f"Could not fetch Facebook pages: {e}")
            
            # Get Instagram profile if we have the Instagram Business Account ID
            if instagram_user_id:
                try:
                    profile_response = await client.get(
                        f"{GRAPH_URL}/{instagram_user_id}",
                        params={
                            "fields": "id,username",
                            "access_token": access_token
                        }
                    )
                    
                    if profile_response.status_code == 200:
                        profile_data = profile_response.json()
                        username = profile_data.get("username", "")
                        logger.info(f"Got Instagram profile: @{username}")
                except Exception as e:
                    logger.warning(f"Could not fetch Instagram profile: {e}")
            
            if not instagram_user_id:
                logger.warning("No Instagram Business Account found. User may need to connect Instagram to their Facebook Page first.")
                # Still save the Facebook token, user can connect Instagram later
                instagram_user_id = "pending"
            
            # Save to database
            supabase = get_supabase_client()
            
            # Calculate token expiration
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
            
            # Upsert user instagram account
            result = supabase.table("user_instagram_accounts").upsert(
                {
                    "user_id": user_id,
                    "instagram_user_id": instagram_user_id,
                    "instagram_username": username,
                    "access_token": access_token,
                    "token_expires_at": expires_at.isoformat(),
                    "is_active": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                on_conflict="user_id,instagram_user_id"
            ).execute()
            
            logger.info(f"User {user_id} connected Instagram account: @{username} (ID: {instagram_user_id})")
            
            return RedirectResponse(f"{FRONTEND_URL}{redirect_url}?instagram_connected=true")
    
    except Exception as e:
        logger.error(f"Instagram OAuth error: {e}", exc_info=True)
        return RedirectResponse(f"{FRONTEND_URL}/settings?instagram_error=server_error")


@router.get("/status")
async def instagram_status(current_user: dict = Depends(get_current_user_dict)):
    """
    Check if user has connected Instagram account.
    
    Returns connection status and account info.
    """
    user_id = _extract_user_id(current_user)
    
    supabase = get_supabase_client()
    response = supabase.table("user_instagram_accounts").select("*").eq("user_id", user_id).eq("is_active", True).limit(1).execute()
    
    if response.data and len(response.data) > 0:
        account = response.data[0]
        return {
            "connected": True,
            "username": account.get("instagram_username"),
            "instagram_user_id": account.get("instagram_user_id"),
            "connected_at": account.get("created_at"),
            "token_expires_at": account.get("token_expires_at")
        }
    
    return {"connected": False}


@router.delete("/disconnect")
async def instagram_disconnect(current_user: dict = Depends(get_current_user_dict)):
    """
    Disconnect Instagram account.
    
    Marks the account as inactive instead of deleting it.
    """
    user_id = _extract_user_id(current_user)
    
    supabase = get_supabase_client()
    result = supabase.table("user_instagram_accounts").update({
        "is_active": False,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("user_id", user_id).execute()
    
    logger.info(f"User {user_id} disconnected Instagram account")
    return {"success": True, "message": "Instagram account disconnected"}

