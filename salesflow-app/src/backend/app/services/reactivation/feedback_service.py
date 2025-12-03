"""
Feedback Service

Verarbeitet User-Feedback für Few-Shot Learning.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class FeedbackService:
    """
    Verarbeitet Feedback für kontinuierliches Lernen.
    """
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def process_feedback(
        self,
        draft_id: str,
        action: str,
        edited_message: Optional[str] = None,
        user_notes: Optional[str] = None
    ) -> None:
        """
        Verarbeitet Feedback und speichert für Learning.
        """
        # Draft laden
        draft = await self._get_draft(draft_id)
        if not draft:
            raise ValueError(f"Draft {draft_id} not found")
        
        # Learning Event erstellen
        learning_event = {
            "user_id": draft["user_id"],
            "event_type": "reactivation_feedback",
            "action": action,
            "original_message": draft["draft_message"],
            "edited_message": edited_message,
            "user_notes": user_notes,
            "lead_context": draft.get("lead_context"),
            "signals": draft.get("signals"),
            "confidence_score": draft.get("confidence_score"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        await self.supabase.from_("learning_events").insert(learning_event).execute()
        
        # Draft Status updaten
        await self.supabase.from_("reactivation_drafts").update({
            "status": action,
            "reviewed_at": datetime.utcnow().isoformat(),
            "reviewer_notes": user_notes,
            "edited_message": edited_message
        }).eq("id", draft_id).execute()
    
    async def get_few_shot_examples(
        self,
        user_id: str,
        signal_type: str = None,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Holt erfolgreiche Beispiele für Few-Shot Learning.
        """
        query = self.supabase.from_("learning_events")\
            .select("original_message, edited_message, lead_context, signals")\
            .eq("user_id", user_id)\
            .eq("event_type", "reactivation_feedback")\
            .in_("action", ["approved", "edited"])\
            .order("created_at", desc=True)\
            .limit(limit * 2)
        
        response = await query.execute()
        
        examples = []
        for event in response.data or []:
            message = event.get("edited_message") or event.get("original_message")
            examples.append({
                "message": message,
                "context": event.get("lead_context"),
                "signals": event.get("signals")
            })
            
            if len(examples) >= limit:
                break
        
        return examples
    
    async def _get_draft(self, draft_id: str) -> Optional[Dict]:
        """
        Lädt einen Draft.
        """
        response = await self.supabase.from_("reactivation_drafts")\
            .select("*")\
            .eq("id", draft_id)\
            .single()\
            .execute()
        
        return response.data

