"""
SALES FLOW AI - Neuro Profiler API
AI-powered DISG personality profiling from text samples
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.core.auth_helper import get_current_user_id
from app.core.llm import call_chief_llm

router = APIRouter(prefix="/api/neuro", tags=["neuro-profiler"])

# ============================================================================
# MODELS
# ============================================================================

class NeuroProfileRequest(BaseModel):
    lead_id: str
    sample_text: str

class NeuroProfileResponse(BaseModel):
    disc_primary: str
    disc_secondary: str | None = None
    confidence: float
    rationale: str | None = None

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/profile", response_model=NeuroProfileResponse)
async def neuro_profile(
    payload: NeuroProfileRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Profile lead's DISG personality from text sample"""
    supabase = get_supabase_client()
    
    # Call CHIEF LLM for DISG profiling
    result = await call_chief_llm({
        "mode": "disc_profile",
        "sample_text": payload.sample_text,
    })
    
    disc_primary = result.get("disc_primary", "D")
    disc_secondary = result.get("disc_secondary")
    confidence = float(result.get("confidence", 0.7))
    rationale = result.get("rationale", "")
    
    # Save to disc_analyses table
    try:
        supabase.table("disc_analyses").insert({
            "lead_id": payload.lead_id,
            "user_id": user_id,
            "source": "ai_chat",
            "disc_primary": disc_primary,
            "disc_secondary": disc_secondary,
            "confidence": confidence,
            "rationale": rationale,
        }).execute()
    except Exception:
        # Table might not exist - that's OK
        pass
    
    # Update lead with DISG profile
    try:
        supabase.table("leads").update({
            "disc_primary": disc_primary,
            "disc_secondary": disc_secondary,
            "disc_confidence": confidence,
            "disc_last_source": "ai_chat",
        }).eq("id", payload.lead_id).execute()
    except Exception:
        # Table might not exist - that's OK
        pass
    
    return NeuroProfileResponse(
        disc_primary=disc_primary,
        disc_secondary=disc_secondary,
        confidence=confidence,
        rationale=rationale,
    )

