"""
═══════════════════════════════════════════════════════════════════════════
PREDICTIVE AI API
═══════════════════════════════════════════════════════════════════════════
API endpoints für Predictive AI Features.

Endpoints:
- GET /api/predictive-ai/win-probability/{lead_id} - Calculate win probability
- GET /api/predictive-ai/optimal-time/{lead_id} - Get optimal contact time
- GET /api/predictive-ai/score-breakdown/{lead_id} - Get detailed score breakdown

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
from app.services.predictive_ai_service import PredictiveAIService
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class WinProbabilityResponse(BaseModel):
    win_probability: int
    confidence: str
    factors: Dict[str, float]
    recommendations: List[str]


class OptimalContactTimeResponse(BaseModel):
    optimal_day: str
    optimal_hour: int
    confidence: str
    suggestion: str


class ScoreBreakdownResponse(BaseModel):
    lead_id: str
    lead_name: str
    win_probability: int
    confidence: str
    factors: Dict[str, float]
    recommendations: List[str]
    bant_status: str
    personality_type: str
    lead_status: str


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_predictive_service() -> PredictiveAIService:
    """Get predictive AI service instance."""
    supabase = get_supabase_client()
    return PredictiveAIService(supabase=supabase)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/win-probability/{lead_id}", response_model=WinProbabilityResponse)
async def get_win_probability(
    lead_id: str,
    current_user: dict = Depends(get_current_user),
    predictive_service: PredictiveAIService = Depends(get_predictive_service)
):
    """
    Calculate win probability for a lead.
    
    Returns a score between 0-100% based on:
    - BANT assessment (40%)
    - Engagement level (20%)
    - Personality match (15%)
    - Source quality (10%)
    - Response speed (10%)
    - Historical patterns (5%)
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        result = await predictive_service.calculate_win_probability(lead_id)
        
        return WinProbabilityResponse(
            win_probability=result['win_probability'],
            confidence=result['confidence'],
            factors=result['factors'],
            recommendations=result['recommendations']
        )
    
    except Exception as e:
        logger.error(f"Error calculating win probability: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating win probability: {str(e)}")


@router.get("/optimal-time/{lead_id}", response_model=OptimalContactTimeResponse)
async def get_optimal_contact_time(
    lead_id: str,
    current_user: dict = Depends(get_current_user),
    predictive_service: PredictiveAIService = Depends(get_predictive_service)
):
    """
    Get optimal time to contact lead based on historical response patterns.
    
    Analyzes:
    - Lead's past response times
    - Day of week patterns
    - Hour of day patterns
    - Overall user patterns (fallback)
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        result = await predictive_service.get_optimal_contact_time(lead_id, user_id)
        
        return OptimalContactTimeResponse(
            optimal_day=result['optimal_day'],
            optimal_hour=result['optimal_hour'],
            confidence=result['confidence'],
            suggestion=result['suggestion']
        )
    
    except Exception as e:
        logger.error(f"Error getting optimal contact time: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting optimal contact time: {str(e)}")


@router.get("/score-breakdown/{lead_id}", response_model=ScoreBreakdownResponse)
async def get_score_breakdown(
    lead_id: str,
    current_user: dict = Depends(get_current_user),
    predictive_service: PredictiveAIService = Depends(get_predictive_service)
):
    """
    Get detailed breakdown of lead scoring factors.
    
    Shows exactly WHY a lead has a certain win probability,
    with all factor scores and context.
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        result = await predictive_service.get_lead_score_breakdown(lead_id)
        
        return ScoreBreakdownResponse(
            lead_id=result['lead_id'],
            lead_name=result['lead_name'],
            win_probability=result['win_probability'],
            confidence=result['confidence'],
            factors=result['factors'],
            recommendations=result['recommendations'],
            bant_status=result['bant_status'],
            personality_type=result['personality_type'],
            lead_status=result['lead_status']
        )
    
    except Exception as e:
        logger.error(f"Error getting score breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting score breakdown: {str(e)}")


@router.get("/batch/win-probabilities")
async def get_batch_win_probabilities(
    lead_ids: str,  # Comma-separated lead IDs
    current_user: dict = Depends(get_current_user),
    predictive_service: PredictiveAIService = Depends(get_predictive_service)
):
    """
    Get win probabilities for multiple leads at once.
    
    Query Parameter:
    - lead_ids: Comma-separated list of lead IDs (e.g., "uuid1,uuid2,uuid3")
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        lead_id_list = lead_ids.split(',')
        
        results = []
        for lead_id in lead_id_list[:20]:  # Limit to 20 leads per request
            try:
                result = await predictive_service.calculate_win_probability(lead_id.strip())
                results.append({
                    "lead_id": lead_id.strip(),
                    "win_probability": result['win_probability'],
                    "confidence": result['confidence']
                })
            except Exception as e:
                logger.warning(f"Error calculating for lead {lead_id}: {str(e)}")
                results.append({
                    "lead_id": lead_id.strip(),
                    "error": str(e)
                })
        
        return {
            "results": results,
            "total_requested": len(lead_id_list),
            "total_processed": len(results)
        }
    
    except Exception as e:
        logger.error(f"Error in batch win probabilities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing batch request: {str(e)}")


@router.get("/status")
async def get_predictive_status():
    """
    Check Predictive AI service status.
    """
    return {
        "service": "predictive_ai",
        "status": "operational",
        "features": [
            "win_probability",
            "optimal_contact_time",
            "score_breakdown",
            "batch_processing",
            "historical_pattern_analysis"
        ],
        "tier_required": "premium"
    }

