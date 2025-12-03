# backend/app/services/chat_import/pending_actions.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PENDING ACTIONS SERVICE                                                    ║
║  Verwaltung ausstehender Lead-Aktionen                                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Features:
- Pending Actions für Daily Flow
- Zahlungsprüfungen
- Follow-up Erinnerungen
- Action Snooze & Complete
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from dataclasses import dataclass

from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class PendingActionSummary:
    """Zusammenfassung für Daily Flow"""
    date: date
    total_pending: int
    overdue: int
    payment_checks: int
    follow_ups: int
    calls: int
    high_priority: int
    by_type: Dict[str, int]


# =============================================================================
# SERVICE CLASS
# =============================================================================

class PendingActionsService:
    """
    Service für ausstehende Lead-Aktionen.
    
    Wird vom Daily Flow und Chat Import verwendet.
    """
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # GET ACTIONS
    # =========================================================================
    
    async def get_pending_actions(
        self,
        user_id: str,
        due_date: Optional[date] = None,
        action_type: Optional[str] = None,
        include_lead: bool = True,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Holt ausstehende Aktionen für einen User.
        
        Ideal für Daily Flow: due_date = heute holt alle fälligen Aktionen.
        """
        
        if include_lead:
            # Nutze RPC für Join
            result = self.db.rpc("get_pending_actions_with_leads", {
                "p_user_id": user_id,
                "p_due_date": (due_date or date.today()).isoformat(),
                "p_action_type": action_type,
                "p_limit": limit,
            }).execute()
        else:
            query = self.db.table("lead_pending_actions").select("*")
            query = query.eq("user_id", user_id)
            query = query.eq("status", "pending")
            
            if due_date:
                query = query.lte("due_date", due_date.isoformat())
            
            if action_type:
                query = query.eq("action_type", action_type)
            
            query = query.order("priority").order("due_date")
            query = query.limit(limit)
            
            result = query.execute()
        
        return result.data or []
    
    async def get_payment_checks(
        self,
        user_id: str,
        include_overdue: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Holt alle fälligen Zahlungsprüfungen.
        
        Besonders wichtig für Leads mit deal_state = 'pending_payment'!
        """
        
        due_date = date.today() if include_overdue else date.today()
        
        return await self.get_pending_actions(
            user_id=user_id,
            due_date=due_date,
            action_type="check_payment",
        )
    
    async def get_daily_summary(
        self,
        user_id: str,
        for_date: Optional[date] = None,
    ) -> PendingActionSummary:
        """
        Holt Tages-Zusammenfassung für Daily Flow Header.
        """
        
        check_date = for_date or date.today()
        
        result = self.db.rpc("get_daily_action_summary", {
            "p_user_id": user_id,
            "p_date": check_date.isoformat(),
        }).execute()
        
        data = result.data or {}
        
        return PendingActionSummary(
            date=check_date,
            total_pending=data.get("total_pending", 0),
            overdue=data.get("overdue", 0),
            payment_checks=data.get("payment_checks", 0),
            follow_ups=data.get("follow_ups", 0),
            calls=0,  # TODO
            high_priority=data.get("high_priority", 0),
            by_type=data.get("by_type", {}),
        )
    
    # =========================================================================
    # ACTION MANAGEMENT
    # =========================================================================
    
    async def complete_action(
        self,
        action_id: str,
        user_id: str,
        notes: Optional[str] = None,
    ) -> bool:
        """Markiert eine Aktion als erledigt"""
        
        result = self.db.rpc("complete_pending_action", {
            "p_action_id": action_id,
            "p_user_id": user_id,
            "p_notes": notes,
        }).execute()
        
        return bool(result.data)
    
    async def snooze_action(
        self,
        action_id: str,
        user_id: str,
        snooze_until: date,
    ) -> bool:
        """Verschiebt eine Aktion auf später"""
        
        result = self.db.rpc("snooze_pending_action", {
            "p_action_id": action_id,
            "p_user_id": user_id,
            "p_snooze_until": snooze_until.isoformat(),
        }).execute()
        
        return bool(result.data)
    
    async def skip_action(
        self,
        action_id: str,
        user_id: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Überspringt eine Aktion"""
        
        result = self.db.table("lead_pending_actions").update({
            "status": "skipped",
            "notes": reason,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", action_id).eq("user_id", user_id).execute()
        
        return bool(result.data)
    
    async def create_action(
        self,
        lead_id: str,
        user_id: str,
        action_type: str,
        due_date: date,
        reason: Optional[str] = None,
        suggested_message: Optional[str] = None,
        priority: int = 2,
    ) -> Dict[str, Any]:
        """Erstellt eine neue Pending Action"""
        
        result = self.db.table("lead_pending_actions").insert({
            "lead_id": lead_id,
            "user_id": user_id,
            "action_type": action_type,
            "due_date": due_date.isoformat(),
            "action_reason": reason,
            "suggested_message": suggested_message,
            "priority": priority,
            "status": "pending",
        }).execute()
        
        if not result.data:
            raise Exception("Action konnte nicht erstellt werden")
        
        return result.data[0]
    
    # =========================================================================
    # BULK OPERATIONS
    # =========================================================================
    
    async def complete_all_for_lead(
        self,
        lead_id: str,
        user_id: str,
        action_type: Optional[str] = None,
    ) -> int:
        """Markiert alle Aktionen für einen Lead als erledigt"""
        
        query = self.db.table("lead_pending_actions").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
        }).eq("lead_id", lead_id).eq("user_id", user_id).eq("status", "pending")
        
        if action_type:
            query = query.eq("action_type", action_type)
        
        result = query.execute()
        
        return len(result.data) if result.data else 0
    
    async def get_overdue_count(
        self,
        user_id: str,
    ) -> int:
        """Zählt überfällige Aktionen"""
        
        today = date.today().isoformat()
        
        result = self.db.table("lead_pending_actions").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq(
            "status", "pending"
        ).lt("due_date", today).execute()
        
        return result.count or 0
    
    # =========================================================================
    # SMART SCHEDULING
    # =========================================================================
    
    async def schedule_follow_up(
        self,
        lead_id: str,
        user_id: str,
        days_from_now: int = 3,
        reason: str = "Follow-up",
        suggested_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Scheduling Helper für Follow-ups"""
        
        due_date = date.today() + timedelta(days=days_from_now)
        
        return await self.create_action(
            lead_id=lead_id,
            user_id=user_id,
            action_type="follow_up",
            due_date=due_date,
            reason=reason,
            suggested_message=suggested_message,
        )
    
    async def schedule_payment_check(
        self,
        lead_id: str,
        user_id: str,
        days_from_now: int = 2,
        expected_amount: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Scheduling Helper für Zahlungsprüfungen"""
        
        due_date = date.today() + timedelta(days=days_from_now)
        reason = "Zahlung prüfen"
        if expected_amount:
            reason = f"Zahlung prüfen (erwartet: €{expected_amount:.2f})"
        
        return await self.create_action(
            lead_id=lead_id,
            user_id=user_id,
            action_type="check_payment",
            due_date=due_date,
            reason=reason,
            priority=1,  # Hohe Priorität für Zahlungen
        )


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[PendingActionsService] = None


def get_pending_actions_service(db: Client) -> PendingActionsService:
    """Factory für PendingActionsService"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = PendingActionsService(db)
    
    return _service_instance

