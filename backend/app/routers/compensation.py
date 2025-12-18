"""
Compensation Plan API Router für SalesFlow AI.

Provisionsberechnung für Network Marketing:
- Herbalife (Breakaway)
- PM-International (Unilevel)
- LR Health & Beauty (Unilevel)
- doTERRA (Unilevel + Fast Start)
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Any, Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from decimal import Decimal
from pydantic import BaseModel, Field

from app.services.compensation_plans import (
    CompensationPlanFactory,
    TeamMember,
    CommissionStatement,
    CommissionType,
)

router = APIRouter(prefix="/compensation", tags=["compensation"])


# ============= Request/Response Models =============

class TeamMemberInput(BaseModel):
    """Input für ein Team-Mitglied."""
    id: str
    name: str
    rank: str
    personal_volume: float
    group_volume: float = 0.0
    is_active: bool = True
    joined_date: Optional[datetime] = None
    sponsor_id: Optional[str] = None


class CalculateCommissionRequest(BaseModel):
    """Request für Provisionsberechnung."""
    company_id: str
    user: TeamMemberInput
    team: list[TeamMemberInput] = Field(default_factory=list)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class CommissionResponse(BaseModel):
    """Response für berechnete Provisionen."""
    user_id: str
    company_id: str
    rank: str
    period_start: datetime
    period_end: datetime
    personal_volume: float
    group_volume: float
    total_volume: float
    total_earnings: float
    commissions: list[dict]
    summary: dict


class RankRequirementResponse(BaseModel):
    """Response für Rang-Anforderungen."""
    rank_name: str
    personal_volume_min: float
    group_volume_min: float
    qualified_legs_min: int
    rank_legs: dict[str, int]


class RankProgressResponse(BaseModel):
    """Response für Rang-Fortschritt."""
    current_rank: str
    next_rank: Optional[str]
    progress_percent: float
    requirements_met: dict[str, bool]
    remaining: dict[str, float]


# ============= Endpoints =============

@router.get("/plans")
async def list_compensation_plans():
    """
    Listet alle unterstützten Vergütungspläne auf.
    """
    plans = CompensationPlanFactory.list_supported()
    
    plan_details = []
    for plan_id in plans:
        plan = CompensationPlanFactory.get_plan(plan_id)
        plan_details.append({
            "id": plan_id,
            "name": plan_id.replace("_", " ").title(),
            "type": "breakaway" if "herbalife" in plan_id else "unilevel",
            "ranks": plan.ranks,
            "total_ranks": len(plan.ranks)
        })
    
    return {
        "plans": plan_details,
        "total": len(plans)
    }


@router.get("/plans/{company_id}")
async def get_compensation_plan_details(company_id: str):
    """
    Holt Details zu einem spezifischen Vergütungsplan.
    """
    try:
        plan = CompensationPlanFactory.get_plan(company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{company_id}' nicht gefunden")
    
    return {
        "company_id": company_id,
        "ranks": plan.ranks,
        "rank_requirements": {
            rank: req.model_dump() if hasattr(req, 'model_dump') else str(req)
            for rank, req in plan.rank_requirements.items()
        },
        "commission_info": _get_plan_commission_info(company_id, plan)
    }


@router.get("/plans/{company_id}/ranks")
async def get_rank_requirements(company_id: str):
    """
    Holt alle Rang-Anforderungen für einen Plan.
    """
    try:
        plan = CompensationPlanFactory.get_plan(company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{company_id}' nicht gefunden")
    
    ranks_info = []
    for rank in plan.ranks:
        req = plan.rank_requirements.get(rank)
        if req:
            ranks_info.append({
                "rank": rank,
                "requirements": req.model_dump()
            })
        else:
            ranks_info.append({
                "rank": rank,
                "requirements": {"note": "Einstiegsrang oder keine spezifischen Anforderungen"}
            })
    
    return {
        "company_id": company_id,
        "ranks": ranks_info
    }


@router.post("/calculate", response_model=CommissionResponse)
async def calculate_commissions(request: CalculateCommissionRequest):
    """
    Berechnet die Provisionen für einen User basierend auf seinem Team.
    
    Beispiel:
    ```json
    {
        "company_id": "herbalife",
        "user": {
            "id": "user-123",
            "name": "Max Mustermann",
            "rank": "Supervisor",
            "personal_volume": 500.0,
            "group_volume": 3500.0
        },
        "team": [
            {
                "id": "team-1",
                "name": "Anna Schmidt",
                "rank": "Distributor",
                "personal_volume": 200.0,
                "sponsor_id": "user-123"
            }
        ]
    }
    ```
    """
    try:
        plan = CompensationPlanFactory.get_plan(request.company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{request.company_id}' nicht gefunden")
    
    # Zeitraum bestimmen (Standard: aktueller Monat)
    now = datetime.utcnow()
    period_start = request.period_start or datetime(now.year, now.month, 1)
    period_end = request.period_end or now
    
    # User konvertieren
    user = _convert_to_team_member(request.user)
    
    # Team konvertieren
    team = [_convert_to_team_member(m) for m in request.team]
    
    # Provisionen berechnen
    statement = plan.calculate_commissions(user, team, period_start, period_end)
    
    # Response erstellen
    commissions_list = []
    for comm in statement.commissions:
        commissions_list.append({
            "type": comm.type.value,
            "amount": float(comm.amount),
            "description": comm.description,
            "volume": float(comm.volume) if comm.volume else None,
            "rate": float(comm.rate) if comm.rate else None,
            "level": comm.level,
            "source_member": comm.source_member_name
        })
    
    # Summary erstellen
    summary = _create_commission_summary(commissions_list)
    
    return CommissionResponse(
        user_id=request.user.id,
        company_id=request.company_id,
        rank=statement.rank,
        period_start=period_start,
        period_end=period_end,
        personal_volume=float(statement.personal_volume),
        group_volume=float(statement.group_volume),
        total_volume=float(statement.total_volume),
        total_earnings=float(statement.total_earnings),
        commissions=commissions_list,
        summary=summary
    )


@router.post("/rank/determine")
async def determine_rank(request: CalculateCommissionRequest):
    """
    Bestimmt den aktuellen Rang eines Users basierend auf Qualifikationen.
    """
    try:
        plan = CompensationPlanFactory.get_plan(request.company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{request.company_id}' nicht gefunden")
    
    user = _convert_to_team_member(request.user)
    team = [_convert_to_team_member(m) for m in request.team]
    
    determined_rank = plan.determine_rank(user, team)
    
    return {
        "company_id": request.company_id,
        "user_id": request.user.id,
        "current_rank": request.user.rank,
        "qualified_rank": determined_rank,
        "rank_changed": request.user.rank != determined_rank
    }


@router.post("/rank/progress", response_model=RankProgressResponse)
async def get_rank_progress(request: CalculateCommissionRequest):
    """
    Zeigt den Fortschritt zum nächsten Rang.
    """
    try:
        plan = CompensationPlanFactory.get_plan(request.company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{request.company_id}' nicht gefunden")
    
    user = _convert_to_team_member(request.user)
    team = [_convert_to_team_member(m) for m in request.team]
    
    # Aktueller Rang Index
    current_rank = request.user.rank
    rank_index = plan.ranks.index(current_rank) if current_rank in plan.ranks else 0
    
    # Nächster Rang
    next_rank = plan.ranks[rank_index + 1] if rank_index + 1 < len(plan.ranks) else None
    
    # Anforderungen prüfen
    requirements_met = {}
    remaining = {}
    progress = 100.0
    
    if next_rank and next_rank in plan.rank_requirements:
        req = plan.rank_requirements[next_rank]
        
        # Personal Volume
        pv_met = float(user.personal_volume) >= float(req.personal_volume_min)
        requirements_met["personal_volume"] = pv_met
        remaining["personal_volume"] = max(0, float(req.personal_volume_min) - float(user.personal_volume))
        
        # Group Volume
        total_group = float(user.group_volume) + float(user.personal_volume)
        gv_met = total_group >= float(req.group_volume_min)
        requirements_met["group_volume"] = gv_met
        remaining["group_volume"] = max(0, float(req.group_volume_min) - total_group)
        
        # Qualified Legs
        qualified_legs = plan.count_qualified_legs(user.id, team, Decimal("500"))
        legs_met = qualified_legs >= req.qualified_legs_min
        requirements_met["qualified_legs"] = legs_met
        remaining["qualified_legs"] = max(0, req.qualified_legs_min - qualified_legs)
        
        # Progress berechnen
        met_count = sum(1 for v in requirements_met.values() if v)
        progress = (met_count / len(requirements_met)) * 100 if requirements_met else 100.0
    
    return RankProgressResponse(
        current_rank=current_rank,
        next_rank=next_rank,
        progress_percent=progress,
        requirements_met=requirements_met,
        remaining=remaining
    )


@router.get("/estimate/{company_id}")
async def estimate_earnings(
    company_id: str,
    rank: str = Query(..., description="Aktueller Rang"),
    personal_volume: float = Query(100, description="Persönliches Volumen"),
    team_volume: float = Query(0, description="Team Volumen"),
    team_size: int = Query(0, description="Team Größe")
):
    """
    Schätzt potenzielle Einnahmen basierend auf Volumen.
    
    Nützlich für "Was wäre wenn" Szenarien.
    """
    try:
        plan = CompensationPlanFactory.get_plan(company_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Plan '{company_id}' nicht gefunden")
    
    # Simplified estimation
    estimates = {
        "retail_profit": personal_volume * 0.25,  # ~25% Retail
        "team_commission": team_volume * 0.05 if team_volume > 0 else 0,  # ~5% Team
        "bonuses": 0
    }
    
    # Rank-based bonus estimates
    rank_index = plan.ranks.index(rank) if rank in plan.ranks else 0
    if rank_index >= 4:  # Higher ranks
        estimates["bonuses"] = team_volume * 0.02
    
    total_estimate = sum(estimates.values())
    
    return {
        "company_id": company_id,
        "rank": rank,
        "input": {
            "personal_volume": personal_volume,
            "team_volume": team_volume,
            "team_size": team_size
        },
        "estimates": estimates,
        "total_estimated_earnings": round(total_estimate, 2),
        "note": "Dies ist eine Schätzung. Tatsächliche Einnahmen können variieren."
    }


# ============= Helper Functions =============

def _convert_to_team_member(input: TeamMemberInput) -> TeamMember:
    """Konvertiert Input zu TeamMember."""
    return TeamMember(
        id=UUID(input.id) if len(input.id) == 36 else uuid4(),
        name=input.name,
        rank=input.rank,
        personal_volume=Decimal(str(input.personal_volume)),
        group_volume=Decimal(str(input.group_volume)),
        level=0,
        is_active=input.is_active,
        joined_date=input.joined_date,
        sponsor_id=UUID(input.sponsor_id) if input.sponsor_id and len(input.sponsor_id) == 36 else None
    )


def _get_plan_commission_info(company_id: str, plan) -> dict:
    """Holt Commission-Informationen für einen Plan."""
    if company_id == "herbalife":
        return {
            "retail_profit": "25-50% je nach Rang",
            "wholesale_commission": "Differenz zwischen Rabattstufen",
            "royalty_override": "5% pro Ebene (bis zu 6 Ebenen)",
            "production_bonus": "1-2% ab 5000 Volumen"
        }
    elif company_id == "pm_international":
        return {
            "direct_bonus": "25% auf persönliche Verkäufe",
            "unilevel": "6%-6%-6%-4%-4%-2%-2% (7 Generationen)",
            "leadership_bonus": "5% Matching für Directors+"
        }
    elif company_id == "doterra":
        return {
            "retail_profit": "25%",
            "fast_start": "20%-10%-5% (erste 60 Tage)",
            "unilevel": "2-3% (je nach Rang)",
            "power_of_3": "$50-$1500 Bonus"
        }
    elif company_id == "lr_health":
        return {
            "personal_bonus": "21%",
            "generation_bonus": "21%-7%-5%-3%-2%-2% (6 Gen)",
            "car_bonus": "$500/Monat ab 50.000 Volumen"
        }
    return {}


def _create_commission_summary(commissions: list[dict]) -> dict:
    """Erstellt eine Zusammenfassung der Provisionen."""
    summary = {
        "by_type": {},
        "total_retail": 0,
        "total_team": 0,
        "total_bonuses": 0
    }
    
    for comm in commissions:
        comm_type = comm["type"]
        amount = comm["amount"]
        
        if comm_type not in summary["by_type"]:
            summary["by_type"][comm_type] = 0
        summary["by_type"][comm_type] += amount
        
        if comm_type in ["retail_profit"]:
            summary["total_retail"] += amount
        elif comm_type in ["wholesale_commission", "unilevel", "royalty_override"]:
            summary["total_team"] += amount
        else:
            summary["total_bonuses"] += amount
    
    return summary

