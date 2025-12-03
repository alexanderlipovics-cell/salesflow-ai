"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCE API ROUTES                                                       ║
║  CRUD + Enrollment + Stats für Outreach Automation                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import logging

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.sequencer import SequenceService, EnrollmentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sequences", tags=["sequences"])


# =============================================================================
# SCHEMAS
# =============================================================================

class SequenceCreate(BaseModel):
    """Neue Sequence erstellen."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    settings: Optional[Dict] = None
    tags: Optional[List[str]] = None
    company_id: Optional[str] = None


class SequenceUpdate(BaseModel):
    """Sequence updaten."""
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict] = None
    tags: Optional[List[str]] = None


class StepCreate(BaseModel):
    """Step zur Sequence hinzufügen."""
    step_type: str = Field(..., description="email, linkedin_connect, linkedin_dm, linkedin_inmail, whatsapp, sms, wait, condition")
    step_order: int = Field(..., ge=1)
    delay_days: int = Field(default=0, ge=0)
    delay_hours: int = Field(default=0, ge=0, le=23)
    delay_minutes: int = Field(default=0, ge=0, le=59)
    subject: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    ab_variant: Optional[str] = None
    condition_type: Optional[str] = None
    condition_step_id: Optional[str] = None
    platform_settings: Optional[Dict] = None


class StepUpdate(BaseModel):
    """Step updaten."""
    delay_days: Optional[int] = None
    delay_hours: Optional[int] = None
    delay_minutes: Optional[int] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    is_active: Optional[bool] = None
    platform_settings: Optional[Dict] = None


class EnrollContact(BaseModel):
    """Kontakt einschreiben."""
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    contact_linkedin_url: Optional[str] = None
    contact_phone: Optional[str] = None
    lead_id: Optional[str] = None
    variables: Optional[Dict] = None


class BulkEnroll(BaseModel):
    """Mehrere Kontakte einschreiben."""
    contacts: List[Dict]


# =============================================================================
# SEQUENCES CRUD
# =============================================================================

@router.post("/", response_model=dict)
async def create_sequence(
    data: SequenceCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Erstellt eine neue Sequence (Kampagne)."""
    service = SequenceService(supabase)
    
    sequence = await service.create_sequence(
        user_id=str(current_user.id),
        name=data.name,
        description=data.description,
        settings=data.settings,
        tags=data.tags,
        company_id=data.company_id,
    )
    
    return {"success": True, "sequence": sequence}


