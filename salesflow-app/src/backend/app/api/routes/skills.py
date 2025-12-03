"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SKILLS API ROUTES - CHIEF SKILL ORCHESTRATOR                              ║
║  Unified AI Skill Endpoint with Logging & Analytics                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /skills/{skill_name} - Execute an AI skill
- GET /skills - List available skills
- GET /skills/{skill_name}/stats - Get skill usage statistics
- POST /skills/analyze-objection - Convenience endpoint
- POST /skills/generate-followup - Convenience endpoint
- POST /skills/check-compliance - Convenience endpoint
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from ...db.deps import get_current_user, CurrentUser
from ...db.supabase import get_supabase
from ...services.ai import AIService, Skill, AIInteraction
from ...services.ai.ai_logger import OutcomeStatus, get_ai_logger

router = APIRouter(prefix="/skills", tags=["skills", "ai"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class SkillRequest(BaseModel):
    """Generic skill execution request."""
    input_data: Dict[str, Any] = Field(..., description="Skill-specific input data")
    lead_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0, le=2)


class SkillResponse(BaseModel):
    """Skill execution response."""
    content: str
    interaction_id: str
    skill: str
    model: str
    latency_ms: Optional[int]
    tokens_used: Optional[int]


class ObjectionAnalysisRequest(BaseModel):
    """Objection analysis request."""
    objection_text: str = Field(..., description="The objection to analyze")
    lead_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class FollowUpGenerationRequest(BaseModel):
    """Follow-up generation request."""
    lead_info: Dict[str, Any] = Field(..., description="Lead information")
    context: str = Field(..., description="Context for the follow-up")
    tone: str = Field("professional", description="Tone: professional, casual, urgent")
    lead_id: Optional[str] = None


class ComplianceCheckRequest(BaseModel):
    """Compliance check request."""
    message: str = Field(..., description="Message to check")
    vertical: str = Field("network_marketing", description="Business vertical")
    rules: Optional[List[str]] = None


class OutcomeUpdateRequest(BaseModel):
    """Update interaction outcome."""
    interaction_id: str
    outcome: str = Field(..., description="Outcome status")
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None


class SkillInfo(BaseModel):
    """Skill information."""
    id: str
    name: str
    description: str
    category: str


class SkillStats(BaseModel):
    """Skill usage statistics."""
    skill_name: str
    period_days: int
    total_calls: int
    avg_latency_ms: float
    avg_tokens_in: float
    avg_tokens_out: float
    total_cost_usd: float
    usage_rate: float
    outcome_distribution: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════
# SKILL DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════════

SKILL_CATALOG = {
    Skill.ANALYZE_OBJECTION: {
        "name": "Einwand-Analyse",
        "description": "Analysiert ob ein Einwand echt oder ein Vorwand ist",
        "category": "analysis",
    },
    Skill.ANALYZE_PERSONALITY: {
        "name": "DISG-Persönlichkeitsanalyse",
        "description": "Erkennt Kommunikationsstil aus Nachrichten",
        "category": "analysis",
    },
    Skill.GENERATE_FOLLOWUP: {
        "name": "Follow-Up Generator",
        "description": "Generiert personalisierte Follow-Up Nachrichten",
        "category": "generation",
    },
    Skill.GENERATE_REACTIVATION: {
        "name": "Reaktivierungs-Nachricht",
        "description": "Erstellt Nachrichten für inaktive Leads",
        "category": "generation",
    },
    Skill.GENERATE_CLOSER: {
        "name": "Closer Phrase",
        "description": "Generiert Abschluss-Phrasen",
        "category": "generation",
    },
    Skill.CHECK_DEAL_HEALTH: {
        "name": "Deal Health Check",
        "description": "Prüft ob ein Deal gefährdet ist",
        "category": "analysis",
    },
    Skill.DEAL_POST_MORTEM: {
        "name": "Deal Post-Mortem",
        "description": "Analysiert warum ein Deal verloren wurde",
        "category": "analysis",
    },
    Skill.CHECK_COMPLIANCE: {
        "name": "Compliance Check",
        "description": "Prüft Nachrichten auf Compliance-Verstöße",
        "category": "compliance",
    },
    Skill.CHIEF_CHAT: {
        "name": "CHIEF Chat",
        "description": "Interaktive Unterhaltung mit CHIEF",
        "category": "chat",
    },
    Skill.LIVE_ASSIST: {
        "name": "Live Assist",
        "description": "Echtzeit-Unterstützung während Gesprächen",
        "category": "chat",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# GENERIC SKILL ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{skill_name}", response_model=SkillResponse)
async def execute_skill(
    skill_name: str,
    request: SkillRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Execute an AI skill by name.
    
    This is the main entry point for all AI skill executions.
    All calls are automatically logged for analytics.
    
    Available skills:
    - analyze_objection
    - analyze_personality
    - generate_followup
    - generate_reactivation
    - check_deal_health
    - check_compliance
    - chief_chat
    """
    try:
        skill = Skill(skill_name)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown skill: {skill_name}. Available: {[s.value for s in Skill]}"
        )
    
    # Check feature access
    from ...services.features import check_feature, Feature
    
    # Map skills to features for access control
    skill_feature_map = {
        Skill.AUTOPILOT: Feature.AUTOPILOT,
        Skill.LIVE_ASSIST: Feature.LIVE_ASSIST,
    }
    
    required_feature = skill_feature_map.get(skill)
    if required_feature:
        has_access = await check_feature(str(current_user.id), required_feature)
        if not has_access:
            raise HTTPException(
                status_code=403,
                detail=f"Upgrade your plan to access {skill_name}"
            )
    
    # Execute skill
    ai = AIService(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    try:
        interaction = await ai.call_skill(
            skill=skill,
            input_data=request.input_data,
            lead_id=request.lead_id,
            model=request.model,
            temperature=request.temperature,
        )
        
        return SkillResponse(
            content=interaction.response.content,
            interaction_id=interaction.interaction_id,
            skill=skill.value,
            model=interaction.response.model,
            latency_ms=interaction.response.latency_ms,
            tokens_used=interaction.response.total_tokens,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Skill execution failed: {str(e)}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/analyze-objection", response_model=SkillResponse)
async def analyze_objection(
    request: ObjectionAnalysisRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analyze an objection to determine if it's real or a pretense.
    
    Returns:
    - type: "real", "pretense", or "buying_signal"
    - confidence: 0-1
    - recommended_response: Suggested response
    """
    ai = AIService(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    interaction = await ai.analyze_objection(
        objection_text=request.objection_text,
        lead_context=request.context,
        lead_id=request.lead_id,
    )
    
    return SkillResponse(
        content=interaction.response.content,
        interaction_id=interaction.interaction_id,
        skill=Skill.ANALYZE_OBJECTION.value,
        model=interaction.response.model,
        latency_ms=interaction.response.latency_ms,
        tokens_used=interaction.response.total_tokens,
    )


@router.post("/generate-followup", response_model=SkillResponse)
async def generate_followup(
    request: FollowUpGenerationRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generate a personalized follow-up message for a lead.
    """
    ai = AIService(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    interaction = await ai.generate_followup(
        lead_info=request.lead_info,
        context=request.context,
        tone=request.tone,
        lead_id=request.lead_id,
    )
    
    return SkillResponse(
        content=interaction.response.content,
        interaction_id=interaction.interaction_id,
        skill=Skill.GENERATE_FOLLOWUP.value,
        model=interaction.response.model,
        latency_ms=interaction.response.latency_ms,
        tokens_used=interaction.response.total_tokens,
    )


@router.post("/check-compliance", response_model=SkillResponse)
async def check_compliance(
    request: ComplianceCheckRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Check a message for compliance issues.
    
    Returns compliance status and any violations found.
    """
    ai = AIService(
        user_id=str(current_user.id),
        company_id=getattr(current_user, "company_id", None),
    )
    
    interaction = await ai.check_compliance(
        message=request.message,
        vertical=request.vertical,
        rules=request.rules,
    )
    
    return SkillResponse(
        content=interaction.response.content,
        interaction_id=interaction.interaction_id,
        skill=Skill.CHECK_COMPLIANCE.value,
        model=interaction.response.model,
        latency_ms=interaction.response.latency_ms,
        tokens_used=interaction.response.total_tokens,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# OUTCOME TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/outcome", response_model=Dict[str, Any])
async def update_outcome(
    request: OutcomeUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Update the outcome of an AI interaction.
    
    Call this when you know what happened with the AI response:
    - ignored: User didn't use the response
    - modified: User modified the response
    - used_as_is: User used response as-is
    - sent_to_lead: Message was sent to lead
    - lead_replied: Lead replied to the message
    - meeting_booked: A meeting was booked
    - deal_won: The deal was won
    - deal_lost: The deal was lost
    """
    try:
        outcome = OutcomeStatus(request.outcome)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid outcome. Valid: {[o.value for o in OutcomeStatus]}"
        )
    
    logger = get_ai_logger()
    
    success = await logger.update_outcome(
        interaction_id=request.interaction_id,
        outcome=outcome,
        user_rating=request.rating,
        user_feedback=request.feedback,
    )
    
    return {"success": success}


@router.post("/mark-used/{interaction_id}", response_model=Dict[str, Any])
async def mark_interaction_used(
    interaction_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Mark that an AI response was used by the user."""
    logger = get_ai_logger()
    success = await logger.mark_used(interaction_id)
    
    return {"success": success}


# ═══════════════════════════════════════════════════════════════════════════════
# CATALOG & STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=Dict[str, Any])
async def list_skills(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    List all available AI skills.
    """
    skills = []
    for skill, info in SKILL_CATALOG.items():
        skills.append({
            "id": skill.value,
            "name": info["name"],
            "description": info["description"],
            "category": info["category"],
        })
    
    return {
        "skills": skills,
        "categories": ["analysis", "generation", "compliance", "chat"],
    }


@router.get("/{skill_name}/stats", response_model=SkillStats)
async def get_skill_stats(
    skill_name: str,
    days: int = Query(30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get usage statistics for a skill.
    
    Useful for analyzing skill performance and adoption.
    """
    try:
        skill = Skill(skill_name)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown skill: {skill_name}"
        )
    
    logger = get_ai_logger()
    stats = await logger.get_skill_stats(skill_name, days)
    
    return SkillStats(**stats)


@router.get("/my-stats", response_model=Dict[str, Any])
async def get_user_ai_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get AI usage statistics for the current user.
    """
    logger = get_ai_logger()
    stats = await logger.get_user_stats(str(current_user.id), days)
    
    return stats

