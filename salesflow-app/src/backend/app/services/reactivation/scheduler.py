"""
Reactivation Scheduler

Cron-basierte Planung für automatische Reaktivierung.
"""

import logging
from typing import List
from datetime import datetime

logger = logging.getLogger(__name__)


class ReactivationScheduler:
    """
    Scheduler für automatische Dormant-Lead-Erkennung.
    """
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
    
    async def scan_dormant_leads(self, min_days: int = 90) -> List[dict]:
        """
        Scannt nach dormanten Leads, die noch nicht reaktiviert wurden.
        """
        # Leads finden, die:
        # - Status dormant ODER >90 Tage kein Kontakt
        # - Noch kein Reactivation Run in den letzten 30 Tagen
        # - Nicht won/lost
        
        query = """
        SELECT l.*
        FROM leads l
        LEFT JOIN (
            SELECT lead_id, MAX(started_at) as last_run
            FROM reactivation_runs
            WHERE started_at > NOW() - INTERVAL '30 days'
            GROUP BY lead_id
        ) r ON l.id = r.lead_id
        WHERE 
            r.last_run IS NULL
            AND l.status NOT IN ('won', 'lost')
            AND (
                l.status = 'dormant' 
                OR l.last_contact_at < NOW() - INTERVAL '{min_days} days'
            )
        LIMIT 100
        """
        
        # TODO: Implementiere mit Supabase RPC
        response = await self.supabase.rpc(
            "get_dormant_leads_for_reactivation",
            {"min_dormant_days": min_days}
        ).execute()
        
        return response.data or []
    
    async def schedule_batch(self, leads: List[dict]) -> int:
        """
        Plant Batch-Reaktivierung.
        """
        scheduled = 0
        for lead in leads:
            try:
                # Job in Queue einfügen
                await self.supabase.from_("reactivation_queue").insert({
                    "lead_id": lead["id"],
                    "user_id": lead["user_id"],
                    "scheduled_at": datetime.utcnow().isoformat(),
                    "status": "pending"
                }).execute()
                scheduled += 1
            except Exception as e:
                logger.warning(f"Failed to schedule lead {lead['id']}: {e}")
        
        return scheduled

