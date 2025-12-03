"""
SALES FLOW AI - KI INTELLIGENCE ROUTER
FastAPI Endpoints für BANT, DISG, Recommendations & Intelligence
Version: 1.0.0 | Created: 2024-12-01
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user_id
from app.models.ki_core import (
    AIRecommendationCreate,
    AIRecommendationResponse,
    AIRecommendationUpdate,
    BANTAssessmentCreate,
    BANTAssessmentResponse,
    BulkRecommendationsResponse,
    ComplianceCheckRequest,
    ComplianceCheckResponse,
    ConversionMicrosteps,
    DISGRecommendations,
    LeadIntelligence,
    LeadMemoryUpdateRequest,
    LeadMemoryUpdateResponse,
    PersonalityInsights,
    PersonalityProfileCreate,
    PersonalityProfileResponse,
    PlaybookExecutionCreate,
    PlaybookExecutionResponse,
    PlaybookExecutionUpdate,
    ScoredLead,
)
from app.services.ki_intelligence_service import KIIntelligenceService
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ki", tags=["KI Intelligence"])


def get_ki_service() -> KIIntelligenceService:
    """Dependency to get KI service"""
    return KIIntelligenceService(openai_api_key=settings.OPENAI_API_KEY)


# ============================================================================
# BANT ASSESSMENT ENDPOINTS
# ============================================================================


@router.post(
    "/bant/assess",
    response_model=BANTAssessmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_bant_assessment(
    assessment: BANTAssessmentCreate,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🎯 DEAL-MEDIC: Erstelle BANT-Assessment für Lead
    
    Bewertet:
    - Budget (0-100)
    - Authority (0-100)
    - Need (0-100)
    - Timeline (0-100)
    
    Gibt Traffic Light zurück: 🟢 Green | 🟡 Yellow | 🔴 Red
    """
    try:
        scores = {
            "budget_score": assessment.budget_score,
            "authority_score": assessment.authority_score,
            "need_score": assessment.need_score,
            "timeline_score": assessment.timeline_score,
        }
        
        notes = {
            "budget_notes": assessment.budget_notes,
            "authority_notes": assessment.authority_notes,
            "need_notes": assessment.need_notes,
            "timeline_notes": assessment.timeline_notes,
            "next_steps": assessment.next_steps,
        }
        
        result = await ki_service.create_bant_assessment(
            user_id=user_id,
            lead_id=str(assessment.lead_id),
            scores=scores,
            notes=notes,
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error creating BANT assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create BANT assessment: {str(e)}",
        )


@router.get(
    "/bant/{lead_id}",
    response_model=BANTAssessmentResponse,
)
async def get_bant_assessment(
    lead_id: UUID,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """🎯 Hole BANT-Assessment für Lead"""
    try:
        result = ki_service.supabase.table("bant_assessments").select("*").eq(
            "lead_id", str(lead_id)
        ).eq("user_id", user_id).order("created_at.desc").limit(1).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="BANT assessment not found",
            )
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting BANT assessment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# PERSONALITY PROFILE ENDPOINTS
# ============================================================================


@router.post(
    "/personality/profile",
    response_model=PersonalityProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_personality_profile(
    profile: PersonalityProfileCreate,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🧠 NEURO-PROFILER: Erstelle DISG-Persönlichkeitsprofil
    
    Bewertet:
    - D: Dominanz (Ergebnisorientiert)
    - I: Influence (Menschenorientiert)
    - S: Steadiness (Stabilitätsorientiert)
    - C: Conscientiousness (Qualitätsorientiert)
    """
    try:
        scores = {
            "dominance_score": profile.dominance_score,
            "influence_score": profile.influence_score,
            "steadiness_score": profile.steadiness_score,
            "conscientiousness_score": profile.conscientiousness_score,
            "confidence_score": 0.8,  # Manual assessment = high confidence
        }
        
        result = await ki_service.create_personality_profile(
            user_id=user_id,
            lead_id=str(profile.lead_id),
            scores=scores,
            assessment_method=profile.assessment_method,
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error creating personality profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create personality profile: {str(e)}",
        )


@router.post(
    "/personality/analyze/{lead_id}",
    response_model=PersonalityProfileResponse,
)
async def analyze_personality_ai(
    lead_id: UUID,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🤖 NEURO-PROFILER: AI-Analyse aus Nachrichten-History
    
    Analysiert automatisch Persönlichkeitstyp basierend auf:
    - Message-Tone
    - Response-Patterns
    - Entscheidungsgeschwindigkeit
    """
    try:
        # Get message history
        messages_result = ki_service.supabase.table("messages").select(
            "content"
        ).eq("lead_id", str(lead_id)).order("created_at.desc").limit(20).execute()
        
        if not messages_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough message history for analysis (min. 5 messages)",
            )
        
        messages = [msg["content"] for msg in messages_result.data]
        
        result = await ki_service.analyze_personality_from_messages(
            lead_id=str(lead_id),
            user_id=user_id,
            messages=messages,
        )
        
        # Get saved profile
        profile_result = ki_service.supabase.table("personality_profiles").select(
            "*"
        ).eq("lead_id", str(lead_id)).execute()
        
        return profile_result.data[0] if profile_result.data else result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing personality: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/personality/{lead_id}/recommendations",
    response_model=DISGRecommendations,
)
async def get_disg_recommendations(
    lead_id: UUID,
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """🎯 Hole DISG-basierte Kommunikations-Empfehlungen"""
    try:
        result = await ki_service.generate_bant_recommendations(str(lead_id))
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result.get("error", "No personality profile found"),
            )
        
        return result.get("recommendations", {})
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting DISG recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# LEAD INTELLIGENCE ENDPOINTS
# ============================================================================


