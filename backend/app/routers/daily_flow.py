"""
╔════════════════════════════════════════════════════════════════════════════╗
║  DAILY FLOW API - VOLLSTÄNDIG                                              ║
║  API für tägliche Verkaufsplanung und Aktivitäten-Tracking               ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Optional, List, Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/daily-flow", tags=["daily-flow"])


# =============================================================================
# MODELS
# =============================================================================

class DailyAction(BaseModel):
    """Eine tägliche Aktion."""
    id: str
    type: str  # outreach, follow_up, check_in, content, learn, admin
    title: str
    description: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    status: str = "pending"  # pending, in_progress, completed, skipped, snoozed
    priority: str = "medium"  # critical, high, medium, low
    channel: str = "whatsapp"  # whatsapp, phone, email, meeting
    estimated_minutes: int = 10
    due_at: Optional[str] = None
    scheduled_time: Optional[str] = None
    completed_at: Optional[str] = None
    snoozed_until: Optional[str] = None
    metadata: dict = {}
    created_at: str = ""
    action_type: str = ""  # Alias für type


class DailyFlowStatus(BaseModel):
    """Daily Flow Status."""
    date: str
    total_actions: int
    completed_actions: int
    completion_percent: float
    streak_days: int
    estimated_remaining_minutes: int
    next_action: Optional[DailyAction] = None
    motivational_message: str


class DailyFlowSettings(BaseModel):
    """Daily Flow Einstellungen."""
    daily_outreach_goal: int = 10
    daily_follow_up_goal: int = 5
    working_hours_start: str = "09:00"
    working_hours_end: str = "18:00"
    preferred_action_order: List[str] = ["follow_up", "outreach", "check_in"]
    auto_generate_actions: bool = True
    show_ai_suggestions: bool = True


class DailyPlan(BaseModel):
    """Tagesplan mit Aktionen."""
    id: str
    date: str
    user_id: str
    state: str = "ACTIVE"  # ACTIVE, COMPLETED, PAUSED
    actions: List[DailyAction]
    planned_new_contacts: int = 5
    planned_followups: int = 8
    planned_actions_total: int = 13
    target_calls: int = 5
    target_messages: int = 10
    target_meetings: int = 1
    completed_calls: int = 0
    completed_messages: int = 0
    completed_meetings: int = 0
    notes: Optional[str] = None
    created_at: str
    updated_at: str


class DailyConfig(BaseModel):
    """Konfiguration für Daily Flow."""
    target_calls: int = 5
    target_messages: int = 10
    target_meetings: int = 1
    target_deals_per_period: int = 10
    period: str = "month"
    work_start: str = "09:00"
    work_end: str = "18:00"
    work_days: List[int] = [1, 2, 3, 4, 5]
    work_hours: dict = {"start": 9, "end": 18}
    focus_mode: bool = False
    auto_schedule: bool = True


class ConversionRate(BaseModel):
    """Conversion-Rate Statistiken."""
    period: str
    calls_made: int
    appointments_set: int
    deals_closed: int
    call_to_appointment: float
    appointment_to_deal: float
    overall_rate: float
    contact_to_lead: float = 0.3
    lead_to_deal: float = 0.15


class DailyStats(BaseModel):
    """Tagesstatistiken."""
    date: str
    total_actions: int = 0
    completed_actions: int = 0
    skipped_actions: int = 0
    completion_rate: float = 0.0
    calls_completed: int = 0
    messages_sent: int = 0
    meetings_held: int = 0
    leads_contacted: int = 0
    deals_progressed: int = 0
    revenue_generated: float = 0.0


class DailySummary(BaseModel):
    """Tages-Zusammenfassung."""
    date: str
    total_actions: int
    completed_actions: int
    skipped_actions: int
    pending_actions: int
    completion_rate: float
    next_action: Optional[DailyAction] = None
    streak_days: int = 0
    motivation_message: str = ""


class ActionCompletion(BaseModel):
    """Antwort nach Aktions-Abschluss."""
    action_id: str
    completed: bool
    notes: Optional[str] = None
    outcome: Optional[str] = None
    next_action_suggested: Optional[DailyAction] = None
    xp_earned: int = 10
    celebration_message: Optional[str] = None


# =============================================================================
# IN-MEMORY STORE (Demo-Daten)
# =============================================================================

_daily_config: dict = {
    "target_calls": 5,
    "target_messages": 10,
    "target_meetings": 1,
    "target_deals_per_period": 10,
    "period": "month",
    "work_start": "09:00",
    "work_end": "18:00",
    "work_days": [1, 2, 3, 4, 5],
    "work_hours": {"start": 9, "end": 18},
    "focus_mode": False,
    "auto_schedule": True,
}

_daily_settings: dict = {
    "daily_outreach_goal": 10,
    "daily_follow_up_goal": 5,
    "working_hours_start": "09:00",
    "working_hours_end": "18:00",
    "preferred_action_order": ["follow_up", "outreach", "check_in"],
    "auto_generate_actions": True,
    "show_ai_suggestions": True,
}

_daily_plans: dict = {}

_demo_actions = [
    {
        "id": "act_001",
        "type": "follow_up",
        "action_type": "follow_up",
        "title": "Follow-up Call mit Max",
        "description": "Nachfassen zum Angebot von letzter Woche",
        "lead_id": "lead_001",
        "lead_name": "Max Mustermann",
        "status": "pending",
        "priority": "high",
        "channel": "phone",
        "estimated_minutes": 15,
        "due_at": f"{datetime.now().strftime('%Y-%m-%d')}T10:00:00",
        "scheduled_time": "10:00",
        "metadata": {},
        "created_at": datetime.now().isoformat(),
    },
    {
        "id": "act_002",
        "type": "outreach",
        "action_type": "outreach",
        "title": "WhatsApp an Anna",
        "description": "Produktinfo senden",
        "lead_id": "lead_002",
        "lead_name": "Anna Schmidt",
        "status": "pending",
        "priority": "medium",
        "channel": "whatsapp",
        "estimated_minutes": 5,
        "due_at": f"{datetime.now().strftime('%Y-%m-%d')}T11:00:00",
        "scheduled_time": "11:00",
        "metadata": {},
        "created_at": datetime.now().isoformat(),
    },
    {
        "id": "act_003",
        "type": "check_in",
        "action_type": "check_in",
        "title": "Zoom-Call mit Thomas",
        "description": "Produktpräsentation",
        "lead_id": "lead_003",
        "lead_name": "Thomas Weber",
        "status": "pending",
        "priority": "critical",
        "channel": "meeting",
        "estimated_minutes": 30,
        "due_at": f"{datetime.now().strftime('%Y-%m-%d')}T14:00:00",
        "scheduled_time": "14:00",
        "metadata": {},
        "created_at": datetime.now().isoformat(),
    },
    {
        "id": "act_004",
        "type": "follow_up",
        "action_type": "follow_up",
        "title": "Check-in bei Lisa",
        "description": "3-Wochen Follow-up",
        "lead_id": "lead_004",
        "lead_name": "Lisa Müller",
        "status": "pending",
        "priority": "medium",
        "channel": "whatsapp",
        "estimated_minutes": 10,
        "due_at": f"{datetime.now().strftime('%Y-%m-%d')}T15:30:00",
        "scheduled_time": "15:30",
        "metadata": {},
        "created_at": datetime.now().isoformat(),
    },
    {
        "id": "act_005",
        "type": "outreach",
        "action_type": "outreach",
        "title": "Neukunden-Akquise",
        "description": "Cold Call aus Lead-Liste",
        "lead_id": "lead_005",
        "lead_name": "Peter Bauer",
        "status": "pending",
        "priority": "low",
        "channel": "phone",
        "estimated_minutes": 10,
        "due_at": f"{datetime.now().strftime('%Y-%m-%d')}T16:00:00",
        "scheduled_time": "16:00",
        "metadata": {},
        "created_at": datetime.now().isoformat(),
    },
]

_payment_checks = [
    {
        "id": "pay_001",
        "type": "check_payment",
        "action_type": "check_payment",
        "title": "Zahlung prüfen: Max",
        "description": "3er Pack Abo - ausstehend seit 3 Tagen",
        "lead_id": "lead_001",
        "lead_name": "Max Mustermann",
        "status": "pending",
        "priority": "critical",
        "channel": "whatsapp",
        "estimated_minutes": 5,
        "is_urgent": True,
        "metadata": {"amount": 297.00, "days_overdue": 3},
        "created_at": datetime.now().isoformat(),
    },
    {
        "id": "pay_002",
        "type": "check_payment",
        "action_type": "check_payment",
        "title": "Zahlung prüfen: Lisa",
        "description": "Starter Set - ausstehend seit 1 Tag",
        "lead_id": "lead_004",
        "lead_name": "Lisa Müller",
        "status": "pending",
        "priority": "high",
        "channel": "whatsapp",
        "estimated_minutes": 5,
        "is_urgent": False,
        "metadata": {"amount": 149.00, "days_overdue": 1},
        "created_at": datetime.now().isoformat(),
    },
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _get_or_create_plan(date_str: str, user_id: str = "demo-user") -> dict:
    """Holt oder erstellt einen Tagesplan."""
    key = f"{user_id}:{date_str}"
    
    if key not in _daily_plans:
        actions = [dict(a) for a in _demo_actions]
        _daily_plans[key] = {
            "id": str(uuid4()),
            "date": date_str,
            "user_id": user_id,
            "state": "ACTIVE",
            "actions": actions,
            "planned_new_contacts": 5,
            "planned_followups": 8,
            "planned_actions_total": len(actions),
            "target_calls": _daily_config["target_calls"],
            "target_messages": _daily_config["target_messages"],
            "target_meetings": _daily_config["target_meetings"],
            "completed_calls": 0,
            "completed_messages": 0,
            "completed_meetings": 0,
            "notes": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
    
    return _daily_plans[key]


def _calculate_stats(plan: dict) -> dict:
    """Berechnet Statistiken für einen Plan."""
    actions = plan.get("actions", [])
    total = len(actions)
    completed = len([a for a in actions if a.get("status") == "completed"])
    skipped = len([a for a in actions if a.get("status") == "skipped"])
    
    return {
        "total": total,
        "completed": completed,
        "skipped": skipped,
        "pending": total - completed - skipped,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
    }


def _get_next_action(actions: List[dict]) -> Optional[dict]:
    """Findet die nächste ausstehende Aktion."""
    pending = [a for a in actions if a.get("status") == "pending"]
    if not pending:
        return None
    
    # Sortiere nach Priorität
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    pending.sort(key=lambda x: priority_order.get(x.get("priority", "medium"), 2))
    
    return pending[0]


def _get_motivation_message(completion_rate: float) -> str:
    """Generiert eine motivierende Nachricht."""
    if completion_rate >= 100:
        return "🎉 Fantastisch! Du hast alle Aufgaben erledigt!"
    elif completion_rate >= 80:
        return "🔥 Fast geschafft! Nur noch ein paar Aufgaben!"
    elif completion_rate >= 50:
        return "💪 Gut dabei! Weiter so!"
    elif completion_rate >= 25:
        return "🚀 Guter Start! Bleib dran!"
    else:
        return "☀️ Los geht's! Ein Schritt nach dem anderen."


# =============================================================================
# STATUS ENDPOINTS
# =============================================================================

@router.get("/status", response_model=DailyFlowStatus)
async def get_status(
    date: Optional[str] = Query(None, description="Datum im Format YYYY-MM-DD"),
) -> DailyFlowStatus:
    """
    Holt den Daily Flow Status.
    
    Args:
        date: Datum (default: heute)
        
    Returns:
        DailyFlowStatus
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(date)
    stats = _calculate_stats(plan)
    next_action = _get_next_action(plan.get("actions", []))
    
    remaining_minutes = sum(
        a.get("estimated_minutes", 10)
        for a in plan.get("actions", [])
        if a.get("status") == "pending"
    )
    
    return DailyFlowStatus(
        date=date,
        total_actions=stats["total"],
        completed_actions=stats["completed"],
        completion_percent=stats["completion_rate"],
        streak_days=5,  # Demo
        estimated_remaining_minutes=remaining_minutes,
        next_action=DailyAction(**next_action) if next_action else None,
        motivational_message=_get_motivation_message(stats["completion_rate"]),
    )


