from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.core.deps import get_supabase
from app.core.security import get_current_user_dict

router = APIRouter(prefix="/messages", tags=["messages"])
logger = logging.getLogger(__name__)

class MessageCreate(BaseModel):
    lead_id: str
    direction: str
    platform: str
    content: str
    message_type: Optional[str] = "general"
    generated_by: Optional[str] = "manual"
    template_used: Optional[str] = None
    metadata: Optional[dict] = {}

@router.post("")
async def create_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user_dict)
):
    """Speichert eine gesendete oder empfangene Nachricht."""
    try:
        db = await get_supabase()
        
        result = db.table("lead_messages").insert({
            "user_id": current_user.get("user_id") or current_user.get("id") or current_user.get("sub"),
            "lead_id": message.lead_id,
            "direction": message.direction,
            "platform": message.platform,
            "content": message.content,
            "message_type": message.message_type,
            "generated_by": message.generated_by,
            "template_used": message.template_used,
            "metadata": message.metadata,
        }).execute()
        
        if result.data:
            return {"success": True, "message": result.data[0]}
        raise HTTPException(status_code=500, detail="Failed to save message")
        
    except Exception as e:
        logger.exception(f"Message save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/lead/{lead_id}")
async def get_lead_messages(
    lead_id: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user_dict)
):
    """Holt alle Nachrichten für einen Lead."""
    try:
        db = await get_supabase()
        
        result = db.table("lead_messages").select("*").eq(
            "user_id", current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
        ).eq(
            "lead_id", lead_id
        ).order("created_at", desc=True).limit(limit).execute()
        
        return result.data if result.data else []
        
    except Exception as e:
        logger.exception(f"Get messages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

