# backend/app/api/routes/sales_brain.py
"""
╔════════════════════════════════════════════════════════════════════════════╗
║  🧠 SALES BRAIN ROUTER                                                      ║
║  API Endpoints für Teach-UI & Rule Learning                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /sales-brain/rules           → Neue Regel erstellen
- GET  /sales-brain/rules           → Regeln abrufen
- GET  /sales-brain/rules/{id}      → Einzelne Regel
- PATCH /sales-brain/rules/{id}     → Regel aktualisieren
- DELETE /sales-brain/rules/{id}    → Regel löschen
- POST /sales-brain/rules/match     → Passende Regeln finden
- POST /sales-brain/rules/{id}/feedback → Feedback zu Regel
- GET  /sales-brain/stats           → Statistiken
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client
from typing import Optional

from ..schemas.sales_brain import (
    CreateRuleRequest,
    CreateRuleResponse,
    UpdateRuleRequest,
    MatchRulesRequest,
    RuleFeedbackRequest,
    SalesBrainRuleResponse,
    GetRulesResponse,
    SalesBrainStatsResponse,
)
from ...services.sales_brain import SalesBrainService, get_sales_brain_service
from ...db.deps import get_db, get_current_user, CurrentUser


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(
    prefix="/sales-brain",
    tags=["sales-brain"],
)


# =============================================================================
# CREATE RULE
# =============================================================================

@router.post("/rules", response_model=CreateRuleResponse)
async def create_rule(
    request: CreateRuleRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    🧠 Erstellt eine neue Regel aus einem Override.
    
    Wird vom Teach-UI aufgerufen wenn der User "Nur für mich"
    oder "Für mein Team" auswählt.
    """
    service = get_sales_brain_service(db)
    
    result = service.create_rule(
        user_id=current_user.id,
        team_id=getattr(current_user, "team_id", None),
        scope=request.scope.value,
        override=request.override.model_dump(),
        note=request.note,
        auto_tag=request.auto_tag,
    )
    
    return CreateRuleResponse(**result)


# =============================================================================
# GET RULES
# =============================================================================

@router.get("/rules", response_model=GetRulesResponse)
async def get_rules(
    scope: Optional[str] = Query(None, pattern="^(user|team)$"),
    channel: Optional[str] = None,
    use_case: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Regeln für den aktuellen User/Team.
    """
    service = get_sales_brain_service(db)
    
    result = service.get_rules(
        user_id=current_user.id,
        team_id=getattr(current_user, "team_id", None),
        scope=scope,
        channel=channel,
        use_case=use_case,
        page=page,
        page_size=page_size,
    )
    
    return GetRulesResponse(
        rules=[SalesBrainRuleResponse(**r) for r in result["rules"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get("/rules/{rule_id}", response_model=SalesBrainRuleResponse)
async def get_rule(
    rule_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt eine einzelne Regel.
    """
    service = get_sales_brain_service(db)
    
    rule = service.get_rule(rule_id, current_user.id)
    
    if not rule:
        raise HTTPException(status_code=404, detail="Regel nicht gefunden")
    
    return SalesBrainRuleResponse(**rule)


# =============================================================================
# UPDATE RULE
# =============================================================================

@router.patch("/rules/{rule_id}", response_model=SalesBrainRuleResponse)
async def update_rule(
    rule_id: str,
    request: UpdateRuleRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Aktualisiert eine Regel.
    """
    service = get_sales_brain_service(db)
    
    updated = service.update_rule(
        rule_id=rule_id,
        user_id=current_user.id,
        updates=request.model_dump(exclude_unset=True),
    )
    
    return SalesBrainRuleResponse(**updated)


# =============================================================================
# DELETE RULE
# =============================================================================

@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Löscht eine Regel.
    """
    service = get_sales_brain_service(db)
    
    service.delete_rule(rule_id, current_user.id)
    
    return {"success": True}


# =============================================================================
# MATCH RULES
# =============================================================================

@router.post("/rules/match")
async def match_rules(
    request: MatchRulesRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Findet passende Regeln für einen Kontext.
    
    Wird von CHIEF verwendet um User-Regeln zu berücksichtigen.
    """
    service = get_sales_brain_service(db)
    
    rules = service.match_rules(
        user_id=current_user.id,
        team_id=getattr(current_user, "team_id", None),
        channel=request.channel,
        use_case=request.use_case,
        lead_status=request.lead_status,
        deal_state=request.deal_state,
        input_text=request.input_text,
        limit=request.limit,
    )
    
    return [SalesBrainRuleResponse(**r) for r in rules]


# =============================================================================
# FEEDBACK
# =============================================================================

@router.post("/rules/{rule_id}/feedback")
async def submit_feedback(
    rule_id: str,
    request: RuleFeedbackRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Gibt Feedback zu einer angewendeten Regel.
    """
    service = get_sales_brain_service(db)
    
    service.submit_feedback(
        rule_id=rule_id,
        user_id=current_user.id,
        accepted=request.accepted,
        modified=request.modified or False,
        final_text=request.final_text,
    )
    
    return {"success": True}


# =============================================================================
# STATS
# =============================================================================

@router.get("/stats", response_model=SalesBrainStatsResponse)
async def get_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Holt Sales Brain Statistiken.
    """
    service = get_sales_brain_service(db)
    
    stats = service.get_stats(
        user_id=current_user.id,
        team_id=getattr(current_user, "team_id", None),
    )
    
    return SalesBrainStatsResponse(
        total_rules=stats["total_rules"],
        user_rules=stats["user_rules"],
        team_rules=stats["team_rules"],
        applied_this_week=stats["applied_this_week"],
        top_use_cases=stats["top_use_cases"],
    )

