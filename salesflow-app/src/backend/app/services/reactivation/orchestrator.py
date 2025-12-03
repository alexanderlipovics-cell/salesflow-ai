"""
Reactivation Orchestrator

Hauptsteuerung für den Reactivation Agent.
"""

import logging
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ReactivationOrchestrator:
    """
    Orchestriert die Ausführung des Reactivation Agents.
    """
    
    def __init__(self):
        from ...db.supabase import get_supabase
        self.supabase = get_supabase()
    
    async def get_dormant_leads(
        self,
        user_id: str,
        min_days: int = 90,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Holt alle dormanten Leads für einen User.
        """
        response = await self.supabase.from_("leads")\
            .select("*")\
            .eq("user_id", user_id)\
            .or_(f"status.eq.dormant,last_contact_at.lt.{self._days_ago(min_days)}")\
            .not_.in_("status", ["won", "lost"])\
            .limit(limit)\
            .execute()
        
        return response.data or []
    
    async def validate_lead(self, lead_id: str, user_id: str) -> Optional[Dict]:
        """
        Validiert, dass ein Lead existiert und dem User gehört.
        """
        response = await self.supabase.from_("leads")\
            .select("*")\
            .eq("id", lead_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        return response.data
    
    async def create_run(self, lead_id: str, user_id: str) -> str:
        """
        Erstellt einen neuen Reactivation Run.
        """
        run_id = str(uuid.uuid4())
        
        await self.supabase.from_("reactivation_runs").insert({
            "id": run_id,
            "lead_id": lead_id,
            "user_id": user_id,
            "status": "started",
            "started_at": datetime.utcnow().isoformat()
        }).execute()
        
        return run_id
    
    async def execute_agent(
        self,
        run_id: str,
        lead_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Führt den Reactivation Agent aus.
        """
        from ...agents.reactivation import create_reactivation_graph
        from ...agents.reactivation.state import create_initial_state
        from ...core.config import settings
        
        logger.info(f"[{run_id}] Starting Reactivation Agent")
        
        try:
            # Graph erstellen
            graph = create_reactivation_graph(
                db_connection_string=settings.DATABASE_URL
            )
            
            # Initial State
            initial_state = create_initial_state(
                lead_id=lead_id,
                user_id=user_id,
                run_id=run_id
            )
            
            # Ausführen
            result = await graph.ainvoke(initial_state)
            
            # Run updaten
            await self._update_run(run_id, result)
            
            return result
            
        except Exception as e:
            logger.exception(f"[{run_id}] Agent execution failed: {e}")
            await self._fail_run(run_id, str(e))
            raise
    
    async def _update_run(self, run_id: str, result: Dict) -> None:
        """
        Aktualisiert den Run mit dem Ergebnis.
        """
        await self.supabase.from_("reactivation_runs").update({
            "status": "completed",
            "completed_at": datetime.utcnow().isoformat(),
            "signals_found": len(result.get("signals", [])),
            "primary_signal": result.get("primary_signal"),
            "confidence_score": result.get("confidence_score"),
            "action_taken": "draft_created" if result.get("draft_id") else "skipped",
            "final_state": result
        }).eq("id", run_id).execute()
    
    async def _fail_run(self, run_id: str, error: str) -> None:
        """
        Markiert einen Run als fehlgeschlagen.
        """
        await self.supabase.from_("reactivation_runs").update({
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
            "error_message": error
        }).eq("id", run_id).execute()
    
    def _days_ago(self, days: int) -> str:
        """
        Berechnet ISO-Datum für X Tage in der Vergangenheit.
        """
        from datetime import timedelta
        return (datetime.utcnow() - timedelta(days=days)).isoformat()

