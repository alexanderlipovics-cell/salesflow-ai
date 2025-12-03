"""
Neuro-Profiler API Router
DISC personality analysis for leads
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/neuro", tags=["Neuro-Profiler"])

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class NeuroProfileRequest(BaseModel):
    """Request to profile a lead"""
    lead_id: UUID
    sample_text: str  # Text from lead to analyze

class NeuroProfileResponse(BaseModel):
    """DISC profile result"""
    disc_primary: str  # "D", "I", "S", "G"
    disc_secondary: Optional[str] = None
    confidence: float  # 0.0 - 1.0
    rationale: str

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/profile", response_model=NeuroProfileResponse)
async def profile_lead(
    request: NeuroProfileRequest,
    supabase_client = Depends(get_supabase)
):
    """
    Analyze lead's DISC personality type from sample text.
    
    This will:
    1. Call LLM to classify DISC type
    2. Insert into disc_analyses table
    3. Update leads.disc_primary and disc_confidence
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # TODO: Implement DISC analysis logic
        
        # Step 1: Call LLM for DISC classification
        # disc_result = await analyze_disc_with_llm(request.sample_text)
        
        # Step 2: Insert analysis record
        # analysis_data = {
        #     "lead_id": str(request.lead_id),
        #     "disc_primary": disc_result.primary,
        #     "disc_secondary": disc_result.secondary,
        #     "confidence": disc_result.confidence,
        #     "sample_text": request.sample_text,
        #     "rationale": disc_result.rationale
        # }
        # supabase_client.table('disc_analyses').insert(analysis_data).execute()
        
        # Step 3: Update lead record
        # supabase_client.table('leads').update({
        #     "disc_primary": disc_result.primary,
        #     "disc_confidence": disc_result.confidence
        # }).eq("id", str(request.lead_id)).execute()
        
        # Mock response
        return NeuroProfileResponse(
            disc_primary="G",
            disc_secondary="S",
            confidence=0.86,
            rationale="Lead stellt viele Detailfragen, wirkt vorsichtig und systematisch."
        )
    except Exception as e:
        logger.error(f"Error profiling lead: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to profile lead")

# ─────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────

def get_supabase():
    """Dependency injection for Supabase client"""
    from config import config
    if not config.SUPABASE_URL or not config.SUPABASE_KEY:
        return None
    
    from supabase import create_client
    return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# TODO: Implement helper functions:
# - analyze_disc_with_llm(sample_text)
# - classify_disc_patterns(text)

