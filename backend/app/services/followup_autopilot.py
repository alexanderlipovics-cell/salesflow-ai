"""
Autopilot Service für Follow-ups

Integriert Autopilot-Funktionalität in das Follow-up-System:
- Confidence Score Berechnung
- Email Auto-Send
- Background Processing
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID

from ..supabase_client import get_supabase_client
from ..services.gmail_service import GmailService
from ..core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def generate_followup_with_confidence(
    lead_id: str,
    user_id: str,
    context: Optional[Dict[str, Any]] = None,
    previous_message: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generiert Follow-up Nachricht mit Confidence Score.
    
    Returns:
        {
            "message": str,
            "confidence_score": float (0-100),
            "confidence_reason": str,
            "execution_mode": str ("prepared", "autopilot", "manual")
        }
    """
    try:
        from ..ai_client import chat_completion
        
        # Build prompt for confidence scoring
        prompt = f"""
Generiere eine Follow-up Nachricht für einen Lead.

Kontext: {json.dumps(context or {}, indent=2)}
Letzte Nachricht: {previous_message or "Keine vorherige Nachricht"}

Antworte als JSON:
{{
    "message": "Die Nachricht (kurz, persönlich, mit klarem CTA)",
    "confidence_score": 0-100,
    "confidence_reason": "Warum dieser Score"
}}

Confidence Score Regeln:
- 90-100: Standard Follow-up, keine offenen Fragen, klarer Kontext ("Hast du meine Nachricht gesehen?")
- 70-89: Kontext-spezifisch aber sicher, gute Datenlage
- 50-69: Komplex, sollte geprüft werden, unklare Situation
- <50: Riskant, manuelle Prüfung nötig, wenig Kontext

Wichtig: Sei ehrlich beim Confidence Score. Niedrige Scores sind OK wenn der Kontext unklar ist.
"""
        
        response_text = await chat_completion(
            messages=[
                {"role": "system", "content": "Du bist ein Sales-Assistent. Antworte IMMER als JSON."},
                {"role": "user", "content": prompt}
            ],
            model="gpt-4o-mini",
            max_tokens=500
        )
        
        result = json.loads(response_text)
        
        confidence_score = float(result.get("confidence_score", 70))
        confidence_reason = result.get("confidence_reason", "Standard Follow-up")
        message = result.get("message", "")
        
        # Determine execution mode based on confidence
        if confidence_score >= 90:
            execution_mode = "autopilot"  # Kann automatisch gesendet werden
        elif confidence_score >= 70:
            execution_mode = "prepared"  # User entscheidet
        else:
            execution_mode = "manual"  # Sollte geprüft werden
        
        return {
            "message": message,
            "confidence_score": confidence_score,
            "confidence_reason": confidence_reason,
            "execution_mode": execution_mode
        }
        
    except Exception as e:
        logger.error(f"Error generating followup with confidence: {e}", exc_info=True)
        # Fallback: Return default
        return {
            "message": "Hallo, ich wollte kurz nachfragen wie es dir geht.",
            "confidence_score": 50.0,
            "confidence_reason": "Fehler bei AI-Generierung - manuelle Prüfung empfohlen",
            "execution_mode": "manual"
        }


