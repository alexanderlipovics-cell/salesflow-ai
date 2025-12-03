"""
Sequences Router
API endpoints for Multi-Touch Sales Campaign management
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from supabase import create_client
from services.sequence_engine import sequence_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sequences", tags=["Sequences"])

# Initialize Supabase client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class StepCreate(BaseModel):
    """Model for creating a sequence step"""
    step_order: int = Field(..., ge=1, description="Order of this step (1, 2, 3...)")
    step_name: str = Field(..., min_length=3, description="Human-readable step name")
    type: str = Field(..., description="Step type: email, linkedin, call, sms, whatsapp, task, wait")
    delay_hours: int = Field(24, ge=0, description="Hours to wait after previous step")
    template_id: Optional[str] = Field(None, description="UUID of message template (optional)")
    task_note: Optional[str] = Field(None, description="Task description if type=task")

class SequenceCreate(BaseModel):
    """Model for creating a new sequence"""
    name: str = Field(..., min_length=3, description="Sequence name")
    description: Optional[str] = Field(None, description="What this sequence does")
    trigger_type: str = Field("manual", description="How leads enter: manual, auto_stage, auto_score, auto_tag")
    steps: List[StepCreate] = Field(..., min_items=1, description="List of steps in order")

class EnrollRequest(BaseModel):
    """Model for enrolling a lead into a sequence"""
    lead_id: str = Field(..., description="UUID of the lead to enroll")
    sequence_id: str = Field(..., description="UUID of the sequence")
    start_immediately: bool = Field(True, description="Start immediately or wait for delay")

class InteractionRequest(BaseModel):
    """Model for handling lead interactions"""
    lead_id: str = Field(..., description="UUID of the lead")
    interaction_type: str = Field(..., description="Type: reply, meeting_booked, opt_out, bounced")

class SequenceResponse(BaseModel):
    """Response model for sequence"""
    id: str
    name: str
    description: Optional[str]
    trigger_type: str
    is_active: bool
    total_enrollments: int
    active_enrollments: int
    completed_enrollments: int

class EnrollmentResponse(BaseModel):
    """Response model for enrollment"""
    id: str
    lead_id: str
    sequence_id: str
    status: str
    current_step_order: int
    next_step_at: Optional[str]
    enrolled_at: str

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/", response_model=Dict[str, Any])
async def create_sequence(payload: SequenceCreate):
    """
    Create a new sequence with steps
    
    - **name**: Sequence name (e.g., "7-Day Cold Lead Nurture")
    - **trigger_type**: How leads enter (manual, auto_stage, auto_score, auto_tag)
    - **steps**: Array of steps in execution order
    
    Returns the created sequence with all steps
    """
    try:
        logger.info(f"📝 Creating sequence: {payload.name}")
        
        # Create sequence
        sequence_data = {
            'name': payload.name,
            'description': payload.description,
            'trigger_type': payload.trigger_type,
            'is_active': True
        }
        
        result = supabase.table('sequences').insert(sequence_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create sequence")
        
        sequence_id = result.data[0]['id']
        logger.info(f"✅ Sequence created: {sequence_id}")
        
        # Create steps
        created_steps = []
        for step in payload.steps:
            step_data = {
                'sequence_id': sequence_id,
                'step_order': step.step_order,
                'step_name': step.step_name,
                'type': step.type,
                'delay_hours': step.delay_hours,
                'template_id': step.template_id,
                'task_note': step.task_note
            }
            
            step_result = supabase.table('sequence_steps').insert(step_data).execute()
            created_steps.append(step_result.data[0])
        
        logger.info(f"✅ Created {len(created_steps)} steps")
        
        return {
            "status": "created",
            "sequence": result.data[0],
            "steps": created_steps
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create sequence: {str(e)}")


@router.post("/enroll", response_model=Dict[str, Any])
async def enroll_lead(payload: EnrollRequest):
    """
    Enroll a lead into a sequence
    
    - **lead_id**: UUID of the lead to enroll
    - **sequence_id**: UUID of the sequence
    - **start_immediately**: If true, first step delay starts now
    
    Returns enrollment details with next_step_at timestamp
    """
    try:
        result = await sequence_engine.enroll_lead(
            lead_id=payload.lead_id,
            sequence_id=payload.sequence_id,
            start_immediately=payload.start_immediately
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error enrolling lead: {e}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")


@router.post("/run-scheduler", response_model=Dict[str, Any])
async def run_scheduler(background_tasks: BackgroundTasks):
    """
    Manually trigger the scheduler to process due steps
    
    In production, this should be called by a cron job every 15-30 minutes.
    For testing/MVP, you can trigger it manually via this endpoint.
    
    Returns a summary of processed steps.
    """
    try:
        logger.info("🚀 Scheduler triggered manually")
        
        # Run scheduler in background
        background_tasks.add_task(sequence_engine.process_due_steps)
        
        return {
            "status": "scheduler_started",
            "message": "Scheduler is processing due steps in background"
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting scheduler: {e}")
        raise HTTPException(status_code=500, detail=f"Scheduler failed: {str(e)}")


@router.post("/interaction", response_model=Dict[str, Any])
async def handle_interaction(payload: InteractionRequest):
    """
    Handle lead interaction (auto-optimization)
    
    When a lead replies, books a meeting, or opts out, call this endpoint
    to automatically pause/complete their active sequences.
    
    - **lead_id**: UUID of the lead
    - **interaction_type**: reply, meeting_booked, opt_out, bounced
    
    Returns updated enrollment count
    """
    try:
        result = await sequence_engine.handle_interaction(
            lead_id=payload.lead_id,
            interaction_type=payload.interaction_type
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error handling interaction: {e}")
        raise HTTPException(status_code=500, detail=f"Interaction handling failed: {str(e)}")


@router.get("/{sequence_id}/analytics", response_model=Dict[str, Any])
async def get_sequence_analytics(sequence_id: str):
    """
    Get detailed analytics for a sequence
    
    - **sequence_id**: UUID of the sequence
    
    Returns:
    - Overview stats (total enrollments, success rate)
    - Per-step stats (sent, opened, replied, open rate, reply rate)
    """
    try:
        result = await sequence_engine.get_sequence_analytics(sequence_id)
        return result
        
    except Exception as e:
        logger.error(f"❌ Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")


@router.get("/", response_model=List[SequenceResponse])
async def list_sequences(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    List all sequences with basic stats
    
    - **is_active**: Filter by active status (optional)
    - **limit**: Maximum results (default: 50)
    """
    try:
        query = supabase.table('sequences').select('*')
        
        if is_active is not None:
            query = query.eq('is_active', is_active)
        
        result = query.order('created_at', desc=True).limit(limit).execute()
        
        return result.data
        
    except Exception as e:
        logger.error(f"❌ Error listing sequences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list sequences: {str(e)}")


