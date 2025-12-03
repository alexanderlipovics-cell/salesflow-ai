"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CONTACT PLANS API                                                         ║
║  API für Contact Plans aus dem Chat-Import-System                         ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/chat-import", tags=["contact-plans"])


# =============================================================================
# MODELS
# =============================================================================

class ContactPlan(BaseModel):
    """Ein Contact Plan."""
    id: str
    deal_id: Optional[str] = None
    contact_name: str
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    action_type: str  # check_payment, follow_up_message, call, reactivation_follow_up
    action_description: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    status: str = "pending"  # pending, completed, skipped, snoozed
    priority: int = 50  # 0-100
    is_urgent: bool = False
    deal_state: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


class ContactPlanStats(BaseModel):
    """Statistiken für Contact Plans."""
    total_today: int
    total_overdue: int
    total_upcoming: int
    payment_checks: int
    urgent_count: int


# =============================================================================
# IN-MEMORY STORE (Demo-Daten)
# =============================================================================

_demo_contact_plans = [
    {
        "id": "cp_001",
        "deal_id": "deal_001",
        "contact_name": "Max Mustermann",
        "contact_phone": "+49 171 1234567",
        "contact_email": "max@example.com",
        "action_type": "check_payment",
        "action_description": "Zahlungseingang prüfen - 3er Pack Abo",
        "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
        "scheduled_time": "10:00",
        "status": "pending",
        "priority": 90,
        "is_urgent": True,
        "deal_state": "payment_pending",
        "notes": None,
        "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
    },
    {
        "id": "cp_002",
        "deal_id": "deal_002",
        "contact_name": "Anna Schmidt",
        "contact_phone": "+49 172 2345678",
        "contact_email": "anna@example.com",
        "action_type": "follow_up_message",
        "action_description": "Nachfassen - Produktinfo gesendet",
        "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
        "scheduled_time": "11:00",
        "status": "pending",
        "priority": 70,
        "is_urgent": False,
        "deal_state": "info_sent",
        "notes": None,
        "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
    },
    {
        "id": "cp_003",
        "deal_id": "deal_003",
        "contact_name": "Lisa Müller",
        "contact_phone": "+49 173 3456789",
        "contact_email": None,
        "action_type": "call",
        "action_description": "Anrufen - Interesse bekundet",
        "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
        "scheduled_time": "14:00",
        "status": "pending",
        "priority": 80,
        "is_urgent": False,
        "deal_state": "interested",
        "notes": None,
        "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
    },
    {
        "id": "cp_004",
        "deal_id": "deal_004",
        "contact_name": "Thomas Weber",
        "contact_phone": "+49 174 4567890",
        "contact_email": "thomas@example.com",
        "action_type": "reactivation_follow_up",
        "action_description": "Reaktivierung - 30 Tage kein Kontakt",
        "scheduled_date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
        "scheduled_time": None,
        "status": "pending",
        "priority": 60,
        "is_urgent": True,
        "deal_state": "cold",
        "notes": None,
        "created_at": (datetime.now() - timedelta(days=30)).isoformat(),
    },
    {
        "id": "cp_005",
        "deal_id": "deal_005",
        "contact_name": "Peter Bauer",
        "contact_phone": "+49 175 5678901",
        "contact_email": "peter@example.com",
        "action_type": "check_payment",
        "action_description": "Zahlungseingang prüfen - Starter Set",
        "scheduled_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
        "scheduled_time": "09:00",
        "status": "pending",
        "priority": 95,
        "is_urgent": True,
        "deal_state": "payment_pending",
        "notes": "Bereits 2x nachgefragt",
        "created_at": (datetime.now() - timedelta(days=7)).isoformat(),
    },
]

_contact_plans_store = {plan["id"]: plan for plan in _demo_contact_plans}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _get_plans_by_date(target_date: str) -> List[dict]:
    """Holt Plans für ein bestimmtes Datum."""
    return [
        plan for plan in _contact_plans_store.values()
        if plan["scheduled_date"] == target_date and plan["status"] == "pending"
    ]


def _get_overdue_plans() -> List[dict]:
    """Holt überfällige Plans."""
    today = datetime.now().strftime("%Y-%m-%d")
    return [
        plan for plan in _contact_plans_store.values()
        if plan["scheduled_date"] < today and plan["status"] == "pending"
    ]


