# backend/app/api/routes/daily_flow.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DAILY FLOW API ROUTES                                                     ║
║  Unified Actions & Workflow Management                                     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from dataclasses import asdict

from ...db.supabase import get_supabase
from ...db.deps import get_current_user
from ...services.daily_flow_actions import get_daily_flow_actions_service


router = APIRouter(prefix="/daily-flow", tags=["daily-flow"])


# =============================================================================
# SCHEMAS
# =============================================================================

class UnifiedActionResponse(BaseModel):
    """Response für eine einheitliche Action"""
    id: str
    source: str
    action_type: str
    priority: int
    
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    lead_handle: Optional[str] = None
    lead_channel: Optional[str] = None
    lead_status: Optional[str] = None
    lead_deal_state: Optional[str] = None
    
    title: str
    reason: Optional[str] = None
    suggested_message: Optional[str] = None
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    
    status: str
    is_urgent: bool
    is_overdue: bool


class DailySummaryResponse(BaseModel):
    """Response für die Tages-Zusammenfassung"""
    date: str
    total_actions: int
    completed_actions: int
    completion_rate: float
    
    payment_checks: int
    follow_ups: int
    new_contacts: int
    reactivations: int
    calls: int
    
    overdue_count: int
    urgent_count: int
    estimated_time_minutes: int


class CompleteActionRequest(BaseModel):
    """Request für Action abschließen"""
    notes: Optional[str] = None
    outcome: Optional[str] = None


class SnoozeActionRequest(BaseModel):
    """Request für Action verschieben"""
    snooze_until: str  # ISO date format


# =============================================================================
# ROUTES
# =============================================================================

@router.get("/unified-actions", response_model=List[UnifiedActionResponse])
async def get_unified_actions(
    for_date: Optional[str] = Query(None, description="Datum im ISO-Format (YYYY-MM-DD)"),
    include_completed: bool = Query(False, description="Abgeschlossene inkludieren?"),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
):
    """
    Holt alle vereinheitlichten Actions aus allen Quellen.
    
    Kombiniert:
    - Pending Actions (Zahlungsprüfungen, Follow-ups)
    - Daily Flow Actions (aus Tagesplan)
    
    Priorisiert nach:
    1. Dringlichkeit (payment_checks zuerst)
    2. Due Date
    3. Priorität
    """
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    check_date = date.fromisoformat(for_date) if for_date else date.today()
    
    actions = await service.get_unified_actions(
        user_id=user.id,
        for_date=check_date,
        include_completed=include_completed,
        limit=limit,
    )
    
    return [
        UnifiedActionResponse(
            id=a.id,
            source=a.source,
            action_type=a.action_type,
            priority=a.priority,
            lead_id=a.lead_id,
            lead_name=a.lead_name,
            lead_handle=a.lead_handle,
            lead_channel=a.lead_channel,
            lead_status=a.lead_status,
            lead_deal_state=a.lead_deal_state,
            title=a.title,
            reason=a.reason,
            suggested_message=a.suggested_message,
            due_date=a.due_date,
            due_time=a.due_time,
            status=a.status,
            is_urgent=a.is_urgent,
            is_overdue=a.is_overdue,
        )
        for a in actions
    ]


@router.get("/summary", response_model=DailySummaryResponse)
async def get_daily_summary(
    for_date: Optional[str] = Query(None, description="Datum im ISO-Format"),
    user=Depends(get_current_user),
):
    """
    Holt die Tages-Zusammenfassung.
    
    Enthält:
    - Gesamtzahl Actions
    - Completion Rate
    - Nach Typ aufgeschlüsselt
    - Warnungen (überfällig, dringend)
    - Geschätzte Zeit
    """
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    check_date = date.fromisoformat(for_date) if for_date else date.today()
    
    summary = await service.get_daily_summary(
        user_id=user.id,
        for_date=check_date,
    )
    
    return DailySummaryResponse(
        date=summary.date.isoformat(),
        total_actions=summary.total_actions,
        completed_actions=summary.completed_actions,
        completion_rate=summary.completion_rate,
        payment_checks=summary.payment_checks,
        follow_ups=summary.follow_ups,
        new_contacts=summary.new_contacts,
        reactivations=summary.reactivations,
        calls=summary.calls,
        overdue_count=summary.overdue_count,
        urgent_count=summary.urgent_count,
        estimated_time_minutes=summary.estimated_time_minutes,
    )