@router.get("/{sequence_id}", response_model=Dict[str, Any])
async def get_sequence(sequence_id: str):
    """
    Get a single sequence with all its steps
    
    - **sequence_id**: UUID of the sequence
    
    Returns sequence details and all steps in order
    """
    try:
        # Get sequence
        sequence = supabase.table('sequences').select('*').eq('id', sequence_id).single().execute()
        
        if not sequence.data:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
        # Get steps
        steps = supabase.table('sequence_steps').select('*').eq(
            'sequence_id', sequence_id
        ).order('step_order').execute()
        
        return {
            "sequence": sequence.data,
            "steps": steps.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sequence: {str(e)}")


@router.patch("/{sequence_id}/activate", response_model=Dict[str, Any])
async def activate_sequence(sequence_id: str):
    """
    Activate a paused sequence
    
    - **sequence_id**: UUID of the sequence
    """
    try:
        result = supabase.table('sequences').update({
            'is_active': True
        }).eq('id', sequence_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
        return {"status": "activated", "sequence": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error activating sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Activation failed: {str(e)}")


@router.patch("/{sequence_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_sequence(sequence_id: str):
    """
    Deactivate a sequence (stops new enrollments, existing ones continue)
    
    - **sequence_id**: UUID of the sequence
    """
    try:
        result = supabase.table('sequences').update({
            'is_active': False
        }).eq('id', sequence_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
        return {"status": "deactivated", "sequence": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deactivating sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Deactivation failed: {str(e)}")


@router.get("/enrollments/lead/{lead_id}", response_model=List[Dict[str, Any]])
async def get_lead_enrollments(lead_id: str):
    """
    Get all enrollments for a specific lead
    
    - **lead_id**: UUID of the lead
    
    Shows which sequences the lead is enrolled in and their status
    """
    try:
        enrollments = supabase.table('enrollments').select(
            '*, sequences(name, description)'
        ).eq('lead_id', lead_id).execute()
        
        return enrollments.data
        
    except Exception as e:
        logger.error(f"❌ Error fetching lead enrollments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch enrollments: {str(e)}")


@router.patch("/enrollments/{enrollment_id}/pause", response_model=Dict[str, Any])
async def pause_enrollment(enrollment_id: str, reason: Optional[str] = None):
    """
    Manually pause an enrollment
    
    - **enrollment_id**: UUID of the enrollment
    - **reason**: Optional reason for pausing
    """
    try:
        result = await sequence_engine.pause_enrollment(enrollment_id, reason)
        return result
        
    except Exception as e:
        logger.error(f"❌ Error pausing enrollment: {e}")
        raise HTTPException(status_code=500, detail=f"Pause failed: {str(e)}")


@router.patch("/enrollments/{enrollment_id}/resume", response_model=Dict[str, Any])
async def resume_enrollment(enrollment_id: str):
    """
    Resume a paused enrollment
    
    - **enrollment_id**: UUID of the enrollment
    
    Recalculates next_step_at and sets status back to active
    """
    try:
        result = await sequence_engine.resume_enrollment(enrollment_id)
        return result
        
    except Exception as e:
        logger.error(f"❌ Error resuming enrollment: {e}")
        raise HTTPException(status_code=500, detail=f"Resume failed: {str(e)}")


@router.get("/performance/overview", response_model=Dict[str, Any])
async def get_performance_overview():
    """
    Get performance overview across all sequences
    
    Returns aggregated stats from sequence_performance view
    """
    try:
        result = supabase.table('sequence_performance').select('*').execute()
        
        return {
            "sequences": result.data,
            "total_sequences": len(result.data),
            "total_active": sum(1 for s in result.data if s['is_active'])
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching performance overview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch overview: {str(e)}")

