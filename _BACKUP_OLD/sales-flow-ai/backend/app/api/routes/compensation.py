"""
╔════════════════════════════════════════════════════════════════════════════╗
║  COMPENSATION API ROUTES                                                   ║
║  Endpoints für Compensation Plans & Firmen                                 ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

from app.api.schemas.compensation import (
    CompanyListResponse,
    CompanyInfo,
    CompensationPlanResponse,
    RankListResponse,
    RankInfo,
    FindRankRequest,
    FindRankResponse,
)
from app.domain.compensation import (
    get_all_plans,
    get_plan_by_id,
    get_available_companies,
    find_rank_for_income,
)

router = APIRouter()


@router.get("/companies", response_model=CompanyListResponse)
async def list_companies(region: str = "DE"):
    """
    Liste aller verfügbaren MLM-Firmen.
    
    Gibt zurück:
    - ID, Name, Logo für jede Firma
    - Gefiltert nach Region
    
    Beispiel Response:
    ```json
    {
        "companies": [
            {"id": "zinzino", "name": "Zinzino", "logo": "🧬", "region": "DE"},
            {"id": "pm-international", "name": "PM-International", "logo": "💪", "region": "DE"}
        ],
        "count": 2
    }
    ```
    """
    companies = get_available_companies()
    
    # Filter by region if specified
    if region:
        companies = [c for c in companies if c["region"] == region]
    
    return CompanyListResponse(
        companies=[CompanyInfo(**c) for c in companies],
        count=len(companies),
    )


@router.get("/plans/{company_id}", response_model=CompensationPlanResponse)
async def get_compensation_plan(company_id: str, region: str = "DE"):
    """
    Hole den vollständigen Compensation Plan einer Firma.
    
    Gibt zurück:
    - Alle Ränge mit Requirements und Einkommensschätzungen
    - Durchschnittswerte für Kunden/Partner-Volumen
    - Disclaimer
    
    Path Parameter:
    - company_id: z.B. "zinzino", "pm-international", "lr-health"
    """
    plan = get_plan_by_id(company_id, region)
    
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Compensation plan not found: {company_id} ({region})"
        )
    
    # Transform ranks for response
    ranks = [
        RankInfo(
            id=r.id,
            name=r.name,
            order=r.order,
            min_group_volume=r.requirements.min_group_volume,
            avg_monthly_income=r.earning_estimate.avg_monthly_income if r.earning_estimate else None,
            income_range=r.earning_estimate.range if r.earning_estimate else None,
        )
        for r in plan.ranks
    ]
    
    return CompensationPlanResponse(
        company_id=plan.company_id,
        company_name=plan.company_name,
        company_logo=plan.company_logo,
        region=plan.region.value,
        plan_type=plan.plan_type.value,
        unit_label=plan.unit_label,
        unit_code=plan.unit_code.value,
        currency=plan.currency,
        avg_volume_per_customer=plan.avg_personal_volume_per_customer,
        avg_volume_per_partner=plan.avg_personal_volume_per_partner,
        ranks=ranks,
        version=plan.version,
        disclaimer=plan.disclaimer,
    )


@router.get("/plans/{company_id}/ranks", response_model=RankListResponse)
async def get_ranks(company_id: str, region: str = "DE"):
    """
    Hole nur die Ränge einer Firma.
    
    Nützlich für Rang-Auswahl im UI.
    """
    plan = get_plan_by_id(company_id, region)
    
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Company not found: {company_id}"
        )
    
    ranks = [
        RankInfo(
            id=r.id,
            name=r.name,
            order=r.order,
            min_group_volume=r.requirements.min_group_volume,
            avg_monthly_income=r.earning_estimate.avg_monthly_income if r.earning_estimate else None,
            income_range=r.earning_estimate.range if r.earning_estimate else None,
        )
        for r in plan.ranks
        if r.earning_estimate and r.earning_estimate.avg_monthly_income > 0
    ]
    
    return RankListResponse(
        company_id=plan.company_id,
        company_name=plan.company_name,
        ranks=ranks,
        count=len(ranks),
    )


@router.post("/find-rank", response_model=FindRankResponse)
async def find_rank_by_income(request: FindRankRequest):
    """
    Finde den passenden Rang für ein Ziel-Einkommen.
    
    Beispiel:
    ```json
    {
        "company_id": "zinzino",
        "target_income": 2000
    }
    ```
    
    Gibt den ersten Rang zurück, der das Ziel-Einkommen erreicht.
    """
    rank = find_rank_for_income(
        request.company_id,
        request.target_income,
        request.region,
    )
    
    if not rank:
        return FindRankResponse(
            found=False,
            message=f"No rank found for income {request.target_income}€ at {request.company_id}",
        )
    
    return FindRankResponse(
        found=True,
        rank=RankInfo(
            id=rank.id,
            name=rank.name,
            order=rank.order,
            min_group_volume=rank.requirements.min_group_volume,
            avg_monthly_income=rank.earning_estimate.avg_monthly_income if rank.earning_estimate else None,
            income_range=rank.earning_estimate.range if rank.earning_estimate else None,
        ),
        message=f"Rank '{rank.name}' matches target income of {request.target_income}€",
    )

