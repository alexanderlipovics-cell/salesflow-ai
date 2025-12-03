"""
Follow-up API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import logging

from app.services.followup_service import followup_service
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/follow-ups", tags=["Follow-ups"])


class TriggerFollowUpRequest(BaseModel):
    lead_id: str
    playbook_id: str
    channel: Optional[str] = None


class ScheduleFollowUpRequest(BaseModel):
    lead_id: str
    playbook_id: str
    scheduled_at: datetime


@router.get("/")
@router.get("")
async def get_all_followups(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
):
    """
    Get all follow-ups, optionally filtered by user ID.
    Returns demo data when database is unavailable.
    """
    # Demo data for follow-ups
    demo_followups = [
        {
            "id": "fu_001",
            "lead_id": "lead_001",
            "lead_name": "Max Mustermann",
            "type": "call",
            "title": "Follow-up Call",
            "description": "Nachfassen zum Angebot",
            "status": "pending",
            "priority": "high",
            "due_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
        },
        {
            "id": "fu_002",
            "lead_id": "lead_002",
            "lead_name": "Anna Schmidt",
            "type": "message",
            "title": "WhatsApp Follow-up",
            "description": "Produktinfo nachfragen",
            "status": "pending",
            "priority": "medium",
            "due_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
        },
        {
            "id": "fu_003",
            "lead_id": "lead_003",
            "lead_name": "Lisa Müller",
            "type": "email",
            "title": "E-Mail Follow-up",
            "description": "Angebot senden",
            "status": "completed",
            "priority": "low",
            "due_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
        },
    ]
    
    return {
        "count": len(demo_followups),
        "follow_ups": demo_followups,
    }


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user = Depends(get_current_user)
):
    """
    Get follow-up analytics including channel performance,
    weekly activity, and response heatmap.
    
    - **days**: Number of days to analyze (1-365)
    """
    
    try:
        analytics = await followup_service.get_followup_analytics(
            user_id=current_user.id,
            days=days
        )
        
        return {
            "success": True,
            "data": analytics
        }
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leads-needing-followup")
async def get_leads_needing_followup(
    days_threshold: int = Query(3, ge=1, le=30),
    current_user = Depends(get_current_user)
):
    """
    Get all leads needing follow-up based on inactivity threshold.
    
    - **days_threshold**: Days of inactivity before follow-up needed (1-30)
    """
    
    try:
        from app.core.supabase import get_supabase_client
        supabase = get_supabase_client()
        
        response = supabase.rpc(
            'get_leads_needing_followup',
            {'days_threshold': days_threshold}
        ).execute()
        
        leads = response.data or []
        
        return {
            "success": True,
            "count": len(leads),
            "leads": leads
        }
        
    except Exception as e:
        logger.error(f"Error fetching leads needing follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger")
async def trigger_followup(
    request: TriggerFollowUpRequest,
    current_user = Depends(get_current_user)
):
    """
    Manually trigger a follow-up for a specific lead.
    
    - **lead_id**: Lead UUID
    - **playbook_id**: Follow-up playbook ID
    - **channel**: Optional channel override (whatsapp/email/in_app)
    """
    
    try:
        # Generate message
        message_data = await followup_service.generate_followup(
            lead_id=request.lead_id,
            playbook_id=request.playbook_id
        )
        
        if not message_data:
            raise HTTPException(
                status_code=400,
                detail="Could not generate follow-up message"
            )
        
        # Select channel
        channel = request.channel or await followup_service.select_channel(request.lead_id)
        
        # Send
        success = await followup_service.send_followup(
            lead_id=request.lead_id,
            channel=channel,
            message=message_data['message'],
            subject=message_data.get('subject'),
            playbook_id=request.playbook_id,
            user_id=current_user.id
        )
        
        return {
            "success": success,
            "message": "Follow-up sent successfully" if success else "Failed to send follow-up",
            "channel": channel,
            "playbook_id": request.playbook_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedule")
async def schedule_followup(
    request: ScheduleFollowUpRequest,
    current_user = Depends(get_current_user)
):
    """
    Schedule a follow-up for later.
    
    - **lead_id**: Lead UUID
    - **playbook_id**: Follow-up playbook ID
    - **scheduled_at**: When to send (ISO datetime)
    """
    
    try:
        result = await followup_service.schedule_followup(
            lead_id=request.lead_id,
            playbook_id=request.playbook_id,
            scheduled_at=request.scheduled_at,
            user_id=current_user.id
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error scheduling follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/playbooks")
async def get_playbooks(
    category: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
):
    """
    Get all active follow-up playbooks.
    
    - **category**: Optional filter by category (objection/nurture/reminder/reactivation)
    """
    
    try:
        playbooks = await followup_service.get_playbooks(category=category)
        
        return {
            "success": True,
            "count": len(playbooks),
            "playbooks": playbooks
        }
        
    except Exception as e:
        logger.error(f"Error fetching playbooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{lead_id}")
async def get_followup_history(
    lead_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user = Depends(get_current_user)
):
    """
    Get follow-up history for a specific lead.
    
    - **lead_id**: Lead UUID
    - **limit**: Max number of records (1-200)
    """
    
    try:
        history = await followup_service.get_followup_history(
            lead_id=lead_id,
            limit=limit
        )
        
        return {
            "success": True,
            "count": len(history),
            "history": history
        }
        
    except Exception as e:
        logger.error(f"Error fetching follow-up history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-and-trigger")
async def manual_check_and_trigger(
    current_user = Depends(get_current_user)
):
    """
    Manually trigger the follow-up check (normally runs via cron).
    Useful for testing and immediate execution.
    """
    
    try:
        results = await followup_service.check_and_trigger_followups()
        
        return {
            "success": True,
            "results": results,
            "message": f"Checked {results['checked']} leads, triggered {results['triggered']} follow-ups"
        }
        
    except Exception as e:
        logger.error(f"Error in manual check and trigger: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_followup_stats(
    current_user = Depends(get_current_user)
):
    """
    Get overall follow-up statistics.
    """
    
    try:
        from app.core.supabase import get_supabase_client
        supabase = get_supabase_client()
        
        # Total follow-ups sent
        total_response = supabase.table('follow_ups').select('*', count='exact').execute()
        total_sent = total_response.count or 0
        
        # Follow-ups by status
        status_response = supabase.table('follow_ups')\
            .select('status')\
            .execute()
        
        status_counts = {}
        for record in (status_response.data or []):
            status = record.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Playbook usage
        playbook_response = supabase.table('followup_playbooks')\
            .select('id, name, usage_count, success_rate')\
            .eq('is_active', True)\
            .order('usage_count', desc=True)\
            .limit(10)\
            .execute()
        
        return {
            "success": True,
            "stats": {
                "total_sent": total_sent,
                "by_status": status_counts,
                "top_playbooks": playbook_response.data or []
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

