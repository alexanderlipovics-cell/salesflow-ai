"""
═══════════════════════════════════════════════════════════════════════════
SOCIAL MEDIA API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════
RESTful API für Social Media Integration
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.services.social_media_service import SocialMediaService
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/social", tags=["Social Media"])


# ─────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────

class SocialProfileData(BaseModel):
    id: str
    name: Optional[str] = None
    username: Optional[str] = None
    profile_url: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str] = []
    mutual_friends: int = 0
    follower_count: int = 0
    job_title: Optional[str] = None
    location: Optional[str] = None


class SocialInteraction(BaseModel):
    lead_id: str
    social_account_id: Optional[str] = None
    type: str  # post, comment, like, message, etc.
    content: Optional[str] = None
    url: Optional[str] = None
    sentiment: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.post("/import/facebook")
async def import_facebook_lead(
    profile_data: SocialProfileData,
    user_id: str,
    background_tasks: BackgroundTasks
):
    """
    Importiert einen Facebook Lead und qualifiziert automatisch.
    
    **Body:**
    - profile_data: Facebook Profil-Daten
    - user_id: User der den Import durchführt
    
    **Returns:**
    - Status: duplicate, auto_imported, oder candidate_created
    - Score: Qualifikations-Score (0-100)
    """
    service = SocialMediaService()
    
    result = await service.import_facebook_lead(
        profile_data=profile_data.dict(),
        user_id=user_id
    )
    
    return result


@router.post("/import/linkedin")
async def import_linkedin_lead(
    profile_data: SocialProfileData,
    user_id: str,
    background_tasks: BackgroundTasks
):
    """
    Importiert einen LinkedIn Lead (analog zu Facebook).
    """
    service = SocialMediaService()
    
    # LinkedIn hat höheren Basis-Score
    result = await service.import_facebook_lead(  # Same logic, different platform
        profile_data={**profile_data.dict(), 'platform': 'linkedin'},
        user_id=user_id
    )
    
    return result


@router.get("/candidates")
async def get_lead_candidates(
    user_id: str,
    min_score: int = Query(50, ge=0, le=100),
    status: str = Query("pending", regex="^(pending|approved|rejected|imported)$"),
    platform: Optional[str] = None,
    limit: int = Query(20, le=100)
):
    """
    Holt alle ausstehenden Social Media Lead-Kandidaten.
    
    **Query Parameters:**
    - user_id: User-Filter
    - min_score: Minimaler Qualifikations-Score (default: 50)
    - status: Status-Filter (default: pending)
    - platform: Optional - Platform-Filter (facebook, linkedin, etc.)
    - limit: Max Anzahl (default: 20)
    """
    service = SocialMediaService()
    
    candidates = await service.get_lead_candidates(
        user_id=user_id,
        min_score=min_score,
        status=status,
        limit=limit
    )
    
    # Optional platform filter (client-side for now)
    if platform:
        candidates = [c for c in candidates if c.get('platform') == platform]
    
    return {
        "candidates": candidates,
        "count": len(candidates),
        "filters": {
            "min_score": min_score,
            "status": status,
            "platform": platform
        }
    }


@router.post("/candidates/{candidate_id}/approve")
async def approve_candidate(
    candidate_id: str,
    user_id: str
):
    """
    Bestätigt einen Kandidaten und erstellt Lead.
    
    **Path Parameters:**
    - candidate_id: UUID des Kandidaten
    
    **Body:**
    - user_id: User der die Genehmigung erteilt
    """
    service = SocialMediaService()
    
    result = await service.approve_candidate(
        candidate_id=candidate_id,
        user_id=user_id
    )
    
    return result


@router.post("/candidates/{candidate_id}/reject")
async def reject_candidate(
    candidate_id: str,
    user_id: str,
    reason: str
):
    """
    Lehnt einen Lead-Kandidaten ab.
    
    **Path Parameters:**
    - candidate_id: UUID des Kandidaten
    
    **Body:**
    - user_id: User der ablehnt
    - reason: Ablehnungsgrund
    """
    service = SocialMediaService()
    
    result = await service.reject_candidate(
        candidate_id=candidate_id,
        user_id=user_id,
        reason=reason
    )
    
    return result


@router.post("/interactions/track")
async def track_interaction(
    interaction: SocialInteraction
):
    """
    Trackt eine Social Media Interaktion mit einem Lead.
    
    **Body:**
    - lead_id: UUID des Leads
    - type: Interaktionstyp (post, comment, like, message, etc.)
    - content: Optional - Interaktions-Inhalt
    - url: Optional - URL zum Post
    - sentiment: Optional - Sentiment (positive, neutral, negative)
    """
    service = SocialMediaService()
    
    result = await service.track_social_interaction(
        lead_id=interaction.lead_id,
        interaction_data=interaction.dict()
    )
    
    return result


@router.get("/insights/{lead_id}")
async def get_social_insights(
    lead_id: str
):
    """
    Liefert Social Media Insights für einen Lead.
    
    **Path Parameters:**
    - lead_id: UUID des Leads
    
    **Returns:**
    - social_accounts: Verknüpfte Social Accounts
    - recent_interactions: Letzte Interaktionen
    - stats: Engagement-Statistiken
    """
    service = SocialMediaService()
    
    insights = await service.get_social_insights(lead_id=lead_id)
    
    return insights


@router.get("/campaigns")
async def get_campaigns(
    user_id: Optional[str] = None,
    squad_id: Optional[str] = None,
    status: Optional[str] = None,
    platform: Optional[str] = None
):
    """
    Listet Social Media Kampagnen.
    
    **Query Parameters:**
    - user_id: Optional - Filter nach User
    - squad_id: Optional - Filter nach Squad
    - status: Optional - Status-Filter (active, paused, etc.)
    - platform: Optional - Platform-Filter
    """
    supabase = get_supabase_client()
    
    query = supabase.table('social_campaigns').select('*')
    
    if user_id:
        query = query.eq('user_id', user_id)
    if squad_id:
        query = query.eq('squad_id', squad_id)
    if status:
        query = query.eq('status', status)
    if platform:
        query = query.eq('platform', platform)
    
    query = query.order('created_at', desc=True)
    
    result = query.execute()
    
    return {
        "campaigns": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.post("/campaigns")
async def create_campaign(
    name: str,
    user_id: str,
    platform: str,
    campaign_type: str = "lead_generation",
    description: Optional[str] = None,
    squad_id: Optional[str] = None,
    target_audience: Optional[Dict[str, Any]] = None,
    hashtags: List[str] = []
):
    """
    Erstellt eine neue Social Media Kampagne.
    
    **Body:**
    - name: Kampagnen-Name
    - user_id: Owner der Kampagne
    - platform: Social Media Plattform
    - campaign_type: Typ (lead_generation, engagement, etc.)
    - description: Optional - Beschreibung
    - squad_id: Optional - Squad-Zuordnung
    - target_audience: Optional - Zielgruppen-Definition
    - hashtags: Liste von Hashtags
    """
    supabase = get_supabase_client()
    
    campaign_data = {
        'name': name,
        'user_id': user_id,
        'platform': platform,
        'campaign_type': campaign_type,
        'description': description,
        'squad_id': squad_id,
        'target_audience': target_audience or {},
        'hashtags': hashtags,
        'status': 'draft'
    }
    
    result = supabase.table('social_campaigns').insert(campaign_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Fehler beim Erstellen der Kampagne")
    
    return {
        "status": "created",
        "campaign": result.data[0]
    }

