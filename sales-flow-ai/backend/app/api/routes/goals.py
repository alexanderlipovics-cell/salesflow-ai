"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOAL API ROUTES                                                           ║
║  Endpoints für Goal Engine & Daily Flow Targets                            ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException, Depends
from loguru import logger

from app.api.schemas.goals import (
    GoalCalculateRequest,
    GoalCalculateResponse,
    GoalSaveRequest,
    GoalSaveResponse,
    DailyTargetsResponse,
)
from app.domain.goals import (
    GoalCalculationInput,
    calculate_goal,
    format_target_summary,
    DISCLAIMER_TEXT,
)
from app.domain.goals.models import DEFAULT_DAILY_FLOW_CONFIG

router = APIRouter()


@router.post("/calculate", response_model=GoalCalculateResponse)
async def calculate_goal_endpoint(request: GoalCalculateRequest):
    """
    Berechne Goal Targets basierend auf Einkommen oder Rang.
    
    Gibt zurück:
    - Ziel-Rang
    - Benötigtes Volumen
    - Geschätzte Kunden/Partner
    - Tägliche/wöchentliche Aktivitäts-Targets
    
    Beispiel:
    ```json
    {
        "company_id": "zinzino",
        "goal_type": "income",
        "target_monthly_income": 2000,
        "timeframe_months": 6
    }
    ```
    """
    try:
        # Build input
        calc_input = GoalCalculationInput(
            company_id=request.company_id,
            region=request.region,
            goal_type=request.goal_type,
            target_monthly_income=request.target_monthly_income,
            target_rank_id=request.target_rank_id,
            timeframe_months=request.timeframe_months,
            current_group_volume=request.current_group_volume,
            config=request.config or DEFAULT_DAILY_FLOW_CONFIG,
        )
        
        # Calculate
        result = calculate_goal(calc_input)
        
        logger.info(
            f"Goal calculated: {result.target_rank.name} for {request.company_id} "
            f"({result.missing_group_volume} volume, {result.estimated_customers} customers)"
        )
        
        # Build response
        return GoalCalculateResponse(
            success=True,
            target_rank_id=result.target_rank.id,
            target_rank_name=result.target_rank.name,
            company_id=result.company_id,
            company_name=result.company_name,
            required_group_volume=result.required_group_volume,
            missing_group_volume=result.missing_group_volume,
            estimated_customers=result.estimated_customers,
            estimated_partners=result.estimated_partners,
            per_month_volume=result.per_month_volume,
            per_week_volume=result.per_week_volume,
            per_day_volume=result.per_day_volume,
            timeframe_months=result.timeframe_months,
            weekly_new_contacts=result.daily_targets.weekly.new_contacts,
            weekly_followups=result.daily_targets.weekly.followups,
            weekly_reactivations=result.daily_targets.weekly.reactivations,
            daily_new_contacts=result.daily_targets.daily.new_contacts,
            daily_followups=result.daily_targets.daily.followups,
            daily_reactivations=result.daily_targets.daily.reactivations,
            summary_text=format_target_summary(result),
            disclaimer=DISCLAIMER_TEXT,
        )
        
    except ValueError as e:
        logger.error(f"Goal calculation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in goal calculation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/save", response_model=GoalSaveResponse)
async def save_goal_endpoint(request: GoalSaveRequest):
    """
    Speichere ein Ziel für den User.
    
    Dies speichert:
    - Das Ziel in user_goals
    - Die Daily Flow Targets in user_daily_flow_targets
    
    Hinweis: Erfordert Authentifizierung (user_id aus Token).
    """
    # TODO: Implement with Supabase client and auth
    return GoalSaveResponse(
        success=False,
        message="Not implemented yet - requires Supabase integration",
        error="Endpoint requires authentication",
    )


@router.get("/daily-targets", response_model=DailyTargetsResponse)
async def get_daily_targets_endpoint():
    """
    Hole die aktuellen Daily Flow Targets des Users.
    
    Gibt zurück:
    - Aktives Ziel (falls vorhanden)
    - Tägliche/wöchentliche Targets
    - Fortschritt
    
    Hinweis: Erfordert Authentifizierung.
    """
    # TODO: Implement with Supabase client and auth
    return DailyTargetsResponse(
        has_goal=False,
        daily_new_contacts=0,
        daily_followups=0,
        daily_reactivations=0,
    )


@router.get("/active")
async def get_active_goal_endpoint():
    """
    Hole das aktive Ziel des Users.
    
    Hinweis: Erfordert Authentifizierung.
    """
    # TODO: Implement with Supabase client and auth
    return {"has_active_goal": False, "message": "Not implemented yet"}


@router.post("/{goal_id}/achieved")
async def mark_goal_achieved_endpoint(goal_id: str):
    """
    Markiere ein Ziel als erreicht.
    
    Hinweis: Erfordert Authentifizierung.
    """
    # TODO: Implement with Supabase client and auth
    return {"success": False, "message": "Not implemented yet"}

