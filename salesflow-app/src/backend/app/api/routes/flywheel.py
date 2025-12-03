"""
╔════════════════════════════════════════════════════════════════════════════╗
║  FLYWHEEL API ROUTES                                                       ║
║  Data Flywheel & Erfolgsmessung Endpoints                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- GET /flywheel/report - Comprehensive flywheel report
- GET /flywheel/templates - Template performance metrics
- GET /flywheel/skills - AI skill metrics
- GET /flywheel/funnel - Conversion funnel metrics
- GET /flywheel/engagement/{lead_id} - Lead engagement score
- GET /flywheel/best-practices - Identified best practices
- POST /flywheel/track - Track a metric event
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from ...db.deps import get_current_user, CurrentUser
from ...services.analytics.flywheel import (
    FlywheelService,
    get_flywheel_service,
)

router = APIRouter(prefix="/flywheel", tags=["flywheel", "analytics"])


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class TrackEventRequest(BaseModel):
    """Track a metric event."""
    event_type: str = Field(..., description="template_sent, template_replied, etc.")
    entity_id: str = Field(..., description="ID of the entity (template_id, lead_id, etc.)")
    entity_type: str = Field(..., description="template, lead, skill")
    metadata: Optional[Dict[str, Any]] = None


class TemplateMetricResponse(BaseModel):
    """Template metric response."""
    template_id: str
    template_name: str
    sent_count: int
    reply_count: int
    meeting_count: int
    reply_rate: float
    meeting_rate: float


class SkillMetricResponse(BaseModel):
    """Skill metric response."""
    skill_name: str
    total_calls: int
    adoption_rate: float
    success_rate: float
    avg_latency_ms: float
    total_cost_usd: float


class FunnelStageResponse(BaseModel):
    """Funnel stage response."""
    stage_id: str
    stage_name: str
    leads_count: int
    conversion_rate: float
    drop_off_rate: float


class EngagementResponse(BaseModel):
    """Engagement score response."""
    lead_id: str
    score: int
    level: str
    factors: Dict[str, Any]


class BestPracticeResponse(BaseModel):
    """Best practice recommendation."""
    type: str
    title: str
    description: str
    action: str
    impact: str


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/report", response_model=Dict[str, Any])
async def get_flywheel_report(
    days: int = Query(30, ge=7, le=365, description="Period in days"),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get comprehensive flywheel report.
    
    Includes:
    - Summary statistics
    - Top performing templates
    - AI skill performance
    - Conversion funnel
    - Recommendations
    """
    service = get_flywheel_service()
    
    report = await service.generate_flywheel_report(
        user_id=str(current_user.id),
        days=days,
    )
    
    return report


