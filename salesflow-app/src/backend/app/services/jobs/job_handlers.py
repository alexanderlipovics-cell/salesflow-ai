"""
╔════════════════════════════════════════════════════════════════════════════╗
║  JOB HANDLERS                                                              ║
║  Handler Functions for Each Job Type                                       ║
╚════════════════════════════════════════════════════════════════════════════╝

Each handler receives a Job object and returns a result dict.
Handlers should be idempotent where possible.
"""

import logging
from typing import Dict, Any, Callable, Optional, Awaitable
from datetime import datetime, timedelta

from .job_service import Job, JobType

logger = logging.getLogger(__name__)


# Type for job handlers
JobHandler = Callable[[Job], Awaitable[Optional[Dict[str, Any]]]]


# Registry of job handlers
JOB_HANDLERS: Dict[JobType, JobHandler] = {}


def register_handler(job_type: JobType):
    """Decorator to register a job handler."""
    def decorator(func: JobHandler) -> JobHandler:
        JOB_HANDLERS[job_type] = func
        return func
    return decorator


def get_handler(job_type: JobType) -> Optional[JobHandler]:
    """Get the handler for a job type."""
    return JOB_HANDLERS.get(job_type)


# ═══════════════════════════════════════════════════════════════════════════════
# FOLLOW-UP HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.SEND_FOLLOWUP)
async def handle_send_followup(job: Job) -> Dict[str, Any]:
    """
    Send a scheduled follow-up message.
    
    Payload:
        lead_id: str
        message: str
        channel: str (whatsapp, email, sms)
    """
    from ...db.supabase import get_supabase
    
    payload = job.payload
    lead_id = payload.get("lead_id")
    message = payload.get("message")
    channel = payload.get("channel", "whatsapp")
    
    if not lead_id or not message:
        raise ValueError("lead_id and message are required")
    
    db = get_supabase()
    
    # Get lead info
    lead = db.table("leads").select("*").eq("id", lead_id).single().execute()
    
    if not lead.data:
        raise ValueError(f"Lead not found: {lead_id}")
    
    # TODO: Integrate with actual messaging service (Twilio, etc.)
    # For now, log the follow-up and create activity record
    
    # Create activity record
    activity = {
        "lead_id": lead_id,
        "user_id": job.user_id,
        "activity_type": "followup_sent",
        "channel": channel,
        "content": message[:200],  # Truncate for storage
        "metadata": {
            "job_id": job.id,
            "scheduled": True,
        },
    }
    
    db.table("lead_activities").insert(activity).execute()
    
    # Update lead's last_contact_at
    db.table("leads").update({
        "last_contact_at": datetime.utcnow().isoformat(),
    }).eq("id", lead_id).execute()
    
    logger.info(f"Follow-up sent to lead {lead_id} via {channel}")
    
    return {
        "lead_id": lead_id,
        "channel": channel,
        "sent_at": datetime.utcnow().isoformat(),
    }


@register_handler(JobType.SCHEDULE_FOLLOWUP)
async def handle_schedule_followup(job: Job) -> Dict[str, Any]:
    """
    Create a follow-up task/pending action.
    
    Payload:
        lead_id: str
        action_type: str
        due_date: str (ISO format)
        reason: str
    """
    from ...db.supabase import get_supabase
    
    payload = job.payload
    lead_id = payload.get("lead_id")
    action_type = payload.get("action_type", "followup")
    due_date = payload.get("due_date", datetime.utcnow().isoformat())
    reason = payload.get("reason", "Scheduled follow-up")
    
    db = get_supabase()
    
    # Create pending action
    action = {
        "lead_id": lead_id,
        "user_id": job.user_id,
        "action_type": action_type,
        "action_reason": reason,
        "due_date": due_date,
        "status": "pending",
        "priority": payload.get("priority", 2),
    }
    
    result = db.table("lead_pending_actions").insert(action).execute()
    
    return {
        "action_id": result.data[0]["id"] if result.data else None,
        "lead_id": lead_id,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SEQUENCE HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.SEND_SEQUENCE_STEP)
async def handle_send_sequence_step(job: Job) -> Dict[str, Any]:
    """
    Execute a sequence step (email, LinkedIn, etc.).
    
    Payload:
        enrollment_id: str
        step_id: str
        step_type: str
    """
    from ...db.supabase import get_supabase
    from ...services.sequencer.executor import SequenceExecutor
    
    payload = job.payload
    enrollment_id = payload.get("enrollment_id")
    step_id = payload.get("step_id")
    
    if not enrollment_id or not step_id:
        raise ValueError("enrollment_id and step_id are required")
    
    db = get_supabase()
    executor = SequenceExecutor(db)
    
    # Execute the step
    result = await executor.execute_step(enrollment_id, step_id)
    
    return result