# =============================================================================
# CONFIG ENDPOINTS
# =============================================================================

@router.get("/config", response_model=DailyConfig)
async def get_config() -> DailyConfig:
    """Holt die Daily-Flow-Konfiguration."""
    return DailyConfig(**_daily_config)


@router.put("/config", response_model=DailyConfig)
@router.post("/config", response_model=DailyConfig)
async def update_config(config: DailyConfig) -> DailyConfig:
    """Aktualisiert die Daily-Flow-Konfiguration."""
    global _daily_config
    _daily_config = config.model_dump()
    logger.info("Daily flow config updated")
    return DailyConfig(**_daily_config)


# =============================================================================
# SETTINGS ENDPOINTS
# =============================================================================

@router.get("/settings", response_model=DailyFlowSettings)
async def get_settings() -> DailyFlowSettings:
    """Holt die Daily Flow Settings."""
    return DailyFlowSettings(**_daily_settings)


@router.put("/settings", response_model=DailyFlowSettings)
async def update_settings(settings: DailyFlowSettings) -> DailyFlowSettings:
    """Aktualisiert die Daily Flow Settings."""
    global _daily_settings
    _daily_settings = settings.model_dump()
    logger.info("Daily flow settings updated")
    return DailyFlowSettings(**_daily_settings)


