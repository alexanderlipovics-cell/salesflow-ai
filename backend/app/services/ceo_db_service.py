"""
CEO DB Service - Sichere Datenbank-Zugriffe für CEO Chat
"""

from typing import Optional, List, Dict, Any
from app.core.database import get_supabase
import logging

logger = logging.getLogger(__name__)

# Erlaubte Tabellen für CEO Queries
ALLOWED_TABLES = [
    "leads",
    "lead_activities", 
    "contact_follow_up_queue",
    "message_queue",
    "followup_suggestions",
    "chief_sessions",
    "chief_messages",
    "user_profiles",
]

# Schema-Info für AI
DB_SCHEMA = """
## Verfügbare Tabellen:

### leads
- id, user_id, name, email, phone, whatsapp, instagram
- status (new, engaged, opportunity, won, lost)
- vertical, source, notes
- created_at, updated_at, last_contacted_at

### lead_activities
- id, lead_id, user_id, activity_type, content
- created_at

### contact_follow_up_queue
- id, user_id, contact_id, cycle_id
- current_state, next_due_at, status (pending, sent, cancelled)
- ai_generated_content, created_at

### message_queue
- id, user_id, lead_id, content, status, priority
- created_at, approved_at, sent_at

### followup_suggestions
- id, user_id, lead_id, suggested_message
- confidence_score, due_at, status

### user_profiles
- id, user_id, full_name, company, vertical, mlm_rank
"""


async def execute_safe_query(
    user_id: str,
    table: str,
    select: str = "*",
    filters: Optional[Dict[str, Any]] = None,
    order_by: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Führt sichere SELECT-Queries aus.
    Automatisch gefiltert auf user_id.
    """
    
    # Sicherheitscheck: Nur erlaubte Tabellen
    if table not in ALLOWED_TABLES:
        return {
            "success": False,
            "error": f"Tabelle '{table}' nicht erlaubt. Erlaubt: {ALLOWED_TABLES}"
        }
    
    try:
        db = get_supabase()
        query = db.table(table).select(select)
        
        # IMMER auf user_id filtern (Sicherheit!)
        if table != "user_profiles":
            query = query.eq("user_id", user_id)
        else:
            query = query.eq("id", user_id)
        
        # Zusätzliche Filter
        if filters:
            for key, value in filters.items():
                if isinstance(value, dict):
                    for op, val in value.items():
                        if op == "eq":
                            query = query.eq(key, val)
                        elif op == "neq":
                            query = query.neq(key, val)
                        elif op == "gt":
                            query = query.gt(key, val)
                        elif op == "gte":
                            query = query.gte(key, val)
                        elif op == "lt":
                            query = query.lt(key, val)
                        elif op == "lte":
                            query = query.lte(key, val)
                        elif op == "like":
                            query = query.like(key, val)
                        elif op == "ilike":
                            query = query.ilike(key, val)
                else:
                    query = query.eq(key, value)
        
        # Sortierung
        if order_by:
            desc = order_by.startswith("-")
            col = order_by.lstrip("-")
            query = query.order(col, desc=desc)
        
        # Limit
        query = query.limit(limit)
        
        result = query.execute()
        
        return {
            "success": True,
            "data": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"DB Query Error: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_user_stats(user_id: str) -> Dict[str, Any]:
    """Holt aggregierte Stats für den User."""
    
    db = get_supabase()
    
    try:
        # Leads Count by Status
        leads = db.table("leads").select("status").eq("user_id", user_id).execute()
        lead_stats = {}
        for lead in leads.data:
            status = lead.get("status", "unknown")
            lead_stats[status] = lead_stats.get(status, 0) + 1
        
        # Pending Follow-ups
        followups = db.table("contact_follow_up_queue")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "pending")\
            .execute()
        
        # Messages sent today
        from datetime import datetime
        today = datetime.utcnow().replace(hour=0, minute=0, second=0).isoformat()
        messages = db.table("message_queue")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("status", "sent")\
            .gte("sent_at", today)\
            .execute()
        
        return {
            "success": True,
            "stats": {
                "total_leads": len(leads.data),
                "leads_by_status": lead_stats,
                "pending_followups": len(followups.data),
                "messages_sent_today": len(messages.data),
            }
        }
        
    except Exception as e:
        logger.error(f"Stats Error: {e}")
        return {"success": False, "error": str(e)}