@router.post("/actions/{action_id}/complete")
async def complete_action(
    action_id: str,
    source: str = Query(..., description="Source: pending_action oder daily_flow"),
    body: CompleteActionRequest = None,
    user=Depends(get_current_user),
):
    """
    Markiert eine Action als abgeschlossen.
    
    Args:
        action_id: ID der Action
        source: Quelle (pending_action oder daily_flow)
        notes: Optionale Notizen
        outcome: Optionales Ergebnis
    """
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    success = await service.complete_action(
        action_id=action_id,
        user_id=user.id,
        source=source,
        notes=body.notes if body else None,
        outcome=body.outcome if body else None,
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Action konnte nicht abgeschlossen werden")
    
    return {"success": True, "message": "Action abgeschlossen"}


@router.post("/actions/{action_id}/snooze")
async def snooze_action(
    action_id: str,
    source: str = Query(..., description="Source: pending_action oder daily_flow"),
    body: SnoozeActionRequest = None,
    user=Depends(get_current_user),
):
    """
    Verschiebt eine Action auf später.
    
    Args:
        action_id: ID der Action
        source: Quelle
        snooze_until: Datum, bis wann verschoben werden soll
    """
    
    if not body or not body.snooze_until:
        raise HTTPException(status_code=400, detail="snooze_until ist erforderlich")
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    snooze_date = date.fromisoformat(body.snooze_until)
    
    success = await service.snooze_action(
        action_id=action_id,
        user_id=user.id,
        source=source,
        snooze_until=snooze_date,
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Action konnte nicht verschoben werden")
    
    return {"success": True, "message": f"Action verschoben bis {body.snooze_until}"}


@router.get("/urgent-actions", response_model=List[UnifiedActionResponse])
async def get_urgent_actions(
    limit: int = Query(10, ge=1, le=50),
    user=Depends(get_current_user),
):
    """
    Holt nur die dringenden Actions.
    
    Dringend sind:
    - Zahlungsprüfungen
    - Überfällige Actions
    - Priorität 1 Actions
    """
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    all_actions = await service.get_unified_actions(
        user_id=user.id,
        for_date=date.today(),
        include_completed=False,
        limit=100,
    )
    
    # Filtere nur dringende
    urgent = [a for a in all_actions if a.is_urgent or a.is_overdue][:limit]
    
    return [
        UnifiedActionResponse(
            id=a.id,
            source=a.source,
            action_type=a.action_type,
            priority=a.priority,
            lead_id=a.lead_id,
            lead_name=a.lead_name,
            lead_handle=a.lead_handle,
            lead_channel=a.lead_channel,
            lead_status=a.lead_status,
            lead_deal_state=a.lead_deal_state,
            title=a.title,
            reason=a.reason,
            suggested_message=a.suggested_message,
            due_date=a.due_date,
            due_time=a.due_time,
            status=a.status,
            is_urgent=a.is_urgent,
            is_overdue=a.is_overdue,
        )
        for a in urgent
    ]


@router.get("/payment-checks", response_model=List[UnifiedActionResponse])
async def get_payment_checks(
    user=Depends(get_current_user),
):
    """
    Holt alle offenen Zahlungsprüfungen.
    
    Zeigt Leads mit deal_state='pending_payment' und ausstehender Prüfung.
    """
    
    db = get_supabase()
    service = get_daily_flow_actions_service(db)
    
    all_actions = await service.get_unified_actions(
        user_id=user.id,
        for_date=date.today(),
        include_completed=False,
        limit=100,
    )
    
    # Filtere nur payment_checks
    payment_checks = [a for a in all_actions if a.action_type == "check_payment"]
    
    return [
        UnifiedActionResponse(
            id=a.id,
            source=a.source,
            action_type=a.action_type,
            priority=a.priority,
            lead_id=a.lead_id,
            lead_name=a.lead_name,
            lead_handle=a.lead_handle,
            lead_channel=a.lead_channel,
            lead_status=a.lead_status,
            lead_deal_state=a.lead_deal_state,
            title=a.title,
            reason=a.reason,
            suggested_message=a.suggested_message,
            due_date=a.due_date,
            due_time=a.due_time,
            status=a.status,
            is_urgent=a.is_urgent,
            is_overdue=a.is_overdue,
        )
        for a in payment_checks
    ]


@router.get("/status")
async def get_daily_flow_status(
    company_id: Optional[str] = Query("default", description="Company ID"),
    for_date: Optional[str] = Query(None, description="Datum im ISO-Format (YYYY-MM-DD)"),
    user=Depends(get_current_user),
):
    """
    Holt den Daily Flow Status für einen User.
    
    Kompatibel mit Frontend activityService.getDailyFlowStatus()
    """
    from datetime import datetime
    
    db = get_supabase()
    
    # Wenn RPC-Funktion existiert, verwende sie
    try:
        check_date = for_date if for_date else datetime.now().strftime("%Y-%m-%d")
        
        result = db.rpc(
            "get_daily_flow_status",
            {
                "p_user_id": str(user.id),
                "p_company_id": company_id,
                "p_date": check_date,
            }
        ).execute()
        
        if result.data:
            return result.data
    except Exception as e:
        # Fallback: Erstelle Status aus Daily Flow Actions
        pass
    
    # Fallback: Erstelle Status aus Summary
    service = get_daily_flow_actions_service(db)
    check_date = date.fromisoformat(for_date) if for_date else date.today()
    
    summary = await service.get_daily_summary(
        user_id=user.id,
        for_date=check_date,
    )
    
    # Konvertiere zu Frontend-Format
    return {
        "daily": {
            "new_contacts": {
                "target": summary.new_contacts,
                "done": 0,  # TODO: Aus activities berechnen
            },
            "followups": {
                "target": summary.follow_ups,
                "done": 0,
            },
            "reactivations": {
                "target": summary.reactivations,
                "done": 0,
            },
        },
        "weekly": {
            "target": 0,
            "done": 0,
        },
        "monthly": {
            "target": 0,
            "done": 0,
        },
    }
