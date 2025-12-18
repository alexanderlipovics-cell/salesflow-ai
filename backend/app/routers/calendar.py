# file: app/routers/calendar.py
"""
Calendar API Router

Endpoints für Kalender-Events und Meetings.
"""

import logging
from fastapi import APIRouter, Depends
from app.core.security import get_current_active_user
from app.core.deps import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events")
async def get_calendar_events(
    current_user=Depends(get_current_active_user),
    db=Depends(get_supabase)
):
    """Alle Kalender-Events für den User"""
    try:
        user_id = current_user.get("sub") or current_user.get("id")
        
        if not user_id:
            logger.warning("No user_id found in current_user")
            return []
        
        # Erst ohne Join versuchen (falls Tabelle existiert aber Join fehlschlägt)
        try:
            result = db.from_("calendar_events") \
                .select("*, leads(id, name, company)") \
                .eq("user_id", user_id) \
                .order("start_time") \
                .execute()
            
            return result.data or []
        except Exception as join_error:
            logger.warning(f"Join with leads failed, trying without join: {join_error}")
            # Fallback: Ohne Join
            result = db.from_("calendar_events") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("start_time") \
                .execute()
            
            return result.data or []
            
    except Exception as e:
        logger.error(f"Calendar events error: {e}", exc_info=True)
        # Leere Liste zurückgeben statt 500
        return []


__all__ = ["router"]

