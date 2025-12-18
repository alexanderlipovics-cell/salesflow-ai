"""
Analytics Router für Sales Flow AI.

Endpoints:
- P-Score Recalculation
- Hot Leads
- Next Best Action Batch

WICHTIG:
- P-Score Engine nutzt heuristischen Ansatz (V1)
- NBA kombiniert P-Score mit Event-Analyse
"""

from __future__ import annotations

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field

from app.supabase_client import get_supabase_client, SupabaseNotConfiguredError
from app.services.predictive_scoring import (
    recalc_p_scores_for_user,
    get_hot_leads,
    calculate_p_score_for_lead,
)
from app.services.next_best_action import (
    compute_next_best_action_for_lead,
    get_nba_batch_for_user,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

# DEV User ID für Tests wenn kein Header gesetzt
DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001"


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================


class PScoreRecalcRequest(BaseModel):
    """Request für P-Score Neuberechnung"""
    limit: int = Field(default=100, ge=1, le=500)


class PScoreRecalcResponse(BaseModel):
    """Response für P-Score Neuberechnung"""
    success: bool = True
    summary: dict


class SinglePScoreRequest(BaseModel):
    """Request für einzelne P-Score Berechnung"""
    lead_id: str


class SinglePScoreResponse(BaseModel):
    """Response für einzelne P-Score Berechnung"""
    success: bool = True
    lead_id: str
    p_score: float
    trend: str
    factors: dict


class HotLeadsResponse(BaseModel):
    """Response für Hot Leads"""
    success: bool = True
    leads: List[dict]
    count: int


class NBARequest(BaseModel):
    """Request für Next Best Action"""
    lead_id: Optional[str] = None
    contact_id: Optional[str] = None


class NBAResponse(BaseModel):
    """Response für Next Best Action"""
    success: bool = True
    action_key: str
    reason: str
    suggested_channel: str
    priority: int
    meta: dict = Field(default_factory=dict)


class NBABatchResponse(BaseModel):
    """Response für NBA Batch"""
    success: bool = True
    recommendations: List[dict]
    count: int


# ============================================================================
# P-SCORE ENDPOINTS
# ============================================================================


@router.post("/p-scores/recalc", response_model=PScoreRecalcResponse)
async def recalc_p_scores_endpoint(
    request: PScoreRecalcRequest = None,
    limit: int = Query(default=100, ge=1, le=500),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Berechnet P-Scores für die Leads des aktuellen Users neu.
    
    - **limit**: Max. Anzahl Leads (default: 100, max: 500)
    
    Returns:
        Summary mit Statistiken (total, scored, avg_score, distribution)
    """
    user_id = x_user_id or DEV_USER_ID
    
    # Limit aus Request Body oder Query Parameter
    actual_limit = limit
    if request:
        actual_limit = request.limit
    
    logger.info(f"P-Score recalc requested: user={user_id}, limit={actual_limit}")
    
    try:
        db = get_supabase_client()
        
        summary = await recalc_p_scores_for_user(
            db=db,
            user_id=user_id,
            limit=actual_limit,
        )
        
        return PScoreRecalcResponse(
            success=True,
            summary=summary,
        )
        
    except SupabaseNotConfiguredError:
        logger.error("Supabase not configured")
        raise HTTPException(
            status_code=503,
            detail="Datenbank nicht konfiguriert"
        )
    except Exception as e:
        logger.exception(f"P-Score recalc error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei P-Score Berechnung: {str(e)}"
        )


@router.post("/p-scores/calculate", response_model=SinglePScoreResponse)
async def calculate_single_p_score(
    request: SinglePScoreRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Berechnet den P-Score für einen einzelnen Lead.
    
    - **lead_id**: UUID des Leads
    
    Returns:
        P-Score, Trend und Faktoren-Aufschlüsselung
    """
    user_id = x_user_id or DEV_USER_ID
    
    logger.info(f"Single P-Score calculation: lead={request.lead_id}")
    
    try:
        db = get_supabase_client()
        
        score, trend, factors = await calculate_p_score_for_lead(
            db=db,
            lead_id=request.lead_id,
            user_id=user_id,
        )
        
        # Score in DB speichern
        now = datetime.utcnow().isoformat()
        db.table("leads").update({
            "p_score": score,
            "p_score_trend": trend,
            "last_scored_at": now,
        }).eq("id", request.lead_id).execute()
        
        return SinglePScoreResponse(
            success=True,
            lead_id=request.lead_id,
            p_score=score,
            trend=trend,
            factors=factors,
        )
        
    except Exception as e:
        logger.exception(f"Single P-Score error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei P-Score Berechnung: {str(e)}"
        )


@router.get("/hot-leads", response_model=HotLeadsResponse)
async def get_hot_leads_endpoint(
    min_score: float = Query(default=75, ge=0, le=100),
    limit: int = Query(default=20, ge=1, le=100),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Gibt die heißesten Leads basierend auf P-Score zurück.
    
    - **min_score**: Minimum P-Score (default: 75)
    - **limit**: Max. Anzahl (default: 20)
    """
    user_id = x_user_id or DEV_USER_ID
    
    logger.info(f"Hot leads request: min_score={min_score}, limit={limit}")
    
    try:
        db = get_supabase_client()
        
        leads = await get_hot_leads(
            db=db,
            user_id=user_id,
            min_score=min_score,
            limit=limit,
        )
        
        return HotLeadsResponse(
            success=True,
            leads=leads,
            count=len(leads),
        )
        
    except Exception as e:
        logger.exception(f"Hot leads error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Abrufen der Hot Leads: {str(e)}"
        )


# ============================================================================
# NEXT BEST ACTION ENDPOINTS
# ============================================================================


@router.post("/nba", response_model=NBAResponse)
async def get_next_best_action(
    request: NBARequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Berechnet die Next Best Action für einen Lead/Contact.
    
    - **lead_id**: UUID des Leads (optional)
    - **contact_id**: UUID des Contacts (optional)
    
    Mindestens eine ID muss angegeben werden.
    
    Returns:
        - action_key: follow_up, call_script, offer_create, closing_helper, nurture, wait
        - reason: Begründung auf Deutsch
        - suggested_channel: Empfohlener Kanal
        - priority: 1-5 (5 = höchste)
    """
    user_id = x_user_id or DEV_USER_ID
    
    if not request.lead_id and not request.contact_id:
        raise HTTPException(
            status_code=400,
            detail="Entweder lead_id oder contact_id muss angegeben werden"
        )
    
    logger.info(f"NBA request: lead={request.lead_id}, contact={request.contact_id}")
    
    try:
        db = get_supabase_client()
        
        nba = await compute_next_best_action_for_lead(
            db=db,
            user_id=user_id,
            lead_id=request.lead_id,
            contact_id=request.contact_id,
        )
        
        return NBAResponse(
            success=True,
            action_key=nba["action_key"],
            reason=nba["reason"],
            suggested_channel=nba["suggested_channel"],
            priority=nba["priority"],
            meta=nba.get("meta", {}),
        )
        
    except Exception as e:
        logger.exception(f"NBA error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei NBA Berechnung: {str(e)}"
        )


@router.get("/nba/batch", response_model=NBABatchResponse)
async def get_nba_batch(
    limit: int = Query(default=10, ge=1, le=50),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Holt NBA Empfehlungen für die Top-Leads eines Users.
    
    - **limit**: Max. Anzahl Leads (default: 10)
    
    Returns:
        Liste von {lead, nba} Objekten, sortiert nach Priority
    """
    user_id = x_user_id or DEV_USER_ID
    
    logger.info(f"NBA batch request: user={user_id}, limit={limit}")
    
    try:
        db = get_supabase_client()
        
        recommendations = await get_nba_batch_for_user(
            db=db,
            user_id=user_id,
            limit=limit,
        )
        
        return NBABatchResponse(
            success=True,
            recommendations=recommendations,
            count=len(recommendations),
        )
        
    except Exception as e:
        logger.exception(f"NBA batch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Fehler bei NBA Batch: {str(e)}"
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def analytics_health():
    """Health-Check für den Analytics-Service."""
    return {
        "status": "ok",
        "service": "analytics",
        "features": {
            "p_score": True,
            "nba": True,
            "hot_leads": True,
        }
    }


__all__ = ["router"]

