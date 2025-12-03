"""
Video Platform Webhook Handlers
Handles callbacks from Zoom, Teams, Google Meet
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Header, Depends
from typing import Optional
import hmac
import hashlib
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.video_service import video_service
from app.models.video import VideoMeeting
from app.database import get_db


router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


# ═══════════════════════════════════════════════════════════════
# ZOOM WEBHOOKS
# ═══════════════════════════════════════════════════════════════

@router.post("/zoom")
async def zoom_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Zoom webhook handler
    
    Events:
    - recording.completed: Recording is ready
    - meeting.ended: Meeting has ended
    - meeting.started: Meeting has started
    
    Docs: https://marketplace.zoom.us/docs/api-reference/webhook-reference
    """
    
    # Verify webhook signature
    # zoom_signature = request.headers.get('x-zm-signature')
    # if not verify_zoom_signature(await request.body(), zoom_signature):
    #     raise HTTPException(status_code=401, detail="Invalid signature")
    
    payload = await request.json()
    event_type = payload.get('event')
    
    # Handle validation request
    if event_type == 'endpoint.url_validation':
        # Zoom sends this to verify the endpoint
        plain_token = payload.get('payload', {}).get('plainToken')
        encrypted_token = hashlib.sha256(plain_token.encode()).hexdigest()
        return {
            "plainToken": plain_token,
            "encryptedToken": encrypted_token
        }
    
    # Get meeting info
    meeting_object = payload.get('payload', {}).get('object', {})
    meeting_uuid = meeting_object.get('uuid')
    meeting_id = meeting_object.get('id')
    
    if event_type == 'recording.completed':
        """
        Recording is ready - fetch and process it
        """
        
        # Find meeting in database by platform_meeting_id
        result = await db.execute(
            select(VideoMeeting).where(
                VideoMeeting.platform == 'zoom',
                VideoMeeting.platform_meeting_id == str(meeting_id)
            )
        )
        meeting = result.scalar_one_or_none()
        
        if meeting:
            # Fetch recording in background
            background_tasks.add_task(
                video_service.get_zoom_recording,
                meeting.id
            )
    
    elif event_type == 'meeting.started':
        """
        Meeting has started
        """
        
        result = await db.execute(
            select(VideoMeeting).where(
                VideoMeeting.platform == 'zoom',
                VideoMeeting.platform_meeting_id == str(meeting_id)
            )
        )
        meeting = result.scalar_one_or_none()
        
        if meeting:
            from datetime import datetime
            meeting.status = 'in_progress'
            meeting.actual_start = datetime.utcnow()
            await db.commit()
    
    elif event_type == 'meeting.ended':
        """
        Meeting has ended
        """
        
        result = await db.execute(
            select(VideoMeeting).where(
                VideoMeeting.platform == 'zoom',
                VideoMeeting.platform_meeting_id == str(meeting_id)
            )
        )
        meeting = result.scalar_one_or_none()
        
        if meeting:
            from datetime import datetime
            meeting.status = 'completed'
            meeting.actual_end = datetime.utcnow()
            
            # Calculate actual duration
            if meeting.actual_start:
                duration_seconds = (meeting.actual_end - meeting.actual_start).total_seconds()
                meeting.duration_minutes = int(duration_seconds / 60)
            
            # Get participant count
            participants = meeting_object.get('participant_count', 0)
            meeting.participants_count = participants
            
            await db.commit()
    
    return {"success": True, "event": event_type}


def verify_zoom_signature(body: bytes, signature: Optional[str]) -> bool:
    """Verify Zoom webhook signature"""
    
    if not signature:
        return False
    
    import os
    secret = os.getenv('ZOOM_WEBHOOK_SECRET', '')
    
    if not secret:
        # If no secret configured, skip verification (development only)
        return True
    
    expected_signature = hmac.new(
        secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, f"v0={expected_signature}")


# ═══════════════════════════════════════════════════════════════
# MICROSOFT TEAMS WEBHOOKS
# ═══════════════════════════════════════════════════════════════

@router.post("/teams")
async def teams_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    validation_token: Optional[str] = Header(None, alias='validationtoken'),
    db: AsyncSession = Depends(get_db)
):
    """
    Microsoft Teams webhook handler (Graph API subscription)
    
    Events:
    - callRecording created
    - onlineMeeting updated
    
    Docs: https://docs.microsoft.com/en-us/graph/webhooks
    """
    
    # Handle validation request
    if validation_token:
        # Microsoft sends this to verify the endpoint
        return validation_token
    
    payload = await request.json()
    
    # Get notification details
    notifications = payload.get('value', [])
    
    for notification in notifications:
        resource = notification.get('resource')
        change_type = notification.get('changeType')
        
        # Handle different notification types
        if 'callRecords' in resource and change_type == 'created':
            # Call recording created
            # Extract meeting ID and fetch recording
            pass
        
        elif 'onlineMeetings' in resource:
            # Meeting updated
            # Check if recording is available
            pass
    
    return {"success": True}


# ═══════════════════════════════════════════════════════════════
# GOOGLE MEET WEBHOOKS
# ═══════════════════════════════════════════════════════════════

@router.post("/google-meet")
async def google_meet_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Google Meet webhook handler (Cloud Pub/Sub)
    
    Events:
    - Recording uploaded to Drive
    - Meeting ended
    
    Docs: https://developers.google.com/meet/api
    """
    
    payload = await request.json()
    
    # Parse Pub/Sub message
    message = payload.get('message', {})
    data = message.get('data', '')
    
    # Decode base64 data
    import base64
    decoded_data = base64.b64decode(data).decode('utf-8')
    event_data = json.loads(decoded_data)
    
    event_type = event_data.get('eventType')
    
    if event_type == 'recording.uploaded':
        # Recording uploaded to Google Drive
        recording_id = event_data.get('recordingId')
        meeting_id = event_data.get('meetingId')
        
        # Find meeting and update with recording info
        result = await db.execute(
            select(VideoMeeting).where(
                VideoMeeting.platform == 'google_meet',
                VideoMeeting.platform_meeting_id == meeting_id
            )
        )
        meeting = result.scalar_one_or_none()
        
        if meeting:
            meeting.has_recording = True
            meeting.recording_url = f"https://drive.google.com/file/d/{recording_id}/view"
            await db.commit()
    
    return {"success": True}


# ═══════════════════════════════════════════════════════════════
# MANUAL TRIGGER ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/test/zoom-recording-ready/{meeting_id}")
async def test_zoom_recording_ready(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Test endpoint to manually trigger recording fetch
    (for development/testing)
    """
    
    result = await db.execute(
        select(VideoMeeting).where(VideoMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.platform != 'zoom':
        raise HTTPException(status_code=400, detail="Only Zoom meetings supported")
    
    # Trigger recording fetch
    background_tasks.add_task(
        video_service.get_zoom_recording,
        meeting_id
    )
    
    return {
        "success": True,
        "message": "Recording fetch triggered"
    }

