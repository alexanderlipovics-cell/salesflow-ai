"""
SALES FLOW AI - Speed Hunter API
Gamified lead contact system with points and streaks
"""
from typing import Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.core.auth_helper import get_current_user_id
from supabase import Client

router = APIRouter(prefix="/api/speed-hunter", tags=["speed-hunter"])

# ============================================================================
# MODELS
# ============================================================================

class StartSessionRequest(BaseModel):
    company_id: str
    daily_goal: int = 20
    mode: str = "points"  # 'points' | 'contacts'

class LeadContext(BaseModel):
    lead_id: str
    name: Optional[str] = None
    stage: Optional[str] = None
    last_contact_at: Optional[str] = None
    disc_primary: Optional[str] = None
    company_id: Optional[str] = None
    language_code: Optional[str] = None

class StartSessionResponse(BaseModel):
    session_id: str
    daily_goal: int
    mode: str
    streak_day: Optional[int] = None
    next_lead: Optional[LeadContext] = None

class SpeedHunterActionRequest(BaseModel):
    session_id: str
    lead_id: str
    action_type: str  # 'call','message','snooze','done'
    outcome: Optional[str] = None  # 'no_answer','interested','follow_up_scheduled',...
    points: int = 0
    template_id: Optional[str] = None
    translation_id: Optional[str] = None
    channel: Optional[str] = None

class SpeedHunterActionResponse(BaseModel):
    ok: bool
    new_totals: dict
    next_lead: Optional[LeadContext] = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _get_next_lead_for_user(
    user_id: str, 
    company_id: str,
    supabase: Client
) -> Optional[LeadContext]:
    """
    Get next lead for user based on portfolio logic.
    
    TODO: Implement full portfolio logic:
    - leads + portfolio_scans + next_contact_due_at + scoring
    """
    try:
        resp = (
            supabase.table("leads")
            .select("id,name,stage,last_contact_at,disc_primary,company_id,language_code")
            .eq("owner_user_id", user_id)
            .eq("company_id", company_id)
            .order("last_contact_at", desc=True)
            .limit(1)
            .execute()
        )
        
        data = resp.data or []
        if not data:
            return None
        
        row = data[0]
        return LeadContext(
            lead_id=row["id"],
            name=row.get("name"),
            stage=row.get("stage"),
            last_contact_at=row.get("last_contact_at"),
            disc_primary=row.get("disc_primary"),
            company_id=row.get("company_id"),
            language_code=row.get("language_code"),
        )
    except Exception as e:
        # Table might not exist yet - return None
        return None

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/session", response_model=StartSessionResponse)
async def start_speed_hunter_session(
    payload: StartSessionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Start a new Speed Hunter session"""
    supabase = get_supabase_client()
    
    session_id = str(uuid4())
    
    try:
        # Create session
        supabase.table("speed_hunter_sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "company_id": payload.company_id,
            "daily_goal": payload.daily_goal,
            "mode": payload.mode,
        }).execute()
    except Exception as e:
        # Table might not exist - that's OK for skeleton
        pass
    
    # Get next lead
    next_lead = await _get_next_lead_for_user(user_id, payload.company_id, supabase)
    
    # TODO: Calculate streak_day (separate job/view)
    return StartSessionResponse(
        session_id=session_id,
        daily_goal=payload.daily_goal,
        mode=payload.mode,
        streak_day=None,
        next_lead=next_lead,
    )

@router.get("/session/{session_id}/next-lead", response_model=LeadContext)
async def get_next_lead(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get next lead for a session"""
    supabase = get_supabase_client()
    
    # Validate session
    try:
        resp = (
            supabase.table("speed_hunter_sessions")
            .select("id,user_id,company_id")
            .eq("id", session_id)
            .limit(1)
            .execute()
        )
        
        data = resp.data or []
        if not data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if data[0]["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not your session")
        
        company_id = data[0].get("company_id")
        
        # Get default company if not in session
        if not company_id:
            try:
                prof = (
                    supabase.table("user_profiles")
                    .select("default_company_id")
                    .eq("id", user_id)
                    .single()
                    .execute()
                )
                company_id = prof.data.get("default_company_id") if prof.data else None
            except:
                pass
        
        if not company_id:
            raise HTTPException(status_code=400, detail="No company_id found")
        
        next_lead = await _get_next_lead_for_user(user_id, company_id, supabase)
        if not next_lead:
            raise HTTPException(status_code=404, detail="No more leads available")
        
        return next_lead
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting next lead: {str(e)}")

@router.post("/action", response_model=SpeedHunterActionResponse)
async def log_speed_hunter_action(
    payload: SpeedHunterActionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Log a Speed Hunter action (call, message, etc.)"""
    supabase = get_supabase_client()
    
    try:
        # Log action
        supabase.table("speed_hunter_actions").insert({
            "session_id": payload.session_id,
            "user_id": user_id,
            "lead_id": payload.lead_id,
            "action_type": payload.action_type,
            "outcome": payload.outcome,
            "points": payload.points,
        }).execute()
    except Exception as e:
        # Table might not exist - that's OK for skeleton
        pass
    
    # Refresh session totals via RPC function
    try:
        agg_resp = supabase.rpc(
            "refresh_speed_hunter_totals",
            {"p_session_id": payload.session_id},
        ).execute()
        
        agg_data = (agg_resp.data or [None])[0] if agg_resp.data else None
        
        new_totals = {
            "total_contacts": agg_data["total_contacts"] if agg_data else 0,
            "total_points": agg_data["total_points"] if agg_data else 0,
        }
    except Exception as e:
        # RPC function might not exist yet - fallback to dummy
        new_totals = {
            "total_contacts": 0,
            "total_points": 0,
        }
    
    # Get next lead
    next_lead = None
    try:
        # Get company_id from session
        resp = (
            supabase.table("speed_hunter_sessions")
            .select("company_id")
            .eq("id", payload.session_id)
            .single()
            .execute()
        )
        company_id = resp.data.get("company_id") if resp.data else None
        
        if company_id:
            next_lead = await _get_next_lead_for_user(user_id, company_id, supabase)
    except:
        pass
    
    return SpeedHunterActionResponse(
        ok=True,
        new_totals=new_totals,
        next_lead=next_lead,
    )
