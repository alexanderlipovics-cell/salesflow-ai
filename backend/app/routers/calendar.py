"""
Calendar API Router
Handles device sync + manual CRUD for workspace calendar events.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth_helper import get_current_user_id
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class CalendarEventPayload(BaseModel):
    workspace_id: str = Field(..., description="Workspace identifier")
    contact_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    reminder_minutes: int = 15
    meeting_type: Optional[str] = None
    device_calendar_id: Optional[str] = None


class CalendarSyncEvent(BaseModel):
    device_calendar_id: str
    title: str
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    notes: Optional[str] = None
    meeting_type: Optional[str] = None
    all_day: bool = False


class CalendarSyncRequest(BaseModel):
    workspace_id: str
    events: List[CalendarSyncEvent]


def _iso(dt: datetime) -> str:
    return dt.astimezone().isoformat()


@router.get("/events")
async def list_events(
    workspace_id: str,
    days: int = 7,
    user_id: str = Depends(get_current_user_id),
):
    """
    Returns the upcoming events for the authenticated user.
    """
    if days <= 0:
        days = 7

    supabase = get_supabase_client()
    start = datetime.utcnow()
    end = start + timedelta(days=days)

    try:
        response = (
            supabase.table("calendar_events")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("user_id", user_id)
            .gte("start_time", start.isoformat())
            .lt("start_time", end.isoformat())
            .order("start_time", desc=False)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Kalender konnte nicht geladen werden: {exc}") from exc

    return {"events": response.data or []}


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: CalendarEventPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new calendar event.
    """
    supabase = get_supabase_client()
    record = {
        "workspace_id": payload.workspace_id,
        "contact_id": payload.contact_id,
        "user_id": user_id,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "start_time": _iso(payload.start_time),
        "end_time": _iso(payload.end_time),
        "all_day": payload.all_day,
        "reminder_minutes": payload.reminder_minutes,
        "meeting_type": payload.meeting_type,
        "device_calendar_id": payload.device_calendar_id,
    }

    try:
        response = supabase.table("calendar_events").insert(record).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Event konnte nicht erstellt werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=500, detail="Event konnte nicht gespeichert werden.")

    return response.data[0]


@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    payload: CalendarEventPayload,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update an existing event (only owner can update).
    """
    supabase = get_supabase_client()
    updates = {
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "start_time": _iso(payload.start_time),
        "end_time": _iso(payload.end_time),
        "all_day": payload.all_day,
        "reminder_minutes": payload.reminder_minutes,
        "meeting_type": payload.meeting_type,
        "contact_id": payload.contact_id,
    }

    try:
        response = (
            supabase.table("calendar_events")
            .update(updates)
            .eq("id", event_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Event konnte nicht aktualisiert werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Event nicht gefunden.")

    return response.data[0]


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete a calendar event.
    """
    supabase = get_supabase_client()
    try:
        response = (
            supabase.table("calendar_events")
            .delete()
            .eq("id", event_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Event konnte nicht gelöscht werden: {exc}") from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Event nicht gefunden.")

    return None


@router.post("/sync")
async def sync_calendar(
    payload: CalendarSyncRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Upsert events coming from the device calendar.
    """
    if not payload.events:
        return {"synced": 0}

    supabase = get_supabase_client()
    rows = [
        {
            "workspace_id": payload.workspace_id,
            "user_id": user_id,
            "title": event.title,
            "description": event.notes,
            "location": event.location,
            "start_time": _iso(event.start_time),
            "end_time": _iso(event.end_time),
            "meeting_type": event.meeting_type,
            "all_day": event.all_day,
            "device_calendar_id": event.device_calendar_id,
        }
        for event in payload.events
    ]

    try:
        supabase.table("calendar_events").upsert(
            rows,
            on_conflict="user_id,device_calendar_id",
        ).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Kalender-Sync fehlgeschlagen: {exc}") from exc

    return {"synced": len(rows)}


