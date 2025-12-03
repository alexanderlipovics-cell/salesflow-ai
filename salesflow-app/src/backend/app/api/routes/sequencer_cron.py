"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SEQUENCER CRON JOBS                                                       ║
║  Background Processing für Sequence-Aktionen                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Aufruf:
  - Manuell: POST /api/v1/cron/sequencer/process
  - Via Scheduler: Alle 60 Sekunden
  - Via externes Cron: curl -X POST http://localhost:8000/api/v1/cron/sequencer/process
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import asyncio
import logging
import os

from ...db.supabase import get_supabase
from ...services.sequencer import SequenceScheduler, ActionExecutor, EnrollmentService
from ...services.sequencer.email_sender import EmailSender

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cron/sequencer", tags=["cron-sequencer"])

# =============================================================================
# CRON SECRET (optional security)
# =============================================================================

CRON_SECRET = os.getenv("CRON_SECRET", "salesflow-cron-2024")

def verify_cron_secret(x_cron_secret: Optional[str] = Header(None)):
    """Optional: Cron-Jobs mit Secret absichern."""
    if CRON_SECRET and x_cron_secret != CRON_SECRET:
        # In Development erlauben wir es ohne Secret
        if os.getenv("ENVIRONMENT", "development") == "production":
            raise HTTPException(status_code=403, detail="Invalid cron secret")
    return True


# =============================================================================
# SCHEMAS
# =============================================================================

class ProcessResult(BaseModel):
    """Ergebnis der Queue-Verarbeitung."""
    processed: int
    failed: int
    skipped: int
    duration_ms: int
    next_batch_at: Optional[str] = None


class QueueStats(BaseModel):
    """Queue-Statistiken."""
    pending: int
    overdue: int
    processing: int
    failed_24h: int
    

# =============================================================================
# SINGLETON INSTANCES
# =============================================================================

_scheduler: Optional[SequenceScheduler] = None
_executor: Optional[ActionExecutor] = None