@register_handler(JobType.PROCESS_SEQUENCE_ENROLLMENT)
async def handle_process_enrollment(job: Job) -> Dict[str, Any]:
    """
    Process a new sequence enrollment - schedule first step.
    
    Payload:
        enrollment_id: str
        sequence_id: str
    """
    from ...db.supabase import get_supabase
    from ...services.sequencer.scheduler import SequenceScheduler
    
    payload = job.payload
    enrollment_id = payload.get("enrollment_id")
    sequence_id = payload.get("sequence_id")
    
    db = get_supabase()
    scheduler = SequenceScheduler(db)
    
    # Schedule the first step
    result = await scheduler.schedule_next_step(enrollment_id)
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# AUTOPILOT HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.AUTOPILOT_SEND)
async def handle_autopilot_send(job: Job) -> Dict[str, Any]:
    """
    Send an autopilot-generated message.
    
    Payload:
        lead_id: str
        message: str
        channel: str
        autopilot_session_id: str
    """
    # Similar to SEND_FOLLOWUP but with autopilot tracking
    payload = job.payload
    
    # Reuse followup handler with additional tracking
    result = await handle_send_followup(job)
    
    # Add autopilot-specific tracking
    result["autopilot_session_id"] = payload.get("autopilot_session_id")
    result["autonomous"] = True
    
    return result


@register_handler(JobType.AUTOPILOT_ANALYZE)
async def handle_autopilot_analyze(job: Job) -> Dict[str, Any]:
    """
    Analyze lead for autopilot actions.
    
    Payload:
        lead_id: str
    """
    from ...db.supabase import get_supabase
    from ...services.autopilot.analyzer import AutopilotAnalyzer
    
    payload = job.payload
    lead_id = payload.get("lead_id")
    
    db = get_supabase()
    analyzer = AutopilotAnalyzer(db)
    
    analysis = await analyzer.analyze_lead(lead_id)
    
    return {
        "lead_id": lead_id,
        "analysis": analysis,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.REACTIVATE_LEAD)
async def handle_reactivate_lead(job: Job) -> Dict[str, Any]:
    """
    Attempt to reactivate an inactive lead.
    
    Payload:
        lead_id: str
        reactivation_message: str (optional)
    """
    from ...db.supabase import get_supabase
    
    payload = job.payload
    lead_id = payload.get("lead_id")
    message = payload.get("reactivation_message")
    
    db = get_supabase()
    
    # Create reactivation pending action
    action = {
        "lead_id": lead_id,
        "user_id": job.user_id,
        "action_type": "reactivation",
        "action_reason": "Lead inaktiv - Reaktivierung empfohlen",
        "due_date": datetime.utcnow().isoformat(),
        "status": "pending",
        "priority": 3,
        "suggested_message": message,
    }
    
    result = db.table("lead_pending_actions").insert(action).execute()
    
    return {
        "action_id": result.data[0]["id"] if result.data else None,
        "lead_id": lead_id,
    }


@register_handler(JobType.UPDATE_LEAD_SCORE)
async def handle_update_lead_score(job: Job) -> Dict[str, Any]:
    """
    Recalculate lead scoring.
    
    Payload:
        lead_id: str
    """
    from ...db.supabase import get_supabase
    
    payload = job.payload
    lead_id = payload.get("lead_id")
    
    db = get_supabase()
    
    # Get lead data
    lead = db.table("leads").select("*").eq("id", lead_id).single().execute()
    
    if not lead.data:
        raise ValueError(f"Lead not found: {lead_id}")
    
    lead_data = lead.data
    
    # Simple scoring algorithm
    score = 0
    
    # Activity-based scoring
    activities = db.table("lead_activities").select(
        "id", count="exact"
    ).eq("lead_id", lead_id).execute()
    score += min((activities.count or 0) * 5, 25)  # Max 25 from activities
    
    # Engagement-based scoring
    if lead_data.get("responded"):
        score += 20
    if lead_data.get("deal_state") in ["qualified", "proposal_sent", "negotiation"]:
        score += 30
    
    # Recency-based scoring
    last_contact = lead_data.get("last_contact_at")
    if last_contact:
        try:
            last = datetime.fromisoformat(last_contact.replace("Z", "+00:00"))
            days_ago = (datetime.utcnow().replace(tzinfo=last.tzinfo) - last).days
            if days_ago < 7:
                score += 15
            elif days_ago < 14:
                score += 10
            elif days_ago < 30:
                score += 5
        except:
            pass
    
    # Update lead score
    db.table("leads").update({
        "lead_score": min(score, 100),
        "score_updated_at": datetime.utcnow().isoformat(),
    }).eq("id", lead_id).execute()
    
    return {
        "lead_id": lead_id,
        "new_score": min(score, 100),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.SEND_PUSH_NOTIFICATION)
