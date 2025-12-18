"""
Follow-up Engine API Routes
State Machine endpoints for lead state transitions and queue management
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.deps import get_current_user, get_supabase
from app.services.followup_engine import FollowUpEngine, STATE_TRANSITIONS

router = APIRouter(prefix="/api/engine", tags=["Follow-up Engine"])

class StateChangeRequest(BaseModel):
    lead_id: str
    new_state: str
    vertical: Optional[str] = "mlm"

class ProcessSentRequest(BaseModel):
    queue_id: str

@router.post("/change-state")
async def change_lead_state(
    request: StateChangeRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """
    Change a lead's state and reset their follow-up cycle.
    Valid states: new, engaged, opportunity, won, lost, churned, dormant
    """
    user_id = current_user.get("sub") or current_user.get("user_id") or current_user.get("team_member_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    # Create engine instance - State Machine methods only need db parameter
    # We pass None for repository, ai_router, tz_service since new methods use db directly
    engine = FollowUpEngine(repository=None, ai_router=None, tz_service=None)
    
    result = await engine.change_lead_state(
        user_id=user_id,
        lead_id=request.lead_id,
        new_state=request.new_state,
        db=db,
        vertical=request.vertical
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/process-sent")
async def process_sent_followup(
    request: ProcessSentRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Mark a follow-up as sent and schedule the next one in sequence"""
    user_id = current_user.get("sub") or current_user.get("user_id") or current_user.get("team_member_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    engine = FollowUpEngine(repository=None, ai_router=None, tz_service=None)
    
    result = await engine.process_sent_followup(
        user_id=user_id,
        queue_id=request.queue_id,
        db=db
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/queue")
async def get_pending_queue(
    days_ahead: int = 7,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_supabase)
):
    """Get pending follow-ups from the queue"""
    user_id = current_user.get("sub") or current_user.get("user_id") or current_user.get("team_member_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    engine = FollowUpEngine(repository=None, ai_router=None, tz_service=None)
    
    items = await engine.get_queue_items(
        user_id=user_id,
        db=db,
        days_ahead=days_ahead,
        limit=limit
    )
    
    return {"items": items, "count": len(items)}

@router.get("/cycles")
async def get_available_cycles(
    vertical: str = "mlm",
    db = Depends(get_supabase)
):
    """Get all available follow-up cycles for a vertical"""
    result = db.table("follow_up_cycles")\
        .select("*")\
        .eq("vertical", vertical)\
        .eq("is_active", True)\
        .order("state")\
        .order("sequence_order")\
        .execute()
    
    return {"cycles": result.data or []}

@router.get("/valid-transitions/{current_state}")
async def get_valid_transitions(current_state: str):
    """Get valid state transitions from current state"""
    transitions = STATE_TRANSITIONS.get(current_state.lower(), [])
    return {
        "current_state": current_state.lower(),
        "valid_transitions": transitions
    }

