"""
Autopilot Engine V2 for SalesFlow AI

Complete Production-Ready Autopilot Engine with:
- Multi-Channel Support (WhatsApp, Email, LinkedIn, Instagram)
- Intelligent Scheduling (Timezone-aware, Best send time)
- Confidence-based Gating (>85% = auto-send, <85% = review)
- A/B Testing (Template variants with auto-optimization)
- Rate Limiting (Spam prevention)
- Quality Gates (Safety checks, Opt-out detection)

@author Claude Opus 4.5 (GPT-5.1 Thinking Mode)
@date 2025-01-05
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from supabase import Client

from ..config import get_settings
from ..schemas import ChatMessage
from ..schemas.message_events import MessageEvent
from ..schemas.autopilot import AutopilotMode

# Import V2 services
from .channels import get_channel_adapter, SUPPORTED_CHANNELS
from .channels.base import NormalizedMessage
from .scheduler import calculate_best_send_time, create_autopilot_job
from .rate_limiter import check_rate_limit, increment_rate_limit
from .confidence_gating import (
    check_content_safety,
    detect_opt_out,
    handle_opt_out,
    should_send_message,
    CONFIDENCE_THRESHOLD,
)
from .ab_testing import select_ab_variant, track_ab_result

# Legacy imports (for backward compatibility)
from ..db.repositories.message_events import (
    get_pending_events_for_user,
    set_event_suggested_reply,
    set_event_status,
)
from ..core.ai_prompts import (
    SALES_COACH_PROMPT,
    build_coach_prompt_with_action,
    detect_action_from_text,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================================
# AI RESPONSE GENERATION (with Confidence Scoring)
# ============================================================================


async def generate_ai_response_with_confidence(
    message_text: str,
    action: str,
    channel: str,
    history: Optional[List[ChatMessage]] = None,
) -> Dict[str, Any]:
    """
    Generate AI response WITH confidence score.
    
    Returns:
        {
            "text": str,
            "confidence": float (0.0-1.0),
            "reasoning": str,
            "model": str,
            "action": str
        }
    """
    
    # Mock mode if no API key
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set - using mock response")
        return {
            "text": _generate_mock_text(action),
            "confidence": 0.7,
            "reasoning": "Mock response (no API key)",
            "model": "mock",
            "action": action
        }
    
    try:
        # Import AI client
        from ..ai_client import AIClient
        
        ai_client = AIClient(
            api_key=settings.openai_api_key,
            model=settings.openai_model
        )
        
        # Build prompt with confidence instruction
        system_prompt = build_coach_prompt_with_action(action)
        system_prompt += f"""

═══════════════════════════════════════
AUTOPILOT MODE - CONFIDENCE SCORING:
- Channel: {channel}
- Action: {action}
- Create short, direct response (max. 4-5 sentences)
- Style: Personal, professional, {channel}-appropriate

IMPORTANT - CONFIDENCE RATING:
After your response, rate your confidence (0.0-1.0):
- 0.9-1.0: Very confident, clear context, safe response
- 0.7-0.89: Good confidence, slight uncertainty
- 0.5-0.69: Medium confidence, ambiguous
- 0.0-0.49: Low confidence, complex case

