"""
Follow-up API Endpoints
Advanced follow-up system with analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from app.services.followup_service import followup_service
from app.core.auth import get_current_user


router = APIRouter(prefix="/api/followups", tags=["Follow-ups"])


class SendFollowUpRequest(BaseModel):
    lead_id: str
    channel: str
    message: str
    subject: Optional[str] = None
    playbook_id: Optional[str] = None
    gpt_generated: bool = False


class MarkStatusRequest(BaseModel):
    followup_id: str


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user = Depends(get_current_user)
):
    """
    Get follow-up analytics
    
    Returns comprehensive analytics including:
    - Overall stats (sent, delivered, opened, responded)
    - Channel performance
    - Weekly trend
    - Response heatmap
    - Playbook performance
    """
    
    analytics = await followup_service.get_followup_analytics(
        user_id=current_user.id,
        days=days
    )
    
    return {
        "success": True,
        "data": analytics
    }


@router.get("/leads-needing-followup")
async def get_leads_needing_followup(
    days_threshold: int = Query(3, ge=1, le=30),
    current_user = Depends(get_current_user)
):
    """
    Get leads that need follow-up
    
    Returns list of leads with:
    - Lead info
    - Days since last contact
    - Recommended playbook
    - BANT score
    - Preferred channel
    """
    
    from app.core.database import get_db
    
    async with get_db() as db:
        leads = await db.fetch(
            "SELECT * FROM get_leads_needing_followup($1, $2)",
            days_threshold,
            current_user.id
        )
        
        return {
            "success": True,
            "count": len(leads),
            "leads": [dict(lead) for lead in leads]
        }


@router.post("/send")
async def send_followup(
    request: SendFollowUpRequest,
    current_user = Depends(get_current_user)
):
    """
    Manually send follow-up to a lead
    """
    
    success = await followup_service.send_followup(
        lead_id=request.lead_id,
        user_id=current_user.id,
        channel=request.channel,
        message=request.message,
        subject=request.subject,
        playbook_id=request.playbook_id,
        gpt_generated=request.gpt_generated
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send follow-up")
    
    return {
        "success": True,
        "message": "Follow-up sent successfully"
    }


@router.post("/trigger-all")
async def trigger_all_followups(
    current_user = Depends(get_current_user)
):
    """
    Manually trigger follow-up check for all leads
    (Normally runs via cron)
    """
    
    # Only allow for admin users
    if current_user.role not in ['admin', 'leader']:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = await followup_service.check_and_trigger_followups(
        user_id=current_user.id
    )
    
    return {
        "success": True,
        "results": results
    }


@router.post("/mark-delivered")
async def mark_delivered(
    request: MarkStatusRequest,
    current_user = Depends(get_current_user)
):
    """Mark follow-up as delivered"""
    
    success = await followup_service.mark_delivered(request.followup_id)
    
    return {
        "success": success,
        "message": "Follow-up marked as delivered" if success else "Failed to update"
    }


@router.post("/mark-opened")
async def mark_opened(
    request: MarkStatusRequest,
    current_user = Depends(get_current_user)
):
    """Mark follow-up as opened"""
    
    success = await followup_service.mark_opened(request.followup_id)
    
    return {
        "success": success,
        "message": "Follow-up marked as opened" if success else "Failed to update"
    }


@router.post("/mark-replied")
async def mark_replied(
    request: MarkStatusRequest,
    current_user = Depends(get_current_user)
):
    """Mark follow-up as replied"""
    
    success = await followup_service.mark_replied(request.followup_id)
    
    return {
        "success": success,
        "message": "Follow-up marked as replied" if success else "Failed to update"
    }


@router.get("/playbooks")
async def get_playbooks(
    current_user = Depends(get_current_user)
):
    """Get all active playbooks"""
    
    from app.core.database import get_db
    
    async with get_db() as db:
        playbooks = await db.fetch(
            """
            SELECT * FROM followup_playbooks
            WHERE is_active = TRUE
            ORDER BY priority DESC, name
            """
        )
        
        return {
            "success": True,
            "playbooks": [dict(p) for p in playbooks]
        }


@router.get("/playbook/{playbook_id}")
async def get_playbook(
    playbook_id: str,
    current_user = Depends(get_current_user)
):
    """Get playbook details"""
    
    from app.core.database import get_db
    
    async with get_db() as db:
        playbook = await db.fetchrow(
            "SELECT * FROM get_playbook_by_id($1)",
            playbook_id
        )
        
        if not playbook:
            raise HTTPException(status_code=404, detail="Playbook not found")
        
        return {
            "success": True,
            "playbook": dict(playbook)
        }


@router.get("/channel-performance")
async def get_channel_performance(
    current_user = Depends(get_current_user)
):
    """Get channel performance metrics"""
    
    from app.core.database import get_db
    
    async with get_db() as db:
        performance = await db.fetch(
            "SELECT * FROM channel_performance"
        )
        
        return {
            "success": True,
            "channels": [dict(p) for p in performance]
        }


@router.get("/response-heatmap")
async def get_response_heatmap(
    channel: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Get response heatmap (hour x weekday)
    Shows best times to send messages
    """
    
    from app.core.database import get_db
    
    async with get_db() as db:
        if channel:
            heatmap = await db.fetch(
                "SELECT * FROM response_heatmap WHERE channel = $1",
                channel
            )
        else:
            heatmap = await db.fetch(
                "SELECT * FROM response_heatmap"
            )
        
        return {
            "success": True,
            "heatmap": [dict(h) for h in heatmap]
        }


@router.post("/generate-message")
async def generate_followup_message(
    lead_id: str,
    playbook_id: str,
    current_user = Depends(get_current_user)
):
    """
    Generate follow-up message preview from playbook
    (Does not send, just returns rendered message)
    """
    
    message_data = await followup_service.generate_followup(
        lead_id=lead_id,
        playbook_id=playbook_id
    )
    
    # Get recommended channel
    channel = await followup_service.select_channel(lead_id)
    
    return {
        "success": True,
        "message": message_data['message'],
        "subject": message_data.get('subject'),
        "recommended_channel": channel
    }

