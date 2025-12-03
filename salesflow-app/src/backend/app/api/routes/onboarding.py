"""
╔════════════════════════════════════════════════════════════════════════════╗
║  ONBOARDING API ROUTES                                                     ║
║  Neue User zum ersten Erfolg führen                                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET  /onboarding/progress     → Aktueller Fortschritt
- GET  /onboarding/tasks        → Tasks für aktuelle Stage
- POST /onboarding/tasks/{id}/complete → Task abschließen
- GET  /onboarding/next         → Nächste Aktion (für Overwhelmed)
- POST /onboarding/milestones   → Milestone tracken
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
import logging

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...config.prompts.chief_onboarding import (
    OnboardingStage,
    OnboardingTask,
    OnboardingProgress,
    ONBOARDING_TASKS,
    ONBOARDING_MESSAGES,
    get_current_stage,
    get_tasks_for_stage,
    get_next_task,
    detect_overwhelm,
    get_simplification_action,
    generate_onboarding_message,
    generate_progress_summary,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# =============================================================================
# Pydantic Models
# =============================================================================

class OnboardingProgressResponse(BaseModel):
    """Onboarding-Fortschritt Response."""
    current_stage: str
    days_since_start: int
    tasks_completed: int
    tasks_total: int
    completion_percent: float
    first_contact_sent: bool
    first_reply_received: bool
    first_sale: bool
    is_overwhelmed: bool
    next_task: Optional[dict] = None
    message: Optional[str] = None


class OnboardingTaskResponse(BaseModel):
    """Task Response."""
    id: str
    title: str
    description: str
    estimated_minutes: int
    is_required: bool
    is_completed: bool
    celebration_message: Optional[str] = None


class TaskCompleteRequest(BaseModel):
    """Request zum Abschließen einer Task."""
    notes: Optional[str] = None


class MilestoneRequest(BaseModel):
    """Request zum Tracken eines Milestones."""
    milestone_type: str = Field(..., description="first_contact, first_reply, first_sale, first_objection")
    lead_id: Optional[str] = None
    details: Optional[dict] = None


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/progress", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Aktueller Onboarding-Fortschritt des Users.
    
    Gibt zurück:
    - Aktuelle Stage (day_1, days_2_3, etc.)
    - Completed Tasks
    - Milestones (first_contact, first_reply, first_sale)
    - Ob User overwhelmed ist
    - Nächste empfohlene Task
    """
    user_id = str(current_user.id)
    
    # Onboarding-Daten laden oder erstellen
    result = supabase.table("user_onboarding").select("*").eq(
        "user_id", user_id
    ).single().execute()
    
    if not result.data:
        # Neuen Onboarding-Record erstellen
        start_date = date.today()
        new_record = {
            "user_id": user_id,
            "started_at": start_date.isoformat(),
            "current_stage": OnboardingStage.DAY_1.value,
            "completed_tasks": [],
            "first_contact_sent": False,
            "first_reply_received": False,
            "first_sale": False,
        }
        supabase.table("user_onboarding").insert(new_record).execute()
        data = new_record
    else:
        data = result.data
    
    # Days since start berechnen
    started_at = datetime.fromisoformat(data["started_at"]).date()
    days_since_start = (date.today() - started_at).days + 1
    
    # Aktuelle Stage ermitteln
    current_stage = get_current_stage(days_since_start)
    
    # Tasks zählen
    completed_task_ids = data.get("completed_tasks", [])
    stage_tasks = get_tasks_for_stage(current_stage)
    tasks_total = len([t for t in ONBOARDING_TASKS if t.is_required])
    tasks_completed = len(completed_task_ids)
    
    # Overwhelm Detection
    session_count = data.get("session_count", 0)
    days_inactive = data.get("days_inactive", 0)
    is_overwhelmed = detect_overwhelm(
        days_since_start=days_since_start,
        tasks_completed=tasks_completed,
        days_inactive=days_inactive,
        session_count=session_count,
    )
    
    # Nächste Task
    progress = OnboardingProgress(
        user_id=user_id,
        current_stage=current_stage,
        days_since_start=days_since_start,
        tasks_completed=tasks_completed,
        tasks_total=tasks_total,
        first_contact_sent=data.get("first_contact_sent", False),
        first_reply_received=data.get("first_reply_received", False),
        first_sale=data.get("first_sale", False),
        is_overwhelmed=is_overwhelmed,
    )
    
    next_task = get_next_task(progress, completed_task_ids)
    next_task_dict = None
    if next_task:
        next_task_dict = {
            "id": next_task.id,
            "title": next_task.title,
            "description": next_task.description,
            "estimated_minutes": next_task.estimated_minutes,
        }
    
    # Message basierend auf Zustand
    message = None
    if is_overwhelmed:
        action = get_simplification_action(progress, completed_task_ids)
        message = generate_onboarding_message("overwhelm_detected", {"single_action": action})
    elif days_since_start == 1:
        message = ONBOARDING_MESSAGES.get("welcome", "")
    
    return OnboardingProgressResponse(
        current_stage=current_stage.value,
        days_since_start=days_since_start,
        tasks_completed=tasks_completed,
        tasks_total=tasks_total,
        completion_percent=(tasks_completed / tasks_total * 100) if tasks_total > 0 else 0,
        first_contact_sent=data.get("first_contact_sent", False),
        first_reply_received=data.get("first_reply_received", False),
        first_sale=data.get("first_sale", False),
        is_overwhelmed=is_overwhelmed,
        next_task=next_task_dict,
        message=message,
    )


