"""
Templates Router
API endpoints for message templates and sequences
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

router = APIRouter(prefix="/api/templates", tags=["Templates"])

# Initialize Supabase client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY)

# --- MODELS ---

class TemplateVariableModel(BaseModel):
    """Template variable model"""
    name: str
    description: str
    example: str
    required: bool = True

class TemplateModel(BaseModel):
    """Message template model"""
    id: str
    name: str
    category: str  # first_contact, follow_up, objection_response, closing, etc.
    industry: List[str]
    template_text: str
    variables: List[TemplateVariableModel] = []
    tone: str  # casual, professional, consultative, direct
    success_rate: Optional[str] = "medium"
    use_case: str
    tags: List[str] = []
    created_at: Optional[str] = None

class TemplateSearchResponse(BaseModel):
    """Template search response"""
    count: int
    templates: List[TemplateModel]

class SequenceStepModel(BaseModel):
    """Sequence step model"""
    step_number: int
    template_id: str
    delay_days: int
    delay_hours: int = 0
    conditions: Optional[dict] = {}

class SequenceModel(BaseModel):
    """Message sequence model"""
    id: str
    name: str
    description: str
    industry: List[str]
    total_steps: int
    avg_conversion_rate: Optional[float] = None
    steps: List[SequenceStepModel] = []
    created_at: Optional[str] = None

class SequenceSearchResponse(BaseModel):
    """Sequence search response"""
    count: int
    sequences: List[SequenceModel]

# --- TEMPLATE ENDPOINTS ---

@router.get("/search", response_model=TemplateSearchResponse)
async def search_templates(
    query: Optional[str] = Query(None, description="Search in template name and text"),
    category: Optional[str] = Query(None, description="Filter by category"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    tone: Optional[str] = Query(None, description="Filter by tone"),
    limit: int = Query(20, ge=1, le=100, description="Max results")
):
    """
    Search message templates
    
    - **query**: Search text (optional)
    - **category**: first_contact, follow_up, objection_response, closing, etc.
    - **industry**: network_marketing, real_estate, finance
    - **tone**: casual, professional, consultative, direct
    - **limit**: Maximum number of results
    """
    try:
        # Build query
        db_query = supabase.table('message_templates').select('*')
        
        # Text search if query provided
        if query:
            db_query = db_query.or_(f'name.ilike.%{query}%,template_text.ilike.%{query}%')
        
        # Filter by category
        if category:
            db_query = db_query.eq('category', category)
        
        # Filter by industry
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        # Filter by tone
        if tone:
            db_query = db_query.eq('tone', tone)
        
        # Execute query
        result = db_query.order('success_rate', desc=True).limit(limit).execute()
        
        return {
            "count": len(result.data),
            "templates": result.data
        }
        
    except Exception as e:
        logger.error(f"Error searching templates: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/categories", response_model=List[str])
async def get_template_categories():
    """Get all available template categories"""
    return [
        "first_contact",
        "follow_up",
        "objection_response",
        "closing",
        "reactivation",
        "event_invitation",
        "value_delivery",
        "social_proof",
        "urgency",
        "referral_request"
    ]


@router.get("/tones", response_model=List[str])
async def get_template_tones():
    """Get all available tones"""
    return ["casual", "professional", "consultative", "direct", "empathetic", "enthusiastic"]


@router.get("/{template_id}", response_model=TemplateModel)
async def get_template_by_id(template_id: str):
    """Get single template by ID"""
    try:
        result = supabase.table('message_templates').select('*').eq('id', template_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching template: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/", response_model=TemplateSearchResponse)
async def list_all_templates(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all templates with pagination"""
    try:
        result = supabase.table('message_templates').select('*').order(
            'category', desc=False
        ).range(offset, offset + limit - 1).execute()
        
        return {
            "count": len(result.data),
            "templates": result.data
        }
        
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


# --- SEQUENCE ENDPOINTS ---

