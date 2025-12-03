# backend/app/services/daily_flow_actions.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DAILY FLOW ACTIONS SERVICE                                                ║
║  Integriert Pending Actions in den Daily Flow                              ║
╚════════════════════════════════════════════════════════════════════════════╝

Dieser Service verbindet:
- Lead Pending Actions (Zahlungsprüfungen, Follow-ups)
- Daily Flow Actions (aus Tagesplan generiert)
- Automatische Priorisierung

Ergebnis: Eine einheitliche Liste von "was muss heute getan werden?"
"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from dataclasses import dataclass
from supabase import Client


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class UnifiedAction:
    """Einheitliche Action für Daily Flow"""
    id: str
    source: str  # 'pending_action' | 'daily_flow' | 'auto_generated'
    action_type: str
    priority: int  # 1 = höchste
    
    # Lead Info
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    lead_handle: Optional[str] = None
    lead_channel: Optional[str] = None
    lead_status: Optional[str] = None
    lead_deal_state: Optional[str] = None
    
    # Action Details
    title: str = ""
    reason: Optional[str] = None
    suggested_message: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    
    # Status
    status: str = "pending"
    is_urgent: bool = False
    is_overdue: bool = False


@dataclass
class DailyFlowSummary:
    """Zusammenfassung für den Daily Flow Header"""
    date: date
    total_actions: int
    completed_actions: int
    completion_rate: float
    
    # Nach Typ
    payment_checks: int
    follow_ups: int
    new_contacts: int
    reactivations: int
    calls: int
    
    # Warnungen
    overdue_count: int
    urgent_count: int
    
    # Estimates
    estimated_time_minutes: int


# =============================================================================
# SERVICE CLASS
# =============================================================================

