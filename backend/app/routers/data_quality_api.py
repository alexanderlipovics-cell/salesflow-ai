"""
═══════════════════════════════════════════════════════════════════════════
DATA QUALITY API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════
RESTful API für Data Quality & Duplicate Detection
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/data-quality", tags=["Data Quality"])


# ─────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────

class MergeRequest(BaseModel):
    keep_lead_id: str
    merge_lead_id: str
    merged_by: str


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.post("/detect-duplicates")
async def detect_duplicates(
    min_similarity: float = Query(0.8, ge=0.5, le=1.0)
):
    """
    Startet Dubletten-Erkennung für Leads.
    
    **Query Parameters:**
    - min_similarity: Minimale Ähnlichkeit für Fuzzy-Matching (0.5 - 1.0)
    
    **Returns:**
    - duplicates_found: Anzahl erkannter Dubletten
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('detect_duplicate_leads', {
        'p_min_similarity': min_similarity
    }).execute()
    
    duplicates_count = result.data if result.data is not None else 0
    
    return {
        "status": "completed",
        "duplicates_found": duplicates_count,
        "min_similarity": min_similarity
    }


@router.get("/duplicates")
async def get_duplicates(
    status: str = Query("pending", regex="^(pending|confirmed_duplicate|not_duplicate|merged|ignored)$"),
    confidence_level: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """
    Listet potenzielle Dubletten.
    
    **Query Parameters:**
    - status: Status-Filter (pending, confirmed_duplicate, etc.)
    - confidence_level: Optional - Confidence-Filter (low, medium, high, certain)
    - limit: Max Anzahl (default: 50)
    """
    supabase = get_supabase_client()
    
    query = supabase.table('potential_duplicates').select('*')
    
    query = query.eq('status', status)
    query = query.eq('entity_type', 'leads')
    
    if confidence_level:
        query = query.eq('confidence_level', confidence_level)
    
    query = query.order('similarity_score', desc=True)
    query = query.limit(limit)
    
    result = query.execute()
    
    return {
        "duplicates": result.data or [],
        "count": len(result.data) if result.data else 0,
        "filters": {
            "status": status,
            "confidence_level": confidence_level
        }
    }


@router.post("/duplicates/{duplicate_id}/confirm")
async def confirm_duplicate(
    duplicate_id: str,
    reviewed_by: str
):
    """
    Bestätigt dass zwei Leads Dubletten sind.
    
    **Path Parameters:**
    - duplicate_id: UUID des Duplicate-Records
    
    **Body:**
    - reviewed_by: User der die Bestätigung macht
    """
    supabase = get_supabase_client()
    
    result = supabase.table('potential_duplicates').update({
        'status': 'confirmed_duplicate',
        'reviewed_at': 'now()',
        'reviewed_by': reviewed_by
    }).eq('id', duplicate_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Duplicate nicht gefunden")
    
    return {
        "status": "confirmed",
        "duplicate_id": duplicate_id
    }


@router.post("/duplicates/{duplicate_id}/reject")
async def reject_duplicate(
    duplicate_id: str,
    reviewed_by: str
):
    """
    Verwirft Dubletten-Verdacht (keine Dublette).
    """
    supabase = get_supabase_client()
    
    result = supabase.table('potential_duplicates').update({
        'status': 'not_duplicate',
        'reviewed_at': 'now()',
        'reviewed_by': reviewed_by
    }).eq('id', duplicate_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Duplicate nicht gefunden")
    
    return {
        "status": "rejected",
        "duplicate_id": duplicate_id
    }


@router.post("/duplicates/merge")
async def merge_leads(request: MergeRequest):
    """
    Führt zwei Dubletten-Leads zusammen.
    
    **Body:**
    - keep_lead_id: UUID des Leads der behalten wird
    - merge_lead_id: UUID des Leads der gemerged wird (gelöscht)
    - merged_by: User der den Merge durchführt
    
    **Returns:**
    - Merge-Details (aktivitäten verschoben, etc.)
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('merge_leads', {
        'p_keep_lead_id': request.keep_lead_id,
        'p_merge_lead_id': request.merge_lead_id,
        'p_merged_by': request.merged_by
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Merge fehlgeschlagen")
    
    return result.data


@router.get("/lead-quality/{lead_id}")
async def get_lead_quality_score(lead_id: str):
    """
    Liefert Quality Score für einen Lead.
    
    **Path Parameters:**
    - lead_id: UUID des Leads
    
    **Returns:**
    - completeness_score: Vollständigkeits-Score (0-100)
    - data_quality_score: Datenqualitäts-Score
    - missing_fields: Liste fehlender Felder
    """
    supabase = get_supabase_client()
    
    # Calculate fresh score
    result = supabase.rpc('calculate_lead_completeness', {
        'p_lead_id': lead_id
    }).execute()
    
    completeness = result.data if result.data is not None else 0
    
    # Get full score record
    scores = supabase.table('lead_quality_scores').select('*').eq(
        'lead_id', lead_id
    ).execute()
    
    if scores.data:
        return scores.data[0]
    else:
        return {
            "lead_id": lead_id,
            "completeness_score": completeness,
            "missing_fields": []
        }


@router.post("/lead-quality/{lead_id}/recalculate")
async def recalculate_lead_quality(lead_id: str):
    """
    Berechnet Quality Score neu.
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('calculate_lead_completeness', {
        'p_lead_id': lead_id
    }).execute()
    
    score = result.data if result.data is not None else 0
    
    return {
        "lead_id": lead_id,
        "completeness_score": score,
        "recalculated_at": "now"
    }


@router.post("/quality-check/run")
async def run_quality_checks():
    """
    Führt alle Quality Checks aus (Batch-Operation).
    
    **Returns:**
    - Umfassender Quality-Report
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('run_quality_checks').execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Quality Check fehlgeschlagen")
    
    return result.data


@router.get("/quality-metrics")
async def get_quality_metrics(
    entity_type: str = Query("leads", regex="^(leads|users|activities|products)$"),
    metric_type: Optional[str] = None,
    days_back: int = Query(30, le=365)
):
    """
    Listet Quality Metrics über Zeit.
    
    **Query Parameters:**
    - entity_type: Entitätstyp (leads, users, etc.)
    - metric_type: Optional - Metric-Filter (completeness, duplicates, etc.)
    - days_back: Zeitraum in Tagen
    """
    supabase = get_supabase_client()
    
    query = supabase.table('data_quality_metrics').select('*')
    
    query = query.eq('entity_type', entity_type)
    
    if metric_type:
        query = query.eq('metric_type', metric_type)
    
    query = query.gte('measured_at', f'now() - interval \'{days_back} days\'')
    query = query.order('measured_at', desc=True)
    query = query.limit(100)
    
    result = query.execute()
    
    return {
        "metrics": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/issues")
async def get_data_quality_issues(
    entity_type: Optional[str] = None,
    severity: Optional[str] = Query(None, regex="^(low|medium|high|critical)$"),
    status: str = Query("open", regex="^(open|acknowledged|fixed|ignored)$"),
    limit: int = Query(50, le=200)
):
    """
    Listet Datenqualitäts-Probleme.
    
    **Query Parameters:**
    - entity_type: Optional - Filter nach Entitätstyp
    - severity: Optional - Severity-Filter
    - status: Status-Filter (default: open)
    - limit: Max Anzahl
    """
    supabase = get_supabase_client()
    
    query = supabase.table('data_quality_issues').select('*')
    
    if entity_type:
        query = query.eq('entity_type', entity_type)
    
    if severity:
        query = query.eq('severity', severity)
    
    query = query.eq('status', status)
    query = query.order('severity', desc=True)
    query = query.order('detected_at', desc=True)
    query = query.limit(limit)
    
    result = query.execute()
    
    return {
        "issues": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.post("/issues/{issue_id}/fix")
async def mark_issue_fixed(
    issue_id: str,
    fixed_by: str
):
    """
    Markiert ein Datenqualitäts-Problem als behoben.
    """
    supabase = get_supabase_client()
    
    result = supabase.table('data_quality_issues').update({
        'status': 'fixed',
        'fixed_at': 'now()',
        'fixed_by': fixed_by
    }).eq('id', issue_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Issue nicht gefunden")
    
    return {
        "status": "fixed",
        "issue_id": issue_id
    }

