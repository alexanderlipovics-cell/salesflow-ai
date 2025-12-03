"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LINKEDIN API ROUTES                                                       ║
║  API für LinkedIn Browser Extension                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import logging

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/linkedin", tags=["linkedin"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ActionResult(BaseModel):
    """Ergebnis einer LinkedIn-Aktion."""
    action_id: str
    success: bool
    error: Optional[str] = None
    details: Optional[Dict] = None


class ProfileData(BaseModel):
    """Gescrapte Profil-Daten."""
    name: Optional[str] = None
    headline: Optional[str] = None
    location: Optional[str] = None
    about: Optional[str] = None
    current_position: Optional[str] = None
    profile_url: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/pending-actions", response_model=dict)
async def get_pending_actions(
    limit: int = Query(10, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Holt ausstehende LinkedIn-Aktionen für die Extension.
    
    Die Extension pollt diesen Endpoint regelmäßig.
    """
    # Get pending LinkedIn actions from sequence_actions
    result = supabase.table("sequence_actions").select(
        "id, action_type, sent_subject, sent_content, platform_response, "
        "enrollment_id, sequence_enrollments!inner(contact_linkedin_url, contact_name, variables)"
    ).in_("action_type", [
        "linkedin_connect", "linkedin_dm", "linkedin_inmail"
    ]).eq("status", "pending").eq(
        "sequence_enrollments.user_id", str(current_user.id)
    ).limit(limit).execute()
    
    if not result.data:
        return {"actions": []}
    
    # Format for extension
    actions = []
    for action in result.data:
        enrollment = action.get("sequence_enrollments", {})
        actions.append({
            "id": action["id"],
            "action_type": action["action_type"],
            "linkedin_url": enrollment.get("contact_linkedin_url"),
            "contact_name": enrollment.get("contact_name"),
            "sent_subject": action.get("sent_subject"),
            "sent_content": action.get("sent_content"),
            "platform_response": action.get("platform_response", {}),
            "variables": enrollment.get("variables", {}),
        })
    
    return {"actions": actions}


@router.post("/action-result", response_model=dict)
async def report_action_result(
    data: ActionResult,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Meldet das Ergebnis einer LinkedIn-Aktion zurück.
    
    Die Extension ruft das nach jeder Aktion auf.
    """
    # Update action status
    now = datetime.utcnow().isoformat()
    
    if data.success:
        update_data = {
            "status": "sent",
            "sent_at": now,
            "platform_response": data.details or {},
            "updated_at": now,
        }
        
        # Check for special cases
        if data.details:
            if data.details.get("already_connected"):
                update_data["status"] = "delivered"
                update_data["delivered_at"] = now
            elif data.details.get("already_pending"):
                update_data["status"] = "sent"
    else:
        update_data = {
            "status": "failed",
            "failed_at": now,
            "error_message": data.error,
            "updated_at": now,
        }
    
    result = supabase.table("sequence_actions").update(update_data).eq(
        "id", data.action_id
    ).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Action not found")
    
    # If successful, advance enrollment to next step
    if data.success:
        action = result.data[0]
        enrollment_id = action.get("enrollment_id")
        
        # This would be better handled by a trigger or the scheduler
        # For now, just log it
        logger.info(f"LinkedIn action {data.action_id} completed, enrollment {enrollment_id}")
    
    return {"success": True}


@router.post("/profile", response_model=dict)
async def save_scraped_profile(
    data: ProfileData,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Speichert ein von der Extension gescraptes LinkedIn-Profil.
    
    Kann als Lead gespeichert oder zu einer Sequence hinzugefügt werden.
    """
    # Check if lead with this LinkedIn URL already exists
    existing = supabase.table("leads").select("id").eq(
        "user_id", str(current_user.id)
    ).eq("linkedin_url", data.profile_url).execute()
    
    if existing.data:
        # Update existing
        lead_id = existing.data[0]["id"]
        supabase.table("leads").update({
            "name": data.name,
            "title": data.headline,
            "location": data.location,
            "notes": data.about,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", lead_id).execute()
        
        return {"success": True, "lead_id": lead_id, "updated": True}
    
    # Create new lead
    result = supabase.table("leads").insert({
        "user_id": str(current_user.id),
        "name": data.name,
        "title": data.headline,
        "location": data.location,
        "linkedin_url": data.profile_url,
        "notes": data.about,
        "source": "linkedin_extension",
        "status": "new",
        "temperature": "cold",
    }).execute()
    
    if result.data:
        return {"success": True, "lead_id": result.data[0]["id"], "created": True}
    
    raise HTTPException(status_code=500, detail="Failed to save profile")


@router.get("/stats", response_model=dict)
async def get_linkedin_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Holt LinkedIn-Statistiken für den User.
    """
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Count by status
    total = supabase.table("sequence_actions").select(
        "id", count="exact"
    ).in_("action_type", [
        "linkedin_connect", "linkedin_dm", "linkedin_inmail"
    ]).eq("sequence_enrollments.user_id", str(current_user.id)).gte(
        "created_at", since
    ).execute()
    
    sent = supabase.table("sequence_actions").select(
        "id", count="exact"
    ).in_("action_type", [
        "linkedin_connect", "linkedin_dm", "linkedin_inmail"
    ]).in_("status", ["sent", "delivered", "opened", "replied"]).gte(
        "created_at", since
    ).execute()
    
    failed = supabase.table("sequence_actions").select(
        "id", count="exact"
    ).in_("action_type", [
        "linkedin_connect", "linkedin_dm", "linkedin_inmail"
    ]).eq("status", "failed").gte(
        "created_at", since
    ).execute()
    
    return {
        "period_days": days,
        "total": total.count or 0,
        "sent": sent.count or 0,
        "failed": failed.count or 0,
        "success_rate": round((sent.count or 0) / max(total.count or 1, 1) * 100, 1),
    }


@router.get("/daily-limits", response_model=dict)
async def get_daily_limits(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Holt aktuelle LinkedIn-Limits für heute.
    
    Wichtig um Account-Sperren zu vermeiden!
    """
    today = datetime.utcnow().date().isoformat()
    
    # Count today's actions
    connections_today = supabase.table("sequence_actions").select(
        "id", count="exact"
    ).eq("action_type", "linkedin_connect").in_(
        "status", ["sent", "delivered"]
    ).gte("sent_at", today + "T00:00:00").execute()
    
    messages_today = supabase.table("sequence_actions").select(
        "id", count="exact"
    ).in_("action_type", ["linkedin_dm", "linkedin_inmail"]).in_(
        "status", ["sent", "delivered"]
    ).gte("sent_at", today + "T00:00:00").execute()
    
    # Default safe limits
    connection_limit = 20  # LinkedIn's unofficial daily limit
    message_limit = 50
    
    return {
        "connections": {
            "sent_today": connections_today.count or 0,
            "limit": connection_limit,
            "remaining": max(0, connection_limit - (connections_today.count or 0)),
        },
        "messages": {
            "sent_today": messages_today.count or 0,
            "limit": message_limit,
            "remaining": max(0, message_limit - (messages_today.count or 0)),
        },
        "warning": (connections_today.count or 0) >= connection_limit * 0.8,
    }

