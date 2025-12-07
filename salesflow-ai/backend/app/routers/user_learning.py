"""
User Learning Router - Endpoints für automatisches Lernen und Analytics
"""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app.supabase_client import get_supabase_client
from app.core.security import get_current_user_dict
from app.services.user_learning_service import UserLearningService

router = APIRouter(
    prefix="/user-learning",
    tags=["user-learning"],
)
logger = logging.getLogger(__name__)

DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001"


class LearningAnalysisResponse(BaseModel):
    insights_count: int
    total_conversions: int
    updated_fields: list[str]
    success: bool


class PersonalizationMetricsResponse(BaseModel):
    user_id: str
    personalization_enabled: bool
    profile_completeness: float  # 0.0-1.0
    total_conversions: int
    conversion_rate: float
    avg_response_quality: Optional[float]  # 0.0-1.0
    adaptation_speed_days: Optional[int]
    top_patterns: list[dict]


@router.post("/analyze-conversions", response_model=LearningAnalysisResponse)
async def analyze_conversions(
    days_back: int = 30,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Analysiert erfolgreiche Conversions und passt User Learning Profile an.
    
    Args:
        days_back: Anzahl Tage zurück für Analyse (default: 30)
        x_user_id: User ID aus Header
        
    Returns:
        LearningAnalysisResponse mit Insights und Updates
    """
    user_id = x_user_id or DEV_USER_ID
    
    try:
        db = get_supabase_client()
        service = UserLearningService(db)
        
        # Analysiere Conversions
        insights = await service.analyze_conversions(user_id, days_back)
        
        # Update Profile
        updated = await service.update_profile_from_conversions(
            user_id,
            days_back=days_back,
            min_conversions=5,
        )
        
        updated_fields = []
        if updated:
            # Extrahiere welche Felder aktualisiert wurden
            for insight in insights:
                if insight.confidence >= 0.6:
                    updated_fields.append(insight.pattern_type)
        
        return LearningAnalysisResponse(
            insights_count=len(insights),
            total_conversions=sum(i.sample_size for i in insights),
            updated_fields=updated_fields,
            success=updated,
        )
        
    except Exception as e:
        logger.exception(f"Error analyzing conversions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=PersonalizationMetricsResponse)
async def get_personalization_metrics(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Holt Metriken für Personalisierung.
    
    Returns:
        PersonalizationMetricsResponse mit allen Metriken
    """
    user_id = x_user_id or DEV_USER_ID
    
    try:
        db = get_supabase_client()
        
        # Lade User Learning Profile
        profile_result = db.table("user_learning_profile").select("*").eq("user_id", user_id).maybe_single().execute()
        profile = profile_result.data if profile_result.data else {}
        
        # Berechne Profile Completeness
        required_fields = [
            "preferred_tone", "avg_message_length", "emoji_usage_level",
            "formality_score", "sales_style"
        ]
        filled_fields = sum(1 for field in required_fields if profile.get(field) is not None)
        completeness = filled_fields / len(required_fields) if required_fields else 0.0
        
        # Hole Conversions (letzte 90 Tage)
        from datetime import datetime, timedelta
        cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
        
        conversions_result = db.table("leads").select("id, status").eq(
            "user_id", user_id
        ).in_("status", ["customer", "partner", "signed"]).gte(
            "converted_at", cutoff
        ).execute()
        
        total_conversions = len(conversions_result.data or [])
        
        # Berechne Conversion Rate (vereinfacht)
        total_leads_result = db.table("leads").select("id", count="exact").eq(
            "user_id", user_id
        ).execute()
        total_leads = total_leads_result.count or 1
        conversion_rate = total_conversions / total_leads if total_leads > 0 else 0.0
        
        # Top Patterns (aus successful_patterns im Profil)
        top_patterns = profile.get("successful_patterns", []) or []
        if isinstance(top_patterns, str):
            # Falls es ein String ist, versuche zu parsen
            import json
            try:
                top_patterns = json.loads(top_patterns)
            except:
                top_patterns = []
        
        return PersonalizationMetricsResponse(
            user_id=user_id,
            personalization_enabled=profile.get("user_id") is not None,
            profile_completeness=completeness,
            total_conversions=total_conversions,
            conversion_rate=conversion_rate,
            avg_response_quality=None,  # TODO: Aus Feedback berechnen
            adaptation_speed_days=None,  # TODO: Berechnen
            top_patterns=[{"pattern": p, "success_rate": 0.8} for p in top_patterns[:5]],
        )
        
    except Exception as e:
        logger.exception(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger-learning")
async def trigger_learning(
    days_back: int = 30,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Trigger für automatisches Learning (kann von Cron-Job aufgerufen werden).
    
    Returns:
        Success status
    """
    user_id = x_user_id or DEV_USER_ID
    
    try:
        db = get_supabase_client()
        service = UserLearningService(db)
        
        success = await service.update_profile_from_conversions(
            user_id,
            days_back=days_back,
            min_conversions=3,  # Niedrigeres Minimum für automatisches Learning
        )
        
        return {"success": success, "user_id": user_id}
        
    except Exception as e:
        logger.exception(f"Error triggering learning: {e}")
        return {"success": False, "error": str(e)}

