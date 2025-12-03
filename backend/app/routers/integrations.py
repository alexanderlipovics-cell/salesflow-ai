"""
OAuth Integration Routes
Handle connections to Zoom, Teams, Google Meet
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import requests
import os

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.video import VideoIntegration


router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


# ═══════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class IntegrationResponse(BaseModel):
    """Integration response"""
    integration_id: str
    platform: str
    is_active: bool
    connected_at: datetime
    platform_email: Optional[str] = None


class IntegrationsListResponse(BaseModel):
    """List of user integrations"""
    integrations: list[IntegrationResponse]


# ═══════════════════════════════════════════════════════════════
# MOCK AUTH (Replace with real auth)
# ═══════════════════════════════════════════════════════════════

class CurrentUser:
    def __init__(self, id: str):
        self.id = id


async def get_current_user() -> CurrentUser:
    """Mock - replace with real auth"""
    return CurrentUser(id="user-123")


# ═══════════════════════════════════════════════════════════════
# ZOOM OAUTH
# ═══════════════════════════════════════════════════════════════

@router.get("/zoom/authorize")
async def zoom_authorize(current_user: CurrentUser = Depends(get_current_user)):
    """
    Step 1: Redirect user to Zoom OAuth
    
    Frontend should redirect to this URL
    """
    
    zoom_client_id = os.getenv('ZOOM_CLIENT_ID', '')
    zoom_redirect_uri = os.getenv('ZOOM_REDIRECT_URI', 'http://localhost:8000/api/integrations/zoom/callback')
    
    if not zoom_client_id:
        raise HTTPException(status_code=500, detail="Zoom not configured")
    
    # Build authorization URL
    auth_url = (
        f"https://zoom.us/oauth/authorize?"
        f"response_type=code&"
        f"client_id={zoom_client_id}&"
        f"redirect_uri={zoom_redirect_uri}&"
        f"state={current_user.id}"  # Pass user ID in state
    )
    
    return {
        "authorization_url": auth_url
    }


@router.get("/zoom/callback")
async def zoom_callback(
    code: str = Query(...),
    state: str = Query(...),  # user_id
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle Zoom OAuth callback
    
    Zoom redirects here after user approves
    """
    
    zoom_client_id = os.getenv('ZOOM_CLIENT_ID', '')
    zoom_client_secret = os.getenv('ZOOM_CLIENT_SECRET', '')
    zoom_redirect_uri = os.getenv('ZOOM_REDIRECT_URI', 'http://localhost:8000/api/integrations/zoom/callback')
    
    user_id = state
    
    # Exchange code for access token
    try:
        response = requests.post(
            'https://zoom.us/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': zoom_redirect_uri
            },
            auth=(zoom_client_id, zoom_client_secret),
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Zoom OAuth failed: {response.text}")
        
        tokens = response.json()
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Zoom: {str(e)}")
    
    # Get user info from Zoom
    zoom_user = None
    try:
        user_response = requests.get(
            'https://api.zoom.us/v2/users/me',
            headers={'Authorization': f"Bearer {tokens['access_token']}"},
            timeout=10
        )
        if user_response.status_code == 200:
            zoom_user = user_response.json()
    except:
        pass
    
    # Check if integration already exists
    result = await db.execute(
        select(VideoIntegration).where(
            VideoIntegration.user_id == user_id,
            VideoIntegration.platform == 'zoom'
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing
        existing.access_token = tokens['access_token']
        existing.refresh_token = tokens['refresh_token']
        existing.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
        existing.is_active = True
        existing.platform_email = zoom_user.get('email') if zoom_user else None
        existing.platform_user_id = zoom_user.get('id') if zoom_user else None
    else:
        # Create new
        from uuid import uuid4
        integration = VideoIntegration(
            id=str(uuid4()),
            user_id=user_id,
            platform='zoom',
            access_token=tokens['access_token'],
            refresh_token=tokens['refresh_token'],
            token_expires_at=datetime.utcnow() + timedelta(seconds=tokens['expires_in']),
            platform_email=zoom_user.get('email') if zoom_user else None,
            platform_user_id=zoom_user.get('id') if zoom_user else None,
            is_active=True
        )
        db.add(integration)
    
    await db.commit()
    
    # Redirect to success page
    return {
        "success": True,
        "message": "Zoom connected successfully!",
        "redirect_to": "/video-meetings"
    }


# ═══════════════════════════════════════════════════════════════
# MICROSOFT TEAMS OAUTH
# ═══════════════════════════════════════════════════════════════

@router.get("/teams/authorize")
async def teams_authorize(current_user: CurrentUser = Depends(get_current_user)):
    """
    Step 1: Redirect user to Microsoft OAuth
    """
    
    client_id = os.getenv('MICROSOFT_CLIENT_ID', '')
    redirect_uri = os.getenv('MICROSOFT_REDIRECT_URI', 'http://localhost:8000/api/integrations/teams/callback')
    tenant_id = os.getenv('MICROSOFT_TENANT_ID', 'common')
    
    if not client_id:
        raise HTTPException(status_code=500, detail="Microsoft Teams not configured")
    
    scopes = [
        'Calendars.ReadWrite',
        'OnlineMeetings.ReadWrite',
        'User.Read'
    ]
    
    auth_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize?"
        f"client_id={client_id}&"
        f"response_type=code&"
        f"redirect_uri={redirect_uri}&"
        f"response_mode=query&"
        f"scope={' '.join(scopes)}&"
        f"state={current_user.id}"
    )
    
    return {
        "authorization_url": auth_url
    }


@router.get("/teams/callback")
async def teams_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle Microsoft OAuth callback
    """
    
    client_id = os.getenv('MICROSOFT_CLIENT_ID', '')
    client_secret = os.getenv('MICROSOFT_CLIENT_SECRET', '')
    redirect_uri = os.getenv('MICROSOFT_REDIRECT_URI', 'http://localhost:8000/api/integrations/teams/callback')
    tenant_id = os.getenv('MICROSOFT_TENANT_ID', 'common')
    
    user_id = state
    
    # Exchange code for token
    try:
        response = requests.post(
            f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token',
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
                'scope': 'https://graph.microsoft.com/.default'
            },
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Microsoft OAuth failed: {response.text}")
        
        tokens = response.json()
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Microsoft: {str(e)}")
    
    # Get user info
    ms_user = None
    try:
        user_response = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': f"Bearer {tokens['access_token']}"},
            timeout=10
        )
        if user_response.status_code == 200:
            ms_user = user_response.json()
    except:
        pass
    
    # Save integration
    result = await db.execute(
        select(VideoIntegration).where(
            VideoIntegration.user_id == user_id,
            VideoIntegration.platform == 'teams'
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.access_token = tokens['access_token']
        existing.refresh_token = tokens.get('refresh_token')
        existing.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
        existing.is_active = True
        existing.platform_email = ms_user.get('mail') if ms_user else None
        existing.platform_user_id = ms_user.get('id') if ms_user else None
    else:
        from uuid import uuid4
        integration = VideoIntegration(
            id=str(uuid4()),
            user_id=user_id,
            platform='teams',
            access_token=tokens['access_token'],
            refresh_token=tokens.get('refresh_token'),
            token_expires_at=datetime.utcnow() + timedelta(seconds=tokens['expires_in']),
            platform_email=ms_user.get('mail') if ms_user else None,
            platform_user_id=ms_user.get('id') if ms_user else None,
            is_active=True
        )
        db.add(integration)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Microsoft Teams connected successfully!",
        "redirect_to": "/video-meetings"
    }


# ═══════════════════════════════════════════════════════════════
# GOOGLE MEET OAUTH
# ═══════════════════════════════════════════════════════════════

@router.get("/google/authorize")
async def google_authorize(current_user: CurrentUser = Depends(get_current_user)):
    """
    Step 1: Redirect user to Google OAuth
    """
    
    client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/integrations/google/callback')
    
    if not client_id:
        raise HTTPException(status_code=500, detail="Google Meet not configured")
    
    scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ]
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={' '.join(scopes)}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={current_user.id}"
    )
    
    return {
        "authorization_url": auth_url
    }


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle Google OAuth callback
    """
    
    client_id = os.getenv('GOOGLE_CLIENT_ID', '')
    client_secret = os.getenv('GOOGLE_CLIENT_SECRET', '')
    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/integrations/google/callback')
    
    user_id = state
    
    # Exchange code for token
    try:
        response = requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            },
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Google OAuth failed: {response.text}")
        
        tokens = response.json()
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to Google: {str(e)}")
    
    # Get user info
    google_user = None
    try:
        user_response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f"Bearer {tokens['access_token']}"},
            timeout=10
        )
        if user_response.status_code == 200:
            google_user = user_response.json()
    except:
        pass
    
    # Save integration
    result = await db.execute(
        select(VideoIntegration).where(
            VideoIntegration.user_id == user_id,
            VideoIntegration.platform == 'google_meet'
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.access_token = tokens['access_token']
        existing.refresh_token = tokens.get('refresh_token')
        existing.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens['expires_in'])
        existing.is_active = True
        existing.platform_email = google_user.get('email') if google_user else None
        existing.platform_user_id = google_user.get('id') if google_user else None
    else:
        from uuid import uuid4
        integration = VideoIntegration(
            id=str(uuid4()),
            user_id=user_id,
            platform='google_meet',
            access_token=tokens['access_token'],
            refresh_token=tokens.get('refresh_token'),
            token_expires_at=datetime.utcnow() + timedelta(seconds=tokens['expires_in']),
            platform_email=google_user.get('email') if google_user else None,
            platform_user_id=google_user.get('id') if google_user else None,
            is_active=True
        )
        db.add(integration)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Google Meet connected successfully!",
        "redirect_to": "/video-meetings"
    }


# ═══════════════════════════════════════════════════════════════
# MANAGE INTEGRATIONS
# ═══════════════════════════════════════════════════════════════

@router.get("/list", response_model=IntegrationsListResponse)
async def list_integrations(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's connected integrations"""
    
    result = await db.execute(
        select(VideoIntegration).where(
            VideoIntegration.user_id == current_user.id
        )
    )
    integrations = result.scalars().all()
    
    return IntegrationsListResponse(
        integrations=[
            IntegrationResponse(
                integration_id=i.id,
                platform=i.platform,
                is_active=i.is_active,
                connected_at=i.connected_at,
                platform_email=i.platform_email
            )
            for i in integrations
        ]
    )


@router.delete("/{platform}/disconnect")
async def disconnect_integration(
    platform: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect a platform integration"""
    
    result = await db.execute(
        select(VideoIntegration).where(
            VideoIntegration.user_id == current_user.id,
            VideoIntegration.platform == platform
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Deactivate instead of delete (keep historical data)
    integration.is_active = False
    await db.commit()
    
    return {
        "success": True,
        "message": f"{platform} disconnected"
    }