def _get_upcoming_plans(days: int) -> List[dict]:
    """Holt kommende Plans."""
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    return [
        plan for plan in _contact_plans_store.values()
        if today < plan["scheduled_date"] <= future and plan["status"] == "pending"
    ]


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/contact-plans/today", response_model=List[ContactPlan])
async def get_todays_contact_plans() -> List[ContactPlan]:
    """
    Holt die Contact Plans für heute.
    
    Returns:
        Liste von ContactPlans für heute
    """
    today = datetime.now().strftime("%Y-%m-%d")
    plans = _get_plans_by_date(today)
    
    # Nach Priorität sortieren
    plans.sort(key=lambda x: x.get("priority", 50), reverse=True)
    
    return [ContactPlan(**plan) for plan in plans]


@router.get("/contact-plans/overdue", response_model=List[ContactPlan])
async def get_overdue_contact_plans() -> List[ContactPlan]:
    """
    Holt überfällige Contact Plans.
    
    Returns:
        Liste von überfälligen ContactPlans
    """
    plans = _get_overdue_plans()
    
    # Nach Datum sortieren (älteste zuerst)
    plans.sort(key=lambda x: x.get("scheduled_date", ""))
    
    return [ContactPlan(**plan) for plan in plans]


@router.get("/contact-plans/upcoming", response_model=List[ContactPlan])
async def get_upcoming_contact_plans(
    days: int = Query(7, description="Tage in die Zukunft"),
) -> List[ContactPlan]:
    """
    Holt kommende Contact Plans.
    
    Args:
        days: Anzahl Tage in die Zukunft
        
    Returns:
        Liste von kommenden ContactPlans
    """
    plans = _get_upcoming_plans(days)
    
    # Nach Datum sortieren
    plans.sort(key=lambda x: x.get("scheduled_date", ""))
    
    return [ContactPlan(**plan) for plan in plans]


@router.get("/contact-plans/stats", response_model=ContactPlanStats)
async def get_contact_plan_stats() -> ContactPlanStats:
    """
    Holt Statistiken für Contact Plans.
    
    Returns:
        ContactPlanStats
    """
    today = datetime.now().strftime("%Y-%m-%d")
    today_plans = _get_plans_by_date(today)
    overdue_plans = _get_overdue_plans()
    upcoming_plans = _get_upcoming_plans(7)
    
    all_pending = [p for p in _contact_plans_store.values() if p["status"] == "pending"]
    
    return ContactPlanStats(
        total_today=len(today_plans),
        total_overdue=len(overdue_plans),
        total_upcoming=len(upcoming_plans),
        payment_checks=len([p for p in all_pending if p["action_type"] == "check_payment"]),
        urgent_count=len([p for p in all_pending if p.get("is_urgent", False)]),
    )


@router.post("/contact-plans/{plan_id}/complete")
async def complete_contact_plan(
    plan_id: str,
    note: Optional[str] = None,
) -> dict:
    """
    Markiert einen Contact Plan als abgeschlossen.
    
    Args:
        plan_id: ID des Plans
        note: Optionale Notiz
        
    Returns:
        Bestätigung
    """
    if plan_id not in _contact_plans_store:
        raise HTTPException(status_code=404, detail="Contact Plan nicht gefunden")
    
    plan = _contact_plans_store[plan_id]
    plan["status"] = "completed"
    plan["completed_at"] = datetime.now().isoformat()
    if note:
        plan["notes"] = note
    
    logger.info(f"Contact Plan {plan_id} completed")
    return {
        "success": True,
        "message": "Contact Plan abgeschlossen",
        "plan": ContactPlan(**plan),
    }


@router.post("/contact-plans/{plan_id}/skip")
async def skip_contact_plan(
    plan_id: str,
    reason: Optional[str] = None,
) -> dict:
    """
    Überspringt einen Contact Plan.
    
    Args:
        plan_id: ID des Plans
        reason: Grund fürs Überspringen
        
    Returns:
        Bestätigung
    """
    if plan_id not in _contact_plans_store:
        raise HTTPException(status_code=404, detail="Contact Plan nicht gefunden")
    
    plan = _contact_plans_store[plan_id]
    plan["status"] = "skipped"
    if reason:
        plan["notes"] = reason
    
    logger.info(f"Contact Plan {plan_id} skipped: {reason}")
    return {
        "success": True,
        "message": "Contact Plan übersprungen",
    }


