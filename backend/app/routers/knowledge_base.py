"""
═══════════════════════════════════════════════════════════════════════════
KNOWLEDGE BASE API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════
RESTful API für Knowledge Base, Objections, Products
═══════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/v1/knowledge", tags=["Knowledge Base"])


# ─────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────

class KnowledgeBaseItem(BaseModel):
    id: Optional[str] = None
    category: str
    title: str
    content: str
    summary: Optional[str] = None
    tags: List[str] = []
    language: str = "de"


class ObjectionResponse(BaseModel):
    objection_id: str
    objection_text: str
    objection_category: str
    response_script: str
    adapted_response: Optional[str] = None
    success_rate: Optional[float] = None


class ProductRecommendation(BaseModel):
    product_id: str
    product_name: str
    product_price: float
    recommendation_reason: str
    recommendation_score: float


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_knowledge(
    query: str,
    category: Optional[str] = None,
    language: str = "de",
    limit: int = Query(5, le=20)
):
    """
    Semantische Suche in der Wissensdatenbank (RAG).
    
    **Query Parameters:**
    - query: Suchtext
    - category: Optional - Filter nach Kategorie (playbook, objection, product, etc.)
    - language: Sprache (default: de)
    - limit: Max Anzahl Ergebnisse
    """
    supabase = get_supabase_client()
    
    # TODO: Generate embedding for query via OpenAI
    # For now, use text search
    query_builder = supabase.table('knowledge_base').select('*')
    
    if category:
        query_builder = query_builder.eq('category', category)
    
    query_builder = query_builder.eq('language', language)
    query_builder = query_builder.eq('is_active', True)
    query_builder = query_builder.or_(f'title.ilike.%{query}%,content.ilike.%{query}%')
    query_builder = query_builder.limit(limit)
    
    result = query_builder.execute()
    
    return {
        "results": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/objections/find")
async def find_objection_response(
    objection_text: str,
    personality_type: Optional[str] = None,
    industry: Optional[str] = None
):
    """
    Findet passende Einwandbehandlung mit DISG-Anpassung.
    
    **Query Parameters:**
    - objection_text: Der Einwand des Kunden
    - personality_type: Optional - DISG-Typ (D, I, S, C) für angepasste Response
    - industry: Optional - Branchen-Filter
    """
    supabase = get_supabase_client()
    
    # Call PostgreSQL function
    result = supabase.rpc('find_objection_response', {
        'p_objection_text': objection_text,
        'p_personality_type': personality_type,
        'p_industry': industry
    }).execute()
    
    return {
        "objection": objection_text,
        "responses": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.post("/objections/track-success")
async def track_objection_success(
    objection_id: str,
    was_effective: bool,
    user_id: Optional[str] = None
):
    """
    Trackt Erfolg einer Einwandbehandlung für ML-Learning.
    
    **Body:**
    - objection_id: UUID der Einwandbehandlung
    - was_effective: War die Response erfolgreich?
    - user_id: Optional - User der die Bewertung abgibt
    """
    supabase = get_supabase_client()
    
    # Call tracking function
    supabase.rpc('track_content_usage', {
        'p_content_id': objection_id,
        'p_content_type': 'objection',
        'p_was_effective': was_effective
    }).execute()
    
    return {
        "status": "tracked",
        "objection_id": objection_id,
        "effectiveness": was_effective
    }


@router.get("/products/recommend/{lead_id}")
async def recommend_products(
    lead_id: str,
    recommendation_type: str = Query("upsell", regex="^(upsell|cross_sell)$"),
    limit: int = Query(3, le=10)
):
    """
    Produkt-Empfehlungen basierend auf Lead-Historie und DISG.
    
    **Path Parameters:**
    - lead_id: UUID des Leads
    
    **Query Parameters:**
    - recommendation_type: upsell oder cross_sell
    - limit: Max Anzahl Empfehlungen
    """
    supabase = get_supabase_client()
    
    # Call recommendation function
    function_name = 'recommend_upsells' if recommendation_type == 'upsell' else 'recommend_cross_sells'
    
    result = supabase.rpc(function_name, {
        'p_lead_id': lead_id,
        'p_limit': limit
    }).execute()
    
    return {
        "lead_id": lead_id,
        "type": recommendation_type,
        "recommendations": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/success-stories")
async def get_success_stories(
    story_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(10, le=50)
):
    """
    Holt inspirierende Success Stories für Motivation.
    
    **Query Parameters:**
    - story_type: Optional - Filter nach Story-Typ (first_sale, big_deal, etc.)
    - user_id: Optional - User-Context für Visibility-Filter
    - limit: Max Anzahl Stories
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('get_relevant_success_stories', {
        'p_user_id': user_id,
        'p_story_type': story_type,
        'p_limit': limit
    }).execute()
    
    return {
        "stories": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/content/top-performing")
async def get_top_performing_content(
    category: Optional[str] = None,
    limit: int = Query(10, le=50)
):
    """
    Best performing Content für Optimierung.
    
    **Query Parameters:**
    - category: Optional - Filter nach Kategorie
    - limit: Max Anzahl Einträge
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('get_top_performing_content', {
        'p_category': category,
        'p_limit': limit
    }).execute()
    
    return {
        "top_content": result.data or [],
        "count": len(result.data) if result.data else 0
    }


@router.get("/products/{product_id}/performance")
async def get_product_performance(
    product_id: str,
    days_back: int = Query(30, le=365)
):
    """
    Umfassende Performance-Metriken für ein Produkt.
    
    **Path Parameters:**
    - product_id: UUID des Produkts
    
    **Query Parameters:**
    - days_back: Zeitraum in Tagen (default: 30)
    """
    supabase = get_supabase_client()
    
    result = supabase.rpc('get_product_performance', {
        'p_product_id': product_id,
        'p_days_back': days_back
    }).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    
    return result.data[0] if result.data else {}


@router.post("/products/{product_id}/review")
async def add_product_review(
    product_id: str,
    user_id: str,
    rating: int = Query(..., ge=1, le=5),
    review_text: Optional[str] = None,
    pros: Optional[str] = None,
    cons: Optional[str] = None,
    verified_purchase: bool = False
):
    """
    Fügt eine Produktbewertung hinzu.
    
    **Path Parameters:**
    - product_id: UUID des Produkts
    
    **Body Parameters:**
    - user_id: UUID des Users
    - rating: 1-5 Sterne
    - review_text: Optional - Bewertungstext
    - pros: Optional - Vorteile
    - cons: Optional - Nachteile
    - verified_purchase: Verifizierter Kauf?
    """
    supabase = get_supabase_client()
    
    review_data = {
        'product_id': product_id,
        'user_id': user_id,
        'rating': rating,
        'review_text': review_text,
        'pros': pros,
        'cons': cons,
        'verified_purchase': verified_purchase
    }
    
    result = supabase.table('product_reviews').insert(review_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Fehler beim Erstellen der Bewertung")
    
    return {
        "status": "created",
        "review_id": result.data[0]['id']
    }

