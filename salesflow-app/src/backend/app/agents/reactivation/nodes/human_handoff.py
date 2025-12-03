"""
Reactivation Agent - Human Handoff Node

Übergibt die Nachricht an die Review Queue für Human-in-the-Loop.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from ..state import ReactivationState

logger = logging.getLogger(__name__)


async def run(state: ReactivationState) -> dict:
    """
    Human Handoff Node: Speichert Draft in Review Queue.
    
    Erstellt einen Eintrag in reactivation_drafts mit:
    - Draft Message
    - Lead Context
    - Signals
    - Confidence Score
    - Expiry Date (7 Tage)
    """
    run_id = state.get("run_id", "unknown")
    user_id = state.get("user_id")
    lead_id = state.get("lead_id")
    
    logger.info(f"[{run_id}] Human Handoff: Creating draft for review")
    
    try:
        draft_id = await _create_draft(state)
        
        if not draft_id:
            logger.error(f"[{run_id}] Failed to create draft")
            return {
                "draft_id": None,
                "error": "Draft creation failed",
            }
        
        logger.info(f"[{run_id}] Draft created: {draft_id}")
        
        # Optional: Push Notification an User
        await _notify_user(user_id, lead_id, draft_id)
        
        return {
            "draft_id": draft_id,
            "completed_at": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        logger.exception(f"[{run_id}] Human Handoff failed: {e}")
        return {
            "draft_id": None,
            "error": str(e),
        }


async def _create_draft(state: ReactivationState) -> Optional[str]:
    """
    Erstellt Draft-Eintrag in der Datenbank.
    """
    from ....db.supabase import get_supabase
    
    supabase = get_supabase()
    
    # Draft Data
    draft_data = {
        "user_id": state.get("user_id"),
        "lead_id": state.get("lead_id"),
        "run_id": state.get("run_id"),
        "draft_message": state.get("draft_message"),
        "suggested_channel": state.get("suggested_channel"),
        "signals": state.get("signals", []),
        "lead_context": state.get("lead_context", {}),
        "confidence_score": state.get("confidence_score", 0),
        "status": "pending",
        "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
    }
    
    response = await supabase.from_("reactivation_drafts")\
        .insert(draft_data)\
        .execute()
    
    if response.data and len(response.data) > 0:
        return response.data[0]["id"]
    
    return None


async def _notify_user(user_id: str, lead_id: str, draft_id: str) -> None:
    """
    Sendet Push Notification an den User.
    """
    try:
        from ....services.push.service import PushService
        from ....db.supabase import get_supabase
        
        supabase = get_supabase()
        push_service = PushService(supabase)
        
        await push_service.send_notification(
            user_id=user_id,
            title="🔄 Reaktivierung bereit",
            body="Ein Lead wartet auf Ihre Überprüfung",
            data={
                "type": "reactivation_draft",
                "lead_id": lead_id,
                "draft_id": draft_id,
            }
        )
    except Exception as e:
        # Notification Failure sollte nicht den Flow stoppen
        logger.warning(f"Failed to send notification: {e}")