async def process_autopilot_sends(user_id: str) -> Dict[str, Any]:
    """
    Verarbeitet Autopilot Follow-ups für einen User.
    
    - Lädt User Settings
    - Findet high-confidence Follow-ups
    - Sendet Emails automatisch (wenn Gmail verbunden)
    """
    db = get_supabase_client()
    
    try:
        # Lade User Settings
        settings_result = (
            db.table("autopilot_settings")
            .select("*")
            .eq("user_id", user_id)
            .is_("contact_id", "null")
            .single()
            .execute()
        )
        
        if not settings_result.data:
            logger.debug(f"No autopilot settings for user {user_id}")
            return {"processed": 0, "sent": 0, "skipped": 0}
        
        autopilot_settings = settings_result.data
        
        # Prüfe ob Autopilot aktiv ist
        if not autopilot_settings.get("is_active") or autopilot_settings.get("mode") == "off":
            logger.debug(f"Autopilot not active for user {user_id}")
            return {"processed": 0, "sent": 0, "skipped": 0}
        
        # Hole min_confidence aus Settings (default: 90)
        min_confidence = autopilot_settings.get("min_confidence", 90)
        auto_channels = autopilot_settings.get("channels", ["email"])
        
        # Hole high-confidence Follow-ups für Email
        followups_result = (
            db.table("followup_suggestions")
            .select("*, leads(*)")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .gte("confidence_score", min_confidence)
            .in_("channel", [ch.upper() for ch in auto_channels])
            .lte("due_at", datetime.utcnow().isoformat())
            .execute()
        )
        
        if not followups_result.data:
            return {"processed": 0, "sent": 0, "skipped": 0}
        
        processed = 0
        sent = 0
        skipped = 0
        
        for followup in followups_result.data:
            processed += 1
            channel = followup.get("channel", "").upper()
            
            # Nur Email Auto-Send (WhatsApp/Instagram bleiben "prepared")
            if channel == "EMAIL" and "email" in auto_channels:
                lead = followup.get("leads", {})
                lead_email = lead.get("email") if isinstance(lead, dict) else None
                
                if not lead_email:
                    logger.warning(f"No email for lead in followup {followup.get('id')}")
                    skipped += 1
                    continue
                
                # Prüfe ob Gmail verbunden ist
                email_account = (
                    db.table("email_accounts")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("provider", "gmail")
                    .limit(1)
                    .execute()
                )
                
                if not email_account.data:
                    logger.debug(f"No Gmail account connected for user {user_id}")
                    skipped += 1
                    continue
                
                account = email_account.data[0]
                
                # Sende Email via Gmail
                try:
                    gmail_service = GmailService(access_token=account.get("access_token"))
                    
                    subject = f"Re: {lead.get('name', 'Follow-up')}"
                    body = followup.get("suggested_message", "")
                    
                    # Sende Email
                    result = await gmail_service.send_message(
                        to=lead_email,
                        subject=subject,
                        body=body,
                        html=False
                    )
                    
                    if result:
                        # Update Follow-up Status
                        db.table("followup_suggestions").update({
                            "status": "sent",
                            "execution_mode": "autopilot",
                            "sent_at": datetime.utcnow().isoformat()
                        }).eq("id", followup.get("id")).execute()
                        
                        # Log Interaction
                        db.table("lead_interactions").insert({
                            "user_id": user_id,
                            "lead_id": followup.get("lead_id"),
                            "interaction_type": "email_sent",
                            "channel": "email",
                            "raw_notes": f"Autopilot Email: {body[:200]}",
                            "interaction_at": datetime.utcnow().isoformat(),
                            "created_at": datetime.utcnow().isoformat()
                        }).execute()
                        
                        sent += 1
                        logger.info(f"Autopilot email sent: followup_id={followup.get('id')}, lead_email={lead_email}")
                    else:
                        skipped += 1
                        
                except Exception as e:
                    logger.error(f"Error sending autopilot email: {e}", exc_info=True)
                    skipped += 1
            else:
                # WhatsApp/Instagram: Skip (kein Auto-Send)
                skipped += 1
        
        return {
            "processed": processed,
            "sent": sent,
            "skipped": skipped
        }
        
    except Exception as e:
        logger.error(f"Error in process_autopilot_sends: {e}", exc_info=True)
        return {"processed": 0, "sent": 0, "skipped": 0, "error": str(e)}


async def run_autopilot_for_all_users():
    """
    Background Job: Verarbeitet Autopilot Follow-ups für alle aktiven User.
    Wird alle 15 Minuten ausgeführt.
    """
    db = get_supabase_client()
    
    try:
        # Hole alle User mit aktivem Autopilot
        users_result = (
            db.table("autopilot_settings")
            .select("user_id")
            .eq("is_active", True)
            .neq("mode", "off")
            .execute()
        )
        
        if not users_result.data:
            return
        
        user_ids = list(set([u["user_id"] for u in users_result.data]))
        
        total_processed = 0
        total_sent = 0
        
        for user_id in user_ids:
            result = await process_autopilot_sends(user_id)
            total_processed += result.get("processed", 0)
            total_sent += result.get("sent", 0)
        
        logger.info(f"Autopilot processed: {total_processed} followups, {total_sent} sent for {len(user_ids)} users")
        
    except Exception as e:
        logger.error(f"Error in run_autopilot_for_all_users: {e}", exc_info=True)

