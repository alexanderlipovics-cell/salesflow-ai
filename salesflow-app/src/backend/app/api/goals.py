"""
╔════════════════════════════════════════════════════════════════════════════╗
║  GOALS API ROUTER                                                          ║
║  FastAPI Endpoints für Goal-Berechnung                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /goals/calculate - Berechnet Goal-Breakdown
- POST /goals/daily-targets - Berechnet tägliche Targets
- GET  /goals/verticals - Liste verfügbarer Verticals
- GET  /goals/kpis/{vertical_id} - KPIs für ein Vertical
"""

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ..domain.goals.types import VerticalId, GoalKind
from ..domain.goals.service import get_goal_service, GoalCalculationService


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class GoalCalculateRequest(BaseModel):
    """Request für Goal-Berechnung."""
    vertical_id: str = Field(..., description="Vertical ID (network_marketing, real_estate, etc.)")
    goal_kind: str = Field(..., description="Art des Ziels (income, rank, deals, etc.)")
    target_value: float = Field(..., gt=0, description="Zielwert")
    timeframe_months: int = Field(..., ge=1, le=60, description="Zeitraum in Monaten")
    current_value: float = Field(default=0, ge=0, description="Aktueller Wert")
    vertical_meta: dict[str, Any] = Field(default_factory=dict, description="Vertical-spezifische Daten")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vertical_id": "network_marketing",
                    "goal_kind": "income",
                    "target_value": 2000,
                    "timeframe_months": 6,
                    "vertical_meta": {"comp_plan_id": "zinzino"}
                },
                {
                    "vertical_id": "real_estate",
                    "goal_kind": "income",
                    "target_value": 5000,
                    "timeframe_months": 12,
                    "vertical_meta": {"avg_commission": 8000}
                }
            ]
        }
    }


class GoalBreakdownResponse(BaseModel):
    """Response für Goal-Breakdown."""
    vertical_id: str
    goal_kind: str
    timeframe_months: int
    primary_units: float
    secondary_units: float
    required_volume: float
    per_month_volume: float
    per_week_volume: float
    per_day_volume: float
    vertical_details: dict[str, Any]
    notes: str


class DailyTargetsRequest(BaseModel):
    """Request für Daily Targets Berechnung."""
    breakdown: GoalBreakdownResponse
    config: Optional[dict] = None


class DailyTargetsResponse(BaseModel):
    """Response für Daily/Weekly Targets."""
    daily: dict[str, int]
    weekly: dict[str, Any]


class VerticalInfoResponse(BaseModel):
    """Info über ein Vertical."""
    id: str
    label: str


class KpiDefinitionResponse(BaseModel):
    """KPI Definition."""
    id: str
    label: str
    description: str
    unit: str
    icon: str
    color: str


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/goals", tags=["Goals"])


def get_service() -> GoalCalculationService:
    """Dependency für GoalCalculationService."""
    return get_goal_service()


