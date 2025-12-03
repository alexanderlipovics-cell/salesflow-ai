"""
Review Queue API Routes

Human-in-the-Loop Draft Review Endpoints.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException

from ...core.security import get_current_user
from ...services.reactivation.feedback_service import FeedbackService
from ..schemas.reactivation import (
    DraftResponse,
    ReviewDraftRequest,
    ReviewDraftResponse,
)

router = APIRouter(prefix="/review-queue", tags=["Review Queue"])
logger = logging.getLogger(__name__)


@router.get("/drafts", response_model=List[DraftResponse])
async def get_pending_drafts(
    status: str = "pending",
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Listet alle Drafts in der Review Queue.
    """
    from ...db.supabase import get_supabase
    
    supabase = get_supabase()
    
    response = await supabase.from_("reactivation_drafts")\
        .select("*, leads(name, company)")\
        .eq("user_id", current_user["id"])\
        .eq("status", status)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    
    return response.data or []


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Holt einen spezifischen Draft mit Details.
    """
    from ...db.supabase import get_supabase
    
    supabase = get_supabase()
    
    response = await supabase.from_("reactivation_drafts")\
        .select("*, leads(name, company, email, linkedin_url)")\
        .eq("id", draft_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Draft nicht gefunden")
    
    return response.data


@router.post("/drafts/{draft_id}/review", response_model=ReviewDraftResponse)
async def review_draft(
    draft_id: str,
    request: ReviewDraftRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reviewed einen Draft (approve, reject, edit).
    """
    from ...db.supabase import get_supabase
    
    supabase = get_supabase()
    feedback_service = FeedbackService(supabase)
    
    # Validierung
    draft = await supabase.from_("reactivation_drafts")\
        .select("*")\
        .eq("id", draft_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()
    
    if not draft.data:
        raise HTTPException(status_code=404, detail="Draft nicht gefunden")
    
    if draft.data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Draft bereits bearbeitet")
    
    # Feedback verarbeiten
    await feedback_service.process_feedback(
        draft_id=draft_id,
        action=request.action,
        edited_message=request.edited_message,
        user_notes=request.notes
    )
    
    # Bei Approve/Edit: Nachricht senden (optional)
    if request.action in ["approved", "edited"] and request.send_now:
        await _send_message(
            draft=draft.data,
            message=request.edited_message or draft.data["draft_message"]
        )
    
    return ReviewDraftResponse(
        success=True,
        message=f"Draft {request.action}",
        draft_id=draft_id
    )


@router.get("/stats")
async def get_queue_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Holt Statistiken zur Review Queue.
    """
    from ...db.supabase import get_supabase
    
    supabase = get_supabase()
    
    # Counts nach Status
    pending = await supabase.from_("reactivation_drafts")\
        .select("count", count="exact")\
        .eq("user_id", current_user["id"])\
        .eq("status", "pending")\
        .execute()
    
    approved = await supabase.from_("reactivation_drafts")\
        .select("count", count="exact")\
        .eq("user_id", current_user["id"])\
        .eq("status", "approved")\
        .execute()
    
    rejected = await supabase.from_("reactivation_drafts")\
        .select("count", count="exact")\
        .eq("user_id", current_user["id"])\
        .eq("status", "rejected")\
        .execute()
    
    return {
        "pending": pending.count or 0,
        "approved": approved.count or 0,
        "rejected": rejected.count or 0,
        "edit_rate": 0  # TODO: Berechnen
    }


async def _send_message(draft: dict, message: str) -> None:
    """
    Sendet die Nachricht über den entsprechenden Kanal.
    """
    channel = draft.get("suggested_channel", "linkedin")
    lead_context = draft.get("lead_context", {})
    
    if channel == "linkedin":
        # TODO: LinkedIn Integration
        logger.info(f"Would send LinkedIn message to {lead_context.get('linkedin_url')}")
    elif channel == "email":
        # TODO: Email Integration
        logger.info(f"Would send email to {lead_context.get('email')}")