def get_scheduler(supabase=Depends(get_supabase)) -> SequenceScheduler:
    """Gibt den Scheduler zurück (Singleton)."""
    global _scheduler, _executor
    
    if _executor is None:
        email_sender = EmailSender(supabase)
        _executor = ActionExecutor(supabase, email_sender)
    
    if _scheduler is None:
        _scheduler = SequenceScheduler(supabase, _executor)
    
    return _scheduler


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/process", response_model=ProcessResult)
async def process_sequence_queue(
    batch_size: int = 50,
    background_tasks: BackgroundTasks = None,
    _: bool = Depends(verify_cron_secret),
    supabase = Depends(get_supabase)
):
    """
    🔄 Verarbeitet ausstehende Sequence-Aktionen aus der Queue.
    
    Sollte regelmäßig aufgerufen werden (z.B. alle 60 Sekunden).
    
    - Holt fällige Actions aus sequence_action_queue
    - Führt sie aus (Email senden, LinkedIn queuen, etc.)
    - Aktualisiert Enrollment-Status
    
    **Aufruf via Cron:**
    ```bash
    # Alle 60 Sekunden
    * * * * * curl -X POST http://localhost:8000/api/v1/cron/sequencer/process -H "X-Cron-Secret: salesflow-cron-2024"
    ```
    """
    start_time = datetime.utcnow()
    
    # Create executor and scheduler
    email_sender = EmailSender(supabase)
    executor = ActionExecutor(supabase, email_sender)
    scheduler = SequenceScheduler(supabase, executor)
    
    try:
        # Process pending actions
        processed = await scheduler.process_pending_actions(batch_size=batch_size)
        
        # Clear stale processing items
        stale_cleared = await scheduler.clear_stale_processing(timeout_minutes=30)
        
        # Calculate duration
        duration = datetime.utcnow() - start_time
        duration_ms = int(duration.total_seconds() * 1000)
        
        # Get stats for next batch estimate
        stats = await scheduler.get_queue_stats()
        
        next_batch = None
        if stats["pending"] > 0:
            next_batch = (datetime.utcnow() + timedelta(seconds=60)).isoformat()
        
        logger.info(f"Sequencer: Processed {processed} actions in {duration_ms}ms")
        
        return ProcessResult(
            processed=processed,
            failed=0,  # Would need more detailed tracking
            skipped=stale_cleared,
            duration_ms=duration_ms,
            next_batch_at=next_batch,
        )
        
    except Exception as e:
        logger.error(f"Sequencer process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=QueueStats)
async def get_queue_stats(
    supabase = Depends(get_supabase)
):
    """
    📊 Gibt aktuelle Queue-Statistiken zurück.
    
    Nützlich für Monitoring und Dashboards.
    """
    email_sender = EmailSender(supabase)
    executor = ActionExecutor(supabase, email_sender)
    scheduler = SequenceScheduler(supabase, executor)
    
    stats = await scheduler.get_queue_stats()
    
    return QueueStats(**stats)


@router.post("/clear-stale")
async def clear_stale_items(
    timeout_minutes: int = 30,
    _: bool = Depends(verify_cron_secret),
    supabase = Depends(get_supabase)
):
    """
    🧹 Räumt festgefahrene "processing" Items auf.
    
    Items die länger als timeout_minutes im Status "processing" sind,
    werden auf "pending" zurückgesetzt.
    """
    email_sender = EmailSender(supabase)
    executor = ActionExecutor(supabase, email_sender)
    scheduler = SequenceScheduler(supabase, executor)
    
    cleared = await scheduler.clear_stale_processing(timeout_minutes=timeout_minutes)
    
    return {"cleared": cleared, "timeout_minutes": timeout_minutes}


@router.post("/trigger-enrollment/{enrollment_id}")
async def trigger_enrollment_action(
    enrollment_id: str,
    _: bool = Depends(verify_cron_secret),
    supabase = Depends(get_supabase)
):
    """
    ⚡ Triggert sofort die nächste Aktion für ein Enrollment.
    
    Nützlich für Tests und manuelle Übersteuerung.
    """
    # Get enrollment
    result = supabase.table("sequence_enrollments").select("*").eq(
        "id", enrollment_id
    ).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment = result.data
    
    if enrollment["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Enrollment is {enrollment['status']}, not active")
    
    # Get next step
    next_step_order = enrollment["current_step"] + 1
    step = supabase.table("sequence_steps").select("*").eq(
        "sequence_id", enrollment["sequence_id"]
    ).eq("step_order", next_step_order).eq("is_active", True).single().execute()
    
    if not step.data:
        return {"message": "No more steps, enrollment will complete"}
    
    # Execute immediately
    email_sender = EmailSender(supabase)
    executor = ActionExecutor(supabase, email_sender)
    
    result = await executor.execute_step(
        enrollment=enrollment,
        step=step.data,
    )
    
    if result["success"]:
        # Advance to next step
        enrollment_service = EnrollmentService(supabase)
        await enrollment_service.advance_to_next_step(enrollment_id)
    
    return {
        "enrollment_id": enrollment_id,
        "step_executed": step.data["step_type"],
        "result": result,
    }


@router.get("/health")
async def sequencer_health():
    """
    ❤️ Health Check für den Sequencer.
    """
    return {
        "status": "healthy",
        "service": "sequencer",
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# BACKGROUND SCHEDULER (in-process)
# =============================================================================

_scheduler_running = False
_scheduler_task: Optional[asyncio.Task] = None


async def _background_scheduler_loop(supabase, interval_seconds: int = 60):
    """Background Loop der die Queue verarbeitet."""
    global _scheduler_running
    
    email_sender = EmailSender(supabase)
    executor = ActionExecutor(supabase, email_sender)
    scheduler = SequenceScheduler(supabase, executor)
    
    logger.info(f"Background Scheduler started (interval: {interval_seconds}s)")
    
    while _scheduler_running:
        try:
            processed = await scheduler.process_pending_actions(batch_size=50)
            if processed > 0:
                logger.info(f"Background: Processed {processed} actions")
        except Exception as e:
            logger.error(f"Background scheduler error: {e}")
        
        await asyncio.sleep(interval_seconds)
    
    logger.info("Background Scheduler stopped")


@router.post("/start-background")
async def start_background_scheduler(
    interval_seconds: int = 60,
    _: bool = Depends(verify_cron_secret),
    supabase = Depends(get_supabase)
):
    """
    ▶️ Startet den In-Process Background Scheduler.
    
    Alternative zum externen Cron-Job.
    """
    global _scheduler_running, _scheduler_task
    
    if _scheduler_running:
        return {"status": "already_running"}
    
    _scheduler_running = True
    _scheduler_task = asyncio.create_task(
        _background_scheduler_loop(supabase, interval_seconds)
    )
    
    return {"status": "started", "interval_seconds": interval_seconds}


@router.post("/stop-background")
async def stop_background_scheduler(
    _: bool = Depends(verify_cron_secret),
):
    """
    ⏹️ Stoppt den Background Scheduler.
    """
    global _scheduler_running, _scheduler_task
    
    if not _scheduler_running:
        return {"status": "not_running"}
    
    _scheduler_running = False
    
    if _scheduler_task:
        _scheduler_task.cancel()
        _scheduler_task = None
    
    return {"status": "stopped"}


@router.get("/background-status")
async def get_background_status():
    """
    📊 Status des Background Schedulers.
    """
    return {
        "running": _scheduler_running,
        "task_active": _scheduler_task is not None and not _scheduler_task.done() if _scheduler_task else False,
    }