# =============================================================================
# PLAN ENDPOINTS
# =============================================================================

@router.get("/plan", response_model=DailyPlan)
async def get_plan(
    date: Optional[str] = Query(None, description="Datum im Format YYYY-MM-DD"),
    user_id: str = Query("demo-user", description="User ID"),
) -> DailyPlan:
    """Holt den Tagesplan."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(date, user_id)
    return DailyPlan(**plan)


@router.post("/plan/generate", response_model=DailyPlan)
async def generate_plan(
    date: Optional[str] = Query(None, description="Datum im Format YYYY-MM-DD"),
    user_id: str = Query("demo-user", description="User ID"),
) -> DailyPlan:
    """Generiert einen neuen Tagesplan."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    key = f"{user_id}:{date}"
    actions = [dict(a) for a in _demo_actions]
    
    _daily_plans[key] = {
        "id": str(uuid4()),
        "date": date,
        "user_id": user_id,
        "state": "ACTIVE",
        "actions": actions,
        "planned_new_contacts": 5,
        "planned_followups": 8,
        "planned_actions_total": len(actions),
        "target_calls": _daily_config["target_calls"],
        "target_messages": _daily_config["target_messages"],
        "target_meetings": _daily_config["target_meetings"],
        "completed_calls": 0,
        "completed_messages": 0,
        "completed_meetings": 0,
        "notes": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    
    logger.info(f"Generated daily plan for {date}")
    return DailyPlan(**_daily_plans[key])


# =============================================================================
# ACTION ENDPOINTS
# =============================================================================

@router.get("/actions", response_model=List[DailyAction])
async def get_actions(
    date: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
) -> List[DailyAction]:
    """Holt Aktionen für heute."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(date)
    actions = plan.get("actions", [])
    
    # Filter
    if type:
        actions = [a for a in actions if a.get("type") == type]
    if status:
        actions = [a for a in actions if a.get("status") == status]
    if priority:
        actions = [a for a in actions if a.get("priority") == priority]
    
    return [DailyAction(**a) for a in actions]


@router.get("/next", response_model=Optional[DailyAction])
async def get_next_action() -> Optional[DailyAction]:
    """Holt die nächste empfohlene Aktion."""
    date = datetime.now().strftime("%Y-%m-%d")
    plan = _get_or_create_plan(date)
    next_action = _get_next_action(plan.get("actions", []))
    
    if next_action:
        return DailyAction(**next_action)
    return None


@router.post("/actions", response_model=DailyAction)
async def create_action(
    action: dict = Body(...),
) -> DailyAction:
    """Erstellt eine neue Aktion."""
    date = datetime.now().strftime("%Y-%m-%d")
    plan = _get_or_create_plan(date)
    
    new_action = {
        "id": f"act_{uuid4().hex[:8]}",
        "type": action.get("type", "outreach"),
        "action_type": action.get("type", "outreach"),
        "title": action.get("title", "Neue Aktion"),
        "description": action.get("description"),
        "lead_id": action.get("lead_id"),
        "lead_name": action.get("lead_name"),
        "status": "pending",
        "priority": action.get("priority", "medium"),
        "channel": action.get("channel", "whatsapp"),
        "estimated_minutes": action.get("estimated_minutes", 10),
        "due_at": action.get("due_at"),
        "metadata": action.get("metadata", {}),
        "created_at": datetime.now().isoformat(),
    }
    
    plan["actions"].append(new_action)
    plan["updated_at"] = datetime.now().isoformat()
    
    logger.info(f"Created new action: {new_action['id']}")
    return DailyAction(**new_action)


@router.post("/actions/{action_id}/complete", response_model=ActionCompletion)
async def complete_action(
    action_id: str,
    source: str = Query("daily_flow"),
    data: dict = Body(default={}),
) -> ActionCompletion:
    """Markiert eine Aktion als abgeschlossen."""
    for plan in _daily_plans.values():
        for action in plan.get("actions", []):
            if action["id"] == action_id:
                action["status"] = "completed"
                action["completed_at"] = datetime.now().isoformat()
                
                # Update Counters
                if action.get("channel") == "phone":
                    plan["completed_calls"] = plan.get("completed_calls", 0) + 1
                elif action.get("channel") in ["whatsapp", "email"]:
                    plan["completed_messages"] = plan.get("completed_messages", 0) + 1
                elif action.get("channel") == "meeting":
                    plan["completed_meetings"] = plan.get("completed_meetings", 0) + 1
                
                plan["updated_at"] = datetime.now().isoformat()
                
                logger.info(f"Action {action_id} completed")
                return ActionCompletion(
                    action_id=action_id,
                    completed=True,
                    notes=data.get("notes"),
                    outcome=data.get("outcome"),
                    xp_earned=15,
                    celebration_message="🎉 Super gemacht!",
                )
    
    raise HTTPException(status_code=404, detail="Aktion nicht gefunden")


@router.post("/actions/{action_id}/skip")
async def skip_action(
    action_id: str,
    data: dict = Body(default={}),
) -> dict:
    """Überspringt eine Aktion."""
    for plan in _daily_plans.values():
        for action in plan.get("actions", []):
            if action["id"] == action_id:
                action["status"] = "skipped"
                plan["updated_at"] = datetime.now().isoformat()
                
                logger.info(f"Action {action_id} skipped")
                return {"success": True, "message": "Aktion übersprungen"}
    
    raise HTTPException(status_code=404, detail="Aktion nicht gefunden")


@router.post("/actions/{action_id}/snooze", response_model=DailyAction)
async def snooze_action(
    action_id: str,
    data: dict = Body(default={}),
) -> DailyAction:
    """Verschiebt eine Aktion (Snooze)."""
    snooze_minutes = data.get("snooze_minutes", 60)
    snooze_until = data.get("snooze_until")
    
    for plan in _daily_plans.values():
        for action in plan.get("actions", []):
            if action["id"] == action_id:
                action["status"] = "snoozed"
                if snooze_until:
                    action["snoozed_until"] = snooze_until
                else:
                    action["snoozed_until"] = (
                        datetime.now() + timedelta(minutes=snooze_minutes)
                    ).isoformat()
                plan["updated_at"] = datetime.now().isoformat()
                
                logger.info(f"Action {action_id} snoozed")
                return DailyAction(**action)
    
    raise HTTPException(status_code=404, detail="Aktion nicht gefunden")


@router.post("/actions/{action_id}/start")
async def start_action(action_id: str) -> dict:
    """Startet eine Aktion."""
    for plan in _daily_plans.values():
        for action in plan.get("actions", []):
            if action["id"] == action_id:
                action["status"] = "in_progress"
                plan["updated_at"] = datetime.now().isoformat()
                
                logger.info(f"Action {action_id} started")
                return {"success": True, "action": DailyAction(**action).model_dump()}
    
    raise HTTPException(status_code=404, detail="Aktion nicht gefunden")


# =============================================================================
# GENERATION & HISTORY
# =============================================================================

@router.post("/generate")
async def generate_actions(
    force: bool = Query(False),
) -> dict:
    """Generiert Aktionen für heute."""
    date = datetime.now().strftime("%Y-%m-%d")
    plan = _get_or_create_plan(date)
    
    if force:
        plan["actions"] = [dict(a) for a in _demo_actions]
        plan["updated_at"] = datetime.now().isoformat()
    
    return {
        "generated": len(plan["actions"]),
        "actions": [DailyAction(**a) for a in plan["actions"]],
    }


@router.get("/history")
async def get_history(
    days: int = Query(7),
    type: Optional[str] = Query(None),
) -> List[dict]:
    """Holt den Verlauf."""
    history = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        history.append({
            "date": date,
            "total": 10 - i % 3,
            "completed": 8 - i % 4,
            "completion_rate": round((8 - i % 4) / (10 - i % 3) * 100, 1),
        })
    
    return history


# =============================================================================
# STATS & SUMMARY
# =============================================================================

@router.get("/stats", response_model=DailyStats)
async def get_stats(
    date: Optional[str] = Query(None),
) -> DailyStats:
    """Holt Tagesstatistiken."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(date)
    stats = _calculate_stats(plan)
    
    return DailyStats(
        date=date,
        total_actions=stats["total"],
        completed_actions=stats["completed"],
        skipped_actions=stats["skipped"],
        completion_rate=stats["completion_rate"],
        calls_completed=plan.get("completed_calls", 0),
        messages_sent=plan.get("completed_messages", 0),
        meetings_held=plan.get("completed_meetings", 0),
        leads_contacted=plan.get("completed_calls", 0) + plan.get("completed_messages", 0),
        deals_progressed=0,
        revenue_generated=0.0,
    )


@router.get("/summary", response_model=DailySummary)
async def get_summary(
    for_date: Optional[str] = Query(None),
) -> DailySummary:
    """Holt die Tages-Zusammenfassung."""
    if not for_date:
        for_date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(for_date)
    stats = _calculate_stats(plan)
    next_action = _get_next_action(plan.get("actions", []))
    
    return DailySummary(
        date=for_date,
        total_actions=stats["total"],
        completed_actions=stats["completed"],
        skipped_actions=stats["skipped"],
        pending_actions=stats["pending"],
        completion_rate=stats["completion_rate"],
        next_action=DailyAction(**next_action) if next_action else None,
        streak_days=5,
        motivation_message=_get_motivation_message(stats["completion_rate"]),
    )


# =============================================================================
# UNIFIED & SPECIAL ACTIONS
# =============================================================================

@router.get("/unified-actions")
async def get_unified_actions(
    for_date: Optional[str] = Query(None),
    include_completed: bool = Query(False),
    limit: int = Query(50),
) -> List[dict]:
    """Holt alle vereinheitlichten Actions."""
    if not for_date:
        for_date = datetime.now().strftime("%Y-%m-%d")
    
    plan = _get_or_create_plan(for_date)
    actions = plan.get("actions", [])
    
    # Add payment checks
    all_actions = actions + _payment_checks
    
    if not include_completed:
        all_actions = [a for a in all_actions if a.get("status") != "completed"]
    
    # Sort by priority
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    all_actions.sort(key=lambda x: priority_order.get(x.get("priority", "medium"), 2))
    
    return all_actions[:limit]


@router.get("/urgent-actions")
async def get_urgent_actions(limit: int = Query(10)) -> List[dict]:
    """Holt nur dringende Actions."""
    date = datetime.now().strftime("%Y-%m-%d")
    plan = _get_or_create_plan(date)
    
    urgent = [
        a for a in plan.get("actions", []) + _payment_checks
        if a.get("priority") in ["critical", "high"] or a.get("is_urgent")
    ]
    
    return urgent[:limit]


@router.get("/payment-checks")
async def get_payment_checks() -> List[dict]:
    """Holt alle Zahlungsprüfungen."""
    return [p for p in _payment_checks if p.get("status") == "pending"]


# =============================================================================
# CONVERSION RATES
# =============================================================================

@router.get("/conversion-rates")
async def get_conversion_rates(
    days: int = Query(30),
) -> dict:
    """Holt Conversion-Raten."""
    return {
        "contact_to_lead": 0.30,
        "lead_to_deal": 0.15,
        "overall": 0.045,
        "rates": [
            ConversionRate(
                period="Letzte 7 Tage",
                calls_made=35,
                appointments_set=8,
                deals_closed=2,
                call_to_appointment=22.9,
                appointment_to_deal=25.0,
                overall_rate=5.7,
                contact_to_lead=0.32,
                lead_to_deal=0.18,
            ).model_dump(),
            ConversionRate(
                period="Letzte 30 Tage",
                calls_made=150,
                appointments_set=32,
                deals_closed=8,
                call_to_appointment=21.3,
                appointment_to_deal=25.0,
                overall_rate=5.3,
                contact_to_lead=0.30,
                lead_to_deal=0.15,
            ).model_dump(),
        ],
    }


# =============================================================================
# STREAK & LEADERBOARD
# =============================================================================

@router.get("/streak")
async def get_streak(
    user_id: str = Query("demo-user"),
) -> dict:
    """Holt die aktuelle Streak."""
    return {
        "current_streak": 5,
        "best_streak": 12,
        "goals_met_today": True,
        "calls_target_met": True,
        "messages_target_met": True,
        "meetings_target_met": False,
    }


@router.get("/leaderboard")
async def get_leaderboard(
    period: str = Query("week"),
    limit: int = Query(10),
) -> dict:
    """Holt das Team-Leaderboard."""
    leaderboard = [
        {"rank": 1, "name": "Lisa Müller", "score": 156, "calls": 48, "deals": 5},
        {"rank": 2, "name": "Max Schmidt", "score": 142, "calls": 45, "deals": 4},
        {"rank": 3, "name": "Anna Weber", "score": 128, "calls": 38, "deals": 4},
        {"rank": 4, "name": "Du", "score": 115, "calls": 35, "deals": 3, "is_you": True},
        {"rank": 5, "name": "Tom Bauer", "score": 98, "calls": 32, "deals": 2},
    ]
    
    return {
        "period": period,
        "leaderboard": leaderboard[:limit],
        "your_rank": 4,
        "total_participants": 12,
    }


# =============================================================================
# LEGACY ENDPOINTS (für Kompatibilität)
# =============================================================================

@router.post("/activity/{activity_id}/complete")
async def complete_activity_legacy(
    activity_id: str,
    notes: Optional[str] = None,
) -> dict:
    """Legacy: Markiert eine Aktivität als abgeschlossen."""
    return await complete_action(activity_id, "daily_flow", {"notes": notes})


@router.post("/activity/{activity_id}/skip")
async def skip_activity_legacy(
    activity_id: str,
    reason: Optional[str] = None,
) -> dict:
    """Legacy: Überspringt eine Aktivität."""
    return await skip_action(activity_id, {"reason": reason})