@router.get("/tasks", response_model=List[OnboardingTaskResponse])
async def get_onboarding_tasks(
    stage: Optional[str] = Query(None, description="Filter nach Stage"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Liste aller Onboarding-Tasks.
    
    Optional nach Stage filtern:
    - day_1
    - days_2_3
    - days_4_7
    - days_8_14
    """
    user_id = str(current_user.id)
    
    # Completed Tasks laden
    result = supabase.table("user_onboarding").select(
        "completed_tasks"
    ).eq("user_id", user_id).single().execute()
    
    completed_ids = result.data.get("completed_tasks", []) if result.data else []
    
    # Tasks filtern
    tasks = ONBOARDING_TASKS
    if stage:
        try:
            stage_enum = OnboardingStage(stage)
            tasks = [t for t in tasks if t.stage == stage_enum]
        except ValueError:
            pass
    
    return [
        OnboardingTaskResponse(
            id=t.id,
            title=t.title,
            description=t.description,
            estimated_minutes=t.estimated_minutes,
            is_required=t.is_required,
            is_completed=t.id in completed_ids,
            celebration_message=t.celebration_on_complete if t.id in completed_ids else None,
        )
        for t in tasks
    ]


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    data: TaskCompleteRequest = None,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Markiert eine Onboarding-Task als abgeschlossen.
    
    Gibt Celebration-Message zurück wenn vorhanden.
    """
    user_id = str(current_user.id)
    
    # Task finden
    task = next((t for t in ONBOARDING_TASKS if t.id == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Onboarding-Record updaten
    result = supabase.table("user_onboarding").select("*").eq(
        "user_id", user_id
    ).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Onboarding not started")
    
    completed_tasks = result.data.get("completed_tasks", [])
    
    if task_id not in completed_tasks:
        completed_tasks.append(task_id)
        supabase.table("user_onboarding").update({
            "completed_tasks": completed_tasks,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("user_id", user_id).execute()
    
    return {
        "success": True,
        "task_id": task_id,
        "celebration": task.celebration_on_complete,
        "tasks_completed": len(completed_tasks),
    }


@router.get("/next")
async def get_next_action(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Gibt die EINE nächste Aktion zurück.
    
    Besonders nützlich für overwhelmed User - 
    zeigt nur eine einzige, einfache Aktion.
    """
    user_id = str(current_user.id)
    
    # Fortschritt laden
    result = supabase.table("user_onboarding").select("*").eq(
        "user_id", user_id
    ).single().execute()
    
    if not result.data:
        return {
            "action": "Start Onboarding",
            "description": "Willkommen! Lass uns loslegen.",
            "estimated_minutes": 2,
            "cta": "Los geht's",
        }
    
    data = result.data
    completed_ids = data.get("completed_tasks", [])
    
    started_at = datetime.fromisoformat(data["started_at"]).date()
    days_since_start = (date.today() - started_at).days + 1
    current_stage = get_current_stage(days_since_start)
    
    progress = OnboardingProgress(
        user_id=user_id,
        current_stage=current_stage,
        days_since_start=days_since_start,
        tasks_completed=len(completed_ids),
        tasks_total=len(ONBOARDING_TASKS),
        first_contact_sent=data.get("first_contact_sent", False),
        first_reply_received=data.get("first_reply_received", False),
        first_sale=data.get("first_sale", False),
    )
    
    next_task = get_next_task(progress, completed_ids)
    
    if next_task:
        return {
            "action": next_task.title,
            "description": next_task.description,
            "estimated_minutes": next_task.estimated_minutes,
            "task_id": next_task.id,
            "cta": "Jetzt machen",
        }
    
    return {
        "action": "Onboarding abgeschlossen!",
        "description": "Du hast alle Aufgaben erledigt. Weiter so!",
        "estimated_minutes": 0,
        "cta": "Zum Dashboard",
    }


@router.post("/milestones")
async def track_milestone(
    data: MilestoneRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Trackt einen Milestone im Onboarding.
    
    Milestone-Types:
    - first_contact: Erste Nachricht gesendet
    - first_reply: Erste Antwort bekommen
    - first_sale: Erster Abschluss
    - first_objection: Ersten Einwand behandelt
    """
    user_id = str(current_user.id)
    
    # Onboarding updaten
    update_data = {
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    milestone_field_map = {
        "first_contact": "first_contact_sent",
        "first_reply": "first_reply_received",
        "first_sale": "first_sale",
    }
    
    if data.milestone_type in milestone_field_map:
        update_data[milestone_field_map[data.milestone_type]] = True
    
    supabase.table("user_onboarding").update(update_data).eq(
        "user_id", user_id
    ).execute()
    
    # Celebration Message holen
    celebration_map = {
        "first_contact": "💪 Erste Nachricht raus! Du bist mutiger als 50% die nie anfangen.",
        "first_reply": "🎉 BOOM! Deine erste Antwort! Das ist RIESIG!",
        "first_sale": "🏆🏆🏆 DEIN ERSTER SALE! Das ist der Moment den du nie vergisst!",
        "first_objection": "💪 Ersten Einwand gemeistert! Du wirst immer besser.",
    }
    
    return {
        "success": True,
        "milestone": data.milestone_type,
        "celebration": celebration_map.get(data.milestone_type, "🎉 Milestone erreicht!"),
    }

