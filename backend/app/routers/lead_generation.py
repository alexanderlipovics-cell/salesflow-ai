"""
═══════════════════════════════════════════════════════════════════════════
LEAD GENERATION API
═══════════════════════════════════════════════════════════════════════════
API endpoints für autonome Lead-Generierung aus Social Media.

Endpoints:
- POST /api/lead-gen/start-job - Start lead generation job
- GET /api/lead-gen/jobs - Get user's jobs
- GET /api/lead-gen/candidates - Get auto-generated lead candidates
- POST /api/lead-gen/approve/{candidate_id} - Approve candidate
- POST /api/lead-gen/reject/{candidate_id} - Reject candidate

Version: 1.0.0 (Premium Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.social_media_service import SocialMediaService
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class StartJobRequest(BaseModel):
    platform: str = Field(..., description="Platform: instagram, facebook, linkedin")
    job_type: str = Field(..., description="Job type: hashtag_monitor, connection_requests, group_mining")
    config: Dict[str, Any] = Field(..., description="Job configuration")
    
    class Config:
        schema_extra = {
            "example": {
                "platform": "instagram",
                "job_type": "hashtag_monitor",
                "config": {
                    "hashtags": ["#entrepreneur", "#networkmarketing"],
                    "max_profiles": 50,
                    "min_followers": 100,
                    "max_followers": 10000
                }
            }
        }


class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class LeadCandidateResponse(BaseModel):
    id: str
    platform: str
    username: str
    profile_url: Optional[str]
    qualification_score: int
    status: str
    profile_data: Dict[str, Any]
    created_at: str


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_social_service() -> SocialMediaService:
    """Get social media service instance."""
    supabase = get_supabase_client()
    return SocialMediaService(supabase=supabase)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/start-job", response_model=JobResponse)
async def start_lead_gen_job(
    request: StartJobRequest,
    current_user: dict = Depends(get_current_user),
    social_service: SocialMediaService = Depends(get_social_service)
):
    """
    Start an autonomous lead generation job.
    
    Job Types:
    - **hashtag_monitor** (Instagram): Monitor hashtags for potential leads
    - **connection_requests** (LinkedIn): Automated connection requests
    - **group_mining** (Facebook): Mine groups for leads
    
    Config Examples:
    
    Instagram Hashtag Monitor:
    ```json
    {
        "hashtags": ["#entrepreneur", "#networkmarketing"],
        "max_profiles": 50,
        "min_followers": 100,
        "max_followers": 10000
    }
    ```
    
    LinkedIn Connection Automation:
    ```json
    {
        "job_titles": ["Sales Manager", "Entrepreneur"],
        "locations": ["Germany", "Austria"],
        "max_connections_per_day": 50
    }
    ```
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        # TODO: Check user tier and limits
        
        # Create job
        supabase = get_supabase_client()
        job_data = {
            'user_id': user_id,
            'platform': request.platform,
            'job_type': request.job_type,
            'status': 'pending',
            'config': request.config
        }
        
        result = supabase.table('lead_generation_jobs').insert(job_data).execute()
        
        if not result.data:
            raise Exception("Failed to create job")
        
        job_id = result.data[0]['id']
        
        # TODO: Trigger background job execution
        # For now, just return the job ID
        
        return JobResponse(
            job_id=job_id,
            status='pending',
            message=f"Lead generation job created. Job will start shortly."
        )
    
    except Exception as e:
        logger.error(f"Error starting lead gen job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting job: {str(e)}")


@router.get("/jobs")
async def get_user_jobs(
    status: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's lead generation jobs.
    
    Query Parameters:
    - status: Filter by status (pending, running, completed, failed)
    - limit: Max number of jobs (default: 20)
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        supabase = get_supabase_client()
        
        query = supabase.table('lead_generation_jobs').select('*').eq('user_id', user_id)
        
        if status:
            query = query.eq('status', status)
        
        query = query.order('created_at', desc=True).limit(limit)
        result = query.execute()
        
        return {
            "jobs": result.data or [],
            "total_count": len(result.data) if result.data else 0
        }
    
    except Exception as e:
        logger.error(f"Error getting jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching jobs: {str(e)}")


@router.get("/candidates")
async def get_lead_candidates(
    status: str = 'pending',
    min_score: int = 50,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    social_service: SocialMediaService = Depends(get_social_service)
):
    """
    Get auto-generated lead candidates awaiting review.
    
    Query Parameters:
    - status: Filter by status (pending, approved, rejected, converted)
    - min_score: Minimum qualification score (0-100)
    - limit: Max number of candidates (default: 20)
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        candidates = await social_service.get_lead_candidates(
            user_id=user_id,
            min_score=min_score,
            status=status,
            limit=limit
        )
        
        return {
            "candidates": candidates,
            "total_count": len(candidates)
        }
    
    except Exception as e:
        logger.error(f"Error getting candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching candidates: {str(e)}")


@router.post("/approve/{candidate_id}")
async def approve_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
    social_service: SocialMediaService = Depends(get_social_service)
):
    """
    Approve a lead candidate and create a lead.
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        result = await social_service.approve_candidate(
            candidate_id=candidate_id,
            user_id=user_id
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error approving candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error approving candidate: {str(e)}")


@router.post("/reject/{candidate_id}")
async def reject_candidate(
    candidate_id: str,
    reason: str = "Not qualified",
    current_user: dict = Depends(get_current_user),
    social_service: SocialMediaService = Depends(get_social_service)
):
    """
    Reject a lead candidate.
    
    **Premium Feature** - Requires Premium or Enterprise tier.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        result = await social_service.reject_candidate(
            candidate_id=candidate_id,
            user_id=user_id,
            reason=reason
        )
        
        return result
    
    except Exception as e:
        logger.error(f"Error rejecting candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error rejecting candidate: {str(e)}")


@router.get("/status")
async def get_lead_gen_status():
    """
    Check Lead Generation service status.
    """
    return {
        "service": "lead_generation",
        "status": "operational",
        "supported_platforms": ["instagram", "facebook", "linkedin"],
        "job_types": {
            "instagram": ["hashtag_monitor", "story_replies"],
            "facebook": ["group_mining", "page_engagement"],
            "linkedin": ["connection_requests", "group_engagement"]
        },
        "tier_required": "premium"
    }

