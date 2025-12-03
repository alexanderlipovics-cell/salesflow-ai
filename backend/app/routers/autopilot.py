"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTOPILOT API                                                             ║
║  API für Auto-Reply System, Drafts & Settings                              ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional, List
from uuid import uuid4
from enum import Enum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/autopilot", tags=["autopilot"])


# =============================================================================
# ENUMS
# =============================================================================

class ChannelType(str, Enum):
    INSTAGRAM = "instagram"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    LINKEDIN = "linkedin"
    EMAIL = "email"


class DraftStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    EDITED = "edited"
    REJECTED = "rejected"
    SENT = "sent"


class ActionType(str, Enum):
    AUTO_SEND = "auto_send"
    DRAFT_REVIEW = "draft_review"
    HUMAN_NEEDED = "human_needed"
    ARCHIVE = "archive"
    SKIP = "skip"


class IntentType(str, Enum):
    GREETING = "greeting"
    INFO_REQUEST = "info_request"
    OBJECTION = "objection"
    INTEREST = "interest"
    QUESTION = "question"
    SCHEDULING = "scheduling"
    COMPLAINT = "complaint"
    OTHER = "other"


class AutonomyLevel(str, Enum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


class OverrideMode(str, Enum):
    FULL_AUTO = "full_auto"
    ALWAYS_DRAFT = "always_draft"
    HUMAN_ONLY = "human_only"
    DISABLED = "disabled"


# =============================================================================
# MODELS
# =============================================================================

class AutopilotSettings(BaseModel):
    """Autopilot-Einstellungen."""
    id: str
    user_id: str
    is_enabled: bool = False
    autonomy_level: AutonomyLevel = AutonomyLevel.BALANCED
    auto_send_threshold: float = 0.85
    draft_threshold: float = 0.6
    enabled_channels: List[ChannelType] = []
    enabled_intents: List[IntentType] = []
    working_hours_only: bool = True
    working_hours_start: str = "09:00"
    working_hours_end: str = "18:00"
    timezone: str = "Europe/Berlin"
    max_auto_replies_per_day: int = 50
    require_lead_match: bool = True
    exclude_vip_leads: bool = True
    created_at: datetime
    updated_at: datetime


class AutopilotSettingsUpdate(BaseModel):
    """Update für Settings."""
    is_enabled: Optional[bool] = None
    autonomy_level: Optional[AutonomyLevel] = None
    auto_send_threshold: Optional[float] = None
    draft_threshold: Optional[float] = None
    enabled_channels: Optional[List[ChannelType]] = None
    enabled_intents: Optional[List[IntentType]] = None
    working_hours_only: Optional[bool] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    max_auto_replies_per_day: Optional[int] = None
    require_lead_match: Optional[bool] = None
    exclude_vip_leads: Optional[bool] = None


class AutopilotDraft(BaseModel):
    """Ein Autopilot-Entwurf."""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    content: str
    intent: IntentType
    status: DraftStatus
    confidence_score: float
    created_at: datetime
    approved_at: Optional[datetime] = None


class ActionLog(BaseModel):
    """Ein Action-Log-Eintrag."""
    id: str
    lead_id: str
    lead_name: Optional[str] = None
    action: ActionType
    intent: IntentType
    confidence_score: float
    response_sent: bool
    created_at: datetime


class LeadOverride(BaseModel):
    """Override für einen Lead."""
    lead_id: str
    mode: OverrideMode
    reason: Optional[str] = None
    is_vip: bool = False
    created_at: datetime


class MorningBriefing(BaseModel):
    """Morning Briefing."""
    date: str
    overnight_messages: int
    auto_replied: int
    drafts_pending: int
    human_needed: int
    auto_booked_appointments: int
    new_hot_leads: int
    ready_to_close: int
    estimated_pipeline_value: float
    today_tasks: List[dict]
    estimated_user_time_minutes: int
    greeting_message: str


class EveningSummary(BaseModel):
    """Evening Summary."""
    date: str
    total_messages_sent: int
    auto_replies: int
    followups_sent: int
    user_approved: int
    new_replies_received: int
    appointments_booked: int
    deals_closed: int
    revenue: float
    user_time_minutes: int
    estimated_manual_time_minutes: int
    time_saved_minutes: int
    tomorrow_preview: dict


class AutopilotStats(BaseModel):
    """Autopilot-Statistiken."""
    period: str
    total_inbound: int
    total_processed: int
    auto_sent: int
    drafts_created: int
    human_needed: int
    archived: int
    auto_rate: float
    success_rate: float
    estimated_time_saved_minutes: int
    avg_confidence_score: float
    confidence_distribution: dict


# =============================================================================
# IN-MEMORY STORE
# =============================================================================

_user_settings: dict = {}
_drafts: List[dict] = []
_action_logs: List[dict] = []
_lead_overrides: dict = {}


def _get_or_create_settings(user_id: str) -> dict:
    """Holt oder erstellt Settings für einen User."""
    if user_id not in _user_settings:
        _user_settings[user_id] = {
            "id": f"settings_{uuid4().hex[:8]}",
            "user_id": user_id,
            "is_enabled": True,
            "autonomy_level": "balanced",
            "auto_send_threshold": 0.85,
            "draft_threshold": 0.6,
            "enabled_channels": ["instagram", "whatsapp"],
            "enabled_intents": ["greeting", "info_request", "interest"],
            "working_hours_only": True,
            "working_hours_start": "09:00",
            "working_hours_end": "18:00",
            "timezone": "Europe/Berlin",
            "max_auto_replies_per_day": 50,
            "require_lead_match": True,
            "exclude_vip_leads": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
    return _user_settings[user_id]


# Demo-Drafts initialisieren
def _init_demo_drafts():
    if not _drafts:
        _drafts.extend([
            {
                "id": "draft_001",
                "lead_id": "lead_abc123",
                "lead_name": "Max Mustermann",
                "content": "Hey Max! 👋 Danke für deine Nachricht! Ich melde mich gleich bei dir.",
                "intent": "greeting",
                "status": "pending",
                "confidence_score": 0.78,
                "created_at": datetime.now(),
                "approved_at": None,
            },
            {
                "id": "draft_002",
                "lead_id": "lead_def456",
                "lead_name": "Anna Schmidt",
                "content": "Hi Anna! Das Balance Oil ist perfekt für mehr Energie. Soll ich dir mehr erzählen?",
                "intent": "info_request",
                "status": "pending",
                "confidence_score": 0.72,
                "created_at": datetime.now(),
                "approved_at": None,
            },
            {
                "id": "draft_003",
                "lead_id": "lead_ghi789",
                "lead_name": "Thomas Weber",
                "content": "Hey Thomas! Super dass du Interesse hast. Wann passt dir ein kurzer Call?",
                "intent": "interest",
                "status": "pending",
                "confidence_score": 0.81,
                "created_at": datetime.now(),
                "approved_at": None,
            },
        ])

_init_demo_drafts()


# =============================================================================
# SETTINGS ENDPOINTS
# =============================================================================

@router.get("/settings", response_model=AutopilotSettings)
async def get_settings(
) -> AutopilotSettings:
    """
    Lädt die Autopilot-Settings.
    
    Returns:
        AutopilotSettings
    """
    settings = _get_or_create_settings("demo-user")
    return AutopilotSettings(**settings)


@router.put("/settings", response_model=AutopilotSettings)
async def update_settings(
    update: AutopilotSettingsUpdate,
) -> AutopilotSettings:
    """
    Updated die Autopilot-Settings.
    
    Args:
        update: Zu aktualisierende Felder
        
    Returns:
        Aktualisierte AutopilotSettings
    """
    settings = _get_or_create_settings("demo-user")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            settings[key] = value
    
    settings["updated_at"] = datetime.now()
    
    logger.info("Autopilot settings updated")
    
    return AutopilotSettings(**settings)


# =============================================================================
# LEAD OVERRIDES
# =============================================================================

@router.get("/leads/{lead_id}/override")
async def get_lead_override(
    lead_id: str,
) -> Optional[LeadOverride]:
    """
    Lädt Override-Settings für einen Lead.
    
    Args:
        lead_id: Lead-ID
        
    Returns:
        LeadOverride oder None
    """
    override = _lead_overrides.get(f"demo-user_{lead_id}")
    if override:
        return LeadOverride(**override)
    return None


@router.post("/leads/{lead_id}/override", response_model=LeadOverride)
async def create_lead_override(
    lead_id: str,
    mode: OverrideMode,
    reason: Optional[str] = None,
    is_vip: bool = False,
) -> LeadOverride:
    """
    Erstellt Override für einen Lead.
    
    Args:
        lead_id: Lead-ID
        mode: Override-Modus
        reason: Optionaler Grund
        is_vip: VIP-Status
        
    Returns:
        LeadOverride
    """
    key = f"demo-user_{lead_id}"
    override = {
        "lead_id": lead_id,
        "mode": mode,
        "reason": reason,
        "is_vip": is_vip,
        "created_at": datetime.now(),
    }
    _lead_overrides[key] = override
    
    logger.info(f"Lead override created: {lead_id} -> {mode}")
    
    return LeadOverride(**override)


@router.put("/leads/{lead_id}/override", response_model=LeadOverride)
async def update_lead_override(
    lead_id: str,
    mode: Optional[OverrideMode] = None,
    reason: Optional[str] = None,
    is_vip: Optional[bool] = None,
) -> LeadOverride:
    """
    Updated Override für einen Lead.
    """
    key = f"demo-user_{lead_id}"
    override = _lead_overrides.get(key)
    
    if not override:
        raise HTTPException(status_code=404, detail="Override nicht gefunden")
    
    if mode is not None:
        override["mode"] = mode
    if reason is not None:
        override["reason"] = reason
    if is_vip is not None:
        override["is_vip"] = is_vip
    
    return LeadOverride(**override)


@router.delete("/leads/{lead_id}/override")
async def delete_lead_override(
    lead_id: str,
) -> dict:
    """
    Löscht Override für einen Lead.
    """
    key = f"demo-user_{lead_id}"
    if key in _lead_overrides:
        del _lead_overrides[key]
        return {"success": True}
    
    return {"success": False, "message": "Override nicht gefunden"}


# =============================================================================
# DRAFTS
# =============================================================================

@router.get("/drafts")
async def get_drafts(
    status: Optional[DraftStatus] = None,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    """
    Lädt alle Drafts.
    
    Args:
        status: Optional Status-Filter
        limit: Maximum
        offset: Offset
        
    Returns:
        Dict mit drafts, total, pending_count
    """
    drafts = _drafts
    
    if status:
        drafts = [d for d in drafts if d["status"] == status]
    
    pending_count = sum(1 for d in _drafts if d["status"] == "pending")
    
    return {
        "drafts": [AutopilotDraft(**d) for d in drafts[offset:offset + limit]],
        "total": len(drafts),
        "pending_count": pending_count,
    }


@router.post("/drafts/{draft_id}/approve", response_model=AutopilotDraft)
async def approve_draft(
    draft_id: str,
    edited_content: Optional[str] = None,
) -> AutopilotDraft:
    """
    Genehmigt einen Draft.
    
    Args:
        draft_id: Draft-ID
        edited_content: Optional bearbeiteter Inhalt
        
    Returns:
        Aktualisierter Draft
    """
    for draft in _drafts:
        if draft["id"] == draft_id:
            draft["status"] = "edited" if edited_content else "approved"
            if edited_content:
                draft["content"] = edited_content
            draft["approved_at"] = datetime.now()
            
            logger.info(f"Draft {draft_id} approved")
            
            return AutopilotDraft(**draft)
    
    raise HTTPException(status_code=404, detail="Draft nicht gefunden")


@router.post("/drafts/{draft_id}/reject")
async def reject_draft(
    draft_id: str,
) -> dict:
    """
    Lehnt einen Draft ab.
    """
    for draft in _drafts:
        if draft["id"] == draft_id:
            draft["status"] = "rejected"
            
            logger.info(f"Draft {draft_id} rejected")
            
            return {"success": True}
    
    raise HTTPException(status_code=404, detail="Draft nicht gefunden")


# =============================================================================
# ACTION LOGS
# =============================================================================

@router.get("/actions")
async def get_action_logs(
    days: int = 7,
    action: Optional[ActionType] = None,
    limit: int = 50,
) -> dict:
    """
    Lädt Action Logs.
    """
    logs = _action_logs
    
    if action:
        logs = [l for l in logs if l["action"] == action]
    
    # Demo-Daten generieren wenn leer
    if not logs:
        logs = [
            {
                "id": "action_001",
                "lead_id": "lead_abc",
                "lead_name": "Max Mustermann",
                "action": "auto_send",
                "intent": "greeting",
                "confidence_score": 0.92,
                "response_sent": True,
                "created_at": datetime.now(),
            },
            {
                "id": "action_002",
                "lead_id": "lead_def",
                "lead_name": "Anna Schmidt",
                "action": "draft_review",
                "intent": "info_request",
                "confidence_score": 0.75,
                "response_sent": False,
                "created_at": datetime.now(),
            },
        ]
    
    return {
        "actions": [ActionLog(**l) for l in logs[:limit]],
        "total": len(logs),
        "auto_sent_count": sum(1 for l in logs if l["action"] == "auto_send"),
        "draft_count": sum(1 for l in logs if l["action"] == "draft_review"),
        "human_needed_count": sum(1 for l in logs if l["action"] == "human_needed"),
    }


# =============================================================================
# BRIEFINGS
# =============================================================================

@router.get("/briefing/morning", response_model=MorningBriefing)
async def get_morning_briefing(
) -> MorningBriefing:
    """
    Lädt das Morning Briefing.
    """
    today = date.today().isoformat()
    pending_drafts = sum(1 for d in _drafts if d["status"] == "pending")
    
    return MorningBriefing(
        date=today,
        overnight_messages=12,
        auto_replied=8,
        drafts_pending=pending_drafts,
        human_needed=2,
        auto_booked_appointments=1,
        new_hot_leads=3,
        ready_to_close=2,
        estimated_pipeline_value=4500.0,
        today_tasks=[
            {"type": "call", "priority": "high", "description": "Call mit Max Mustermann - Hot Lead"},
            {"type": "followup", "priority": "medium", "description": "3 Follow-ups geplant"},
            {"type": "review", "priority": "low", "description": f"{pending_drafts} Drafts prüfen"},
        ],
        estimated_user_time_minutes=45,
        greeting_message="☀️ Guten Morgen! Dein Autopilot war fleißig - 8 Nachrichten automatisch beantwortet!",
    )


@router.get("/briefing/evening", response_model=EveningSummary)
async def get_evening_summary(
) -> EveningSummary:
    """
    Lädt das Evening Summary.
    """
    today = date.today().isoformat()
    
    return EveningSummary(
        date=today,
        total_messages_sent=24,
        auto_replies=15,
        followups_sent=6,
        user_approved=3,
        new_replies_received=18,
        appointments_booked=2,
        deals_closed=1,
        revenue=199.0,
        user_time_minutes=35,
        estimated_manual_time_minutes=180,
        time_saved_minutes=145,
        tomorrow_preview={
            "scheduled_followups": 8,
            "scheduled_calls": 3,
        },
    )


# =============================================================================
# STATS
# =============================================================================

@router.get("/stats", response_model=AutopilotStats)
async def get_stats(
    period: str = "week",
) -> AutopilotStats:
    """
    Lädt Autopilot Performance Stats.
    
    Args:
        period: 'today', 'week', oder 'month'
        
    Returns:
        AutopilotStats
    """
    # Multiplier basierend auf Periode
    multiplier = {"today": 1, "week": 7, "month": 30}.get(period, 7)
    
    return AutopilotStats(
        period=period,
        total_inbound=45 * multiplier,
        total_processed=42 * multiplier,
        auto_sent=28 * multiplier,
        drafts_created=10 * multiplier,
        human_needed=4 * multiplier,
        archived=3 * multiplier,
        auto_rate=0.67,
        success_rate=0.82,
        estimated_time_saved_minutes=90 * multiplier,
        avg_confidence_score=0.78,
        confidence_distribution={
            "high": 0.45,
            "medium": 0.35,
            "low": 0.20,
        },
    )

