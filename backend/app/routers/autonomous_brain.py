"""
╔════════════════════════════════════════════════════════════════════════════╗
║  AUTONOMOUS BRAIN API                                                      ║
║  API für autonome KI-Agent-Steuerung und Statistiken                      ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/autonomous/brain", tags=["autonomous-brain"])


# =============================================================================
# MODELS
# =============================================================================

class AutonomyMode(str, Enum):
    """Autonomie-Level des Agenten."""
    PASSIVE = "passive"
    ADVISORY = "advisory"
    SUPERVISED = "supervised"
    AUTONOMOUS = "autonomous"
    FULL_AUTO = "full_auto"


class BrainStats(BaseModel):
    """Statistiken des autonomen Gehirns."""
    mode: AutonomyMode = AutonomyMode.SUPERVISED
    confidence_threshold: float = 0.8
    decisions_today: int = 0
    executed_today: int = 0
    pending_approvals: int = 0
    agents_available: List[str] = []


class BrainModeRequest(BaseModel):
    """Request zum Ändern des Modus."""
    mode: AutonomyMode
    confidence_threshold: Optional[float] = None


class BrainModeResponse(BaseModel):
    """Response nach Modus-Änderung."""
    success: bool
    mode: AutonomyMode
    confidence_threshold: float
    message: str


class PendingDecision(BaseModel):
    """Eine ausstehende Entscheidung."""
    id: str
    agent: str
    action_type: str
    description: str
    confidence: float
    context: dict
    created_at: datetime


# =============================================================================
# IN-MEMORY STORE (für Demo - später Redis/DB)
# =============================================================================

_brain_state = {
    "mode": AutonomyMode.SUPERVISED,
    "confidence_threshold": 0.8,
    "decisions_today": 12,
    "executed_today": 8,
    "pending_approvals": 3,
    "agents_available": ["hunter", "closer", "communicator", "analyst"],
}

_pending_decisions = []


# =============================================================================
# ENDPOINTS (No Auth for Development)
# =============================================================================

@router.get("/stats", response_model=BrainStats)
async def get_brain_stats() -> BrainStats:
    """
    Holt aktuelle Statistiken des autonomen Gehirns.
    """
    return BrainStats(
        mode=_brain_state["mode"],
        confidence_threshold=_brain_state["confidence_threshold"],
        decisions_today=_brain_state["decisions_today"],
        executed_today=_brain_state["executed_today"],
        pending_approvals=_brain_state["pending_approvals"],
        agents_available=_brain_state["agents_available"],
    )


@router.post("/mode", response_model=BrainModeResponse)
async def set_brain_mode(request: BrainModeRequest) -> BrainModeResponse:
    """
    Setzt den Autonomie-Modus des Gehirns.
    """
    old_mode = _brain_state["mode"]
    _brain_state["mode"] = request.mode
    
    if request.confidence_threshold is not None:
        _brain_state["confidence_threshold"] = request.confidence_threshold
    
    logger.info(f"Brain mode changed from {old_mode} to {request.mode}")
    
    mode_labels = {
        AutonomyMode.PASSIVE: "Passiv - nur beobachten",
        AutonomyMode.ADVISORY: "Berater - Vorschläge zeigen",
        AutonomyMode.SUPERVISED: "Überwacht - mit Genehmigung",
        AutonomyMode.AUTONOMOUS: "Autonom - selbstständig handeln",
        AutonomyMode.FULL_AUTO: "Full Auto - komplett autonom",
    }
    
    return BrainModeResponse(
        success=True,
        mode=request.mode,
        confidence_threshold=_brain_state["confidence_threshold"],
        message=f"Modus geändert zu: {mode_labels.get(request.mode, request.mode.value)}",
    )


@router.get("/pending", response_model=List[PendingDecision])
async def get_pending_decisions(limit: int = 20) -> List[PendingDecision]:
    """
    Holt ausstehende Entscheidungen, die auf Genehmigung warten.
    """
    if not _pending_decisions:
        return [
            PendingDecision(
                id="dec_001",
                agent="hunter",
                action_type="lead_qualification",
                description="Lead 'Max Mustermann' als HOT qualifizieren?",
                confidence=0.85,
                context={"lead_score": 85, "engagement": "high"},
                created_at=datetime.now(),
            ),
            PendingDecision(
                id="dec_002",
                agent="communicator",
                action_type="send_followup",
                description="Follow-up an 'Anna Schmidt' senden?",
                confidence=0.78,
                context={"days_since_contact": 3, "template": "friendly_reminder"},
                created_at=datetime.now(),
            ),
            PendingDecision(
                id="dec_003",
                agent="closer",
                action_type="proposal_send",
                description="Angebot an 'Tech GmbH' senden?",
                confidence=0.92,
                context={"deal_value": 4500, "probability": 0.8},
                created_at=datetime.now(),
            ),
        ][:limit]
    
    return _pending_decisions[:limit]


@router.post("/approve/{decision_id}")
async def approve_decision(decision_id: str) -> dict:
    """
    Genehmigt eine ausstehende Entscheidung.
    """
    logger.info(f"Decision {decision_id} approved")
    
    _brain_state["pending_approvals"] = max(0, _brain_state["pending_approvals"] - 1)
    _brain_state["executed_today"] += 1
    
    return {
        "success": True,
        "decision_id": decision_id,
        "message": "Entscheidung genehmigt und wird ausgeführt",
    }


@router.post("/reject/{decision_id}")
async def reject_decision(decision_id: str, reason: Optional[str] = None) -> dict:
    """
    Lehnt eine ausstehende Entscheidung ab.
    """
    logger.info(f"Decision {decision_id} rejected. Reason: {reason}")
    
    _brain_state["pending_approvals"] = max(0, _brain_state["pending_approvals"] - 1)
    
    return {
        "success": True,
        "decision_id": decision_id,
        "message": "Entscheidung abgelehnt",
        "reason": reason,
    }


@router.get("/agents")
async def get_available_agents() -> dict:
    """
    Gibt verfügbare Agenten und deren Status zurück.
    """
    return {
        "agents": [
            {
                "id": "hunter",
                "name": "Lead Hunter",
                "emoji": "🎯",
                "description": "Findet und qualifiziert neue Leads",
                "status": "active",
                "tasks_today": 5,
            },
            {
                "id": "closer",
                "name": "Deal Closer",
                "emoji": "🤝",
                "description": "Führt Deals zum Abschluss",
                "status": "active",
                "tasks_today": 3,
            },
            {
                "id": "communicator",
                "name": "Kommunikator",
                "emoji": "💬",
                "description": "Automatische Follow-ups und Nachrichten",
                "status": "active",
                "tasks_today": 8,
            },
            {
                "id": "analyst",
                "name": "Daten-Analyst",
                "emoji": "📊",
                "description": "Analysiert Patterns und Insights",
                "status": "active",
                "tasks_today": 2,
            },
        ],
        "total_active": 4,
    }


@router.post("/reset-daily")
async def reset_daily_stats() -> dict:
    """
    Setzt die täglichen Statistiken zurück (für Testing).
    """
    _brain_state["decisions_today"] = 0
    _brain_state["executed_today"] = 0
    _brain_state["pending_approvals"] = 0
    
    return {
        "success": True,
        "message": "Tägliche Statistiken zurückgesetzt",
    }
