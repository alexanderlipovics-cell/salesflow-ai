"""
Dashboard Router - Daily briefing and dashboard data
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from ..core.security import get_current_active_user
from ..db.session import get_db
from ..services.daily_briefing import DailyBriefingService

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(get_current_active_user)]
)

logger = logging.getLogger(__name__)

class MarkContactedRequest(BaseModel):
    notes: Optional[str] = None

@router.get("/today")
async def get_today_briefing(
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Get today's most important tasks for the user.
    Returns up to 5 leads to contact today with priorities.
    """
    try:
        # Get user ID
        user_id = getattr(current_user, 'id', None) or current_user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Get daily briefing
        service = DailyBriefingService(db)
        briefing = await service.get_daily_briefing(user_id)

        return {
            "leads": [
                {
                    "id": lead.id,
                    "name": lead.name,
                    "company": lead.company,
                    "phone": lead.phone,
                    "email": lead.email,
                    "status": lead.status,
                    "score": lead.score,
                    "last_contact": lead.last_contact,
                    "next_follow_up": lead.next_follow_up,
                    "reason": lead.reason,
                    "reason_text": lead.reason_text,
                    "priority": lead.priority
                }
                for lead in briefing.leads
            ],
            "stats": {
                "overdue": briefing.stats.overdue,
                "today": briefing.stats.today,
                "hot": briefing.stats.hot,
                "total": briefing.stats.total
            },
            "last_updated": briefing.last_updated
        }

    except Exception as e:
        logger.exception(f"Error getting today briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/leads/{lead_id}/mark-contacted")
async def mark_lead_contacted(
    lead_id: str,
    request: MarkContactedRequest,
    current_user = Depends(get_current_active_user),
    db = Depends(get_db)
):
    """
    Mark a lead as contacted today and schedule next follow-up in 3 days.
    """
    try:
        # Get user ID
        user_id = getattr(current_user, 'id', None) or current_user.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Mark lead as contacted
        service = DailyBriefingService(db)
        success = await service.mark_lead_contacted(user_id, lead_id, request.notes)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to mark lead as contacted")

        return {"success": True, "message": "Lead marked as contacted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error marking lead contacted: {e}")
        raise HTTPException(status_code=500, detail=str(e))
