"""
Playbooks Router
API endpoints for sales playbooks and best practices
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings
from supabase import create_client

# Import Playbook Engine
backend_services_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "services")
sys.path.append(backend_services_path)
from playbook_engine import PlaybookEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/playbooks", tags=["Playbooks"])

# Initialize Supabase client and Playbook Engine
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)
playbook_engine = PlaybookEngine(supabase)

# --- MODELS ---

class PlaybookStepModel(BaseModel):
    """Playbook step model"""
    step_number: int
    title: str
    description: str
    action_items: List[str]
    tips: List[str] = []
    common_mistakes: List[str] = []

class PlaybookModel(BaseModel):
    """Sales playbook model"""
    id: str
    name: str
    description: str
    category: str  # prospecting, closing, objection_handling, follow_up, etc.
    industry: List[str]
    difficulty: str  # beginner, intermediate, advanced
    estimated_time: str  # e.g. "15 minutes", "1 hour"
    success_metrics: Dict[str, str] = {}
    steps: List[PlaybookStepModel] = []
    tags: List[str] = []
    created_at: Optional[str] = None

class PlaybookSearchResponse(BaseModel):
    """Playbook search response"""
    count: int
    playbooks: List[PlaybookModel]

class BestPracticeModel(BaseModel):
    """Best practice model"""
    id: str
    title: str
    description: str
    category: str
    industry: List[str]
    impact_level: str  # high, medium, low
    implementation_difficulty: str  # easy, medium, hard
    examples: List[str] = []
    related_playbooks: List[str] = []

class BestPracticeSearchResponse(BaseModel):
    """Best practice search response"""
    count: int
    best_practices: List[BestPracticeModel]

# --- PLAYBOOK ENDPOINTS ---

@router.get("/search", response_model=PlaybookSearchResponse)
async def search_playbooks(
    query: Optional[str] = Query(None, description="Search in playbook name and description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    limit: int = Query(20, ge=1, le=100, description="Max results")
):
    """
    Search playbooks
    
    - **query**: Search text (optional)
    - **category**: prospecting, closing, objection_handling, follow_up, etc.
    - **industry**: network_marketing, real_estate, finance
    - **difficulty**: beginner, intermediate, advanced
    - **limit**: Maximum number of results
    """
    try:
        # Build query
        db_query = supabase.table('playbooks').select('*')
        
        # Text search if query provided
        if query:
            db_query = db_query.or_(f'name.ilike.%{query}%,description.ilike.%{query}%')
        
        # Filter by category
        if category:
            db_query = db_query.eq('category', category)
        
        # Filter by industry
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        # Filter by difficulty
        if difficulty:
            db_query = db_query.eq('difficulty', difficulty)
        
        # Execute query
        result = db_query.order('name', desc=False).limit(limit).execute()
        
        playbooks = []
        for playbook in result.data:
            # Fetch steps for this playbook
            steps_result = supabase.table('playbook_steps').select('*').eq(
                'playbook_id', playbook['id']
            ).order('step_number', desc=False).execute()
            
            playbooks.append({
                **playbook,
                'steps': steps_result.data
            })
        
        return {
            "count": len(playbooks),
            "playbooks": playbooks
        }
        
    except Exception as e:
        logger.error(f"Error searching playbooks: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/categories", response_model=List[str])
async def get_playbook_categories():
    """Get all available playbook categories"""
    return [
        "prospecting",
        "qualification",
        "presentation",
        "objection_handling",
        "closing",
        "follow_up",
        "relationship_building",
        "team_building",
        "event_planning",
        "social_media",
        "content_creation",
        "lead_generation"
    ]


@router.get("/difficulties", response_model=List[str])
async def get_difficulties():
    """Get all difficulty levels"""
    return ["beginner", "intermediate", "advanced"]


@router.get("/{playbook_id}", response_model=PlaybookModel)
async def get_playbook_by_id(playbook_id: str):
    """Get single playbook by ID with all steps"""
    try:
        # Fetch playbook
        result = supabase.table('playbooks').select('*').eq('id', playbook_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Playbook not found")
        
        playbook = result.data[0]
        
        # Fetch steps
        steps_result = supabase.table('playbook_steps').select('*').eq(
            'playbook_id', playbook_id
        ).order('step_number', desc=False).execute()
        
        playbook['steps'] = steps_result.data
        
        return playbook
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching playbook: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/", response_model=PlaybookSearchResponse)
async def list_all_playbooks(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all playbooks with pagination"""
    try:
        result = supabase.table('playbooks').select('*').order(
            'category', desc=False
        ).range(offset, offset + limit - 1).execute()
        
        playbooks = []
        for playbook in result.data:
            # Fetch steps
            steps_result = supabase.table('playbook_steps').select('*').eq(
                'playbook_id', playbook['id']
            ).order('step_number', desc=False).execute()
            
            playbooks.append({
                **playbook,
                'steps': steps_result.data
            })
        
        return {
            "count": len(playbooks),
            "playbooks": playbooks
        }
        
    except Exception as e:
        logger.error(f"Error listing playbooks: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


# --- BEST PRACTICES ENDPOINTS ---

@router.get("/best-practices/search", response_model=BestPracticeSearchResponse)
async def search_best_practices(
    query: Optional[str] = Query(None, description="Search in title and description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    impact_level: Optional[str] = Query(None, description="Filter by impact level"),
    limit: int = Query(20, ge=1, le=100, description="Max results")
):
    """
    Search best practices
    
    - **query**: Search text (optional)
    - **category**: Same as playbook categories
    - **industry**: network_marketing, real_estate, finance
    - **impact_level**: high, medium, low
    - **limit**: Maximum number of results
    """
    try:
        # Build query
        db_query = supabase.table('best_practices').select('*')
        
        # Text search if query provided
        if query:
            db_query = db_query.or_(f'title.ilike.%{query}%,description.ilike.%{query}%')
        
        # Filter by category
        if category:
            db_query = db_query.eq('category', category)
        
        # Filter by industry
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        # Filter by impact level
        if impact_level:
            db_query = db_query.eq('impact_level', impact_level)
        
        # Execute query
        result = db_query.order('impact_level', desc=True).limit(limit).execute()
        
        return {
            "count": len(result.data),
            "best_practices": result.data
        }
        
    except Exception as e:
        logger.error(f"Error searching best practices: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/best-practices/{practice_id}", response_model=BestPracticeModel)
async def get_best_practice_by_id(practice_id: str):
    """Get single best practice by ID"""
    try:
        result = supabase.table('best_practices').select('*').eq('id', practice_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Best practice not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching best practice: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/best-practices/", response_model=BestPracticeSearchResponse)
async def list_all_best_practices(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all best practices with pagination"""
    try:
        result = supabase.table('best_practices').select('*').order(
            'impact_level', desc=True
        ).range(offset, offset + limit - 1).execute()
        
        return {
            "count": len(result.data),
            "best_practices": result.data
        }
        
    except Exception as e:
        logger.error(f"Error listing best practices: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


# --- UTILITY ENDPOINTS ---

@router.get("/stats/popular", response_model=PlaybookSearchResponse)
async def get_popular_playbooks(
    industry: Optional[str] = Query(None, description="Filter by industry"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get most popular playbooks"""
    try:
        db_query = supabase.table('playbooks').select('*')
        
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        result = db_query.order('created_at', desc=True).limit(limit).execute()
        
        playbooks = []
        for playbook in result.data:
            # Fetch steps
            steps_result = supabase.table('playbook_steps').select('*').eq(
                'playbook_id', playbook['id']
            ).order('step_number', desc=False).execute()
            
            playbooks.append({
                **playbook,
                'steps': steps_result.data
            })
        
        return {
            "count": len(playbooks),
            "playbooks": playbooks
        }
        
    except Exception as e:
        logger.error(f"Error fetching popular playbooks: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/recommended/{user_role}")
async def get_recommended_playbooks(
    user_role: str,
    industry: Optional[str] = Query(None, description="Filter by industry")
):
    """
    Get recommended playbooks based on user role
    
    - **user_role**: beginner, intermediate, advanced, team_leader
    - **industry**: Filter by industry (optional)
    """
    try:
        # Map user role to difficulty
        difficulty_map = {
            "beginner": "beginner",
            "intermediate": "intermediate",
            "advanced": "advanced",
            "team_leader": "advanced"
        }
        
        difficulty = difficulty_map.get(user_role, "beginner")
        
        db_query = supabase.table('playbooks').select('*').eq('difficulty', difficulty)
        
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        result = db_query.limit(10).execute()
        
        playbooks = []
        for playbook in result.data:
            steps_result = supabase.table('playbook_steps').select('*').eq(
                'playbook_id', playbook['id']
            ).order('step_number', desc=False).execute()
            
            playbooks.append({
                **playbook,
                'steps': steps_result.data
            })
        
        return {
            "user_role": user_role,
            "recommended_difficulty": difficulty,
            "count": len(playbooks),
            "playbooks": playbooks
        }
        
    except Exception as e:
        logger.error(f"Error fetching recommended playbooks: {e}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")
