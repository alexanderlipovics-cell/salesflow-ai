"""
╔════════════════════════════════════════════════════════════════════════════╗
║  JOBS API ROUTES                                                           ║
║  Endpoints for Job Queue Management                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /jobs - Create a new job
- GET /jobs - List user's jobs
- GET /jobs/{id} - Get job details
- DELETE /jobs/{id} - Cancel a job
- GET /jobs/stats - Get queue statistics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from ...db.deps import get_current_user, CurrentUser
from ...services.jobs import JobService, JobType, JobStatus

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class JobCreate(BaseModel):
    """Create a new job."""
    job_type: str = Field(..., description="Type of job (send_followup, etc.)")
    payload: Dict[str, Any] = Field(default_factory=dict)
    run_at: Optional[datetime] = Field(None, description="When to run (default: now)")
    job_name: Optional[str] = None
    priority: int = Field(5, ge=1, le=10)
    delay_minutes: int = Field(0, ge=0)
    delay_hours: int = Field(0, ge=0)
    delay_days: int = Field(0, ge=0)


class JobResponse(BaseModel):
    """Job response model."""
    id: str
    job_type: str
    job_name: Optional[str]
    status: str
    priority: int
    run_at: str
    created_at: str
    attempts: int
    last_error: Optional[str]
    result: Optional[Dict[str, Any]]


class JobStats(BaseModel):
    """Queue statistics."""
    pending: int
    running: int
    completed_today: int
    failed_today: int
    by_type: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/", response_model=Dict[str, Any])
async def create_job(
    data: JobCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a new scheduled job.
    
    Job types:
    - send_followup
    - send_sequence_step
    - reactivate_lead
    - send_push_notification
    """
    try:
        job_type = JobType(data.job_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job_type. Valid types: {[jt.value for jt in JobType]}"
        )
    
    service = JobService()
    
    # Calculate run_at from delay
    run_at = data.run_at
    if data.delay_minutes > 0 or data.delay_hours > 0 or data.delay_days > 0:
        from datetime import timedelta
        run_at = datetime.utcnow() + timedelta(
            minutes=data.delay_minutes,
            hours=data.delay_hours,
            days=data.delay_days,
        )
    
    job = await service.create_job(
        job_type=job_type,
        payload=data.payload,
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
        run_at=run_at,
        job_name=data.job_name,
        priority=data.priority,
    )
    
    return {
        "success": True,
        "job": {
            "id": job.id,
            "job_type": job.job_type.value,
            "status": job.status.value,
            "run_at": job.run_at.isoformat(),
        }
    }


@router.get("/", response_model=Dict[str, Any])
async def list_jobs(
    status: Optional[str] = Query(None, description="Filter by status"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List user's scheduled jobs."""
    service = JobService()
    
    status_filter = JobStatus(status) if status else None
    type_filter = JobType(job_type) if job_type else None
    
    jobs = await service.get_user_jobs(
        user_id=str(current_user.id),
        status=status_filter,
        job_type=type_filter,
        limit=limit,
    )
    
    return {
        "jobs": [
            {
                "id": job.id,
                "job_type": job.job_type.value,
                "job_name": job.job_name,
                "status": job.status.value,
                "priority": job.priority,
                "run_at": job.run_at.isoformat(),
                "created_at": job.created_at.isoformat(),
                "attempts": job.attempts,
            }
            for job in jobs
        ],
        "count": len(jobs),
    }


@router.get("/stats", response_model=JobStats)
async def get_job_stats(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get job queue statistics."""
    service = JobService()
    stats = await service.get_queue_stats()
    
    return JobStats(**stats)


@router.get("/{job_id}", response_model=Dict[str, Any])
async def get_job(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get job details."""
    service = JobService()
    job = await service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check ownership
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "job": {
            "id": job.id,
            "job_type": job.job_type.value,
            "job_name": job.job_name,
            "status": job.status.value,
            "priority": job.priority,
            "run_at": job.run_at.isoformat(),
            "created_at": job.created_at.isoformat(),
            "attempts": job.attempts,
            "max_attempts": job.max_attempts,
            "last_error": job.last_error,
            "result": job.result,
            "payload": job.payload,
        }
    }


@router.delete("/{job_id}", response_model=Dict[str, Any])
async def cancel_job(
    job_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Cancel a pending job."""
    service = JobService()
    job = await service.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check ownership
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if cancellable
    if job.status not in [JobStatus.PENDING, JobStatus.RETRYING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job.status.value}"
        )
    
    success = await service.cancel_job(job_id)
    
    return {"success": success}


@router.get("/types/all", response_model=Dict[str, Any])
async def list_job_types(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all available job types."""
    return {
        "job_types": [
            {"value": jt.value, "name": jt.name}
            for jt in JobType
        ]
    }

