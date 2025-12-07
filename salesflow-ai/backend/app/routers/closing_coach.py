"""
Sales Flow AI - Closing Coach Router

KI-Analyse für Deal-Closing, Blocker-Erkennung, Closing-Strategien
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_current_user, get_supabase

router = APIRouter(prefix="/closing-coach", tags=["Closing Coach"])


# ============================================================================
# SCHEMAS
# ============================================================================


class Blocker(BaseModel):
    type: str  # 'price_objection', 'decision_maker_missing', 'timeline_unclear', etc.
    severity: str  # 'low', 'medium', 'high'
    occurrences: int = 1
    context: str
    recommendation: Optional[str] = None


class ClosingStrategy(BaseModel):
    strategy: str  # 'alternative_close', 'urgency_close', 'summary_close', etc.
    script: str
    confidence: float = Field(..., ge=0, le=1)
    when_to_use: Optional[str] = None


class ClosingInsight(BaseModel):
    id: UUID
    user_id: UUID
    deal_id: UUID
    contact_id: Optional[UUID] = None
    detected_blockers: List[Blocker]
    closing_score: Decimal
    closing_probability: str
    recommended_strategies: List[ClosingStrategy]
    suggested_next_action: Optional[str] = None
    suggested_next_action_time: Optional[datetime] = None
    conversation_sentiment: Optional[str] = None
    engagement_level: Optional[str] = None
    objection_count: int = 0
    price_mentioned_count: int = 0
    timeline_mentioned: bool = False
    last_analyzed_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# AI ANALYSIS SERVICE - Nutzt bestehende LLM-Infrastruktur
# ============================================================================

async def analyze_deal_for_closing(deal_data: dict, conversation_history: List[dict]) -> dict:
    """
    Analysiert Deal und Gesprächshistorie für Closing-Insights mit LLM.
    """
    # Prüfe ob OpenAI Key vorhanden
    if not settings.openai_api_key:
        # Fallback auf einfache Logik wenn kein Key
        return {
            "detected_blockers": [],
            "closing_score": 50.0,
            "closing_probability": "medium",
            "recommended_strategies": [],
            "suggested_next_action": "Follow-up planen",
            "objection_count": 0,
            "price_mentioned_count": 0,
        }
    
    try:
        # Prompt generieren
        prompt_messages = get_closing_coach_gpt_prompt(deal_data, conversation_history)
        
        # LLM aufrufen (nutzt bestehende ai_client Infrastruktur)
        response_text = await chat_completion(
            messages=prompt_messages,
            model="gpt-4",
            max_tokens=2000,
            temperature=0.3,
        )
        
        # JSON parsen
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback: Versuche JSON aus Text zu extrahieren
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError("No valid JSON found in LLM response")
        
        return result
        
    except Exception as e:
        logger.error(f"LLM Error in analyze_deal_for_closing: {e}")
        # Fallback auf einfache Logik
        return {
            "detected_blockers": [],
            "closing_score": 50.0,
            "closing_probability": "medium",
            "recommended_strategies": [],
            "suggested_next_action": "Follow-up planen",
            "objection_count": 0,
            "price_mentioned_count": 0,
        }


# ============================================================================
# ROUTES
# ============================================================================


@router.post("/analyze/{deal_id}", response_model=ClosingInsight)
async def analyze_deal(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Analysiere Deal für Closing-Insights."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    # Hole Deal
    deal_result = (
        supabase.table("deals")
        .select("*")
        .eq("id", str(deal_id))
        .single()
        .execute()
    )

    if not deal_result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = deal_result.data[0]

    # Hole Gesprächshistorie (Activities, Notes, etc.)
    activities_result = (
        supabase.table("activities")
        .select("*")
        .eq("deal_id", str(deal_id))
        .order("created_at", desc=False)
        .execute()
    )

    conversation_history = activities_result.data or []

    # KI-Analyse (async!)
    analysis = await analyze_deal_for_closing(deal, conversation_history)

    # Speichere oder aktualisiere Insight
    insight_data = {
        "user_id": user_id,
        "deal_id": str(deal_id),
        "contact_id": deal.get("contact_id"),
        "detected_blockers": analysis["detected_blockers"],
        "closing_score": float(analysis["closing_score"]),
        "closing_probability": analysis["closing_probability"],
        "recommended_strategies": analysis["recommended_strategies"],
        "suggested_next_action": analysis.get("suggested_next_action"),
        "objection_count": analysis["objection_count"],
        "price_mentioned_count": analysis["price_mentioned_count"],
        "last_analyzed_at": datetime.now().isoformat(),
    }

    # Prüfe ob bereits existiert
    existing = (
        supabase.table("closing_insights")
        .select("id")
        .eq("deal_id", str(deal_id))
        .single()
        .execute()
    )

    if existing.data:
        result = (
            supabase.table("closing_insights")
            .update(insight_data)
            .eq("id", existing.data["id"])
            .execute()
        )
        insight_id = existing.data["id"]
    else:
        result = supabase.table("closing_insights").insert(insight_data).execute()
        insight_id = result.data[0]["id"]

    # Hole vollständiges Insight
    insight_result = (
        supabase.table("closing_insights")
        .select("*")
        .eq("id", insight_id)
        .single()
        .execute()
    )

    return ClosingInsight(**insight_result.data[0])


@router.get("/deal/{deal_id}", response_model=ClosingInsight)
async def get_closing_insight(
    deal_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Hole Closing-Insight für einen Deal."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    result = (
        supabase.table("closing_insights")
        .select("*")
        .eq("deal_id", str(deal_id))
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Closing insight not found")

    return ClosingInsight(**result.data[0])


@router.get("/my-deals", response_model=List[ClosingInsight])
async def list_my_closing_insights(
    min_score: Optional[float] = Query(None, ge=0, le=100),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste alle Closing-Insights für meine Deals."""
    user_id = current_user.get("team_member_id") or current_user.get("id")

    query = (
        supabase.table("closing_insights")
        .select("*")
        .eq("user_id", user_id)
    )

    if min_score:
        query = query.gte("closing_score", min_score)

    result = query.order("closing_score", desc=True).execute()

    return [ClosingInsight(**row) for row in result.data]