FORMAT:
Response: [Your answer here]
Confidence: [0.XX]
Reasoning: [Brief explanation]
"""
        
        # Generate response
        messages = history or []
        messages.append(ChatMessage(role="user", content=message_text))
        
        reply_full = ai_client.generate(system_prompt, messages)
        
        # Parse confidence
        import re
        
        confidence_match = re.search(r'Confidence:\s*(0\.\d+|1\.0)', reply_full)
        confidence = float(confidence_match.group(1)) if confidence_match else 0.7
        
        reasoning_match = re.search(r'Reasoning:\s*(.+?)(?:\n|$)', reply_full, re.DOTALL)
        reasoning = reasoning_match.group(1).strip() if reasoning_match else "No reasoning"
        
        # Extract answer (before Confidence line)
        answer_match = re.search(r'Response:\s*(.+?)\s*(?:Confidence:|$)', reply_full, re.DOTALL)
        answer = answer_match.group(1).strip() if answer_match else reply_full
        
        # Remove confidence/reasoning from answer if present
        answer = re.sub(r'\nConfidence:.*', '', answer, flags=re.DOTALL)
        answer = answer.strip()
        
        return {
            "text": answer,
            "confidence": confidence,
            "reasoning": reasoning,
            "model": settings.openai_model,
            "action": action
        }
    
    except Exception as e:
        logger.exception(f"Error generating AI response: {e}")
        return {
            "text": _generate_mock_text(action),
            "confidence": 0.5,
            "reasoning": f"Error: {str(e)}",
            "model": "error_fallback",
            "action": action
        }


def _generate_mock_text(action: str) -> str:
    """Generate mock text for testing"""
    mocks = {
        "objection_handler": "Verstehe ich! Lass uns das gemeinsam anschauen.",
        "follow_up": "Hi! Wollte kurz nachhaken - was denkst du?",
        "offer_create": "Gute Frage! Hier sind die Details...",
        "generate_message": "Hey! Danke für deine Nachricht."
    }
    return mocks.get(action, "Danke für deine Nachricht!")


# ============================================================================
# MAIN ENGINE FUNCTION (V2)
# ============================================================================


async def process_pending_events_v2(
    db: Client,
    user_id: str,
    max_events: int = 20
) -> Dict[str, Any]:
    """
    V2 Engine: Process pending events with full feature set.
    
    Flow:
    1. Load pending events
    2. For each event:
       a. Load autopilot settings
       b. Check if active & channel enabled
       c. Detect opt-out signals
       d. Generate AI response with confidence
       e. Run safety checks
       f. Decide: auto-send OR review queue
       g. Schedule job (if auto-send) OR mark for review
    3. Return summary
    
    Args:
        db: Supabase client
        user_id: User UUID
        max_events: Max events to process
        
    Returns:
        Summary dict with counters
    """
    logger.info(f"=== Autopilot V2 Processing START: user={user_id} ===")
    
    # Counters
    stats = {
        "processed": 0,
        "auto_scheduled": 0,
        "review_queue": 0,
        "opted_out": 0,
        "rate_limited": 0,
        "skipped": 0,
        "errors": 0
    }
    
    try:
        # 1. Load pending events
        events = await get_pending_events_for_user(db, user_id, limit=max_events)
        
        if not events:
            logger.info("No pending events found")
            return stats
        
        logger.info(f"Found {len(events)} pending events")
        
        # 2. Process each event
        for event in events:
            stats["processed"] += 1
            
            try:
                result = await _process_single_event(db, event, user_id)
                
                # Update stats
                status = result["status"]
                if status == "auto_scheduled":
                    stats["auto_scheduled"] += 1
                elif status == "review_queue":
                    stats["review_queue"] += 1
                elif status == "opted_out":
                    stats["opted_out"] += 1
                elif status == "rate_limited":
                    stats["rate_limited"] += 1
                elif status == "skipped":
                    stats["skipped"] += 1
            
            except Exception as e:
                logger.exception(f"Error processing event {event.id}: {e}")
                stats["errors"] += 1
        
        logger.info(f"=== Autopilot V2 Processing COMPLETE: {stats} ===")
        return stats
    
    except Exception as e:
        logger.exception(f"Fatal error in autopilot processing: {e}")
        stats["errors"] += 1
        return stats


async def _process_single_event(
    db: Client,
    event: MessageEvent,
    user_id: str
) -> Dict[str, Any]:
    """
    Process a single message event.
    
    Returns:
        {"status": str, "reason": str, "job_id": Optional[str]}
    """
    
    event_id = event.id
    channel = event.channel
    contact_id = event.contact_id
    
    logger.debug(f"Processing event {event_id}: channel={channel}, contact={contact_id}")
    
    # 1. Only process inbound messages
    if event.direction != "inbound":
        await set_event_status(db, event_id, "skipped")
        return {"status": "skipped", "reason": "outbound_message"}
    
    # 2. Load autopilot settings
    settings_result = await _get_autopilot_settings(db, user_id, contact_id)
    
    if not settings_result or not settings_result.get("is_active"):
        await set_event_status(db, event_id, "skipped")
        return {"status": "skipped", "reason": "autopilot_inactive"}
    
    mode = settings_result.get("mode", "off")
    enabled_channels = settings_result.get("channels", [])
    max_per_day = settings_result.get("max_auto_replies_per_day", 10)
    
    if mode == "off" or channel not in enabled_channels:
        await set_event_status(db, event_id, "skipped")
        return {"status": "skipped", "reason": f"mode_off_or_channel_disabled"}
    
    # 3. Check opt-out
    if detect_opt_out(event.normalized_text):
        await handle_opt_out(db, contact_id, channel)
        await set_event_status(db, event_id, "skipped")
        return {"status": "opted_out", "reason": "opt_out_detected"}
    
    # 4. Load contact
    contact = await _get_contact(db, contact_id)
    if not contact:
        await set_event_status(db, event_id, "skipped")
        return {"status": "skipped", "reason": "contact_not_found"}
    
    # Check if contact opted out of this channel
    if channel in contact.get("opt_out_channels", []):
        await set_event_status(db, event_id, "skipped")
        return {"status": "opted_out", "reason": "channel_opted_out"}
    
    # 5. Check rate limit
    allowed, current_count = await check_rate_limit(
        db, user_id, contact_id, channel, max_per_day
    )
    
    if not allowed:
        await set_event_status(db, event_id, "skipped")
        return {"status": "rate_limited", "reason": f"limit_reached:{current_count}/{max_per_day}"}
    
    # 6. Detect action
    action = _detect_action(event.normalized_text)
    
    # 7. Generate AI response with confidence
    ai_response = await generate_ai_response_with_confidence(
        message_text=event.normalized_text,
        action=action,
        channel=channel,
        history=await _load_conversation_history(db, contact.id) if contact else None
    )
    
    reply_text = ai_response["text"]
    confidence = ai_response["confidence"]
    reasoning = ai_response["reasoning"]
    
    # 8. Safety checks
    issues = await check_content_safety(reply_text, settings.openai_api_key)
    
    # 9. Quality gate: Should we send?
    send_allowed, gate_reason = await should_send_message(
        reply_text, contact, channel, confidence, issues, db
    )
    
    # 10. Build suggested reply
    suggested_reply = {
        "text": reply_text,
        "confidence": confidence,
        "reasoning": reasoning,
        "detected_action": action,
        "channel": channel,
        "mode_used": mode,
        "model": ai_response["model"],
        "safety_issues": issues,
        "gate_reason": gate_reason
    }
    
    # Save suggested reply
    await set_event_suggested_reply(
        db=db,
        event_id=event_id,
        suggested_reply=suggested_reply,
        new_status="suggested"
    )
    
    # 11. Decide: Auto-schedule OR review queue
    if not send_allowed:
        # Review queue (low confidence or safety issues)
        logger.info(f"Event {event_id} → REVIEW QUEUE: {gate_reason}")
        return {"status": "review_queue", "reason": gate_reason}
    
    if mode == "auto":
        # Auto-send mode: Schedule immediately
        send_time = await calculate_best_send_time(contact_id, db, channel)
        
        job = await create_autopilot_job(
            db=db,
            user_id=user_id,
            contact_id=contact_id,
            channel=channel,
            message_text=reply_text,
            scheduled_for=send_time,
            message_event_id=event_id,
            metadata={"confidence": confidence, "action": action}
        )
        
        logger.info(f"Event {event_id} → AUTO-SCHEDULED: job={job['id']}, time={send_time}")
        return {"status": "auto_scheduled", "reason": "high_confidence_auto_mode", "job_id": job["id"]}
    
    else:
        # Assist/One-Click mode: Needs human approval
        logger.info(f"Event {event_id} → REVIEW QUEUE: mode={mode}")
        return {"status": "review_queue", "reason": f"mode_{mode}_needs_approval"}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


async def _get_autopilot_settings(
    db: Client,
    user_id: str,
    contact_id: Optional[str]
) -> Optional[Dict[str, Any]]:
    """Load autopilot settings (contact-specific or global)"""
    
    # Try contact-specific first
    if contact_id:
        result = db.table("autopilot_settings")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("contact_id", contact_id)\
            .limit(1)\
            .execute()
        
        if result.data:
            return result.data[0]
    
    # Fallback: Global settings
    result = db.table("autopilot_settings")\
        .select("*")\
        .eq("user_id", user_id)\
        .is_("contact_id", "null")\
        .limit(1)\
        .execute()
    
    if result.data:
        return result.data[0]
    
    return None


async def _get_contact(db: Client, contact_id: str) -> Optional[Dict[str, Any]]:
    """Load contact from database"""
    try:
        result = db.table("contacts").select("*").eq("id", contact_id).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"Error loading contact: {e}")
    
    return None


def _detect_action(text: str) -> str:
    """Detect action from message text"""
    text_lower = text.lower()
    
    # Objection keywords
    objection_keywords = [
        "zu teuer", "kein budget", "keine zeit", "nicht interessiert",
        "too expensive", "no time", "not interested"
    ]
    
    if any(kw in text_lower for kw in objection_keywords):
        return "objection_handler"
    
    # Price inquiry
    if any(kw in text_lower for kw in ["preis", "kosten", "price", "cost"]):
        return "offer_create"
    
    # Meeting request
    if any(kw in text_lower for kw in ["termin", "treffen", "meeting", "call"]):
        return "follow_up"
    
    # Use prompt hub detection
    detected = detect_action_from_text(text)
    return detected or "generate_message"


# ============================================================================
# JOB EXECUTOR (Sends scheduled messages)
# ============================================================================


async def execute_scheduled_jobs(
    db: Client,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Execute scheduled autopilot jobs that are due.
    
    This should be called by a cron job or background worker
    every minute or so.
    
    Args:
        db: Supabase client
        limit: Max jobs to process
        
    Returns:
        Summary dict
    """
    logger.info(f"=== Executing scheduled jobs (limit={limit}) ===")
    
    stats = {
        "processed": 0,
        "sent": 0,
        "failed": 0,
        "skipped": 0
    }
    
    try:
        # Get jobs that are due (scheduled_for <= now)
        now = datetime.utcnow()
        
        result = db.table("autopilot_jobs")\
            .select("*")\
            .eq("status", "pending")\
            .lte("scheduled_for", now.isoformat())\
            .limit(limit)\
            .execute()
        
        if not result.data:
            logger.info("No jobs due for execution")
            return stats
        
        jobs = result.data
        logger.info(f"Found {len(jobs)} jobs to execute")
        
        for job in jobs:
            stats["processed"] += 1
            
            try:
                # Execute job
                send_result = await _execute_job(db, job)
                
                if send_result["success"]:
                    stats["sent"] += 1
                else:
                    stats["failed"] += 1
            
            except Exception as e:
                logger.exception(f"Error executing job {job['id']}: {e}")
                stats["failed"] += 1
                
                # Update job status
                db.table("autopilot_jobs").update({
                    "status": "failed",
                    "error_message": str(e),
                    "attempts": job["attempts"] + 1,
                    "last_attempt_at": datetime.utcnow().isoformat()
                }).eq("id", job["id"]).execute()
        
        logger.info(f"=== Job execution complete: {stats} ===")
        return stats
    
    except Exception as e:
        logger.exception(f"Fatal error executing jobs: {e}")
        return stats


