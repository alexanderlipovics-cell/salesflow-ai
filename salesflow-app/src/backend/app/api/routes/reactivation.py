"""
Reactivation Agent API Routes

REST API Endpoints für Lead-Reaktivierung.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from ...core.security import get_current_user
from ...services.reactivation.orchestrator import ReactivationOrchestrator
from ..schemas.reactivation import (
    StartReactivationRequest,
    ReactivationRunResponse,
    DormantLeadResponse,
    BatchReactivationResponse,
)

router = APIRouter(prefix="/reactivation", tags=["Reactivation Agent"])
logger = logging.getLogger(__name__)


@router.get("/dormant-leads", response_model=List[DormantLeadResponse])
async def get_dormant_leads(
    min_days: int = 90,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Listet alle dormanten Leads für den aktuellen User.
    
    Dormant = Kein Kontakt seit X Tagen.
    """
    orchestrator = ReactivationOrchestrator()
    leads = await orchestrator.get_dormant_leads(
        user_id=current_user["id"],
        min_days=min_days,
        limit=limit
    )
    return leads


@router.post("/start", response_model=ReactivationRunResponse)
async def start_reactivation(
    request: StartReactivationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Startet den Reactivation Agent für einen Lead.
    """
    orchestrator = ReactivationOrchestrator()
    
    # Validierung
    lead = await orchestrator.validate_lead(
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nicht gefunden")
    
    # Run erstellen
    run_id = await orchestrator.create_run(
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    # Agent im Hintergrund starten
    background_tasks.add_task(
        orchestrator.execute_agent,
        run_id=run_id,
        lead_id=request.lead_id,
        user_id=current_user["id"]
    )
    
    return ReactivationRunResponse(
        run_id=run_id,
        status="started",
        message="Reactivation Agent gestartet"
    )


@router.get("/runs", response_model=List[ReactivationRunResponse])
async def get_runs(
    lead_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Listet Reactivation Runs.
    """
    orchestrator = ReactivationOrchestrator()
    
    query = orchestrator.supabase.from_("reactivation_runs")\
        .select("*")\
        .eq("user_id", current_user["id"])\
        .order("started_at", desc=True)\
        .limit(limit)
    
    if lead_id:
        query = query.eq("lead_id", lead_id)
    if status:
        query = query.eq("status", status)
    
    response = await query.execute()
    return response.data or []


@router.get("/runs/{run_id}")
async def get_run_details(
    run_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Holt Details zu einem spezifischen Run.
    """
    orchestrator = ReactivationOrchestrator()
    
    response = await orchestrator.supabase.from_("reactivation_runs")\
        .select("*")\
        .eq("id", run_id)\
        .eq("user_id", current_user["id"])\
        .single()\
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Run nicht gefunden")
    
    return response.data


@router.post("/batch", response_model=BatchReactivationResponse)
async def start_batch_reactivation(
    background_tasks: BackgroundTasks,
    min_days: int = 90,
    max_leads: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Startet Batch-Reactivation für alle dormanten Leads.
    
    ⚠️ Rate-Limited: Max 10 Leads pro Batch.
    """
    orchestrator = ReactivationOrchestrator()
    
    leads = await orchestrator.get_dormant_leads(
        user_id=current_user["id"],
        min_days=min_days,
        limit=max_leads
    )
    
    if not leads:
        return BatchReactivationResponse(
            batch_id=None,
            message="Keine dormanten Leads gefunden",
            count=0
        )
    
    # Batch starten
    import uuid
    batch_id = str(uuid.uuid4())
    
    for lead in leads:
        run_id = await orchestrator.create_run(
            lead_id=lead["id"],
            user_id=current_user["id"]
        )
        background_tasks.add_task(
            orchestrator.execute_agent,
            run_id=run_id,
            lead_id=lead["id"],
            user_id=current_user["id"]
        )
    
    return BatchReactivationResponse(
        batch_id=batch_id,
        message=f"Batch-Reactivation für {len(leads)} Leads gestartet",
        count=len(leads)
    )