@router.get(
    "/intelligence/{lead_id}",
    response_model=LeadIntelligence,
)
async def get_lead_intelligence(
    lead_id: UUID,
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🧠 Komplette Lead-Intelligence-Summary
    
    Liefert:
    - BANT Score & Traffic Light
    - DISG Persönlichkeitsprofil
    - Context Summary (Auto-Memory)
    - Pending Recommendations
    - Intelligence Score (low/medium/high)
    """
    try:
        result = await ki_service.get_lead_intelligence(str(lead_id))
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"],
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lead intelligence: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/memory/update",
    response_model=LeadMemoryUpdateResponse,
)
async def update_lead_memory(
    request: LeadMemoryUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    💾 AUTO-MEMORY: Update Lead Context Summary
    
    Aktualisiert:
    - Conversation History
    - Key Facts
    - Pain Points & Goals
    - Objections Raised
    - GPT-Optimized Context Blob
    """
    try:
        result = await ki_service.update_lead_memory(
            lead_id=str(request.lead_id),
            user_id=user_id,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to update memory"),
            )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead memory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# RECOMMENDATIONS ENDPOINTS
# ============================================================================


@router.get(
    "/recommendations",
    response_model=list[AIRecommendationResponse],
)
async def get_pending_recommendations(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(10, ge=1, le=50),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """📋 Hole alle pending AI-Recommendations"""
    try:
        result = await ki_service.get_pending_recommendations(
            user_id=user_id,
            limit=limit,
        )
        return result
    
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/recommendations/followups",
    response_model=BulkRecommendationsResponse,
)
async def get_followup_recommendations(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(5, ge=1, le=20),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    ⚡ Next Best Actions (Intelligent Follow-up Recommendations)
    
    Berechnet basierend auf:
    - Days since last contact
    - BANT Score
    - Personality Profile
    - Pending Recommendations
    - Deal Health
    """
    try:
        result = await ki_service.recommend_followup_actions(
            user_id=user_id,
            limit=limit,
        )
        
        from datetime import datetime
        return {
            "total": len(result),
            "recommendations": result,
            "generated_at": datetime.utcnow(),
        }
    
    except Exception as e:
        logger.error(f"Error getting followup recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/recommendations",
    response_model=AIRecommendationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_recommendation(
    recommendation: AIRecommendationCreate,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """➕ Erstelle manuelle AI-Recommendation"""
    try:
        result = await ki_service.create_recommendation(
            user_id=user_id,
            recommendation_data=recommendation.model_dump(exclude_unset=True),
        )
        return result
    
    except Exception as e:
        logger.error(f"Error creating recommendation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch(
    "/recommendations/{recommendation_id}",
    response_model=AIRecommendationResponse,
)
async def update_recommendation_status(
    recommendation_id: UUID,
    update: AIRecommendationUpdate,
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """✅ Update Recommendation Status (accept/dismiss/complete)"""
    try:
        result = await ki_service.update_recommendation_status(
            recommendation_id=str(recommendation_id),
            status=update.status,
            dismissed_reason=update.dismissed_reason,
        )
        return result
    
    except Exception as e:
        logger.error(f"Error updating recommendation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# COMPLIANCE ENDPOINTS
# ============================================================================


@router.post(
    "/compliance/check",
    response_model=ComplianceCheckResponse,
)
async def check_compliance(
    request: ComplianceCheckRequest,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🛡️ LIABILITY-SHIELD: Check Content for Compliance
    
    Prüft auf:
    - Health Claims
    - Income Guarantees
    - Misleading Statements
    - Missing Disclaimers
    """
    try:
        result = await ki_service.check_compliance(
            user_id=user_id,
            content=request.original_content,
            content_type=request.content_type,
            related_lead_id=str(request.related_lead_id) if request.related_lead_id else None,
        )
        return result
    
    except Exception as e:
        logger.error(f"Error checking compliance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# SCRIPT GENERATION ENDPOINTS
# ============================================================================


@router.post(
    "/scripts/generate/{lead_id}",
    response_model=dict,
)
async def generate_personalized_script(
    lead_id: UUID,
    script_type: str = Query("follow-up", regex="^(follow-up|opening|closing|objection)$"),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    ✍️ Generiere personalisierten Script
    
    Berücksichtigt:
    - DISG Persönlichkeitstyp
    - BANT Score
    - Context History
    - Compliance Rules
    """
    try:
        script = await ki_service.generate_personalized_script(
            lead_id=str(lead_id),
            script_type=script_type,
        )
        
        return {
            "lead_id": str(lead_id),
            "script_type": script_type,
            "script": script,
            "compliance_checked": True,
        }
    
    except Exception as e:
        logger.error(f"Error generating script: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================


@router.get(
    "/analytics/scored-leads",
    response_model=list[ScoredLead],
)
async def get_scored_leads(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """📊 Scored Leads (mit Overall Health Score)"""
    try:
        result = await ki_service.get_scored_leads(
            user_id=user_id,
            limit=limit,
        )
        return result
    
    except Exception as e:
        logger.error(f"Error getting scored leads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/analytics/conversion-funnel",
    response_model=ConversionMicrosteps,
)
async def get_conversion_funnel(
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """📊 Conversion Micro-Steps Analytics"""
    try:
        result = await ki_service.get_conversion_microsteps(user_id=user_id)
        return result
    
    except Exception as e:
        logger.error(f"Error getting conversion funnel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/analytics/personality-insights",
    response_model=PersonalityInsights,
)
async def get_personality_analytics(
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """📊 Personality Insights (DISG Performance Analytics)"""
    try:
        result = await ki_service.get_personality_insights(user_id=user_id)
        return result
    
    except Exception as e:
        logger.error(f"Error getting personality insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/analytics/refresh-views",
    status_code=status.HTTP_202_ACCEPTED,
)
async def refresh_materialized_views(
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """🔄 Refresh Materialized Views (Admin)"""
    try:
        success = await ki_service.refresh_views()
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to refresh views",
            )
        
        return {"message": "Views refresh queued", "success": True}
    
    except Exception as e:
        logger.error(f"Error refreshing views: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


# ============================================================================
# PLAYBOOK ENDPOINTS
# ============================================================================


@router.post(
    "/playbooks/start",
    response_model=PlaybookExecutionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_playbook(
    playbook: PlaybookExecutionCreate,
    user_id: str = Depends(get_current_user_id),
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """
    🎯 Start Playbook Execution
    
    Playbooks:
    - DEAL-MEDIC (BANT Assessment)
    - NEURO-PROFILER (DISG Analysis)
    - FEUERLÖSCHER (Complaint Management)
    - EMPFEHLUNGS-MASCHINE (Referral Engine)
    """
    try:
        result = await ki_service.start_playbook_execution(
            user_id=user_id,
            lead_id=str(playbook.lead_id),
            playbook_name=playbook.playbook_name,
            total_steps=playbook.total_steps,
        )
        return result
    
    except Exception as e:
        logger.error(f"Error starting playbook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.patch(
    "/playbooks/{execution_id}",
    response_model=PlaybookExecutionResponse,
)
async def update_playbook(
    execution_id: UUID,
    update: PlaybookExecutionUpdate,
    ki_service: KIIntelligenceService = Depends(get_ki_service),
):
    """✅ Update Playbook Execution Progress"""
    try:
        result = await ki_service.update_playbook_execution(
            execution_id=str(execution_id),
            update_data=update.model_dump(exclude_unset=True),
        )
        return result
    
    except Exception as e:
        logger.error(f"Error updating playbook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

