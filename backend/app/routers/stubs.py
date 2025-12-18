from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from app.core.deps import get_supabase
from app.core.security.main import get_current_user

router = APIRouter(prefix="/api", tags=["stubs"])


@router.get("/follow-ups")
async def get_followups_stub(
    due: str = Query(None, description="Filter: 'today' für heutige Follow-ups"),
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Follow-ups Endpunkt - nutzt followup_suggestions Tabelle"""
    user_id = current_user.get("sub") or current_user.get("id") or current_user.get("user_id")
    
    if not user_id:
        return {"items": [], "count": 0}
    
    query = supabase.table("followup_suggestions").select(
        "*, leads(id, name, email, phone, company, status, whatsapp, instagram, linkedin)"
    ).eq("user_id", user_id).eq("status", "pending")
    
    # Filter für "due=today"
    if due == "today":
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0).isoformat()
        query = query.gte("due_at", today_start).lte("due_at", today_end)
    
    query = query.order("due_at", desc=False).limit(limit)
    
    result = query.execute()
    items = result.data or []
    
    # Map zu Frontend-Format
    mapped_items = []
    for item in items:
        lead = item.get("leads") or {}
        mapped_items.append({
            "id": item.get("id"),
            "lead_id": item.get("lead_id"),
            "lead_name": lead.get("name") or item.get("lead_name"),
            "title": item.get("title") or f"Follow-up für {lead.get('name', 'Lead')}",
            "due_at": item.get("due_at"),
            "due": item.get("due_at"),
            "type": item.get("type") or "follow_up",
            "action": item.get("suggested_action") or item.get("reason") or "Follow-up",
            "status": item.get("status"),
            "overdue": False,  # Kann später berechnet werden
        })
    
    return {"items": mapped_items, "count": len(mapped_items)}


@router.get("/activities")
async def get_activities_stub():
    return []


@router.get("/finance/stats")
async def get_finance_stats_stub():
    return {}


@router.get("/analytics/charts")
async def get_analytics_charts_stub():
    return {}

