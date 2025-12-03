"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GHOST BUSTER API ROUTES                                                   ║
║  Re-Engagement für Leads die nicht mehr antworten                          ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET  /ghosts                → Liste aller Ghosts
- GET  /ghosts/{id}           → Ghost-Details mit Re-Engagement Plan
- POST /ghosts/{id}/reengage  → Re-Engagement Nachricht generieren
- POST /ghosts/{id}/action    → Aktion ausführen (send, skip, breakup)
- GET  /ghosts/report         → Ghost-Report Übersicht
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import logging

from ...db.deps import get_db, get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...config.prompts.chief_ghost_buster import (
    GhostType,
    ReEngagementStrategy,
    Ghost,
    ReEngagementResult,
    classify_ghost,
    get_reactivation_probability,
    recommend_strategy,
    get_optimal_timing,
    generate_reengagement_message,
    create_reengagement_plan,
    generate_ghost_report,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ghosts", tags=["ghost-buster"])


# =============================================================================
# Pydantic Models
# =============================================================================

class GhostResponse(BaseModel):
    """Ghost Response."""
    id: str
    name: str
    platform: str
    ghost_type: str
    hours_since_seen: int
    was_online_since: bool
    reengagement_attempts: int
    conversion_probability: float
    recommended_strategy: str
    optimal_timing: str


class GhostDetailResponse(BaseModel):
    """Detaillierte Ghost-Infos mit Re-Engagement Plan."""
    id: str
    name: str
    platform: str
    profile_url: Optional[str]
    ghost_type: str
    ghost_type_description: str
    hours_since_seen: int
    days_since_seen: float
    was_online_since: bool
    last_message_preview: Optional[str]
    reengagement_attempts: int
    last_strategy_used: Optional[str]
    conversion_probability: float
    recommended_strategy: str
    strategy_description: str
    optimal_timing: str
    is_final_attempt: bool
    suggested_message: str


class ReEngageRequest(BaseModel):
    """Request für Re-Engagement Nachricht."""
    strategy: Optional[str] = Field(None, description="Optional: Strategie überschreiben")
    custom_context: Optional[dict] = Field(None, description="Zusätzlicher Kontext")


class ReEngageResponse(BaseModel):
    """Re-Engagement Nachricht Response."""
    strategy: str
    message: str
    timing_suggestion: str
    success_probability: float
    is_final_attempt: bool
    alternatives: List[str] = []


class GhostActionRequest(BaseModel):
    """Aktion für Ghost."""
    action: str = Field(..., description="send, skip, breakup, snooze")
    message_sent: Optional[str] = None
    snooze_days: Optional[int] = Field(default=3, ge=1, le=30)
    skip_reason: Optional[str] = None


class GhostReportResponse(BaseModel):
    """Ghost-Report Übersicht."""
    total_ghosts: int
    soft_ghosts: int
    hard_ghosts: int
    deep_ghosts: int
    report_text: str
    top_priority: List[dict]


# =============================================================================
# Helper Functions
# =============================================================================

def _build_ghost_from_db(data: dict) -> Ghost:
    """Baut ein Ghost-Objekt aus DB-Daten."""
    hours = 0
    if data.get("seen_at"):
        seen_at = datetime.fromisoformat(data["seen_at"].replace("Z", "+00:00"))
        hours = int((datetime.utcnow() - seen_at.replace(tzinfo=None)).total_seconds() / 3600)
    
    ghost_type = classify_ghost(
        hours_since_seen=hours,
        was_online_since=data.get("was_online_since", False),
        reengagement_attempts=data.get("ghost_followup_count", 0),
    )
    
    return Ghost(
        id=data.get("id", ""),
        name=data.get("contact_name", "Unknown"),
        platform=data.get("platform", "unknown"),
        ghost_type=ghost_type,
        hours_since_seen=hours,
        was_online_since=data.get("was_online_since", False),
        last_message_type=data.get("message_type", "unknown"),
        reengagement_attempts=data.get("ghost_followup_count", 0),
        last_strategy_used=data.get("last_reengagement_strategy"),
        conversion_probability=get_reactivation_probability(ghost_type),
    )


GHOST_TYPE_DESCRIPTIONS = {
    GhostType.SOFT: "Wahrscheinlich busy oder vergessen - gute Chancen bei sanftem Reminder",
    GhostType.HARD: "Bewusste Entscheidung nicht zu antworten - Pattern Interrupt nötig",
    GhostType.DEEP: "Langzeit-Ghost - letzter Versuch oder loslassen",
}

STRATEGY_DESCRIPTIONS = {
    ReEngagementStrategy.VALUE_ADD: "Neuen Wert bieten ohne nach Antwort zu fragen",
    ReEngagementStrategy.CASUAL_CHECKIN: "Lockerer Check-in, kein Druck",
    ReEngagementStrategy.SOFT_URGENCY: "Sanfte Dringlichkeit mit News/Update",
    ReEngagementStrategy.HUMOR: "Mit Humor auflockern, Druck rausnehmen",
    ReEngagementStrategy.TAKEAWAY: "Zeig dass du loslassen kannst",
    ReEngagementStrategy.CHANNEL_SWITCH: "Anderen Kanal probieren",
    ReEngagementStrategy.VOICE_NOTE: "Persönlicher via Voice Note",
    ReEngagementStrategy.BREAKUP: "Würdevolles Verabschieden, Tür offen lassen",
}


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/", response_model=List[GhostResponse])
async def list_ghosts(
    ghost_type: Optional[str] = Query(None, description="soft, hard, deep"),
    platform: Optional[str] = Query(None, description="instagram, whatsapp, etc."),
    limit: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Liste aller Ghosts des Users.
    
    Sortiert nach Priorität (Soft Ghosts zuerst, dann nach Stunden).
    """
    user_id = str(current_user.id)
    
    # Query bauen
    query = supabase.table("outreach_messages").select(
        "id, contact_name, contact_handle, platform, seen_at, ghost_since, "
        "ghost_followup_count, was_online_since, message_type, last_reengagement_strategy"
    ).eq("user_id", user_id).eq("is_ghost", True).is_("replied_at", "null")
    
    if platform:
        query = query.eq("platform", platform)
    
    result = query.order("seen_at").limit(limit).execute()
    
    ghosts = []
    for data in (result.data or []):
        ghost = _build_ghost_from_db(data)
        
        # Filter nach Ghost-Type
        if ghost_type:
            if ghost.ghost_type.value != ghost_type:
                continue
        
        strategy = recommend_strategy(ghost)
        
        ghosts.append(GhostResponse(
            id=ghost.id,
            name=ghost.name,
            platform=ghost.platform,
            ghost_type=ghost.ghost_type.value,
            hours_since_seen=ghost.hours_since_seen,
            was_online_since=ghost.was_online_since,
            reengagement_attempts=ghost.reengagement_attempts,
            conversion_probability=ghost.conversion_probability,
            recommended_strategy=strategy.value,
            optimal_timing=get_optimal_timing(ghost.ghost_type),
        ))
    
    # Sortieren: Soft zuerst, dann nach Stunden
    type_order = {"soft": 0, "hard": 1, "deep": 2}
    ghosts.sort(key=lambda g: (type_order.get(g.ghost_type, 99), g.hours_since_seen))
    
    return ghosts


@router.get("/{ghost_id}", response_model=GhostDetailResponse)
async def get_ghost_detail(
    ghost_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Detaillierte Ghost-Infos mit Re-Engagement Plan.
    
    Enthält:
    - Ghost-Klassifizierung
    - Empfohlene Strategie
    - Vorgeschlagene Nachricht
    - Timing-Empfehlung
    """
    user_id = str(current_user.id)
    
    result = supabase.table("outreach_messages").select("*").eq(
        "id", ghost_id
    ).eq("user_id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Ghost not found")
    
    data = result.data
    ghost = _build_ghost_from_db(data)
    
    # Re-Engagement Plan erstellen
    context = {
        "topic": data.get("notes", "unser Gespräch"),
        "content": "ein interessantes Update",
        "news": "Neuigkeiten die dich interessieren könnten",
        "sender_name": current_user.name or "Ich",
    }
    plan = create_reengagement_plan(ghost, context)
    
    return GhostDetailResponse(
        id=ghost.id,
        name=ghost.name,
        platform=ghost.platform,
        profile_url=data.get("contact_profile_url"),
        ghost_type=ghost.ghost_type.value,
        ghost_type_description=GHOST_TYPE_DESCRIPTIONS.get(ghost.ghost_type, ""),
        hours_since_seen=ghost.hours_since_seen,
        days_since_seen=ghost.hours_since_seen / 24,
        was_online_since=ghost.was_online_since,
        last_message_preview=data.get("message_preview"),
        reengagement_attempts=ghost.reengagement_attempts,
        last_strategy_used=ghost.last_strategy_used,
        conversion_probability=plan.success_probability,
        recommended_strategy=plan.strategy.value,
        strategy_description=STRATEGY_DESCRIPTIONS.get(plan.strategy, ""),
        optimal_timing=plan.timing_suggestion,
        is_final_attempt=plan.is_final_attempt,
        suggested_message=plan.message,
    )


@router.post("/{ghost_id}/reengage", response_model=ReEngageResponse)
async def generate_reengage_message(
    ghost_id: str,
    data: ReEngageRequest = None,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Generiert eine Re-Engagement Nachricht für einen Ghost.
    
    Optional: Strategie überschreiben oder Custom-Context mitgeben.
    """
    user_id = str(current_user.id)
    
    result = supabase.table("outreach_messages").select("*").eq(
        "id", ghost_id
    ).eq("user_id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Ghost not found")
    
    ghost = _build_ghost_from_db(result.data)
    
    # Context aufbauen
    context = {
        "topic": result.data.get("notes", "unser Gespräch"),
        "content": "ein interessantes Update",
        "news": "Neuigkeiten die dich interessieren könnten",
        "sender_name": current_user.name or "Ich",
    }
    
    if data and data.custom_context:
        context.update(data.custom_context)
    
    # Strategie bestimmen
    if data and data.strategy:
        try:
            strategy = ReEngagementStrategy(data.strategy)
        except ValueError:
            strategy = recommend_strategy(ghost)
    else:
        strategy = recommend_strategy(ghost)
    
    # Nachricht generieren
    message = generate_reengagement_message(ghost, strategy, context)
    
    # Alternativen generieren
    alternatives = []
    for alt_strategy in [ReEngagementStrategy.VALUE_ADD, ReEngagementStrategy.HUMOR, ReEngagementStrategy.TAKEAWAY]:
        if alt_strategy != strategy:
            alt_msg = generate_reengagement_message(ghost, alt_strategy, context)
            if alt_msg:
                alternatives.append(alt_msg)
    
    plan = create_reengagement_plan(ghost, context)
    
    return ReEngageResponse(
        strategy=strategy.value,
        message=message,
        timing_suggestion=plan.timing_suggestion,
        success_probability=plan.success_probability,
        is_final_attempt=plan.is_final_attempt,
        alternatives=alternatives[:2],
    )


@router.post("/{ghost_id}/action")
async def perform_ghost_action(
    ghost_id: str,
    data: GhostActionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Führt eine Aktion für einen Ghost aus.
    
    Actions:
    - send: Nachricht wurde gesendet (zählt Versuch hoch)
    - skip: Ghost überspringen (mit Grund)
    - breakup: Breakup-Nachricht gesendet, Ghost archivieren
    - snooze: Später wieder anzeigen
    """
    user_id = str(current_user.id)
    
    # Ghost laden
    result = supabase.table("outreach_messages").select("*").eq(
        "id", ghost_id
    ).eq("user_id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Ghost not found")
    
    current_data = result.data
    update = {"updated_at": datetime.utcnow().isoformat()}
    
    if data.action == "send":
        # Re-Engagement Versuch zählen
        update["ghost_followup_count"] = current_data.get("ghost_followup_count", 0) + 1
        update["last_reengagement_at"] = datetime.utcnow().isoformat()
        if data.message_sent:
            update["last_reengagement_message"] = data.message_sent[:500]
        
        message = f"Re-Engagement #{update['ghost_followup_count']} gesendet"
    
    elif data.action == "skip":
        update["skip_reason"] = data.skip_reason
        update["skipped_at"] = datetime.utcnow().isoformat()
        message = "Ghost übersprungen"
    
    elif data.action == "breakup":
        update["is_ghost"] = False
        update["status"] = "archived"
        update["archived_at"] = datetime.utcnow().isoformat()
        update["archive_reason"] = "breakup_sent"
        message = "Breakup gesendet, Lead archiviert"
    
    elif data.action == "snooze":
        snooze_until = datetime.utcnow() + timedelta(days=data.snooze_days or 3)
        update["snooze_until"] = snooze_until.isoformat()
        message = f"Für {data.snooze_days} Tage zurückgestellt"
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    supabase.table("outreach_messages").update(update).eq("id", ghost_id).execute()
    
    return {
        "success": True,
        "action": data.action,
        "message": message,
    }


@router.get("/report", response_model=GhostReportResponse)
async def get_ghost_report(
    current_user: CurrentUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """
    Ghost-Report Übersicht.
    
    Zeigt:
    - Gesamtzahl Ghosts nach Typ
    - Top-Priorität zum Ansprechen
    - Formatierter Report-Text
    """
    user_id = str(current_user.id)
    
    result = supabase.table("outreach_messages").select(
        "id, contact_name, platform, seen_at, ghost_followup_count, was_online_since"
    ).eq("user_id", user_id).eq("is_ghost", True).is_("replied_at", "null").execute()
    
    ghosts = []
    for data in (result.data or []):
        ghosts.append(_build_ghost_from_db(data))
    
    # Nach Typ zählen
    soft = [g for g in ghosts if g.ghost_type == GhostType.SOFT]
    hard = [g for g in ghosts if g.ghost_type == GhostType.HARD]
    deep = [g for g in ghosts if g.ghost_type == GhostType.DEEP]
    
    # Report generieren
    report_text = generate_ghost_report(ghosts)
    
    # Top-Priorität (Soft Ghosts, sortiert nach Stunden)
    top_priority = []
    for ghost in sorted(soft, key=lambda g: g.hours_since_seen)[:5]:
        strategy = recommend_strategy(ghost)
        top_priority.append({
            "id": ghost.id,
            "name": ghost.name,
            "platform": ghost.platform,
            "hours": ghost.hours_since_seen,
            "strategy": strategy.value,
            "probability": ghost.conversion_probability,
        })
    
    return GhostReportResponse(
        total_ghosts=len(ghosts),
        soft_ghosts=len(soft),
        hard_ghosts=len(hard),
        deep_ghosts=len(deep),
        report_text=report_text,
        top_priority=top_priority,
    )

