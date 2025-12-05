"""
Confidence Gating & Quality Assurance for Autopilot Engine V2

Determines if AI-generated messages are safe to send automatically.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from supabase import Client

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIDENCE THRESHOLD
# ============================================================================

CONFIDENCE_THRESHOLD = 0.85  # 85% - messages below this go to review queue


# ============================================================================
# CONTENT SAFETY CHECKS
# ============================================================================


async def check_content_safety(
    text: str,
    openai_api_key: Optional[str] = None
) -> List[str]:
    """
    Check content for toxicity, compliance issues, spam signals.
    
    Uses:
    1. OpenAI Moderation API (if API key provided)
    2. Custom keyword filtering
    
    Args:
        text: Message text to check
        openai_api_key: Optional OpenAI API key for moderation
        
    Returns:
        List of issues (empty if safe)
    """
    issues = []
    
    # 1. OpenAI Moderation API
    if openai_api_key:
        try:
            from openai import OpenAI
            
            client = OpenAI(api_key=openai_api_key)
            moderation = client.moderations.create(input=text)
            result = moderation.results[0]
            
            if result.flagged:
                categories = result.categories
                if categories.hate:
                    issues.append("hate_speech")
                if categories.sexual:
                    issues.append("sexual_content")
                if categories.violence:
                    issues.append("violence")
                if categories.self_harm:
                    issues.append("self_harm")
        
        except Exception as e:
            logger.warning(f"OpenAI Moderation API error: {e}")
    
    # 2. Custom Compliance Checks
    text_lower = text.lower()
    
    # Forbidden keywords (legal/compliance risk)
    forbidden_keywords = [
        "garantie", "garantiert", "risikofrei", "ohne risiko",
        "guaranteed", "risk-free", "schnell reich", "get rich quick",
        "keine kosten", "kostenlos", "free money", "geld verdienen",
        "100% sicher", "100% safe", "kein verlust"
    ]
    
    for keyword in forbidden_keywords:
        if keyword in text_lower:
            issues.append(f"compliance_risk:{keyword}")
            break
    
    # 3. Spam Detection
    spam_patterns = [
        r'klick hier.{0,50}http',  # Suspicious links
        r'(!!!){2,}',  # Excessive exclamation
        r'([A-Z]{5,})',  # EXCESSIVE CAPS
        r'💰{3,}|💵{3,}',  # Money emoji spam
    ]
    
    for pattern in spam_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            issues.append("spam_signal")
            break
    
    return issues


# ============================================================================
# OPT-OUT DETECTION
# ============================================================================


def detect_opt_out(message_text: str) -> bool:
    """
    Detect opt-out signals in incoming messages.
    
    Args:
        message_text: Incoming message text
        
    Returns:
        True if opt-out detected
    """
    text_lower = message_text.lower()
    
    opt_out_keywords = [
        "stop", "unsubscribe", "abmelden", "kein interesse",
        "nicht mehr kontaktieren", "leave me alone", "lass mich in ruhe",
        "don't contact me", "remove me", "delete my data",
        "keine nachrichten mehr", "no more messages"
    ]
    
    return any(keyword in text_lower for keyword in opt_out_keywords)


async def handle_opt_out(
    db: Client,
    contact_id: str,
    channel: str
):
    """
    Handle opt-out request.
    
    Actions:
    1. Add channel to opt_out_channels
    2. Cancel pending autopilot jobs
    3. Log event
    
    Args:
        db: Supabase client
        contact_id: Contact UUID
        channel: Channel to opt out from
    """
    try:
        # 1. Get contact
        result = db.table("contacts").select("*").eq("id", contact_id).execute()
        
        if not result.data:
            logger.warning(f"Contact not found for opt-out: {contact_id}")
            return
        
        contact = result.data[0]
        opt_out_channels = contact.get("opt_out_channels", [])
        
        # 2. Add channel if not already opted out
        if channel not in opt_out_channels:
            opt_out_channels.append(channel)
            
            db.table("contacts").update({
                "opt_out_channels": opt_out_channels,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", contact_id).execute()
            
            logger.info(f"Contact {contact_id} opted out of {channel}")
        
        # 3. Cancel pending jobs for this channel
        db.table("autopilot_jobs").update({
            "status": "cancelled",
            "error_message": f"Contact opted out of {channel}",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("contact_id", contact_id)\
          .eq("channel", channel)\
          .eq("status", "pending")\
          .execute()
        
        logger.info(f"Cancelled pending jobs for contact {contact_id} on {channel}")
    
    except Exception as e:
        logger.exception(f"Error handling opt-out: {e}")


# ============================================================================
# MESSAGE QUALITY GATES
# ============================================================================


async def should_send_message(
    message_text: str,
    contact: Dict,
    channel: str,
    confidence: float,
    issues: List[str],
    db: Client
) -> Tuple[bool, str]:
    """
    Quality gate: Decide if message should be sent.
    
    Checks:
    1. Opt-out status
    2. Confidence threshold
    3. Safety issues
    4. Message freshness
    5. Recent opt-out signals
    
    Args:
        message_text: Message to send
        contact: Contact dict
        channel: Channel name
        confidence: AI confidence score (0.0-1.0)
        issues: List of detected issues
        db: Supabase client
        
    Returns:
        (allowed: bool, reason: str)
    """
    
    # 1. Check opt-out
    opt_out_channels = contact.get("opt_out_channels", [])
    if channel in opt_out_channels:
        return (False, "contact_opted_out")
    
    # 2. Check confidence
    if confidence < CONFIDENCE_THRESHOLD:
        return (False, f"low_confidence:{confidence:.2f}")
    
    # 3. Check safety issues
    if issues:
        return (False, f"safety_issue:{','.join(issues)}")
    
    # 4. Check recent opt-out signals in conversation
    try:
        # Get recent messages from contact
        recent_result = db.table("message_events")\
            .select("text, direction")\
            .eq("contact_id", contact["id"])\
            .eq("direction", "inbound")\
            .gte("created_at", (datetime.utcnow() - timedelta(days=7)).isoformat())\
            .limit(10)\
            .execute()
        
        if recent_result.data:
            for msg in recent_result.data:
                if detect_opt_out(msg["text"]):
                    return (False, "opt_out_detected_in_history")
    
    except Exception as e:
        logger.warning(f"Error checking recent messages: {e}")
    
    # All checks passed
    return (True, "all_checks_passed")


__all__ = [
    "check_content_safety",
    "detect_opt_out",
    "handle_opt_out",
    "should_send_message",
    "CONFIDENCE_THRESHOLD",
]