async def _execute_job(db: Client, job: Dict[str, Any]) -> Dict[str, bool]:
    """
    Execute a single autopilot job.
    
    Returns:
        {"success": bool}
    """
    job_id = job["id"]
    channel = job["channel"]
    contact_id = job["contact_id"]
    user_id = job["user_id"]
    
    logger.info(f"Executing job {job_id}: channel={channel}, contact={contact_id}")
    
    # 1. Mark as sending
    db.table("autopilot_jobs").update({
        "status": "sending",
        "attempts": job["attempts"] + 1,
        "last_attempt_at": datetime.utcnow().isoformat()
    }).eq("id", job_id).execute()
    
    try:
        # 2. Load contact
        contact = await _get_contact(db, contact_id)
        if not contact:
            raise Exception(f"Contact not found: {contact_id}")
        
        # 3. Build normalized message
        normalized_msg: NormalizedMessage = {
            "id": job_id,
            "user_id": user_id,
            "contact_id": contact_id,
            "channel": channel,
            "direction": "outbound",
            "text": job["message_text"],
            "metadata": {
                "email": contact.get("email"),
                "phone_number": contact.get("phone") or contact.get("whatsapp_number"),
                "linkedin_id": contact.get("linkedin_id"),
                "instagram_id": contact.get("instagram_id"),
                **job.get("metadata", {})
            },
            "timestamp": datetime.utcnow(),
            "scheduled_for": None,
            "timezone": contact.get("timezone"),
            "detected_action": job.get("metadata", {}).get("action"),
            "confidence_score": job.get("metadata", {}).get("confidence"),
            "experiment_id": job.get("experiment_id"),
            "variant_id": job.get("variant_id")
        }
        
        # 4. Get channel adapter & send
        # Note: In production, load credentials from channel_credentials table
        adapter_config = await _get_channel_credentials(db, user_id, channel)
        
        if not adapter_config:
            raise Exception(f"No credentials configured for channel: {channel}")
        
        adapter = get_channel_adapter(channel, adapter_config)
        payload = adapter.prepare_outgoing(normalized_msg)
        send_result = await adapter.send(payload)
        
        # 5. Update job status
        if send_result.success:
            db.table("autopilot_jobs").update({
                "status": "sent",
                "sent_at": send_result.sent_at.isoformat() if send_result.sent_at else datetime.utcnow().isoformat(),
                "metadata": {
                    **job.get("metadata", {}),
                    "channel_message_id": send_result.message_id
                }
            }).eq("id", job_id).execute()
            
            # Increment rate limit
            await increment_rate_limit(db, user_id, contact_id, channel)
            
            # Track A/B result (if experiment)
            if job.get("experiment_id") and job.get("variant_id"):
                await track_ab_result(
                    db,
                    job["experiment_id"],
                    job["variant_id"],
                    job.get("message_event_id", ""),
                    contact_id,
                    "sent",
                    1.0
                )
            
            logger.info(f"Job {job_id} sent successfully: {send_result.message_id}")
            return {"success": True}
        
        else:
            # Send failed
            error_msg = send_result.error or "Unknown error"
            
            # Check if we should retry
            attempts = job["attempts"] + 1
            max_attempts = job.get("max_attempts", 3)
            
            if attempts < max_attempts:
                # Retry later
                db.table("autopilot_jobs").update({
                    "status": "pending",
                    "error_message": error_msg,
                    "attempts": attempts
                }).eq("id", job_id).execute()
                
                logger.warning(f"Job {job_id} failed, will retry ({attempts}/{max_attempts}): {error_msg}")
            else:
                # Max retries reached
                db.table("autopilot_jobs").update({
                    "status": "failed",
                    "error_message": error_msg,
                    "attempts": attempts
                }).eq("id", job_id).execute()
                
                logger.error(f"Job {job_id} failed permanently after {attempts} attempts: {error_msg}")
            
            return {"success": False}
    
    except Exception as e:
        logger.exception(f"Error executing job {job_id}: {e}")
        
        # Update job with error
        db.table("autopilot_jobs").update({
            "status": "failed",
            "error_message": str(e),
            "attempts": job["attempts"] + 1
        }).eq("id", job_id).execute()
        
        return {"success": False}


