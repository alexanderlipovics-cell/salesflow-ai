"""
Follow-up Engine API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.deps import get_supabase
from app.core.security import get_current_user_dict
from app.services.followup_engine import FollowUpEngine

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
    current_user: dict = Depends(get_current_user_dict),
    db = Depends(get_supabase)
):
    """Change a lead's state and reset their follow-up cycle"""
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    engine = FollowUpEngine(db)
    
    result = await engine.change_lead_state(
        user_id=user_id,
        lead_id=request.lead_id,
        new_state=request.new_state,
        vertical=request.vertical
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.post("/process-sent")
async def process_sent_followup(
    request: ProcessSentRequest,
    current_user: dict = Depends(get_current_user_dict),
    db = Depends(get_supabase)
):
    """Mark a follow-up as sent and schedule the next one"""
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    engine = FollowUpEngine(db)
    
    result = await engine.process_sent_followup(
        user_id=user_id,
        queue_id=request.queue_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result

@router.get("/queue")
async def get_pending_queue(
    limit: int = 50,
    current_user: dict = Depends(get_current_user_dict),
    db = Depends(get_supabase)
):
    """Get pending follow-ups from the queue"""
    user_id = current_user.get("sub") or current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    engine = FollowUpEngine(db)
    
    items = await engine.get_pending_queue(user_id=user_id, limit=limit)
    return {"items": items}

