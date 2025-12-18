"""
Sales Flow AI - Performance Insights Router

Performance-Analyse, Coaching-Empfehlungen, Issue-Detection
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from supabase import Client

from app.core.deps import get_current_user, get_supabase
from app.ai_client import chat_completion
from app.prompts.performance_coach_prompts import get_performance_coach_gpt_prompt
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/performance-insights", tags=["Performance Insights"])


# ============================================================================
# SCHEMAS
# ============================================================================


class DetectedIssue(BaseModel):
    type: str
    severity: str
    metric: str
    value: float
    benchmark: float
    impact: str
    recommendation: str
    priority: int


class Recommendation(BaseModel):
    title: str
    description: str
    action_items: List[str]
    expected_impact: str
    priority: int
    effort: str


class PerformanceInsight(BaseModel):
    id: UUID
    user_id: UUID
    period_start: date
    period_end: date
    period_type: str
    calls_made: int
    calls_completed: int
    meetings_booked: int
    meetings_completed: int
    deals_created: int
    deals_won: int
    deals_lost: int
    revenue: Decimal
    conversion_rate: Optional[Decimal] = None
    average_deal_size: Optional[Decimal] = None
    average_sales_cycle_days: Optional[int] = None
    detected_issues: List[dict]
    recommendations: List[dict]
    percentile_rank: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# METRICS COLLECTION
# ============================================================================


async def collect_performance_metrics(
    user_id: UUID,
    period_start: date,
    period_end: date,
    supabase: Client,
) -> dict:
    """Sammelt Performance-Metriken für einen Zeitraum."""
    
    # Calls (aus activities oder separater Tabelle)
    calls_result = (
        supabase.table("activities")
        .select("id, created_at")
        .eq("user_id", str(user_id))
        .gte("created_at", period_start.isoformat())
        .lte("created_at", period_end.isoformat())
        .eq("type", "call")
        .execute()
    )
    calls_made = len(calls_result.data) if calls_result.data else 0
    
    # Deals
    deals_result = (
        supabase.table("deals")
        .select("id, value, stage, closed_at, won, created_at")
        .eq("owner_id", str(user_id))
        .gte("created_at", period_start.isoformat())
        .lte("created_at", period_end.isoformat())
        .execute()
    )
    
    deals = deals_result.data or []
    deals_created = len(deals)
    deals_won = len([d for d in deals if d.get("won") is True])
    deals_lost = len([d for d in deals if d.get("won") is False])
    
    revenue = sum(Decimal(str(d.get("value", 0))) for d in deals if d.get("won") is True)
    
    conversion_rate = (Decimal(deals_won) / Decimal(deals_created) * 100) if deals_created > 0 else Decimal(0)
    avg_deal_size = revenue / Decimal(deals_won) if deals_won > 0 else Decimal(0)
    
    # Meetings (aus activities)
    meetings_result = (
        supabase.table("activities")
        .select("id")
        .eq("user_id", str(user_id))
        .gte("created_at", period_start.isoformat())
        .lte("created_at", period_end.isoformat())
        .eq("type", "meeting")
        .execute()
    )
    meetings_booked = len(meetings_result.data) if meetings_result.data else 0
    
    return {
        "calls_made": calls_made,
        "calls_completed": calls_made,  # Vereinfacht
        "meetings_booked": meetings_booked,
        "meetings_completed": meetings_booked,  # Vereinfacht
        "deals_created": deals_created,
        "deals_won": deals_won,
        "deals_lost": deals_lost,
        "revenue": float(revenue),
        "conversion_rate": float(conversion_rate),
        "average_deal_size": float(avg_deal_size),
        "average_sales_cycle_days": 0,  # TODO: Berechnen aus Deal-Daten
    }


async def analyze_performance_with_llm(
    metrics: dict,
    comparison: dict,
    lost_deals: List[dict],
) -> dict:
    """Analysiert Performance mit LLM."""
    if not settings.openai_api_key:
        return {
            "detected_issues": [],
            "recommendations": [],
            "strengths": [],
            "improvement_areas": [],
        }
    
    try:
        prompt_messages = get_performance_coach_gpt_prompt(metrics, comparison, lost_deals)
        response_text = await chat_completion(
            messages=prompt_messages,
            model="gpt-4",
            max_tokens=2000,
            temperature=0.3,
        )
        
        import json
        import re
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError("No valid JSON found")
        
        return result
    except Exception as e:
        logger.error(f"LLM Error in analyze_performance: {e}")
        return {
            "detected_issues": [],
            "recommendations": [],
            "strengths": [],
            "improvement_areas": [],
        }


# ============================================================================
# ROUTES
# ============================================================================


@router.post("/analyze", response_model=PerformanceInsight)
async def analyze_performance(
    period_start: date = Query(..., description="Start date (YYYY-MM-DD)"),
    period_end: date = Query(..., description="End date (YYYY-MM-DD)"),
    period_type: str = Query("monthly", description="daily, weekly, monthly, quarterly"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Analysiere Performance für einen Zeitraum."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    # Metriken sammeln
    metrics = await collect_performance_metrics(user_id, period_start, period_end, supabase)
    metrics["period_start"] = period_start
    metrics["period_end"] = period_end
    
    # Vergleich mit vorheriger Periode
    prev_period_days = (period_end - period_start).days
    prev_period_start = period_start - timedelta(days=prev_period_days + 1)
    prev_period_end = period_start - timedelta(days=1)
    
    prev_metrics = await collect_performance_metrics(user_id, prev_period_start, prev_period_end, supabase)
    
    comparison = {
        "prev_calls_made": prev_metrics.get("calls_made", 0),
        "calls_change_percent": (
            ((metrics["calls_made"] - prev_metrics.get("calls_made", 0)) / prev_metrics.get("calls_made", 1)) * 100
            if prev_metrics.get("calls_made", 0) > 0 else 0
        ),
        "prev_deals_won": prev_metrics.get("deals_won", 0),
        "deals_change_percent": (
            ((metrics["deals_won"] - prev_metrics.get("deals_won", 0)) / prev_metrics.get("deals_won", 1)) * 100
            if prev_metrics.get("deals_won", 0) > 0 else 0
        ),
        "prev_conversion_rate": prev_metrics.get("conversion_rate", 0),
        "conversion_change_percent": (
            metrics["conversion_rate"] - prev_metrics.get("conversion_rate", 0)
        ),
    }
    
    # Verlorene Deals
    lost_deals_result = (
        supabase.table("deals")
        .select("id, title, value, stage, lost_reason, notes")
        .eq("owner_id", str(user_id))
        .eq("won", False)
        .gte("created_at", period_start.isoformat())
        .lte("created_at", period_end.isoformat())
        .execute()
    )
    lost_deals = lost_deals_result.data or []
    
    # LLM-Analyse
    analysis = await analyze_performance_with_llm(metrics, comparison, lost_deals)
    
    # Speichere Insight
    insight_data = {
        "user_id": user_id,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "period_type": period_type,
        "calls_made": metrics["calls_made"],
        "calls_completed": metrics["calls_completed"],
        "meetings_booked": metrics["meetings_booked"],
        "meetings_completed": metrics["meetings_completed"],
        "deals_created": metrics["deals_created"],
        "deals_won": metrics["deals_won"],
        "deals_lost": metrics["deals_lost"],
        "revenue": metrics["revenue"],
        "conversion_rate": metrics["conversion_rate"],
        "average_deal_size": metrics["average_deal_size"],
        "detected_issues": analysis.get("detected_issues", []),
        "recommendations": analysis.get("recommendations", []),
    }
    
    # Prüfe ob bereits existiert
    existing = (
        supabase.table("performance_insights")
        .select("id")
        .eq("user_id", user_id)
        .eq("period_start", period_start.isoformat())
        .eq("period_end", period_end.isoformat())
        .eq("period_type", period_type)
        .maybe_single()
        .execute()
    )
    
    if existing.data:
        result = (
            supabase.table("performance_insights")
            .update(insight_data)
            .eq("id", existing.data["id"])
            .execute()
        )
        insight_id = existing.data["id"]
    else:
        result = supabase.table("performance_insights").insert(insight_data).execute()
        insight_id = result.data[0]["id"]
    
    # Hole vollständiges Insight
    insight_result = (
        supabase.table("performance_insights")
        .select("*")
        .eq("id", insight_id)
        .single()
        .execute()
    )
    
    return PerformanceInsight(**insight_result.data[0])


@router.get("/my-insights", response_model=List[PerformanceInsight])
async def list_my_insights(
    period_type: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """Liste alle Performance-Insights."""
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    query = (
        supabase.table("performance_insights")
        .select("*")
        .eq("user_id", user_id)
    )
    
    if period_type:
        query = query.eq("period_type", period_type)
    
    result = query.order("period_start", desc=True).limit(limit).execute()
    
    return [PerformanceInsight(**row) for row in result.data]


@router.post("/analyze", response_model=dict)
async def analyze_performance_mobile(
    period_start: str = Query(..., description="Start date (ISO format)"),
    period_end: str = Query(..., description="End date (ISO format)"),
    supabase: Client = Depends(get_supabase),
    current_user: dict = Depends(get_current_user),
):
    """
    Analysiere Performance für Mobile App.
    Gibt eine vereinfachte Struktur zurück, die der Mobile App entspricht.
    """
    from datetime import datetime
    
    user_id = current_user.get("team_member_id") or current_user.get("id")
    
    # Parse dates
    start_date = datetime.fromisoformat(period_start.replace('Z', '+00:00')).date()
    end_date = datetime.fromisoformat(period_end.replace('Z', '+00:00')).date()
    
    # Metriken sammeln
    metrics = await collect_performance_metrics(user_id, start_date, end_date, supabase)
    
    # Vergleich mit vorheriger Periode
    prev_period_days = (end_date - start_date).days
    prev_period_start = start_date - timedelta(days=prev_period_days + 1)
    prev_period_end = start_date - timedelta(days=1)
    
    prev_metrics = await collect_performance_metrics(user_id, prev_period_start, prev_period_end, supabase)
    
    # Berechne Trends
    revenue_trend = (
        ((metrics["revenue"] - prev_metrics.get("revenue", 0)) / prev_metrics.get("revenue", 1)) * 100
        if prev_metrics.get("revenue", 0) > 0 else 0
    )
    calls_trend = (
        ((metrics["calls_made"] - prev_metrics.get("calls_made", 0)) / prev_metrics.get("calls_made", 1)) * 100
        if prev_metrics.get("calls_made", 0) > 0 else 0
    )
    deals_trend = (
        ((metrics["deals_won"] - prev_metrics.get("deals_won", 0)) / prev_metrics.get("deals_won", 1)) * 100
        if prev_metrics.get("deals_won", 0) > 0 else 0
    )
    conversion_trend = (
        metrics["conversion_rate"] - prev_metrics.get("conversion_rate", 0)
    )
    
    # Hole Zeitreihen-Daten (vereinfacht: wöchentlich)
    time_series_labels = []
    time_series_calls = []
    time_series_deals = []
    
    # Vereinfachte Zeitreihe (4 Wochen)
    current = start_date
    week_count = 0
    while current <= end_date and week_count < 4:
        week_end = min(current + timedelta(days=6), end_date)
        week_metrics = await collect_performance_metrics(user_id, current, week_end, supabase)
        
        time_series_labels.append(f"Woche {week_count + 1}")
        time_series_calls.append(week_metrics["calls_made"])
        time_series_deals.append(week_metrics["deals_won"])
        
        current = week_end + timedelta(days=1)
        week_count += 1
    
    # Verlorene Deals für Issue-Detection
    lost_deals_result = (
        supabase.table("deals")
        .select("id, title, value, stage, lost_reason, notes")
        .eq("owner_id", user_id)
        .eq("won", False)
        .gte("created_at", start_date.isoformat())
        .lte("created_at", end_date.isoformat())
        .execute()
    )
    lost_deals = lost_deals_result.data or []
    
    # LLM-Analyse
    comparison = {
        "prev_calls_made": prev_metrics.get("calls_made", 0),
        "calls_change_percent": calls_trend,
        "prev_deals_won": prev_metrics.get("deals_won", 0),
        "deals_change_percent": deals_trend,
        "prev_conversion_rate": prev_metrics.get("conversion_rate", 0),
        "conversion_change_percent": conversion_trend,
    }
    
    analysis = await analyze_performance_with_llm(metrics, comparison, lost_deals)
    
    # Formatiere für Mobile App
    return {
        "id": "mobile-insight",
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "kpis": {
            "revenue": metrics["revenue"],
            "calls": metrics["calls_made"],
            "deals": metrics["deals_won"],
            "conversion_rate": metrics["conversion_rate"] / 100,  # Als Dezimal (0-1)
            "revenue_trend": revenue_trend,
            "calls_trend": calls_trend,
            "deals_trend": deals_trend,
            "conversion_trend": conversion_trend,
        },
        "time_series": {
            "labels": time_series_labels,
            "calls": time_series_calls,
            "deals": time_series_deals,
        },
        "issues": [
            {
                "id": f"issue_{idx}",
                "title": issue.get("type", "Unknown Issue"),
                "severity": issue.get("severity", "medium"),
                "description": issue.get("recommendation", ""),
            }
            for idx, issue in enumerate(analysis.get("detected_issues", []))
        ],
        "recommendations": [
            {
                "id": f"rec_{idx}",
                "title": rec.get("title", "Recommendation"),
                "description": rec.get("description", ""),
                "priority": "high" if rec.get("priority", 0) > 7 else "medium" if rec.get("priority", 0) > 4 else "low",
            }
            for idx, rec in enumerate(analysis.get("recommendations", []))
        ],
    }