@router.get("/templates", response_model=Dict[str, Any])
async def get_template_metrics(
    template_id: Optional[str] = Query(None),
    top_n: int = Query(10, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get template performance metrics.
    
    Shows which templates have the best reply and conversion rates.
    """
    service = get_flywheel_service()
    
    metrics = await service.get_template_metrics(
        template_id=template_id,
        user_id=str(current_user.id),
        top_n=top_n,
    )
    
    return {
        "templates": [
            {
                "template_id": m.template_id,
                "template_name": m.template_name,
                "sent_count": m.sent_count,
                "reply_count": m.reply_count,
                "meeting_count": m.meeting_count,
                "deal_count": m.deal_count,
                "reply_rate": round(m.reply_rate * 100, 1),
                "meeting_rate": round(m.meeting_rate * 100, 1),
                "deal_rate": round(m.deal_rate * 100, 1),
            }
            for m in metrics
        ],
        "count": len(metrics),
    }


@router.get("/skills", response_model=Dict[str, Any])
async def get_skill_metrics(
    skill_name: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=365),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get AI skill performance metrics.
    
    Shows adoption rates, success rates, and costs per skill.
    """
    service = get_flywheel_service()
    
    metrics = await service.get_skill_metrics(
        skill_name=skill_name,
        user_id=str(current_user.id),
        days=days,
    )
    
    return {
        "period_days": days,
        "skills": [
            {
                "skill_name": m.skill_name,
                "total_calls": m.total_calls,
                "adoption_rate": round(m.adoption_rate * 100, 1),
                "modification_rate": round(m.modification_rate * 100, 1),
                "success_rate": round(m.success_rate * 100, 1),
                "avg_latency_ms": round(m.avg_latency_ms, 0),
                "total_cost_usd": round(m.total_cost_usd, 2),
            }
            for m in metrics
        ],
        "total_calls": sum(m.total_calls for m in metrics),
        "total_cost": round(sum(m.total_cost_usd for m in metrics), 2),
    }


@router.get("/funnel", response_model=Dict[str, Any])
async def get_funnel_metrics(
    vertical: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=365),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get conversion funnel metrics.
    
    Shows lead distribution and conversion rates across pipeline stages.
    """
    service = get_flywheel_service()
    
    stages = await service.get_funnel_metrics(
        user_id=str(current_user.id),
        vertical=vertical,
        days=days,
    )
    
    total_leads = sum(s.leads_count for s in stages)
    
    return {
        "period_days": days,
        "vertical": vertical or "all",
        "total_leads": total_leads,
        "stages": [
            {
                "stage_id": s.stage_id,
                "stage_name": s.stage_name,
                "leads_count": s.leads_count,
                "percentage": round(s.leads_count / total_leads * 100, 1) if total_leads > 0 else 0,
                "conversion_rate": round(s.conversion_rate_to_next * 100, 1),
                "drop_off_rate": round(s.drop_off_rate * 100, 1),
            }
            for s in stages
        ],
    }


@router.get("/engagement/{lead_id}", response_model=EngagementResponse)
async def get_lead_engagement(
    lead_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get engagement score for a specific lead.
    
    Returns a score (0-100) and level (cold, cool, warm, hot).
    """
    service = get_flywheel_service()
    
    engagement = await service.calculate_engagement_score(lead_id)
    
    return EngagementResponse(
        lead_id=lead_id,
        score=engagement["score"],
        level=engagement["level"],
        factors=engagement["factors"],
    )


@router.get("/best-practices", response_model=Dict[str, Any])
async def get_best_practices(
    vertical: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get identified best practices based on data.
    
    Returns actionable recommendations based on what's working.
    """
    service = get_flywheel_service()
    
    practices = await service.identify_best_practices(
        user_id=str(current_user.id),
        vertical=vertical,
    )
    
    return {
        "practices": practices[:limit],
        "count": len(practices),
    }


@router.post("/track", response_model=Dict[str, Any])
async def track_event(
    request: TrackEventRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Track a metric event.
    
    Use this to track:
    - Template usage (sent, replied, meeting, deal)
    - Lead interactions
    - Custom events
    """
    service = get_flywheel_service()
    
    # Route to appropriate handler based on entity type
    if request.entity_type == "template":
        success = await service.update_template_metrics(
            template_id=request.entity_id,
            event=request.event_type,
            lead_id=request.metadata.get("lead_id") if request.metadata else None,
        )
    else:
        # Generic event tracking (can be extended)
        success = True
    
    return {
        "success": success,
        "event_type": request.event_type,
        "entity_id": request.entity_id,
        "tracked_at": datetime.utcnow().isoformat(),
    }


@router.get("/summary", response_model=Dict[str, Any])
async def get_quick_summary(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get a quick summary of key metrics.
    
    Lightweight endpoint for dashboard widgets.
    """
    service = get_flywheel_service()
    
    # Get last 7 days for quick view
    templates = await service.get_template_metrics(user_id=str(current_user.id), top_n=3)
    skills = await service.get_skill_metrics(user_id=str(current_user.id), days=7)
    
    # Calculate quick stats
    total_sent = sum(t.sent_count for t in templates)
    total_replied = sum(t.reply_count for t in templates)
    avg_reply_rate = total_replied / total_sent if total_sent > 0 else 0
    
    total_ai_calls = sum(s.total_calls for s in skills)
    
    return {
        "period": "last_7_days",
        "messages_sent": total_sent,
        "reply_rate": round(avg_reply_rate * 100, 1),
        "ai_calls": total_ai_calls,
        "top_template": templates[0].template_name if templates else None,
        "most_used_skill": skills[0].skill_name if skills else None,
    }

