"""
═══════════════════════════════════════════════════════════════════════════
KNOWLEDGE BASE RAG API
═══════════════════════════════════════════════════════════════════════════
API endpoints für RAG-basierte Knowledge Base.

Endpoints:
- POST /api/knowledge/add - Add knowledge to base
- GET /api/knowledge/search - Semantic search
- GET /api/knowledge/objection-response - Find objection responses
- GET /api/knowledge/product-recommendations - Get product recommendations

Version: 1.0.0 (Starter+ Feature)
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.services.rag_service import RAGService
from app.core.auth import get_current_user
from app.utils.logger import get_logger
from openai import AsyncOpenAI
import os

logger = get_logger(__name__)
router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class AddKnowledgeRequest(BaseModel):
    title: str = Field(..., description="Title of knowledge item")
    content: str = Field(..., description="Content")
    category: str = Field(..., description="Category: playbook, objection, product, script, faq, best_practice, article, training")
    tags: Optional[List[str]] = Field(None, description="Optional tags")
    source: str = Field(default="manual", description="Source of knowledge")


class SearchKnowledgeResponse(BaseModel):
    results: List[Dict[str, Any]]
    total_count: int


class ObjectionResponseRequest(BaseModel):
    objection_text: str = Field(..., description="The objection raised")
    category: Optional[str] = Field(None, description="Optional category filter")
    personality_type: Optional[str] = Field(None, description="DISG type for personalization")


class ProductRecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    lead_id: str


# ═══════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════════

def get_rag_service() -> RAGService:
    """Get RAG service instance."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. RAG service requires OpenAI API access."
        )
    
    openai_client = AsyncOpenAI(api_key=api_key)
    return RAGService(openai_client=openai_client)


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/add")
async def add_knowledge(
    request: AddKnowledgeRequest,
    current_user: dict = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Add new knowledge to Knowledge Base with automatic embedding generation.
    
    Categories:
    - playbook: Sales playbooks and methodologies
    - objection: Objection handling responses
    - product: Product information and features
    - script: Sales scripts and templates
    - faq: Frequently asked questions
    - best_practice: Best practices and tips
    - article: Articles and long-form content
    - training: Training materials
    
    **Starter+ Feature** - Requires Starter tier or higher.
    """
    try:
        user_id = current_user.get('sub') or current_user.get('id')
        
        kb_id = await rag_service.add_knowledge(
            user_id=user_id,
            title=request.title,
            content=request.content,
            category=request.category,
            tags=request.tags,
            source=request.source
        )
        
        return {
            "success": True,
            "knowledge_id": kb_id,
            "message": f"Knowledge '{request.title}' added successfully"
        }
    
    except Exception as e:
        logger.error(f"Error adding knowledge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding knowledge: {str(e)}")


@router.get("/search", response_model=SearchKnowledgeResponse)
async def search_knowledge(
    query: str,
    categories: Optional[str] = None,  # Comma-separated categories
    limit: int = 5,
    similarity_threshold: float = 0.7,
    current_user: dict = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Semantic search in Knowledge Base using vector similarity.
    
    Query Parameters:
    - query: Search query (required)
    - categories: Comma-separated categories to filter (optional)
    - limit: Max number of results (default: 5)
    - similarity_threshold: Minimum similarity score 0-1 (default: 0.7)
    
    **Starter+ Feature** - Requires Starter tier or higher.
    """
    try:
        categories_list = None
        if categories:
            categories_list = [cat.strip() for cat in categories.split(',')]
        
        results = await rag_service.search_knowledge(
            query=query,
            categories=categories_list,
            limit=limit,
            similarity_threshold=similarity_threshold
        )
        
        return SearchKnowledgeResponse(
            results=results,
            total_count=len(results)
        )
    
    except Exception as e:
        logger.error(f"Error searching knowledge: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching knowledge: {str(e)}")


@router.post("/objection-response")
async def find_objection_response(
    request: ObjectionResponseRequest,
    current_user: dict = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Find best objection handling response from library.
    
    The service will:
    - Search objection library for similar objections
    - Adapt response to personality type if provided
    - Return proven responses with success rates
    
    **Starter+ Feature** - Requires Starter tier or higher.
    """
    try:
        responses = await rag_service.find_objection_response(
            objection_text=request.objection_text,
            category=request.category,
            personality_type=request.personality_type
        )
        
        return {
            "objection_text": request.objection_text,
            "responses": responses,
            "total_count": len(responses)
        }
    
    except Exception as e:
        logger.error(f"Error finding objection response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error finding objection response: {str(e)}")


@router.get("/product-recommendations/{lead_id}", response_model=ProductRecommendationResponse)
async def get_product_recommendations(
    lead_id: str,
    limit: int = 3,
    current_user: dict = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get personalized product recommendations for a lead.
    
    Based on:
    - Lead's budget (from BANT assessment)
    - Personality type (DISG)
    - Purchase history
    - Industry fit
    
    **Pro+ Feature** - Requires Pro tier or higher.
    """
    try:
        recommendations = await rag_service.recommend_products(
            lead_id=lead_id,
            limit=limit
        )
        
        return ProductRecommendationResponse(
            recommendations=recommendations,
            lead_id=lead_id
        )
    
    except Exception as e:
        logger.error(f"Error getting product recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting product recommendations: {str(e)}")


@router.post("/feedback/{kb_id}")
async def provide_feedback(
    kb_id: str,
    was_helpful: bool,
    current_user: dict = Depends(get_current_user),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Provide feedback on knowledge item effectiveness.
    
    This helps improve the quality of search results and recommendations.
    """
    try:
        await rag_service.update_effectiveness_score(kb_id, was_helpful)
        await rag_service.increment_usage(kb_id)
        
        return {
            "success": True,
            "message": "Feedback recorded successfully"
        }
    
    except Exception as e:
        logger.error(f"Error recording feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error recording feedback: {str(e)}")


@router.get("/status")
async def get_rag_status():
    """
    Check RAG service status.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    return {
        "service": "knowledge_rag",
        "status": "available" if api_key else "unavailable",
        "requires_openai": True,
        "has_api_key": bool(api_key),
        "features": [
            "semantic_search",
            "objection_handling",
            "product_recommendations",
            "automatic_embeddings",
            "effectiveness_tracking"
        ],
        "tier_required": "starter"
    }

