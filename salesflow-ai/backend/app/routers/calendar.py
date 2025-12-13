# file: app/routers/calendar.py
"""
Calendar API Router

Endpoints für Kalender-Events und Meetings.
"""

from datetime import datetime
from fastapi import APIRouter, Depends
from app.core.security import get_current_active_user
from app.core.deps import get_supabase

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events")
async def get_calendar_events(
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase)
):
    """Alle Kalender-Events für den User"""
    user_id = current_user.get("sub") or current_user.get("id")
    
    result = db.from_("calendar_events") \
        .select("*, leads(id, name, company)") \
        .eq("user_id", user_id) \
        .order("start_time") \
        .execute()
    
    return result.data or []


__all__ = ["router"]

