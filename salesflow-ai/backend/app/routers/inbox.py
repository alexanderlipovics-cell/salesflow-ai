"""
Approval Inbox API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from ..core.deps import get_supabase, get_current_user
from ..services.inbox_service import InboxService

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class ApproveRequest(BaseModel):
    edited_message: Optional[str] = None


@router.get("/pending")
async def get_pending_messages(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """Get pending messages for approval."""
    user_id = current_user.get("sub")
    service = InboxService(db, user_id)

    messages = await service.get_pending_messages(limit)
    stats = await service.get_stats()

    return {"messages": messages, "stats": stats}


@router.post("/generate-drafts")
async def generate_drafts(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """Generate drafts for all due tasks."""
    user_id = current_user.get("sub")
    service = InboxService(db, user_id)

    count = await service.generate_drafts_for_due_tasks()

    return {"generated": count}


@router.post("/{message_id}/approve")
async def approve_message(
    message_id: str,
    request: ApproveRequest = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """Approve and send a message."""
    user_id = current_user.get("sub")
    service = InboxService(db, user_id)

    edited = request.edited_message if request else None
    result = await service.approve_and_send(message_id, edited)

    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Message not found"))

    return result


@router.post("/{message_id}/skip")
async def skip_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """Skip a message."""
    user_id = current_user.get("sub")
    service = InboxService(db, user_id)

    return await service.skip_message(message_id)


@router.get("/stats")
async def get_inbox_stats(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase),
) -> Dict[str, Any]:
    """Get inbox statistics."""
    user_id = current_user.get("sub")
    service = InboxService(db, user_id)

    return await service.get_stats()

