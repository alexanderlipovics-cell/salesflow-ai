"""
Video Meetings API Endpoints
Zoom, Teams, Google Meet integration
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.video_service import video_service
from app.database import get_db
from app.models.video import VideoMeeting


router = APIRouter(prefix="/api/video-meetings", tags=["Video Meetings"])


# ═══════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class CreateMeetingRequest(BaseModel):
    """Create meeting request"""
    platform: str = Field(..., description="Platform: 'zoom', 'teams', 'google_meet'")
    lead_id: Optional[str] = Field(None, description="Lead ID if meeting is with a lead")
    title: str = Field(..., description="Meeting title")
    start_time: datetime = Field(..., description="Meeting start time (ISO 8601)")
    duration_minutes: int = Field(60, description="Meeting duration in minutes")


class MeetingResponse(BaseModel):
    """Meeting response"""
    meeting_id: str
    platform: str
    title: str
    join_url: str
    host_url: Optional[str] = None
    password: Optional[str] = None
    scheduled_start: datetime
    scheduled_end: datetime
    status: str
    
    # Optional fields
    has_recording: bool = False
    recording_url: Optional[str] = None
    has_transcript: bool = False
    ai_summary: Optional[str] = None
    key_topics: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    sentiment_analysis: Optional[dict] = None
    
    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    """Meeting list response"""
    meetings: List[MeetingResponse]
    count: int


# ═══════════════════════════════════════════════════════════════
# AUTH DEPENDENCY (Mock for now)
# ═══════════════════════════════════════════════════════════════

class CurrentUser:
    """Mock current user"""
    def __init__(self, id: str):
        self.id = id


async def get_current_user() -> CurrentUser:
    """Get current user from auth token"""
    # TODO: Implement real authentication
    # For now, return a mock user
    return CurrentUser(id="user-123")


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/create", response_model=MeetingResponse)
async def create_meeting(
    request: CreateMeetingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Create video meeting
    
    Supports:
    - Zoom
    - Microsoft Teams
    - Google Meet
    
    Returns meeting details including join URL
    """
    
    try:
        if request.platform == 'zoom':
            meeting = await video_service.create_zoom_meeting(
                user_id=current_user.id,
                lead_id=request.lead_id,
                title=request.title,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                db=db
            )
        elif request.platform == 'teams':
            meeting = await video_service.create_teams_meeting(
                user_id=current_user.id,
                lead_id=request.lead_id,
                title=request.title,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                db=db
            )
        elif request.platform == 'google_meet':
            meeting = await video_service.create_google_meet(
                user_id=current_user.id,
                lead_id=request.lead_id,
                title=request.title,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                db=db
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid platform: {request.platform}. Must be 'zoom', 'teams', or 'google_meet'"
            )
        
        return MeetingResponse.from_orm(meeting)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meetings", response_model=MeetingListResponse)
async def get_meetings(
    upcoming: bool = True,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get user's meetings
    
    Query params:
    - upcoming: True for upcoming meetings, False for past meetings
    - limit: Maximum number of meetings to return
    """
    
    try:
        meetings = await video_service.get_user_meetings(
            user_id=current_user.id,
            upcoming=upcoming,
            limit=limit,
            db=db
        )
        
        return MeetingListResponse(
            meetings=[MeetingResponse.from_orm(m) for m in meetings],
            count=len(meetings)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_meeting_details(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Get meeting details including recording/transcript/AI analysis
    """
    
    try:
        meeting = await video_service.get_meeting_by_id(meeting_id, db)
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check if user owns meeting
        if meeting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this meeting")
        
        return MeetingResponse.from_orm(meeting)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/{meeting_id}/analyze")
async def analyze_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Trigger AI analysis of meeting transcript
    
    Analyzes:
    - Key topics discussed
    - Action items
    - Sentiment
    - Summary
    """
    
    try:
        meeting = await video_service.get_meeting_by_id(meeting_id, db)
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check if user owns meeting
        if meeting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to analyze this meeting")
        
        # Check if transcript exists
        if not meeting.has_transcript:
            raise HTTPException(status_code=400, detail="No transcript available for this meeting")
        
        # Run analysis in background
        background_tasks.add_task(
            video_service.analyze_meeting_with_ai,
            meeting_id,
            db
        )
        
        return {
            "success": True,
            "message": "Analysis started. Check back in a few moments."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/meetings/{meeting_id}/fetch-recording")
async def fetch_recording(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Manually fetch recording for a meeting
    
    Normally recordings are fetched automatically via webhook,
    but this endpoint allows manual fetching if needed.
    """
    
    try:
        meeting = await video_service.get_meeting_by_id(meeting_id, db)
        
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        # Check if user owns meeting
        if meeting.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this meeting")
        
        # Only Zoom supports fetching recordings via API
        if meeting.platform != 'zoom':
            raise HTTPException(
                status_code=400,
                detail="Recording fetch only supported for Zoom meetings"
            )
        
        # Fetch recording in background
        background_tasks.add_task(
            video_service.get_zoom_recording,
            meeting_id,
            db
        )
        
        return {
            "success": True,
            "message": "Recording fetch started. Check back in a few moments."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/meetings/{meeting_id}")
async def cancel_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Cancel meeting
    """
    
    try:
        success = await video_service.cancel_meeting(meeting_id, current_user.id, db)
        
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found")
        
        return {
            "success": True,
            "message": "Meeting cancelled"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# WEBHOOK ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/webhooks/zoom")
async def zoom_webhook(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Zoom webhook handler
    
    Handles events:
    - recording.completed: Fetch recording and transcript
    - meeting.ended: Update meeting status
    """
    
    event_type = payload.get('event')
    
    if event_type == 'recording.completed':
        # Recording is ready
        meeting_uuid = payload.get('payload', {}).get('object', {}).get('uuid')
        
        if meeting_uuid:
            # Find meeting by platform_meeting_id
            # Then fetch recording
            # This is simplified - in production, add proper lookup
            background_tasks.add_task(
                video_service.get_zoom_recording,
                meeting_uuid,
                db
            )
    
    elif event_type == 'meeting.ended':
        # Meeting ended
        meeting_uuid = payload.get('payload', {}).get('object', {}).get('uuid')
        
        if meeting_uuid:
            # Update meeting status to completed
            # This is simplified - in production, add proper implementation
            pass
    
    return {"success": True}


@router.post("/webhooks/teams")
async def teams_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Microsoft Teams webhook handler
    
    Handles event subscriptions for:
    - Meeting recordings
    - Meeting transcripts
    """
    
    # Teams uses Graph API subscriptions
    # This is a simplified handler
    
    return {"success": True}

