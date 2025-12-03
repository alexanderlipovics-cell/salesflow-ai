"""
╔════════════════════════════════════════════════════════════════════════════╗
║  JOB SERVICE                                                               ║
║  Background Job Queue Management                                           ║
╚════════════════════════════════════════════════════════════════════════════╝

Handles:
- Creating scheduled jobs
- Fetching pending jobs for workers
- Marking jobs as complete/failed
- Job statistics and monitoring
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging
import uuid

from ...db.supabase import get_supabase

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class JobType(str, Enum):
    """Available job types."""
    
    # Follow-Up Jobs
    SEND_FOLLOWUP = "send_followup"
    SCHEDULE_FOLLOWUP = "schedule_followup"
    
    # Sequence Jobs
    SEND_SEQUENCE_STEP = "send_sequence_step"
    PROCESS_SEQUENCE_ENROLLMENT = "process_sequence_enrollment"
    
    # Autopilot Jobs
    AUTOPILOT_SEND = "autopilot_send"
    AUTOPILOT_ANALYZE = "autopilot_analyze"
    
    # Lead Jobs
    REACTIVATE_LEAD = "reactivate_lead"
    UPDATE_LEAD_SCORE = "update_lead_score"
    
    # AI Jobs
    AI_ANALYZE_CONVERSATION = "ai_analyze_conversation"
    AI_GENERATE_RESPONSE = "ai_generate_response"
    AI_UPDATE_PERSONALITY = "ai_update_personality"
    
    # Notification Jobs
    SEND_PUSH_NOTIFICATION = "send_push_notification"
    SEND_EMAIL_NOTIFICATION = "send_email_notification"
    
    # Analytics Jobs
    AGGREGATE_DAILY_STATS = "aggregate_daily_stats"
    UPDATE_LEADERBOARD = "update_leaderboard"
    
    # Cleanup Jobs
    CLEANUP_OLD_JOBS = "cleanup_old_jobs"
    ARCHIVE_COMPLETED_JOBS = "archive_completed_jobs"
    
    # Webhook Jobs
    PROCESS_WEBHOOK = "process_webhook"
    RETRY_WEBHOOK = "retry_webhook"


class JobStatus(str, Enum):
    """Job execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Job:
    """Represents a scheduled job."""
    id: str
    job_type: JobType
    job_name: Optional[str]
    payload: Dict[str, Any]
    run_at: datetime
    status: JobStatus
    priority: int
    attempts: int
    max_attempts: int
    user_id: Optional[str]
    company_id: Optional[str]
    created_at: datetime
    last_error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_db(cls, data: Dict[str, Any]) -> "Job":
        """Create Job from database row."""
        return cls(
            id=data["id"],
            job_type=JobType(data["job_type"]),
            job_name=data.get("job_name"),
            payload=data.get("payload", {}),
            run_at=datetime.fromisoformat(data["run_at"].replace("Z", "+00:00")) if isinstance(data["run_at"], str) else data["run_at"],
            status=JobStatus(data["status"]),
            priority=data.get("priority", 5),
            attempts=data.get("attempts", 0),
            max_attempts=data.get("max_attempts", 3),
            user_id=data.get("user_id"),
            company_id=data.get("company_id"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if isinstance(data["created_at"], str) else data["created_at"],
            last_error=data.get("last_error"),
            result=data.get("result"),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# JOB SERVICE
# ═══════════════════════════════════════════════════════════════════════════════

class JobService:
    """
    Service for managing background jobs.
    
    Provides methods for:
    - Creating jobs (immediate or scheduled)
    - Fetching pending jobs for workers
    - Updating job status
    - Job statistics
    """
    
    def __init__(self, supabase=None):
        self.db = supabase or get_supabase()
    
    # ─────────────────────────────────────────────────────────────────────────
    # CREATE JOBS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def create_job(
        self,
        job_type: JobType,
        payload: Dict[str, Any],
        user_id: Optional[str] = None,
        company_id: Optional[str] = None,
        run_at: Optional[datetime] = None,
        job_name: Optional[str] = None,
        priority: int = 5,
        max_attempts: int = 3,
    ) -> Job:
        """
        Create a new scheduled job.
        
        Args:
            job_type: Type of job (from JobType enum)
            payload: Job-specific data
            user_id: Owner of the job
            company_id: Company context
            run_at: When to execute (default: now)
            job_name: Human-readable name
            priority: 1=highest, 10=lowest
            max_attempts: Max retry attempts
            
        Returns:
            Created Job object
        """
        if run_at is None:
            run_at = datetime.utcnow()
        
        job_data = {
            "id": str(uuid.uuid4()),
            "job_type": job_type.value,
            "job_name": job_name or f"{job_type.value}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "payload": payload,
            "run_at": run_at.isoformat(),
            "status": JobStatus.PENDING.value,
            "priority": priority,
            "max_attempts": max_attempts,
            "attempts": 0,
            "user_id": user_id,
            "company_id": company_id,
        }
        
        result = self.db.table("scheduled_jobs").insert(job_data).execute()
        
        if result.data:
            logger.info(f"Created job: {job_type.value} (ID: {job_data['id']})")
            return Job.from_db(result.data[0])
        
        raise Exception("Failed to create job")
    
    async def create_delayed_job(
        self,
        job_type: JobType,
        payload: Dict[str, Any],
        delay_minutes: int = 0,
        delay_hours: int = 0,
        delay_days: int = 0,
        **kwargs
    ) -> Job:
        """
        Create a job that runs after a delay.
        
        Convenience wrapper around create_job.
        """
        run_at = datetime.utcnow() + timedelta(
            minutes=delay_minutes,
            hours=delay_hours,
            days=delay_days
        )
        return await self.create_job(
            job_type=job_type,
            payload=payload,
            run_at=run_at,
            **kwargs
        )
    
    async def create_recurring_job(
        self,
        job_type: JobType,
        payload: Dict[str, Any],
        recurrence_rule: str,  # cron-style: "0 9 * * 1-5"
        **kwargs
    ) -> Job:
        """
        Create a recurring job.
        
        The worker will re-schedule the job after execution.
        """
        job = await self.create_job(
            job_type=job_type,
            payload=payload,
            **kwargs
        )
        
        # Update with recurrence info
        self.db.table("scheduled_jobs").update({
            "is_recurring": True,
            "recurrence_rule": recurrence_rule,
        }).eq("id", job.id).execute()
        
        return job
    
    # ─────────────────────────────────────────────────────────────────────────
    # FETCH JOBS (FOR WORKERS)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_pending_jobs(
        self,
        limit: int = 10,
        job_types: Optional[List[JobType]] = None,
    ) -> List[Job]:
        """
        Atomically fetch and claim pending jobs for execution.
        
        Uses database function for atomic claiming to prevent race conditions.
        
        Args:
            limit: Max jobs to fetch
            job_types: Filter by job types (optional)
            
        Returns:
            List of claimed jobs
        """
        try:
            # Use the database function for atomic claiming
            type_filter = [jt.value for jt in job_types] if job_types else None
            
            result = self.db.rpc(
                "get_pending_jobs",
                {"p_limit": limit, "p_job_types": type_filter}
            ).execute()
            
            if result.data:
                jobs = [Job.from_db(row) for row in result.data]
                logger.info(f"Claimed {len(jobs)} jobs for execution")
                return jobs
            
            return []
            
        except Exception as e:
            logger.error(f"Error fetching pending jobs: {e}")
            # Fallback: Direct query (less safe but works without function)
            return await self._get_pending_jobs_fallback(limit, job_types)
    
    async def _get_pending_jobs_fallback(
        self,
        limit: int,
        job_types: Optional[List[JobType]] = None,
    ) -> List[Job]:
        """Fallback method if RPC function not available."""
        query = self.db.table("scheduled_jobs").select("*").in_(
            "status", [JobStatus.PENDING.value, JobStatus.RETRYING.value]
        ).lte("run_at", datetime.utcnow().isoformat()).order(
            "priority", desc=False
        ).order("run_at", desc=False).limit(limit)
        
        if job_types:
            query = query.in_("job_type", [jt.value for jt in job_types])
        
        result = query.execute()
        
        jobs = []
        for row in result.data or []:
            # Mark as running
            self.db.table("scheduled_jobs").update({
                "status": JobStatus.RUNNING.value,
                "started_at": datetime.utcnow().isoformat(),
                "attempts": row["attempts"] + 1,
            }).eq("id", row["id"]).execute()
            
            jobs.append(Job.from_db(row))
        
        return jobs
    
    # ─────────────────────────────────────────────────────────────────────────
    # UPDATE JOB STATUS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def complete_job(
        self,
        job_id: str,
        result: Optional[Dict[str, Any]] = None,
    ) -> Job:
        """Mark a job as successfully completed."""
        try:
            # Use database function
            db_result = self.db.rpc(
                "complete_job",
                {"p_job_id": job_id, "p_result": result}
            ).execute()
            
            if db_result.data:
                logger.info(f"Completed job: {job_id}")
                return Job.from_db(db_result.data)
            
        except Exception:
            # Fallback
            update_result = self.db.table("scheduled_jobs").update({
                "status": JobStatus.COMPLETED.value,
                "completed_at": datetime.utcnow().isoformat(),
                "result": result,
            }).eq("id", job_id).execute()
            
            if update_result.data:
                return Job.from_db(update_result.data[0])
        
        raise Exception(f"Failed to complete job: {job_id}")
    
    async def fail_job(
        self,
        job_id: str,
        error: str,
    ) -> Job:
        """Mark a job as failed (may retry based on attempts)."""
        try:
            # Use database function
            db_result = self.db.rpc(
                "fail_job",
                {"p_job_id": job_id, "p_error": error}
            ).execute()
            
            if db_result.data:
                job = Job.from_db(db_result.data)
                if job.status == JobStatus.RETRYING:
                    logger.warning(f"Job {job_id} will be retried (attempt {job.attempts})")
                else:
                    logger.error(f"Job {job_id} failed permanently: {error}")
                return job
            
        except Exception:
            # Fallback
            # First get current attempts
            job_result = self.db.table("scheduled_jobs").select(
                "attempts, max_attempts"
            ).eq("id", job_id).single().execute()
            
            if job_result.data:
                attempts = job_result.data["attempts"]
                max_attempts = job_result.data["max_attempts"]
                new_status = JobStatus.RETRYING.value if attempts < max_attempts else JobStatus.FAILED.value
            else:
                new_status = JobStatus.FAILED.value
            
            update_result = self.db.table("scheduled_jobs").update({
                "status": new_status,
                "last_error": error,
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", job_id).execute()
            
            if update_result.data:
                return Job.from_db(update_result.data[0])
        
        raise Exception(f"Failed to update job status: {job_id}")
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending job."""
        result = self.db.table("scheduled_jobs").update({
            "status": JobStatus.CANCELLED.value,
        }).eq("id", job_id).in_(
            "status", [JobStatus.PENDING.value, JobStatus.RETRYING.value]
        ).execute()
        
        return len(result.data or []) > 0
    
    # ─────────────────────────────────────────────────────────────────────────
    # QUERY JOBS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get a single job by ID."""
        result = self.db.table("scheduled_jobs").select("*").eq("id", job_id).single().execute()
        
        if result.data:
            return Job.from_db(result.data)
        return None
    
    async def get_user_jobs(
        self,
        user_id: str,
        status: Optional[JobStatus] = None,
        job_type: Optional[JobType] = None,
        limit: int = 50,
    ) -> List[Job]:
        """Get jobs for a specific user."""
        query = self.db.table("scheduled_jobs").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status.value)
        if job_type:
            query = query.eq("job_type", job_type.value)
        
        result = query.order("created_at", desc=True).limit(limit).execute()
        
        return [Job.from_db(row) for row in result.data or []]
    
    # ─────────────────────────────────────────────────────────────────────────
    # STATISTICS
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get current queue statistics."""
        stats = {
            "pending": 0,
            "running": 0,
            "completed_today": 0,
            "failed_today": 0,
            "by_type": {},
        }
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Pending count
        pending = self.db.table("scheduled_jobs").select(
            "id", count="exact"
        ).eq("status", JobStatus.PENDING.value).execute()
        stats["pending"] = pending.count or 0
        
        # Running count
        running = self.db.table("scheduled_jobs").select(
            "id", count="exact"
        ).eq("status", JobStatus.RUNNING.value).execute()
        stats["running"] = running.count or 0
        
        # Today's completed
        completed = self.db.table("scheduled_jobs").select(
            "id", count="exact"
        ).eq("status", JobStatus.COMPLETED.value).gte(
            "completed_at", today.isoformat()
        ).execute()
        stats["completed_today"] = completed.count or 0
        
        # Today's failed
        failed = self.db.table("scheduled_jobs").select(
            "id", count="exact"
        ).eq("status", JobStatus.FAILED.value).gte(
            "completed_at", today.isoformat()
        ).execute()
        stats["failed_today"] = failed.count or 0
        
        return stats
    
    # ─────────────────────────────────────────────────────────────────────────
    # CLEANUP
    # ─────────────────────────────────────────────────────────────────────────
    
    async def cleanup_old_jobs(self, days: int = 30) -> int:
        """Delete completed jobs older than X days."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        result = self.db.table("scheduled_jobs").delete().in_(
            "status", [JobStatus.COMPLETED.value, JobStatus.CANCELLED.value]
        ).lt("completed_at", cutoff).execute()
        
        deleted = len(result.data or [])
        logger.info(f"Cleaned up {deleted} old jobs")
        return deleted


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

_job_service: Optional[JobService] = None


def get_job_service() -> JobService:
    """Get singleton JobService instance."""
    global _job_service
    if _job_service is None:
        _job_service = JobService()
    return _job_service


async def create_job(
    job_type: JobType,
    payload: Dict[str, Any],
    **kwargs
) -> Job:
    """Convenience function to create a job."""
    service = get_job_service()
    return await service.create_job(job_type, payload, **kwargs)


async def schedule_followup(
    user_id: str,
    lead_id: str,
    message: str,
    channel: str = "whatsapp",
    delay_minutes: int = 0,
    delay_hours: int = 0,
    delay_days: int = 0,
) -> Job:
    """Convenience function to schedule a follow-up."""
    service = get_job_service()
    return await service.create_delayed_job(
        job_type=JobType.SEND_FOLLOWUP,
        payload={
            "lead_id": lead_id,
            "message": message,
            "channel": channel,
        },
        user_id=user_id,
        delay_minutes=delay_minutes,
        delay_hours=delay_hours,
        delay_days=delay_days,
        job_name=f"Follow-up: {lead_id[:8]}",
    )