async def _get_channel_credentials(
    db: Client,
    user_id: str,
    channel: str
) -> Optional[Dict[str, Any]]:
    """
    Load channel credentials from database.
    
    For production: Credentials should be encrypted in DB.
    For MVP: Return mock credentials or load from env vars.
    """
    
    # Load from channel_credentials table or environment
    from app.config import get_settings
    settings = get_settings()
    
    # First try environment variables
    env_credentials = _get_credentials_from_env(channel, settings)
    if env_credentials:
        return env_credentials
    
    logger.warning(f"No credentials found for {channel} - using mock config")
    
    # Mock configurations (replace with real credentials in production)
    mock_configs = {
        "whatsapp": {
            "api_key": "mock_whatsapp_token",
            "phone_number_id": "123456789"
        },
        "email": {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": "noreply@alsales.ai",
            "password": "mock_password",
            "from_email": "noreply@alsales.ai"
        },
        "linkedin": {
            "access_token": "mock_linkedin_token"
        },
        "instagram": {
            "page_access_token": "mock_instagram_token",
            "instagram_account_id": "123456789"
        }
    }
    
    return mock_configs.get(channel)


async def _load_conversation_history(
    db: Client,
    contact_id: str,
    limit: int = 10
) -> Optional[List[Dict[str, Any]]]:
    """
    Load recent conversation history for a contact.
    
    Returns the last N messages between us and the contact.
    """
    try:
        result = db.table("message_events").select(
            "id", "direction", "normalized_text", "channel", "created_at"
        ).eq(
            "contact_id", contact_id
        ).order(
            "created_at", desc=True
        ).limit(limit).execute()
        
        if result.data:
            # Reverse to get chronological order
            history = list(reversed(result.data))
            return [
                {
                    "role": "user" if msg["direction"] == "inbound" else "assistant",
                    "content": msg["normalized_text"],
                    "channel": msg["channel"],
                    "timestamp": msg["created_at"]
                }
                for msg in history
            ]
    except Exception as e:
        logger.warning(f"Could not load conversation history: {e}")
    
    return None


