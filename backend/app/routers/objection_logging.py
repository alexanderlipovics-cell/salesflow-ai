"""
Objection Logging API Router
Logs objection encounters and responses for analytics
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/objections", tags=["Objection Logging"])

# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────

class ObjectionLogRequest(BaseModel):
    """Request to log an objection encounter"""
    lead_id: UUID
    company_id: UUID
    objection_key: str  # e.g., "too_expensive", "no_time"
    funnel_stage: str  # e.g., "closing", "early_follow_up"
    language_code: str = "de-DE"
    disc_type: Optional[str] = None  # "D", "I", "S", "G"
    template_id: Optional[UUID] = None
    response_style: str = "logical"  # "logical", "emotional", "social_proof"
    outcome: str  # "won", "lost", "pending"
    notes: Optional[str] = None

class ObjectionLogResponse(BaseModel):
    """Response after logging objection"""
    ok: bool
    log_id: UUID

# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post("/log", response_model=ObjectionLogResponse)
async def log_objection(
    request: ObjectionLogRequest,
    supabase_client = Depends(get_supabase)
):
    """
    Log an objection encounter and response outcome.
    
    This will:
    - Insert into objection_logs table
    - Update analytics for objection success rates
    - Track by DISC type, stage, style for insights
    """
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # TODO: Implement full objection logging logic
        
        # Prepare log entry
        log_data = {
            "lead_id": str(request.lead_id),
            "company_id": str(request.company_id),
            "objection_key": request.objection_key,
            "funnel_stage": request.funnel_stage,
            "language_code": request.language_code,
            "disc_type": request.disc_type,
            "template_id": str(request.template_id) if request.template_id else None,
            "response_style": request.response_style,
            "outcome": request.outcome,
            "notes": request.notes,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Insert into objection_logs
        # result = supabase_client.table('objection_logs').insert(log_data).execute()
        
        # Update analytics (future: trigger analytics aggregation)
        
        # Mock response
        return ObjectionLogResponse(
            ok=True,
            log_id=UUID("00000000-0000-0000-0000-000000000001")
        )
    except Exception as e:
        logger.error(f"Error logging objection: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to log objection")

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