async def handle_send_push_notification(job: Job) -> Dict[str, Any]:
    """
    Send a push notification.
    
    Payload:
        user_id: str
        title: str
        body: str
        data: dict (optional)
    """
    from ...services.push.push_service import PushService
    
    payload = job.payload
    user_id = payload.get("user_id") or job.user_id
    title = payload.get("title")
    body = payload.get("body")
    data = payload.get("data", {})
    
    if not title or not body:
        raise ValueError("title and body are required")
    
    push_service = PushService()
    
    result = await push_service.send_to_user(
        user_id=user_id,
        title=title,
        body=body,
        data=data,
    )
    
    return {
        "user_id": user_id,
        "sent": result.get("success", False),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.AGGREGATE_DAILY_STATS)
async def handle_aggregate_daily_stats(job: Job) -> Dict[str, Any]:
    """
    Aggregate daily statistics for all users.
    
    Payload:
        date: str (YYYY-MM-DD) - optional, defaults to yesterday
    """
    from ...db.supabase import get_supabase
    from datetime import date
    
    payload = job.payload
    target_date = payload.get("date")
    
    if target_date:
        target = datetime.strptime(target_date, "%Y-%m-%d").date()
    else:
        target = (datetime.utcnow() - timedelta(days=1)).date()
    
    db = get_supabase()
    
    # Get all active users
    users = db.table("profiles").select("id").execute()
    
    stats_created = 0
    
    for user in users.data or []:
        user_id = user["id"]
        
        # Count activities for the day
        activities = db.table("lead_activities").select(
            "activity_type"
        ).eq("user_id", user_id).gte(
            "created_at", f"{target}T00:00:00"
        ).lt(
            "created_at", f"{target + timedelta(days=1)}T00:00:00"
        ).execute()
        
        # Aggregate counts
        counts = {}
        for act in activities.data or []:
            act_type = act["activity_type"]
            counts[act_type] = counts.get(act_type, 0) + 1
        
        if counts:
            # Store in analytics table
            db.table("daily_analytics").upsert({
                "user_id": user_id,
                "date": target.isoformat(),
                "activity_counts": counts,
                "total_activities": sum(counts.values()),
            }).execute()
            
            stats_created += 1
    
    return {
        "date": target.isoformat(),
        "users_processed": stats_created,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.CLEANUP_OLD_JOBS)
async def handle_cleanup_old_jobs(job: Job) -> Dict[str, Any]:
    """
    Clean up old completed/cancelled jobs.
    
    Payload:
        days: int - delete jobs older than X days
    """
    from .job_service import JobService
    
    payload = job.payload
    days = payload.get("days", 30)
    
    service = JobService()
    deleted = await service.cleanup_old_jobs(days=days)
    
    return {
        "deleted_count": deleted,
        "older_than_days": days,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK HANDLERS
# ═══════════════════════════════════════════════════════════════════════════════

@register_handler(JobType.PROCESS_WEBHOOK)
async def handle_process_webhook(job: Job) -> Dict[str, Any]:
    """
    Process an incoming webhook asynchronously.
    
    Payload:
        webhook_type: str
        webhook_data: dict
    """
    payload = job.payload
    webhook_type = payload.get("webhook_type")
    webhook_data = payload.get("webhook_data", {})
    
    # Route to appropriate handler based on webhook type
    # This is a placeholder - integrate with your webhook processing
    
    logger.info(f"Processing webhook: {webhook_type}")
    
    return {
        "webhook_type": webhook_type,
        "processed": True,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def register_job_handlers():
    """
    Ensure all handlers are registered.
    
    Call this at app startup to ensure handlers are loaded.
    """
    logger.info(f"Registered {len(JOB_HANDLERS)} job handlers: {list(JOB_HANDLERS.keys())}")
    return JOB_HANDLERS

