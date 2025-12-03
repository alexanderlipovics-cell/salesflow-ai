# backend/app/api/routes/pending_actions.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  PENDING ACTIONS API ROUTES                                                 ║
║  Endpoints für ausstehende Lead-Aktionen                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Diese Routes werden vom Daily Flow verwendet für:
- Zahlungsprüfungen
- Follow-ups
- Calls
- etc.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, timedelta
from uuid import UUID

from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.chat_import.pending_actions import PendingActionsService


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(
    prefix="/pending-actions",
    tags=["pending-actions", "daily-flow"],
)


# =============================================================================
# SCHEMAS
# =============================================================================

class CreateActionRequest(BaseModel):
    """Request für neue Pending Action"""
    lead_id: UUID
    action_type: str = Field(..., pattern="^(follow_up|check_payment|call|send_info|reactivation|close|wait_for_lead)$")
    due_date: date
    reason: Optional[str] = None
    suggested_message: Optional[str] = None
    priority: int = Field(2, ge=1, le=5)


class SnoozeActionRequest(BaseModel):
    """Request für Snooze"""
    snooze_until: date


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("")
async def list_pending_actions(
    due_date: Optional[date] = None,
    action_type: Optional[str] = Query(None, pattern="^(follow_up|check_payment|call|send_info|reactivation|close|wait_for_lead)$"),
    include_lead: bool = True,
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt ausstehende Aktionen.
    
    Für Daily Flow: due_date = heute zeigt alle fälligen Aktionen.
    """
    service = PendingActionsService(db)
    
    return await service.get_pending_actions(
        user_id=current_user.id,
        due_date=due_date or date.today(),
        action_type=action_type,
        include_lead=include_lead,
        limit=limit,
    )


@router.get("/summary")
async def get_daily_summary(
    for_date: Optional[date] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Tages-Zusammenfassung für Daily Flow Header.
    """
    service = PendingActionsService(db)
    
    summary = await service.get_daily_summary(current_user.id, for_date)
    
    return {
        "date": summary.date.isoformat(),
        "total_pending": summary.total_pending,
        "overdue": summary.overdue,
        "payment_checks": summary.payment_checks,
        "follow_ups": summary.follow_ups,
        "calls": summary.calls,
        "high_priority": summary.high_priority,
        "by_type": summary.by_type,
    }


@router.get("/payment-checks")
async def get_payment_checks(
    include_overdue: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt alle fälligen Zahlungsprüfungen.
    
    Besonders wichtig für Leads mit pending_payment!
    """
    service = PendingActionsService(db)
    
    return await service.get_payment_checks(
        user_id=current_user.id,
        include_overdue=include_overdue,
    )


@router.get("/overdue-count")
async def get_overdue_count(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Zählt überfällige Aktionen.
    """
    service = PendingActionsService(db)
    
    count = await service.get_overdue_count(current_user.id)
    
    return {"count": count}


@router.post("")
async def create_action(
    payload: CreateActionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Erstellt eine neue Pending Action.
    """
    service = PendingActionsService(db)
    
    return await service.create_action(
        lead_id=str(payload.lead_id),
        user_id=current_user.id,
        action_type=payload.action_type,
        due_date=payload.due_date,
        reason=payload.reason,
        suggested_message=payload.suggested_message,
        priority=payload.priority,
    )


@router.post("/{action_id}/complete")
async def complete_action(
    action_id: UUID,
    notes: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Markiert eine Aktion als erledigt.
    """
    service = PendingActionsService(db)
    
    success = await service.complete_action(
        action_id=str(action_id),
        user_id=current_user.id,
        notes=notes,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Aktion nicht gefunden")
    
    return {"success": True}


@router.post("/{action_id}/snooze")
async def snooze_action(
    action_id: UUID,
    payload: SnoozeActionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Verschiebt eine Aktion auf später.
    """
    service = PendingActionsService(db)
    
    success = await service.snooze_action(
        action_id=str(action_id),
        user_id=current_user.id,
        snooze_until=payload.snooze_until,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Aktion nicht gefunden")
    
    return {"success": True, "snoozed_until": payload.snooze_until.isoformat()}


@router.post("/{action_id}/skip")
async def skip_action(
    action_id: UUID,
    reason: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Überspringt eine Aktion.
    """
    service = PendingActionsService(db)
    
    success = await service.skip_action(
        action_id=str(action_id),
        user_id=current_user.id,
        reason=reason,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Aktion nicht gefunden")
    
    return {"success": True}


# =============================================================================
# QUICK HELPERS
# =============================================================================

@router.post("/schedule/follow-up")
async def schedule_follow_up(
    lead_id: UUID,
    days_from_now: int = Query(3, ge=1, le=90),
    reason: str = "Follow-up",
    suggested_message: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Schnelles Scheduling eines Follow-ups.
    """
    service = PendingActionsService(db)
    
    return await service.schedule_follow_up(
        lead_id=str(lead_id),
        user_id=current_user.id,
        days_from_now=days_from_now,
        reason=reason,
        suggested_message=suggested_message,
    )


@router.post("/schedule/payment-check")
async def schedule_payment_check(
    lead_id: UUID,
    days_from_now: int = Query(2, ge=1, le=30),
    expected_amount: Optional[float] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Schnelles Scheduling einer Zahlungsprüfung.
    """
    service = PendingActionsService(db)
    
    return await service.schedule_payment_check(
        lead_id=str(lead_id),
        user_id=current_user.id,
        days_from_now=days_from_now,
        expected_amount=expected_amount,
    )


@router.post("/leads/{lead_id}/complete-all")
async def complete_all_for_lead(
    lead_id: UUID,
    action_type: Optional[str] = Query(None, pattern="^(follow_up|check_payment|call|send_info|reactivation|close|wait_for_lead)$"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Markiert alle Aktionen für einen Lead als erledigt.
    """
    service = PendingActionsService(db)
    
    count = await service.complete_all_for_lead(
        lead_id=str(lead_id),
        user_id=current_user.id,
        action_type=action_type,
    )
    
    return {"completed_count": count}