@router.get("/", response_model=dict)
async def list_sequences(
    status: Optional[str] = Query(None, description="draft, active, paused, completed"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Listet alle Sequences des Users."""
    service = SequenceService(supabase)
    
    sequences = await service.list_sequences(
        user_id=str(current_user.id),
        status=status,
        limit=limit,
        offset=offset,
    )
    
    return {"sequences": sequences, "count": len(sequences)}


@router.get("/{sequence_id}", response_model=dict)
async def get_sequence(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Lädt eine Sequence mit allen Steps."""
    service = SequenceService(supabase)
    
    sequence = await service.get_sequence(sequence_id, str(current_user.id))
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"sequence": sequence}


@router.patch("/{sequence_id}", response_model=dict)
async def update_sequence(
    sequence_id: str,
    data: SequenceUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Aktualisiert eine Sequence."""
    service = SequenceService(supabase)
    
    updates = data.dict(exclude_unset=True)
    sequence = await service.update_sequence(sequence_id, str(current_user.id), updates)
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"success": True, "sequence": sequence}


@router.delete("/{sequence_id}", response_model=dict)
async def delete_sequence(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Löscht eine Sequence."""
    service = SequenceService(supabase)
    
    success = await service.delete_sequence(sequence_id, str(current_user.id))
    
    if not success:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"success": True}


@router.post("/{sequence_id}/activate", response_model=dict)
async def activate_sequence(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Aktiviert eine Sequence."""
    service = SequenceService(supabase)
    
    sequence = await service.activate_sequence(sequence_id, str(current_user.id))
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"success": True, "sequence": sequence}


@router.post("/{sequence_id}/pause", response_model=dict)
async def pause_sequence(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Pausiert eine Sequence."""
    service = SequenceService(supabase)
    
    sequence = await service.pause_sequence(sequence_id, str(current_user.id))
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"success": True, "sequence": sequence}


@router.post("/{sequence_id}/duplicate", response_model=dict)
async def duplicate_sequence(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Dupliziert eine Sequence mit allen Steps."""
    service = SequenceService(supabase)
    
    sequence = await service.duplicate_sequence(sequence_id, str(current_user.id))
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {"success": True, "sequence": sequence}


# =============================================================================
# STEPS
# =============================================================================

@router.post("/{sequence_id}/steps", response_model=dict)
async def add_step(
    sequence_id: str,
    data: StepCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Fügt einen Step zur Sequence hinzu."""
    service = SequenceService(supabase)
    
    # Verify sequence ownership
    sequence = await service.get_sequence(sequence_id, str(current_user.id))
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    step = await service.add_step(
        sequence_id=sequence_id,
        step_type=data.step_type,
        step_order=data.step_order,
        delay_days=data.delay_days,
        delay_hours=data.delay_hours,
        delay_minutes=data.delay_minutes,
        subject=data.subject,
        content=data.content,
        content_html=data.content_html,
        ab_variant=data.ab_variant,
        condition_type=data.condition_type,
        condition_step_id=data.condition_step_id,
        platform_settings=data.platform_settings,
    )
    
    return {"success": True, "step": step}


@router.patch("/{sequence_id}/steps/{step_id}", response_model=dict)
async def update_step(
    sequence_id: str,
    step_id: str,
    data: StepUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Aktualisiert einen Step."""
    service = SequenceService(supabase)
    
    # Verify sequence ownership
    sequence = await service.get_sequence(sequence_id, str(current_user.id))
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    updates = data.dict(exclude_unset=True)
    step = await service.update_step(step_id, sequence_id, updates)
    
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    return {"success": True, "step": step}


@router.delete("/{sequence_id}/steps/{step_id}", response_model=dict)
async def delete_step(
    sequence_id: str,
    step_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Löscht einen Step."""
    service = SequenceService(supabase)
    
    # Verify sequence ownership
    sequence = await service.get_sequence(sequence_id, str(current_user.id))
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    success = await service.delete_step(step_id, sequence_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Step not found")
    
    return {"success": True}


# =============================================================================
# ENROLLMENTS
# =============================================================================

@router.post("/{sequence_id}/enroll", response_model=dict)
async def enroll_contact(
    sequence_id: str,
    data: EnrollContact,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Schreibt einen Kontakt in die Sequence ein."""
    service = EnrollmentService(supabase)
    
    try:
        enrollment = await service.enroll_contact(
            sequence_id=sequence_id,
            user_id=str(current_user.id),
            contact_email=data.contact_email,
            contact_name=data.contact_name,
            contact_linkedin_url=data.contact_linkedin_url,
            contact_phone=data.contact_phone,
            lead_id=data.lead_id,
            variables=data.variables,
        )
        
        return {"success": True, "enrollment": enrollment}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{sequence_id}/enroll-bulk", response_model=dict)
async def bulk_enroll_contacts(
    sequence_id: str,
    data: BulkEnroll,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Schreibt mehrere Kontakte ein."""
    service = EnrollmentService(supabase)
    
    result = await service.bulk_enroll(
        sequence_id=sequence_id,
        user_id=str(current_user.id),
        contacts=data.contacts,
    )
    
    return {
        "success": True,
        "enrolled": result["enrolled"],
        "errors": result["errors"],
        "error_details": result["error_details"],
    }


@router.get("/{sequence_id}/enrollments", response_model=dict)
async def list_enrollments(
    sequence_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Listet alle Enrollments einer Sequence."""
    service = EnrollmentService(supabase)
    
    enrollments = await service.list_enrollments(
        sequence_id=sequence_id,
        user_id=str(current_user.id),
        status=status,
        limit=limit,
        offset=offset,
    )
    
    return {"enrollments": enrollments, "count": len(enrollments)}


@router.post("/enrollments/{enrollment_id}/pause", response_model=dict)
async def pause_enrollment(
    enrollment_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Pausiert ein Enrollment."""
    service = EnrollmentService(supabase)
    
    enrollment = await service.pause_enrollment(enrollment_id, str(current_user.id))
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return {"success": True, "enrollment": enrollment}


@router.post("/enrollments/{enrollment_id}/resume", response_model=dict)
async def resume_enrollment(
    enrollment_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Setzt ein Enrollment fort."""
    service = EnrollmentService(supabase)
    
    enrollment = await service.resume_enrollment(enrollment_id, str(current_user.id))
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return {"success": True, "enrollment": enrollment}


@router.post("/enrollments/{enrollment_id}/stop", response_model=dict)
async def stop_enrollment(
    enrollment_id: str,
    reason: str = Query("manual"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Stoppt ein Enrollment."""
    service = EnrollmentService(supabase)
    
    enrollment = await service.stop_enrollment(enrollment_id, str(current_user.id), reason)
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return {"success": True, "enrollment": enrollment}


@router.post("/enrollments/{enrollment_id}/mark-replied", response_model=dict)
async def mark_enrollment_replied(
    enrollment_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Markiert ein Enrollment als beantwortet."""
    service = EnrollmentService(supabase)
    
    enrollment = await service.mark_replied(enrollment_id, str(current_user.id))
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    return {"success": True, "enrollment": enrollment}


# =============================================================================
# STATS
# =============================================================================

@router.get("/{sequence_id}/stats", response_model=dict)
async def get_sequence_stats(
    sequence_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Lädt Stats einer Sequence."""
    service = SequenceService(supabase)
    
    stats = await service.get_sequence_stats(sequence_id, str(current_user.id))
    
    if not stats:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return stats