@router.get("/sequences/search", response_model=SequenceSearchResponse)
async def search_sequences(
    query: Optional[str] = Query(None, description="Search in sequence name"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    limit: int = Query(20, ge=1, le=100, description="Max results")
):
    """
    Search message sequences
    
    - **query**: Search text in sequence name
    - **industry**: network_marketing, real_estate, finance
    - **limit**: Maximum number of results
    """
    try:
        # Build query
        db_query = supabase.table('message_sequences').select('*')
        
        # Text search if query provided
        if query:
            db_query = db_query.ilike('name', f'%{query}%')
        
        # Filter by industry
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        # Execute query
        result = db_query.order('avg_conversion_rate', desc=True).limit(limit).execute()
        
        sequences = []
        for seq in result.data:
            # Fetch sequence steps
            steps_result = supabase.table('sequence_steps').select('*').eq(
                'sequence_id', seq['id']
            ).order('step_number', desc=False).execute()
            
            sequences.append({
                **seq,
                'steps': steps_result.data
            })
        
        return {
            "count": len(sequences),
            "sequences": sequences
        }
        
    except Exception as e:
        logger.error(f"Error searching sequences: {e}")
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@router.get("/sequences/{sequence_id}", response_model=SequenceModel)
async def get_sequence_by_id(sequence_id: str):
    """Get single sequence by ID with all steps"""
    try:
        # Fetch sequence
        result = supabase.table('message_sequences').select('*').eq('id', sequence_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sequence not found")
        
        sequence = result.data[0]
        
        # Fetch steps
        steps_result = supabase.table('sequence_steps').select('*').eq(
            'sequence_id', sequence_id
        ).order('step_number', desc=False).execute()
        
        sequence['steps'] = steps_result.data
        
        return sequence
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")


@router.get("/sequences/", response_model=SequenceSearchResponse)
async def list_all_sequences(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """List all sequences with pagination"""
    try:
        result = supabase.table('message_sequences').select('*').order(
            'avg_conversion_rate', desc=True
        ).range(offset, offset + limit - 1).execute()
        
        sequences = []
        for seq in result.data:
            # Fetch steps
            steps_result = supabase.table('sequence_steps').select('*').eq(
                'sequence_id', seq['id']
            ).order('step_number', desc=False).execute()
            
            sequences.append({
                **seq,
                'steps': steps_result.data
            })
        
        return {
            "count": len(sequences),
            "sequences": sequences
        }
        
    except Exception as e:
        logger.error(f"Error listing sequences: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")


# --- UTILITY ENDPOINTS ---

@router.post("/render")
async def render_template(
    template_id: str,
    variables: dict
):
    """
    Render a template with provided variables
    
    - **template_id**: ID of the template
    - **variables**: Dictionary with variable values
    
    Returns rendered template text
    """
    try:
        # Fetch template
        result = supabase.table('message_templates').select('*').eq('id', template_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template = result.data[0]
        template_text = template['template_text']
        
        # Replace variables
        for key, value in variables.items():
            template_text = template_text.replace(f"{{{key}}}", str(value))
        
        # Check for unreplaced required variables
        required_vars = [v for v in template.get('variables', []) if v.get('required', True)]
        missing_vars = []
        
        for var in required_vars:
            if f"{{{var['name']}}}" in template_text:
                missing_vars.append(var['name'])
        
        if missing_vars:
            return {
                "rendered_text": template_text,
                "warning": f"Missing required variables: {', '.join(missing_vars)}",
                "missing_variables": missing_vars
            }
        
        return {
            "rendered_text": template_text,
            "template_id": template_id,
            "template_name": template['name']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rendering template: {e}")
        raise HTTPException(status_code=500, detail=f"Render error: {str(e)}")


@router.get("/stats/popular", response_model=TemplateSearchResponse)
async def get_popular_templates(
    industry: Optional[str] = Query(None, description="Filter by industry"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get most popular/highest converting templates"""
    try:
        db_query = supabase.table('message_templates').select('*')
        
        if industry:
            db_query = db_query.contains('industry', [industry])
        
        result = db_query.eq('success_rate', 'high').order(
            'created_at', desc=True
        ).limit(limit).execute()
        
        return {
            "count": len(result.data),
            "templates": result.data
        }
        
    except Exception as e:
        logger.error(f"Error fetching popular templates: {e}")
        raise HTTPException(status_code=500, detail=f"Fetch error: {str(e)}")

