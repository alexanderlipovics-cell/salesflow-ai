"""
Objections Router
API endpoints for objection search and retrieval
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from supabase import create_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/objections", tags=["Knowledge Base"])

# Initialize Supabase client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)

# --- MODELS ---

class ResponseModel(BaseModel):
    """Objection response model"""
    id: str
    technique: str
    response_script: str
    success_rate: str
    tone: str
    when_to_use: Optional[str] = ""

class ObjectionModel(BaseModel):
    """Objection model"""
    id: str
    category: str
    objection_text_de: str
    psychology_tags: List[str] = []
    industry: List[str]
    frequency_score: int
    severity: int
    responses: List[ResponseModel] = []

class SearchResponse(BaseModel):
    """Search response model"""
    count: int
    objections: List[ObjectionModel]

# --- ENDPOINTS ---

@router.get("/search", response_model=SearchResponse)
async def search_objections(
    query: str = Query(..., description="Search query text", min_length=2),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(10, ge=1, le=50, description="Max results")
):
    """
    Search objections by text match
    
    - **query**: Search text (e.g. "teuer", "Zeit", "Konkurrenz")
    - **industry**: Filter by industry (network_marketing, real_estate, finance)
    - **category**: Filter by category (preis, zeit, konkurrenz, etc.)
    - **limit**: Maximum number of results
    """
    try:
        # Build query
        db_query = supabase.table('objections').select('*')
        
        # Text search in objection_text_de
        db_query = db_query.ilike('objection_text_de', f'%{query}%')
        
        # Filter by industry if provided
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        # Filter by category if provided
        if category:
            db_query = db_query.eq('category', category)
        
        # Execute query
        result = db_query.order('frequency_score', desc=True).limit(limit).execute()
        
        objections = []
        for obj in result.data:
            # Fetch responses for this objection
            responses_result = supabase.table('objection_responses').select('*').eq(
                'objection_id', obj['id']
            ).order('success_rate', desc=True).execute()
            
            # Build objection with responses
            objections.append({
                **obj,
                'responses': responses_result.data
            })
        
        return {
            "count": len(objections),
            "objections": objections
        }
        
    except Exception as e:
        logger.error(f"Error searching objections: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/categories", response_model=List[str])
async def get_categories():
    """Get all available objection categories"""
    return [
        "preis", "zeit", "konkurrenz", "vertrauen", "entscheidung",
        "produkt", "autorität", "bedarf", "risiko", "network_marketing",
        "immobilien", "finanzberatung", "vertrag", "daten", "social_proof", "vermeidung"
    ]


@router.get("/industries", response_model=List[str])
async def get_industries():
    """Get all available industries"""
    return ["network_marketing", "real_estate", "finance"]


@router.get("/{objection_id}", response_model=ObjectionModel)
async def get_objection_by_id(objection_id: str):
    """Get single objection by ID"""
    try:
        # Fetch objection
        result = supabase.table('objections').select('*').eq('id', objection_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Objection not found")
        
        objection = result.data[0]
        
        # Fetch responses
        responses_result = supabase.table('objection_responses').select('*').eq(
            'objection_id', objection_id
        ).execute()
        
        objection['responses'] = responses_result.data
        
        return objection
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching objection: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/", response_model=SearchResponse)
async def list_all_objections(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all objections with pagination"""
    try:
        # Fetch objections with pagination
        result = supabase.table('objections').select('*').order(
            'frequency_score', desc=True
        ).range(offset, offset + limit - 1).execute()
        
        objections = []
        for obj in result.data:
            # Fetch responses
            responses_result = supabase.table('objection_responses').select('*').eq(
                'objection_id', obj['id']
            ).execute()
            
            objections.append({
                **obj,
                'responses': responses_result.data
            })
        
        return {
            "count": len(objections),
            "objections": objections
        }
        
    except Exception as e:
        logger.error(f"Error listing objections: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


# ============================================================================
# OBJECTION LOGGING (Speed Hunter Integration)
# ============================================================================

class ObjectionLogRequest(BaseModel):
    """Request model for logging objection interactions"""
    lead_id: str
    company_id: str
    objection_key: str
    funnel_stage: str
    language_code: str
    disc_type: Optional[str] = None
    template_id: Optional[str] = None
    response_style: Optional[str] = None
    outcome: Optional[str] = None  # 'won','lost','pending'
    notes: Optional[str] = None

@router.post("/log")
async def log_objection(
    payload: ObjectionLogRequest,
    user_id: str = None,  # TODO: Add Depends(get_current_user_id) when auth is ready
):
    """
    Log an objection interaction for analytics and learning.
    
    Used by Speed Hunter and other features to track:
    - Which objections occur most often
    - Which responses work best
    - DISG type correlation
    """
    try:
        # Try to insert into objection_logs table
        supabase.table("objection_logs").insert({
            "lead_id": payload.lead_id,
            "user_id": user_id,
            "company_id": payload.company_id,
            "objection_key": payload.objection_key,
            "funnel_stage": payload.funnel_stage,
            "disc_type": payload.disc_type,
            "template_id": payload.template_id,
            "language_code": payload.language_code,
            "response_style": payload.response_style,
            "outcome": payload.outcome,
            "notes": payload.notes,
        }).execute()
        
        return {"ok": True, "message": "Objection logged successfully"}
        
    except Exception as e:
        # Table might not exist - that's OK for skeleton
        logger.warning(f"Could not log objection (table might not exist): {e}")
        return {"ok": True, "message": "Objection logging skipped (table not available)"}

