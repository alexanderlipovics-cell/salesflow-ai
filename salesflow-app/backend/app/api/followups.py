"""
Sales Flow AI - Follow-ups API
CRUD für Follow-up Tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

from app.core.database import get_supabase
from app.core.auth import get_current_user, User

router = APIRouter()


# ===========================================
# ENUMS & MODELS
# ===========================================

class ActionType(str, Enum):
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    MESSAGE = "message"
    FOLLOW_UP = "follow_up"
    TASK = "task"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class FollowUpCreate(BaseModel):
    lead_id: Optional[str] = None
    lead_name: str = Field(..., min_length=1)
    action: ActionType = ActionType.FOLLOW_UP
    description: str = Field(..., min_length=1)
    due_date: str  # YYYY-MM-DD
    due_time: Optional[str] = None  # HH:MM
    priority: Priority = Priority.MEDIUM
    completed: bool = False


class FollowUpUpdate(BaseModel):
    action: Optional[ActionType] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    priority: Optional[Priority] = None
    completed: Optional[bool] = None


# ===========================================
# ENDPOINTS
# ===========================================

@router.get("")
async def get_followups(
    user_id: Optional[str] = Query(None),
    completed: Optional[bool] = None,
    priority: Optional[Priority] = None,
    due_date: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: Optional[User] = Depends(get_current_user)
):
    """
    Follow-ups abrufen.
    Sortiert nach Fälligkeit.
    """
    supabase = get_supabase()
    
    query = supabase.table("follow_up_tasks").select("*")
    
    # Filter by user
    if user:
        query = query.eq("user_id", user.id)
    elif user_id:
        query = query.eq("user_id", user_id)
    
    # Apply filters
    if completed is not None:
        query = query.eq("completed", completed)
    if priority:
        query = query.eq("priority", priority.value)
    if due_date:
        query = query.eq("due_date", due_date)
    
    query = query.order("due_date", desc=False)
    query = query.limit(limit)
    
    try:
        result = query.execute()
        return {"follow_ups": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_followup(
    followup: FollowUpCreate,
    user: Optional[User] = Depends(get_current_user)
):
    """Neues Follow-up erstellen."""
    supabase = get_supabase()
    
    data = followup.model_dump()
    if user:
        data["user_id"] = user.id
    
    try:
        result = supabase.table("follow_up_tasks").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{followup_id}")
async def update_followup(
    followup_id: str,
    followup: FollowUpUpdate,
    user: Optional[User] = Depends(get_current_user)
):
    """Follow-up aktualisieren."""
    supabase = get_supabase()
    
    data = {k: v for k, v in followup.model_dump().items() if v is not None}
    
    # Set completed_at when marking as done
    if data.get("completed") is True:
        data["completed_at"] = datetime.utcnow().isoformat()
    elif data.get("completed") is False:
        data["completed_at"] = None
    
    try:
        result = supabase.table("follow_up_tasks").update(data).eq("id", followup_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Follow-up nicht gefunden")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{followup_id}")
async def delete_followup(
    followup_id: str,
    user: Optional[User] = Depends(get_current_user)
):
    """Follow-up löschen."""
    supabase = get_supabase()
    
    try:
        supabase.table("follow_up_tasks").delete().eq("id", followup_id).execute()
        return {"success": True, "id": followup_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overdue")
async def get_overdue(
    user: Optional[User] = Depends(get_current_user)
):
    """Überfällige Follow-ups."""
    supabase = get_supabase()
    today = date.today().isoformat()
    
    query = supabase.table("follow_up_tasks").select("*")
    query = query.eq("completed", False)
    query = query.lt("due_date", today)
    
    if user:
        query = query.eq("user_id", user.id)
    
    try:
        result = query.execute()
        return {"overdue": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/today")
async def get_today(
    user: Optional[User] = Depends(get_current_user)
):
    """Heutige Follow-ups."""
    supabase = get_supabase()
    today = date.today().isoformat()
    
    query = supabase.table("follow_up_tasks").select("*")
    query = query.eq("completed", False)
    query = query.eq("due_date", today)
    
    if user:
        query = query.eq("user_id", user.id)
    
    try:
        result = query.execute()
        return {"today": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