@router.post("/calculate", response_model=GoalBreakdownResponse)
async def calculate_goal(
    request: GoalCalculateRequest,
    service: GoalCalculationService = Depends(get_service),
):
    """
    Berechnet den Goal-Breakdown.
    
    Nimmt ein Ziel (Income, Rank, Deals, etc.) und berechnet:
    - Benötigte Einheiten (Kunden, Partner, Deals, etc.)
    - Volumen pro Tag/Woche/Monat
    - Vertical-spezifische Details
    """
    try:
        # Konvertiere zu internem GoalInput
        from ..domain.goals.types import GoalInput, VerticalId, GoalKind
        
        goal_input = GoalInput(
            vertical_id=VerticalId(request.vertical_id),
            goal_kind=GoalKind(request.goal_kind),
            target_value=request.target_value,
            timeframe_months=request.timeframe_months,
            current_value=request.current_value,
            vertical_meta=request.vertical_meta,
        )
        
        breakdown = service.calculate_goal(goal_input)
        
        return GoalBreakdownResponse(
            vertical_id=breakdown.vertical_id.value if hasattr(breakdown.vertical_id, 'value') else breakdown.vertical_id,
            goal_kind=breakdown.goal_kind.value if hasattr(breakdown.goal_kind, 'value') else breakdown.goal_kind,
            timeframe_months=breakdown.timeframe_months,
            primary_units=breakdown.primary_units,
            secondary_units=breakdown.secondary_units,
            required_volume=breakdown.required_volume,
            per_month_volume=breakdown.per_month_volume,
            per_week_volume=breakdown.per_week_volume,
            per_day_volume=breakdown.per_day_volume,
            vertical_details=breakdown.vertical_details,
            notes=breakdown.notes,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Berechnung fehlgeschlagen: {str(e)}")


@router.post("/daily-targets", response_model=DailyTargetsResponse)
async def calculate_daily_targets(
    request: DailyTargetsRequest,
    service: GoalCalculationService = Depends(get_service),
):
    """
    Berechnet tägliche und wöchentliche Aktivitäts-Targets.
    
    Basierend auf einem Goal-Breakdown werden konkrete Targets berechnet:
    - Neue Kontakte pro Tag
    - Follow-ups pro Tag
    - Reaktivierungen pro Tag
    - Wöchentliche Ziele
    """
    try:
        from ..domain.goals.types import GoalBreakdown, VerticalId, GoalKind, DailyFlowConfig
        
        breakdown = GoalBreakdown(
            vertical_id=VerticalId(request.breakdown.vertical_id),
            goal_kind=GoalKind(request.breakdown.goal_kind),
            timeframe_months=request.breakdown.timeframe_months,
            primary_units=request.breakdown.primary_units,
            secondary_units=request.breakdown.secondary_units,
            required_volume=request.breakdown.required_volume,
            per_month_volume=request.breakdown.per_month_volume,
            per_week_volume=request.breakdown.per_week_volume,
            per_day_volume=request.breakdown.per_day_volume,
            vertical_details=request.breakdown.vertical_details,
            notes=request.breakdown.notes,
        )
        
        config = None
        if request.config:
            config = DailyFlowConfig(**request.config)
        
        targets = service.calculate_daily_targets(breakdown, config)
        
        return DailyTargetsResponse(
            daily=targets["daily"],
            weekly=targets["weekly"],
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Berechnung fehlgeschlagen: {str(e)}")


@router.get("/verticals", response_model=list[VerticalInfoResponse])
async def list_verticals(
    service: GoalCalculationService = Depends(get_service),
):
    """
    Liste aller verfügbaren Verticals.
    
    Gibt die IDs und Labels aller registrierten Vertical-Adapter zurück.
    """
    verticals = []
    for vertical_id in service.get_available_verticals():
        adapter = service.get_adapter(vertical_id)
        if adapter:
            verticals.append(VerticalInfoResponse(
                id=vertical_id,
                label=adapter.get_label(),
            ))
    return verticals


@router.get("/kpis/{vertical_id}", response_model=list[KpiDefinitionResponse])
async def get_kpis(
    vertical_id: str,
    service: GoalCalculationService = Depends(get_service),
):
    """
    KPI-Definitionen für ein Vertical.
    
    Gibt die relevanten KPIs für die Dashboard-Anzeige zurück.
    """
    kpis = service.get_kpi_definitions(vertical_id)
    
    if not kpis:
        raise HTTPException(status_code=404, detail=f"Vertical '{vertical_id}' nicht gefunden")
    
    return [
        KpiDefinitionResponse(
            id=kpi.id,
            label=kpi.label,
            description=kpi.description,
            unit=kpi.unit,
            icon=kpi.icon,
            color=kpi.color,
        )
        for kpi in kpis
    ]


@router.get("/conversion-config/{vertical_id}")
async def get_conversion_config(
    vertical_id: str,
    service: GoalCalculationService = Depends(get_service),
):
    """
    Default Conversion-Config für ein Vertical.
    
    Gibt die Standard-Konversionsraten für Daily Flow Berechnungen zurück.
    """
    config = service.get_conversion_config(vertical_id)
    
    if not config:
        raise HTTPException(status_code=404, detail=f"Vertical '{vertical_id}' nicht gefunden")
    
    return {
        "working_days_per_week": config.working_days_per_week,
        "contact_to_primary_unit": config.contact_to_primary_unit,
        "contact_to_secondary_unit": config.contact_to_secondary_unit,
        "followups_per_primary": config.followups_per_primary,
        "followups_per_secondary": config.followups_per_secondary,
        "reactivation_share": config.reactivation_share,
    }

