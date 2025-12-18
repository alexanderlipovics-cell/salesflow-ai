"""
Follow-up Revenue Engine - State Machine Logic
Handles automatic state transitions and queue management
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from supabase import Client
import logging

logger = logging.getLogger(__name__)

# Valid state transitions
STATE_TRANSITIONS = {
    'new': ['engaged', 'lost', 'dormant'],
    'engaged': ['opportunity', 'lost', 'dormant'],
    'opportunity': ['won', 'lost', 'dormant'],
    'won': ['churned', 'dormant'],
    'lost': ['engaged', 'dormant'],  # Can be re-engaged
    'churned': ['engaged', 'dormant'],
    'dormant': ['engaged', 'new']  # Can be resurrected
}

class FollowUpEngine:
    def __init__(self, db: Client):
        self.db = db
    
    async def change_lead_state(
        self, 
        user_id: str, 
        lead_id: str, 
        new_state: str,
        vertical: str = 'mlm'
    ) -> Dict[str, Any]:
        """
        Change lead state and reset follow-up queue.
        1. Validates state transition
        2. Clears existing queue for this lead
        3. Loads first step of new state's cycle
        4. Creates new queue entry
        """
        # 1. Get current lead state
        lead_result = self.db.table("leads").select("status").eq("id", lead_id).eq("user_id", user_id).single().execute()
        
        if not lead_result.data:
            return {"success": False, "error": "Lead not found"}
        
        current_state = lead_result.data.get("status", "new").lower()
        
        # 2. Validate transition
        if new_state not in STATE_TRANSITIONS.get(current_state, []):
            return {
                "success": False, 
                "error": f"Invalid transition: {current_state} → {new_state}",
                "valid_transitions": STATE_TRANSITIONS.get(current_state, [])
            }
        
        # 3. Clear existing queue entries for this lead
        self.db.table("contact_follow_up_queue")\
            .update({"status": "skipped"})\
            .eq("contact_id", lead_id)\
            .eq("user_id", user_id)\
            .eq("status", "pending")\
            .execute()
        
        # 4. Update lead status
        self.db.table("leads").update({
            "status": new_state.upper(),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", lead_id).eq("user_id", user_id).execute()
        
        # 5. Get first cycle step for new state
        cycle_result = self.db.table("follow_up_cycles")\
            .select("*")\
            .eq("vertical", vertical)\
            .eq("state", new_state)\
            .eq("is_active", True)\
            .order("sequence_order")\
            .limit(1)\
            .execute()
        
        if cycle_result.data:
            cycle = cycle_result.data[0]
            due_at = datetime.utcnow() + timedelta(days=cycle["days_after_previous"])
            
            # 6. Create new queue entry
            self.db.table("contact_follow_up_queue").insert({
                "user_id": user_id,
                "contact_id": lead_id,
                "cycle_id": cycle["id"],
                "current_state": new_state,
                "next_due_at": due_at.isoformat(),
                "status": "pending"
            }).execute()
            
            return {
                "success": True,
                "message": f"Lead moved to {new_state}",
                "next_followup": {
                    "due_at": due_at.isoformat(),
                    "type": cycle["message_type"],
                    "template": cycle["template_key"]
                }
            }
        
        return {
            "success": True,
            "message": f"Lead moved to {new_state} (no cycles defined)"
        }
    
    async def process_sent_followup(
        self,
        user_id: str,
        queue_id: str
    ) -> Dict[str, Any]:
        """
        After a follow-up is sent, schedule the next one in sequence.
        """
        # 1. Get current queue item
        queue_result = self.db.table("contact_follow_up_queue")\
            .select("*, follow_up_cycles(*)")\
            .eq("id", queue_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not queue_result.data:
            return {"success": False, "error": "Queue item not found"}
        
        queue_item = queue_result.data
        current_cycle = queue_item.get("follow_up_cycles", {})
        
        # 2. Mark as sent
        self.db.table("contact_follow_up_queue").update({
            "status": "sent"
        }).eq("id", queue_id).execute()
        
        # 3. Find next step in sequence
        next_cycle = self.db.table("follow_up_cycles")\
            .select("*")\
            .eq("vertical", current_cycle.get("vertical", "mlm"))\
            .eq("state", queue_item["current_state"])\
            .eq("is_active", True)\
            .gt("sequence_order", current_cycle.get("sequence_order", 0))\
            .order("sequence_order")\
            .limit(1)\
            .execute()
        
        if next_cycle.data:
            cycle = next_cycle.data[0]
            due_at = datetime.utcnow() + timedelta(days=cycle["days_after_previous"])
            
            # 4. Create next queue entry
            self.db.table("contact_follow_up_queue").insert({
                "user_id": user_id,
                "contact_id": queue_item["contact_id"],
                "cycle_id": cycle["id"],
                "current_state": queue_item["current_state"],
                "next_due_at": due_at.isoformat(),
                "status": "pending"
            }).execute()
            
            return {
                "success": True,
                "message": "Next follow-up scheduled",
                "next_followup": {
                    "due_at": due_at.isoformat(),
                    "days": cycle["days_after_previous"],
                    "type": cycle["message_type"]
                }
            }
        
        return {
            "success": True,
            "message": "Sequence complete for this state"
        }
    
    async def get_pending_queue(
        self,
        user_id: str,
        limit: int = 50
    ) -> list:
        """Get all pending follow-ups for a user"""
        result = self.db.table("contact_follow_up_queue")\
            .select("*, follow_up_cycles(*), leads(id, name, email, phone, instagram, whatsapp)")\
            .eq("user_id", user_id)\
            .eq("status", "pending")\
            .lte("next_due_at", (datetime.utcnow() + timedelta(days=7)).isoformat())\
            .order("next_due_at")\
            .limit(limit)\
            .execute()
        
        return result.data or []