@router.post("/contact-plans/{plan_id}/reschedule")
async def reschedule_contact_plan(
    plan_id: str,
    new_date: str = Query(..., description="Neues Datum im Format YYYY-MM-DD"),
) -> dict:
    """
    Verschiebt einen Contact Plan auf ein neues Datum.
    
    Args:
        plan_id: ID des Plans
        new_date: Neues Datum
        
    Returns:
        Aktualisierter Plan
    """
    if plan_id not in _contact_plans_store:
        raise HTTPException(status_code=404, detail="Contact Plan nicht gefunden")
    
    plan = _contact_plans_store[plan_id]
    plan["scheduled_date"] = new_date
    plan["status"] = "pending"  # Reset status if was snoozed
    
    logger.info(f"Contact Plan {plan_id} rescheduled to {new_date}")
    return {
        "success": True,
        "message": f"Contact Plan verschoben auf {new_date}",
        "plan": ContactPlan(**plan),
    }


@router.get("/contact-plans/{plan_id}", response_model=ContactPlan)
async def get_contact_plan(plan_id: str) -> ContactPlan:
    """
    Holt einen einzelnen Contact Plan.
    
    Args:
        plan_id: ID des Plans
        
    Returns:
        ContactPlan
    """
    if plan_id not in _contact_plans_store:
        raise HTTPException(status_code=404, detail="Contact Plan nicht gefunden")
    
    return ContactPlan(**_contact_plans_store[plan_id])


# =============================================================================
# TEMPLATE ENDPOINTS (für Chat Import)
# =============================================================================

@router.get("/templates")
async def get_templates() -> dict:
    """
    Holt verfügbare Nachrichtenvorlagen.
    
    Returns:
        Liste von Templates
    """
    templates = [
        {
            "id": "tpl_001",
            "name": "Zahlungs-Erinnerung",
            "category": "payment",
            "message": "Hey {name}! 👋 Kurze Frage: Hast du schon die Überweisung gemacht? Würde mich freuen von dir zu hören! 💚",
            "use_cases": ["check_payment"],
        },
        {
            "id": "tpl_002",
            "name": "Follow-up nach Info",
            "category": "follow_up",
            "message": "Hey {name}! 👋 Hast du dir die Infos anschauen können? Ich bin gespannt was du davon hältst! 😊",
            "use_cases": ["follow_up_message"],
        },
        {
            "id": "tpl_003",
            "name": "Reaktivierung",
            "category": "reactivation",
            "message": "Hey {name}! 👋 Lange nichts gehört - wie geht's dir? Magst du dich mal auf einen Kaffee treffen? ☕",
            "use_cases": ["reactivation_follow_up"],
        },
        {
            "id": "tpl_004",
            "name": "Terminbestätigung",
            "category": "appointment",
            "message": "Hey {name}! 👋 Kurz zur Bestätigung: Wir sehen uns {date} um {time}, richtig? Freu mich! 🎉",
            "use_cases": ["call", "meeting"],
        },
    ]
    
    return {
        "templates": templates,
        "total": len(templates),
    }


@router.post("/templates/{template_id}/use")
async def use_template(
    template_id: str,
    contact_name: str = Query(..., description="Name des Kontakts"),
) -> dict:
    """
    Wendet ein Template an.
    
    Args:
        template_id: ID des Templates
        contact_name: Name für Personalisierung
        
    Returns:
        Personalisierte Nachricht
    """
    templates = {
        "tpl_001": "Hey {name}! 👋 Kurze Frage: Hast du schon die Überweisung gemacht? Würde mich freuen von dir zu hören! 💚",
        "tpl_002": "Hey {name}! 👋 Hast du dir die Infos anschauen können? Ich bin gespannt was du davon hältst! 😊",
        "tpl_003": "Hey {name}! 👋 Lange nichts gehört - wie geht's dir? Magst du dich mal auf einen Kaffee treffen? ☕",
        "tpl_004": "Hey {name}! 👋 Wir sehen uns bald, richtig? Freu mich! 🎉",
    }
    
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")
    
    message = templates[template_id].replace("{name}", contact_name)
    
    return {
        "message": message,
        "template_id": template_id,
    }

