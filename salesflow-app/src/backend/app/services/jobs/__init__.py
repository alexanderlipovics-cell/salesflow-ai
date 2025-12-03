"""
╔════════════════════════════════════════════════════════════════════════════╗
║  JOB SERVICE MODULE                                                        ║
║  Background Job Queue & Worker Management                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage:
    from app.services.jobs import JobService, JobType
    
    # Create a job
    job = await JobService.create_job(
        user_id=user_id,
        job_type=JobType.SEND_FOLLOWUP,
        payload={"lead_id": "...", "message": "..."},
        run_at=datetime.now() + timedelta(hours=1)
    )
    
    # In worker process
    jobs = await JobService.get_pending_jobs(limit=10)
    for job in jobs:
        result = await JobService.execute_job(job)
"""

from .job_service import JobService, JobType, JobStatus
from .job_worker import JobWorker
from .job_handlers import register_job_handlers, JOB_HANDLERS
from .redis_queue import RedisQueue, get_redis_queue, QueuePriority, enqueue_job
from .followup_reminder import FollowUpReminderService

__all__ = [
    "JobService",
    "JobType", 
    "JobStatus",
    "JobWorker",
    "register_job_handlers",
    "JOB_HANDLERS",
    # Redis Queue
    "RedisQueue",
    "get_redis_queue",
    "QueuePriority",
    "enqueue_job",
    # Follow-Up Reminder
    "FollowUpReminderService",
]

