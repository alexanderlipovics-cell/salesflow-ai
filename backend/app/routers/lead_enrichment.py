"""
Lead Enrichment API Endpoints
Clearbit, Hunter.io integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from ..core.auth import get_current_user
from ..core.supabase import get_supabase_client
from ..services.enrichment_service import LeadEnrichmentService


router = APIRouter(prefix="/api/enrichment", tags=["lead-enrichment"])


@router.post("/enrich/{lead_id}")
async def enrich_lead(
    lead_id: str,
    enrichment_type: str = Query('full', regex='^(email|company|social|full)$'),
    current_user: dict = Depends(get_current_user)
):
    """
    Enrich a single lead with external data.
    
    enrichment_type:
    - email: Enrich by email (Clearbit)
    - company: Enrich company data
    - social: Find social profiles
    - full: All of the above
    """
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Verify lead ownership
    lead = supabase.table('leads').select('*').eq('id', lead_id).eq('user_id', user_id).execute()
    
    if not lead.data:
        raise HTTPException(404, "Lead not found")
    
    try:
        service = LeadEnrichmentService(supabase)
        result = await service.enrich_lead(lead_id, enrichment_type)
        return result
    except Exception as e:
        raise HTTPException(500, f"Enrichment failed: {str(e)}")


class BulkEnrichRequest(BaseModel):
    lead_ids: List[str]
    enrichment_type: str = 'full'


@router.post("/bulk-enrich")
async def bulk_enrich(
    request: BulkEnrichRequest,
    current_user: dict = Depends(get_current_user)
):
    """Enrich multiple leads in background"""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    # Verify lead ownership
    leads = supabase.table('leads')\
        .select('id')\
        .eq('user_id', user_id)\
        .in_('id', request.lead_ids)\
        .execute()
    
    if len(leads.data) != len(request.lead_ids):
        raise HTTPException(403, "Some leads not found or not owned by user")
    
    # Start background enrichment
    import asyncio
    service = LeadEnrichmentService(supabase)
    asyncio.create_task(
        service.bulk_enrich_leads(user_id, request.lead_ids)
    )
    
    return {
        "success": True,
        "message": f"Enriching {len(request.lead_ids)} leads in background",
        "estimated_time": f"{len(request.lead_ids) * 2} seconds"
    }


class ValidateEmailRequest(BaseModel):
    email: EmailStr


@router.post("/validate-email")
async def validate_email(
    request: ValidateEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate email address using Hunter.io Email Verifier.
    Returns validation score, disposable check, webmail check.
    """
    supabase = get_supabase_client()
    service = LeadEnrichmentService(supabase)
    
    result = await service.validate_email(request.email)
    return result


@router.get("/jobs")
async def get_enrichment_jobs(
    limit: int = Query(50, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get user's enrichment jobs"""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    query = supabase.table('lead_enrichment_jobs')\
        .select('''
            *,
            leads!inner(
                id,
                name,
                email,
                company,
                user_id
            )
        ''')\
        .eq('leads.user_id', user_id)\
        .order('created_at', desc=True)\
        .limit(limit)
    
    if status:
        query = query.eq('status', status)
    
    response = query.execute()
    
    return {
        "jobs": response.data,
        "count": len(response.data)
    }


@router.get("/jobs/{job_id}")
async def get_enrichment_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get enrichment job details"""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    
    response = supabase.table('lead_enrichment_jobs')\
        .select('''
            *,
            leads!inner(
                id,
                name,
                email,
                user_id
            )
        ''')\
        .eq('id', job_id)\
        .eq('leads.user_id', user_id)\
        .execute()
    
    if not response.data:
        raise HTTPException(404, "Job not found")
    
    return response.data[0]


@router.get("/stats")
async def get_enrichment_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get enrichment statistics for current user"""
    
    user_id = current_user['id']
    supabase = get_supabase_client()
    service = LeadEnrichmentService(supabase)
    
    stats = await service.get_enrichment_stats(user_id)
    return stats


@router.get("/cache/stats")
async def get_cache_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get cache statistics"""
    
    supabase = get_supabase_client()
    
    stats = await supabase.fetchrow("""
        SELECT 
            COUNT(*) as total_entries,
            SUM(hit_count) as total_hits,
            SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as active_entries,
            AVG(hit_count) as avg_hits_per_entry
        FROM enriched_data_cache
    """)
    
    by_source = await supabase.fetch("""
        SELECT 
            source,
            COUNT(*) as count,
            SUM(hit_count) as hits
        FROM enriched_data_cache
        WHERE expires_at > NOW()
        GROUP BY source
        ORDER BY count DESC
    """)
    
    return {
        "overall": dict(stats) if stats else {},
        "by_source": [dict(row) for row in by_source] if by_source else []
    }


@router.delete("/cache/clear")
async def clear_cache(
    source: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Clear enrichment cache (admin only in production)"""
    
    supabase = get_supabase_client()
    
    if source:
        await supabase.execute("""
            DELETE FROM enriched_data_cache WHERE source = $1
        """, source)
        return {"message": f"Cleared cache for source: {source}"}
    else:
        await supabase.execute("DELETE FROM enriched_data_cache")
        return {"message": "Cleared all cache"}


class FindEmailRequest(BaseModel):
    name: str
    company: str


@router.post("/find-email")
async def find_email(
    request: FindEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Find email address for a person using Hunter.io.
    Useful for prospecting.
    """
    supabase = get_supabase_client()
    service = LeadEnrichmentService(supabase)
    
    email = await service._find_email(request.name, request.company)
    
    if email:
        return {
            "success": True,
            "email": email
        }
    else:
        return {
            "success": False,
            "message": "Email not found"
        }