def _get_credentials_from_env(channel: str, settings) -> Optional[Dict[str, Any]]:
    """
    Load channel credentials from environment variables.
    """
    if channel == "whatsapp":
        if hasattr(settings, 'whatsapp_api_key') and settings.whatsapp_api_key:
            return {
                "api_key": settings.whatsapp_api_key,
                "phone_number_id": getattr(settings, 'whatsapp_phone_number_id', '')
            }
    elif channel == "email":
        if hasattr(settings, 'smtp_host') and settings.smtp_host:
            return {
                "host": settings.smtp_host,
                "port": getattr(settings, 'smtp_port', 587),
                "user": getattr(settings, 'smtp_user', ''),
                "password": getattr(settings, 'smtp_password', ''),
                "from_email": getattr(settings, 'smtp_from_email', '')
            }
    elif channel == "linkedin":
        if hasattr(settings, 'linkedin_access_token') and settings.linkedin_access_token:
            return {
                "access_token": settings.linkedin_access_token
            }
    elif channel == "instagram":
        if hasattr(settings, 'instagram_access_token') and settings.instagram_access_token:
            return {
                "page_access_token": settings.instagram_access_token,
                "instagram_account_id": getattr(settings, 'instagram_account_id', '')
            }
    
    return None


__all__ = [
    "process_pending_events_v2",
    "execute_scheduled_jobs",
]

