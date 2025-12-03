"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  AUTONOMOUS API - Steuerung des KI-Autonomie-Systems                          ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.autonomous import (
    AutonomousBrain,
    AgentOrchestrator,
    AgentTask,
    Observation,
    DecisionPriority,
)
from ...core.config import settings

import anthropic


router = APIRouter(prefix="/autonomous", tags=["autonomous"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class AutonomyMode(str, Enum):
    PASSIVE = "passive"
    ADVISORY = "advisory"
    SUPERVISED = "supervised"
    AUTONOMOUS = "autonomous"
    FULL_AUTO = "full_auto"


class SetModeRequest(BaseModel):
    mode: AutonomyMode
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0)


class ObservationCreate(BaseModel):
    type: str
    data: Dict[str, Any]
    priority: str = "medium"


class AgentTaskCreate(BaseModel):
    agent: str = Field(..., description="hunter, closer, communicator, analyst")
    task_type: str
    params: Dict[str, Any] = {}
    context: Dict[str, Any] = None


class DecisionApproval(BaseModel):
    decision_id: str
    approved: bool
    reason: Optional[str] = None


class BrainStatsResponse(BaseModel):
    mode: str
    confidence_threshold: float
    decisions_today: int
    executed_today: int
    pending_approvals: int
    agents_available: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBALS (In Production: Dependency Injection)
# ═══════════════════════════════════════════════════════════════════════════════

_brain: Optional[AutonomousBrain] = None
_orchestrator: Optional[AgentOrchestrator] = None


def get_brain(db=Depends(get_supabase)) -> AutonomousBrain:
    global _brain
    if _brain is None:
        llm = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        # 🚀 AUTOPILOT AKTIVIERT - Autonomer Modus als Standard
        _brain = AutonomousBrain(db, llm, mode="autonomous")
    return _brain


def get_orchestrator(db=Depends(get_supabase)) -> AgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        llm = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        _orchestrator = AgentOrchestrator(db, llm)
    return _orchestrator


# ═══════════════════════════════════════════════════════════════════════════════
# BRAIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/brain/stats")
async def get_brain_stats(
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
) -> BrainStatsResponse:
    """Holt Statistiken über das Autonomous Brain"""
    stats = await brain.get_brain_stats(user.id)
    pending = await brain.get_pending_decisions(user.id)
    
    return BrainStatsResponse(
        mode=stats["mode"],
        confidence_threshold=stats["confidence_threshold"],
        decisions_today=stats["decisions_today"],
        executed_today=stats["executed_today"],
        pending_approvals=len(pending),
        agents_available=["hunter", "closer", "communicator", "analyst"],
    )


@router.post("/brain/mode")
async def set_brain_mode(
    request: SetModeRequest,
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
):
    """Setzt den Autonomie-Modus des Brains"""
    await brain.set_mode(request.mode.value)
    brain.confidence_threshold = request.confidence_threshold
    
    return {
        "success": True,
        "mode": request.mode.value,
        "confidence_threshold": request.confidence_threshold,
        "message": f"Brain ist jetzt im {request.mode.value} Modus"
    }


@router.post("/brain/observe")
async def add_observation(
    observation: ObservationCreate,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
):
    """Fügt eine neue Beobachtung hinzu"""
    obs = Observation(
        id=f"obs_{datetime.utcnow().timestamp()}",
        type=observation.type,
        data=observation.data,
        timestamp=datetime.utcnow(),
        user_id=user.id,
        company_id=getattr(user, 'company_id', None),
        priority=DecisionPriority(observation.priority),
    )
    
    await brain.observe(obs)
    
    # Process in background
    background_tasks.add_task(brain.process_observations)
    
    return {
        "success": True,
        "observation_id": obs.id,
        "message": "Beobachtung hinzugefügt, wird verarbeitet"
    }


@router.get("/brain/decisions/pending")
async def get_pending_decisions(
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
):
    """Holt alle Entscheidungen, die auf Genehmigung warten"""
    decisions = await brain.get_pending_decisions(user.id)
    return {"decisions": decisions}


@router.post("/brain/decisions/approve")
async def approve_decision(
    approval: DecisionApproval,
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
):
    """Genehmigt oder lehnt eine Entscheidung ab"""
    if approval.approved:
        result = await brain.approve_decision(approval.decision_id)
        return {"success": True, "result": result}
    else:
        result = await brain.reject_decision(
            approval.decision_id, 
            approval.reason or ""
        )
        return {"success": True, "rejected": True}


@router.get("/brain/patterns")
async def analyze_patterns(
    user=Depends(get_current_user),
    brain: AutonomousBrain = Depends(get_brain),
):
    """Analysiert Muster in den Daten"""
    patterns = await brain.analyze_patterns(user.id)
    return {"patterns": patterns}


# ═══════════════════════════════════════════════════════════════════════════════
# AGENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/agents")
async def list_agents():
    """Listet alle verfügbaren Agenten"""
    # Statische Liste ohne Dependency für schnelle Antwort
    return {
        "agents": [
            {
                "name": "Hunter",
                "description": "Findet und qualifiziert neue Leads",
                "capabilities": ["qualify_lead", "research_lead", "score_lead", "find_decision_makers"],
            },
            {
                "name": "Closer",
                "description": "Optimiert Abschlüsse und rettet Deals",
                "capabilities": ["handle_objection", "negotiate_price", "create_urgency", "rescue_deal"],
            },
            {
                "name": "Communicator",
                "description": "Schreibt perfekte, personalisierte Nachrichten",
                "capabilities": ["write_message", "personalize", "adapt_tone", "create_sequence"],
            },
            {
                "name": "Analyst",
                "description": "Analysiert Daten und findet Optimierungspotential",
                "capabilities": ["analyze_performance", "detect_patterns", "forecast", "recommend"],
            },
        ]
    }


@router.post("/agents/execute")
async def execute_agent_task(
    task: AgentTaskCreate,
    user=Depends(get_current_user),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Führt eine Aufgabe mit einem spezifischen Agenten aus"""
    agent_task = AgentTask(
        id=f"task_{datetime.utcnow().timestamp()}",
        type=task.task_type,
        params=task.params,
        context=task.context or {},
    )
    
    result = await orchestrator.delegate(agent_task, task.agent)
    
    return {
        "success": result.success,
        "task_id": result.task_id,
        "data": result.data,
        "confidence": result.confidence,
        "reasoning": result.reasoning,
        "suggestions": result.suggestions,
    }


@router.post("/agents/auto")
async def auto_execute_task(
    task: AgentTaskCreate,
    user=Depends(get_current_user),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Führt eine Aufgabe aus - Agent wird automatisch gewählt"""
    agent_task = AgentTask(
        id=f"task_{datetime.utcnow().timestamp()}",
        type=task.task_type,
        params=task.params,
        context=task.context or {},
    )
    
    result = await orchestrator.auto_delegate(agent_task)
    
    return {
        "success": result.success,
        "task_id": result.task_id,
        "data": result.data,
        "confidence": result.confidence,
        "reasoning": result.reasoning,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# QUICK ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/quick/qualify-lead")
async def quick_qualify_lead(
    lead_id: str,
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Schnelle Lead-Qualifizierung"""
    # Lead laden
    result = db.table("leads").select("*").eq("id", lead_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    
    task = AgentTask(
        id=f"qualify_{lead_id}",
        type="qualify_lead",
        params={"lead": result.data},
    )
    
    agent_result = await orchestrator.delegate(task, "hunter")
    
    return {
        "lead_id": lead_id,
        "qualification": agent_result.data,
        "confidence": agent_result.confidence,
    }


@router.post("/quick/write-message")
async def quick_write_message(
    lead_id: str,
    purpose: str = "follow_up",
    channel: str = "whatsapp",
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Schnelle Nachrichten-Generierung"""
    # Lead laden
    result = db.table("leads").select("*").eq("id", lead_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    
    task = AgentTask(
        id=f"message_{lead_id}",
        type="write_message",
        params={
            "lead": result.data,
            "purpose": purpose,
            "channel": channel,
        },
    )
    
    agent_result = await orchestrator.delegate(task, "communicator")
    
    return {
        "lead_id": lead_id,
        "message": agent_result.data,
        "confidence": agent_result.confidence,
    }


@router.post("/quick/handle-objection")
async def quick_handle_objection(
    objection: str,
    lead_id: Optional[str] = None,
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Schnelle Einwandbehandlung"""
    lead_context = {}
    if lead_id:
        result = db.table("leads").select("*").eq("id", lead_id).single().execute()
        if result.data:
            lead_context = result.data
    
    task = AgentTask(
        id=f"objection_{datetime.utcnow().timestamp()}",
        type="handle_objection",
        params={
            "objection": objection,
            "lead_context": lead_context,
        },
    )
    
    agent_result = await orchestrator.delegate(task, "closer")
    
    return {
        "objection": objection,
        "responses": agent_result.data,
        "confidence": agent_result.confidence,
    }


@router.post("/quick/analyze")
async def quick_analyze(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    orchestrator: AgentOrchestrator = Depends(get_orchestrator),
):
    """Schnelle Performance-Analyse"""
    # Metriken sammeln
    leads = db.table("leads").select("count", count="exact").eq(
        "user_id", user.id
    ).execute()
    
    followups = db.table("followups").select("count", count="exact").eq(
        "user_id", user.id
    ).eq("status", "pending").execute()
    
    metrics = {
        "total_leads": leads.count if leads else 0,
        "pending_followups": followups.count if followups else 0,
    }
    
    task = AgentTask(
        id=f"analyze_{datetime.utcnow().timestamp()}",
        type="analyze_performance",
        params={"metrics": metrics, "period": "week"},
    )
    
    agent_result = await orchestrator.delegate(task, "analyst")
    
    return {
        "analysis": agent_result.data,
        "confidence": agent_result.confidence,
    }