class DailyFlowActionsService:
    """
    Service für einheitliche Daily Flow Actions.
    
    Kombiniert alle Action-Quellen zu einer priorisierten Liste.
    """
    
    # Zeit-Schätzungen pro Action-Typ (Minuten)
    TIME_ESTIMATES = {
        "check_payment": 5,
        "follow_up": 8,
        "call": 15,
        "send_info": 5,
        "new_contact": 10,
        "reactivation": 8,
        "close": 20,
        "wait_for_lead": 2,
    }
    
    def __init__(self, db: Client):
        self.db = db
    
    # =========================================================================
    # UNIFIED ACTIONS
    # =========================================================================
    
    async def get_unified_actions(
        self,
        user_id: str,
        for_date: Optional[date] = None,
        include_completed: bool = False,
        limit: int = 50,
    ) -> List[UnifiedAction]:
        """
        Holt alle Actions aus allen Quellen, vereinheitlicht und priorisiert.
        
        Quellen:
        1. lead_pending_actions (höchste Priorität für payment_checks)
        2. daily_flow_actions (aus Tagesplan)
        3. Auto-generierte Actions (basierend auf Leads)
        
        Returns:
            Sortierte Liste von UnifiedActions
        """
        
        check_date = for_date or date.today()
        actions: List[UnifiedAction] = []
        
        # 1. Pending Actions laden
        pending = await self._get_pending_actions(user_id, check_date, include_completed)
        actions.extend(pending)
        
        # 2. Daily Flow Actions laden (falls vorhanden)
        daily_flow = await self._get_daily_flow_actions(user_id, check_date, include_completed)
        actions.extend(daily_flow)
        
        # 3. Deduplizieren (gleicher Lead + gleicher Typ = zusammenfassen)
        actions = self._deduplicate_actions(actions)
        
        # 4. Sortieren nach Priorität
        actions.sort(key=lambda a: (a.priority, not a.is_urgent, a.due_date or "9999-99-99"))
        
        return actions[:limit]
    
    async def _get_pending_actions(
        self,
        user_id: str,
        for_date: date,
        include_completed: bool,
    ) -> List[UnifiedAction]:
        """Lädt Pending Actions und konvertiert zu UnifiedAction"""
        
        query = self.db.table("lead_pending_actions").select(
            "*, leads(id, first_name, last_name, social_handle, channel, status, deal_state)"
        ).eq("user_id", user_id).lte("due_date", for_date.isoformat())
        
        if not include_completed:
            query = query.eq("status", "pending")
        
        query = query.order("priority").order("due_date").limit(50)
        result = query.execute()
        
        if not result.data:
            return []
        
        actions = []
        for row in result.data:
            lead = row.get("leads") or {}
            lead_name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Unbekannt"
            
            is_overdue = row.get("due_date", "") < for_date.isoformat()
            is_urgent = row.get("priority") == 1 or row.get("action_type") == "check_payment"
            
            actions.append(UnifiedAction(
                id=row["id"],
                source="pending_action",
                action_type=row.get("action_type", "follow_up"),
                priority=row.get("priority", 2),
                
                lead_id=row.get("lead_id"),
                lead_name=lead_name,
                lead_handle=lead.get("social_handle"),
                lead_channel=lead.get("channel"),
                lead_status=lead.get("status"),
                lead_deal_state=lead.get("deal_state"),
                
                title=self._generate_action_title(row.get("action_type"), lead_name),
                reason=row.get("action_reason"),
                suggested_message=row.get("suggested_message"),
                due_date=row.get("due_date"),
                due_time=row.get("due_time"),
                
                status=row.get("status", "pending"),
                is_urgent=is_urgent,
                is_overdue=is_overdue,
            ))
        
        return actions
    
    async def _get_daily_flow_actions(
        self,
        user_id: str,
        for_date: date,
        include_completed: bool,
    ) -> List[UnifiedAction]:
        """Lädt Daily Flow Actions und konvertiert zu UnifiedAction"""
        
        query = self.db.table("daily_flow_actions").select(
            "*, leads(id, first_name, last_name, social_handle, channel, status, deal_state)"
        ).eq("user_id", user_id).eq("plan_date", for_date.isoformat())
        
        if not include_completed:
            query = query.not_.eq("status", "completed")
        
        query = query.order("priority").limit(50)
        result = query.execute()
        
        if not result.data:
            return []
        
        actions = []
        for row in result.data:
            lead = row.get("leads") or {}
            lead_name = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or "Neuer Kontakt"
            
            # Mappe Daily Flow Action Types
            action_type = self._map_daily_flow_type(row.get("action_type"))
            
            actions.append(UnifiedAction(
                id=row["id"],
                source="daily_flow",
                action_type=action_type,
                priority=row.get("priority", 3),
                
                lead_id=row.get("lead_id"),
                lead_name=lead_name,
                lead_handle=lead.get("social_handle"),
                lead_channel=row.get("channel") or lead.get("channel"),
                lead_status=lead.get("status"),
                lead_deal_state=lead.get("deal_state"),
                
                title=self._generate_action_title(action_type, lead_name),
                reason=row.get("notes"),
                suggested_message=row.get("message"),
                due_date=for_date.isoformat(),
                
                status=row.get("status", "pending"),
                is_urgent=False,
                is_overdue=False,
            ))
        
        return actions
    
    def _deduplicate_actions(self, actions: List[UnifiedAction]) -> List[UnifiedAction]:
        """Entfernt Duplikate (gleicher Lead + gleicher Typ)"""
        
        seen = set()
        unique = []
        
        for action in actions:
            # Pending Actions haben Priorität
            key = (action.lead_id, action.action_type)
            
            if action.source == "pending_action":
                # Pending Actions immer behalten
                unique.append(action)
                seen.add(key)
            elif key not in seen:
                unique.append(action)
                seen.add(key)
        
        return unique
    
    def _map_daily_flow_type(self, df_type: str) -> str:
        """Mappt Daily Flow Action Types zu Pending Action Types"""
        mapping = {
            "new_contact": "new_contact",
            "followup": "follow_up",
            "follow_up": "follow_up",
            "reactivation": "reactivation",
            "call": "call",
        }
        return mapping.get(df_type, df_type)
    
    def _generate_action_title(self, action_type: str, lead_name: str) -> str:
        """Generiert lesbaren Titel für Action"""
        titles = {
            "check_payment": f"💰 Zahlung prüfen: {lead_name}",
            "follow_up": f"📱 Follow-up: {lead_name}",
            "call": f"📞 Anrufen: {lead_name}",
            "send_info": f"📄 Infos senden: {lead_name}",
            "new_contact": f"👋 Neuer Kontakt: {lead_name}",
            "reactivation": f"🔄 Reaktivieren: {lead_name}",
            "close": f"🎯 Abschluss: {lead_name}",
            "wait_for_lead": f"⏳ Warten auf: {lead_name}",
        }
        return titles.get(action_type, f"📌 {action_type}: {lead_name}")
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    
    async def get_daily_summary(
        self,
        user_id: str,
        for_date: Optional[date] = None,
    ) -> DailyFlowSummary:
        """
        Generiert Zusammenfassung für Daily Flow Header.
        """
        
        check_date = for_date or date.today()
        
        # Alle Actions holen (inkl. completed)
        all_actions = await self.get_unified_actions(
            user_id, check_date, include_completed=True, limit=200
        )
        
        if not all_actions:
            return DailyFlowSummary(
                date=check_date,
                total_actions=0,
                completed_actions=0,
                completion_rate=0,
                payment_checks=0,
                follow_ups=0,
                new_contacts=0,
                reactivations=0,
                calls=0,
                overdue_count=0,
                urgent_count=0,
                estimated_time_minutes=0,
            )
        
        # Zähle
        total = len(all_actions)
        completed = len([a for a in all_actions if a.status == "completed"])
        pending = [a for a in all_actions if a.status == "pending"]
        
        payment_checks = len([a for a in pending if a.action_type == "check_payment"])
        follow_ups = len([a for a in pending if a.action_type == "follow_up"])
        new_contacts = len([a for a in pending if a.action_type == "new_contact"])
        reactivations = len([a for a in pending if a.action_type == "reactivation"])
        calls = len([a for a in pending if a.action_type == "call"])
        
        overdue = len([a for a in pending if a.is_overdue])
        urgent = len([a for a in pending if a.is_urgent])
        
        # Zeit schätzen
        estimated_time = sum(
            self.TIME_ESTIMATES.get(a.action_type, 5) for a in pending
        )
        
        return DailyFlowSummary(
            date=check_date,
            total_actions=total,
            completed_actions=completed,
            completion_rate=round(completed / total * 100, 1) if total > 0 else 0,
            payment_checks=payment_checks,
            follow_ups=follow_ups,
            new_contacts=new_contacts,
            reactivations=reactivations,
            calls=calls,
            overdue_count=overdue,
            urgent_count=urgent,
            estimated_time_minutes=estimated_time,
        )
    
    # =========================================================================
    # ACTION COMPLETION
    # =========================================================================
    
    async def complete_action(
        self,
        action_id: str,
        user_id: str,
        source: str,
        notes: Optional[str] = None,
        outcome: Optional[str] = None,
    ) -> bool:
        """
        Markiert eine Action als erledigt.
        
        Aktualisiert je nach Source die richtige Tabelle.
        """
        
        try:
            if source == "pending_action":
                self.db.table("lead_pending_actions").update({
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "notes": notes,
                }).eq("id", action_id).eq("user_id", user_id).execute()
                
            elif source == "daily_flow":
                self.db.table("daily_flow_actions").update({
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "outcome": outcome,
                    "notes": notes,
                }).eq("id", action_id).eq("user_id", user_id).execute()
            
            return True
            
        except Exception as e:
            print(f"Error completing action: {e}")
            return False
    
    async def snooze_action(
        self,
        action_id: str,
        user_id: str,
        source: str,
        snooze_until: date,
    ) -> bool:
        """Verschiebt eine Action auf später."""
        
        try:
            if source == "pending_action":
                self.db.table("lead_pending_actions").update({
                    "status": "snoozed",
                    "snoozed_until": snooze_until.isoformat(),
                    "due_date": snooze_until.isoformat(),
                }).eq("id", action_id).eq("user_id", user_id).execute()
                
            elif source == "daily_flow":
                # Daily Flow Actions können nicht gesnoozed werden
                # Stattdessen: Auf morgen verschieben
                tomorrow = date.today() + timedelta(days=1)
                self.db.table("daily_flow_actions").update({
                    "plan_date": snooze_until.isoformat() if snooze_until > date.today() else tomorrow.isoformat(),
                }).eq("id", action_id).eq("user_id", user_id).execute()
            
            return True
            
        except Exception as e:
            print(f"Error snoozing action: {e}")
            return False


# =============================================================================
# FACTORY
# =============================================================================

_service_instance: Optional[DailyFlowActionsService] = None


def get_daily_flow_actions_service(db: Client) -> DailyFlowActionsService:
    """Factory für DailyFlowActionsService"""
    global _service_instance
    
    if _service_instance is None:
        _service_instance = DailyFlowActionsService(db)
    
    return _service_instance

