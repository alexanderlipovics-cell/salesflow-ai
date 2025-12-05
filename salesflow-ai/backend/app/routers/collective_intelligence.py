"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  COLLECTIVE INTELLIGENCE API ROUTER                                            ║
║  REST Endpoints für das Non Plus Ultra System                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field

from ..core.deps import get_supabase
from ..services.collective_intelligence_engine import (
    CollectiveIntelligenceEngine,
    InputType,
    Outcome,
    create_collective_intelligence_engine,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/collective-intelligence", tags=["Collective Intelligence"])


# ═══════════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════


class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="Der Prompt für die KI-Generierung")
    input_type: str = Field(
        default="message_generation",
        description="Typ der Anfrage: objection_response, message_generation, follow_up, closing_script"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Kontext: vertical, channel, objection_category, disg_type, lead_name"
    )
    use_rag: bool = Field(default=True, description="RAG für Kontext-Anreicherung nutzen")
    record_for_rlhf: bool = Field(default=True, description="Für RLHF Training aufzeichnen")


class GenerateResponse(BaseModel):
    response: str
    model_used: str
    latency_ms: int
    rag_context_used: bool
    user_profile_applied: bool
    rlhf_session_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    rlhf_session_id: str = Field(..., description="RLHF Session ID")
    outcome: str = Field(..., description="Outcome: converted, positive_reply, negative_reply, no_reply, unknown")
    user_rating: Optional[int] = Field(None, ge=1, le=5, description="User Bewertung 1-5")
    response_used: bool = Field(default=False, description="Wurde die Antwort verwendet?")
    edited_response: Optional[str] = Field(None, description="Editierte Version der Antwort")


class FeedbackResponse(BaseModel):
    success: bool
    message: str


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., description="Suchbegriff")
    node_types: Optional[List[str]] = Field(None, description="Zu suchende Node-Typen")
    limit: int = Field(default=10, ge=1, le=50)


class KnowledgeNode(BaseModel):
    node_id: str
    node_type: str
    node_key: str
    label: str
    properties: Dict[str, Any]
    similarity: float


class KnowledgeSearchResponse(BaseModel):
    nodes: List[KnowledgeNode]
    total: int


class UserProfileResponse(BaseModel):
    user_id: str
    preferred_tone: str
    avg_message_length: int
    emoji_usage_level: int
    formality_score: float
    sales_style: str
    total_conversations: int
    total_conversions: int
    conversion_rate: float
    contribute_to_global_learning: bool


class UpdateProfileRequest(BaseModel):
    preferred_tone: Optional[str] = None
    avg_message_length: Optional[int] = None
    emoji_usage_level: Optional[int] = Field(None, ge=0, le=5)
    formality_score: Optional[float] = Field(None, ge=0, le=1)
    sales_style: Optional[str] = None
    contribute_to_global_learning: Optional[bool] = None


class HealthResponse(BaseModel):
    status: str
    ollama_available: bool
    rag_enabled: bool
    rlhf_enabled: bool
    model_name: str


# ═══════════════════════════════════════════════════════════════════════════════
# DEPENDENCY: Engine Instance
# ═══════════════════════════════════════════════════════════════════════════════

_engine_instance: Optional[CollectiveIntelligenceEngine] = None


async def get_ci_engine(db=Depends(get_supabase)) -> CollectiveIntelligenceEngine:
    """Dependency für Collective Intelligence Engine"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = create_collective_intelligence_engine(db, prefer_groq=True)
    return _engine_instance


def get_user_id(x_user_id: str = Header(default="demo-user")) -> str:
    """Extrahiert User-ID aus Header"""
    return x_user_id


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/health", response_model=HealthResponse)
async def health_check(engine: CollectiveIntelligenceEngine = Depends(get_ci_engine)):
    """
    Health Check für Collective Intelligence System
    
    Prüft ob Self-Hosted LLM verfügbar ist.
    """
    return HealthResponse(
        status="healthy" if engine.llm_available else "degraded",
        ollama_available=engine.llm_available,
        rag_enabled=engine.knowledge_graph is not None,
        rlhf_enabled=True,
        model_name=engine.llm.model_name if engine.llm else "fallback:openai",
    )


@router.post("/generate", response_model=GenerateResponse)
async def generate_response(
    request: GenerateRequest,
    user_id: str = Depends(get_user_id),
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Generiert eine KI-Antwort mit kollektivem Wissen
    
    Formel: Antwort = LLM(W_Global | Prompt + RAG_Context + D_User)
    
    - Lädt User Learning Profile (D_User)
    - Sucht relevantes Wissen im Knowledge Graph (RAG)
    - Generiert Antwort mit Self-Hosted LLM (W_Global)
    - Zeichnet für RLHF auf (wenn aktiviert)
    """
    try:
        # Input Type validieren
        try:
            input_type = InputType(request.input_type)
        except ValueError:
            input_type = InputType.MESSAGE_GENERATION
        
        result = await engine.generate_response(
            user_id=user_id,
            prompt=request.prompt,
            input_type=input_type,
            context=request.context,
            use_rag=request.use_rag,
            record_for_rlhf=request.record_for_rlhf,
        )
        
        return GenerateResponse(
            response=result.response,
            model_used=result.model_used,
            latency_ms=result.latency_ms,
            rag_context_used=result.rag_context_used,
            user_profile_applied=result.user_profile_applied,
            rlhf_session_id=result.rlhf_session_id,
        )
        
    except Exception as e:
        logger.exception(f"Error generating response: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback", response_model=FeedbackResponse)
async def record_feedback(
    request: FeedbackRequest,
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Zeichnet RLHF Feedback auf
    
    Wird nach User-Interaktion aufgerufen:
    - User verwendet Antwort → response_used: true
    - User bewertet Antwort → user_rating: 1-5
    - Lead konvertiert → outcome: 'converted'
    """
    try:
        # Outcome validieren
        try:
            outcome = Outcome(request.outcome)
        except ValueError:
            outcome = Outcome.UNKNOWN
        
        await engine.record_feedback(
            rlhf_session_id=request.rlhf_session_id,
            outcome=outcome,
            user_rating=request.user_rating,
            response_used=request.response_used,
            edited_response=request.edited_response,
        )
        
        return FeedbackResponse(success=True, message="Feedback recorded")
        
    except Exception as e:
        logger.exception(f"Error recording feedback: {e}")
        return FeedbackResponse(success=False, message=str(e))


@router.post("/knowledge/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    request: KnowledgeSearchRequest,
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Semantische Suche im Knowledge Graph
    
    Nutzt pgvector für Embedding-basierte Similarity Search.
    """
    if not engine.knowledge_graph:
        raise HTTPException(status_code=503, detail="Knowledge Graph not available")
    
    try:
        result = await engine.knowledge_graph.semantic_search(
            query=request.query,
            node_types=request.node_types,
            limit=request.limit,
        )
        
        nodes = [
            KnowledgeNode(
                node_id=result.node_ids[i],
                node_type="unknown",
                node_key="",
                label=result.contents[i].split(":")[0] if ":" in result.contents[i] else result.contents[i],
                properties=result.metadata[i] if i < len(result.metadata) else {},
                similarity=result.similarities[i],
            )
            for i in range(len(result.node_ids))
        ]
        
        return KnowledgeSearchResponse(nodes=nodes, total=len(nodes))
        
    except Exception as e:
        logger.exception(f"Error searching knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str = Depends(get_user_id),
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Holt das User Learning Profile (D_User)
    """
    try:
        profile = await engine.user_profile_service.get_user_profile(user_id)
        
        return UserProfileResponse(
            user_id=profile.user_id,
            preferred_tone=profile.preferred_tone,
            avg_message_length=profile.avg_message_length,
            emoji_usage_level=profile.emoji_usage_level,
            formality_score=profile.formality_score,
            sales_style=profile.sales_style,
            total_conversations=profile.total_conversations if hasattr(profile, 'total_conversations') else 0,
            total_conversions=profile.total_conversions if hasattr(profile, 'total_conversions') else 0,
            conversion_rate=profile.conversion_rate if hasattr(profile, 'conversion_rate') else 0.0,
            contribute_to_global_learning=profile.contribute_to_global_learning,
        )
        
    except Exception as e:
        logger.exception(f"Error getting profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    request: UpdateProfileRequest,
    user_id: str = Depends(get_user_id),
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Aktualisiert das User Learning Profile
    """
    try:
        updates = {}
        if request.preferred_tone is not None:
            updates["preferred_tone"] = request.preferred_tone
        if request.avg_message_length is not None:
            updates["avg_message_length"] = request.avg_message_length
        if request.emoji_usage_level is not None:
            updates["emoji_usage_level"] = request.emoji_usage_level
        if request.formality_score is not None:
            updates["formality_score"] = request.formality_score
        if request.sales_style is not None:
            updates["sales_style"] = request.sales_style
        if request.contribute_to_global_learning is not None:
            updates["contribute_to_global_learning"] = request.contribute_to_global_learning
        
        if updates:
            await engine.user_profile_service.update_user_profile(user_id, updates)
        
        # Aktualisiertes Profil zurückgeben
        return await get_user_profile(user_id, engine)
        
    except Exception as e:
        logger.exception(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/opt-out")
async def set_learning_opt_out(
    opt_out: bool = True,
    contact_ids: Optional[List[str]] = None,
    user_id: str = Depends(get_user_id),
    engine: CollectiveIntelligenceEngine = Depends(get_ci_engine),
):
    """
    Setzt Opt-Out für kollektives Lernen (Governance)
    
    - opt_out=True: User-Daten werden nicht für Training verwendet
    - contact_ids: Spezifische Kontakte vom Training ausschließen
    """
    try:
        await engine.user_profile_service.set_opt_out(user_id, opt_out, contact_ids)
        return {"success": True, "opt_out": opt_out, "contact_ids": contact_ids}
        
    except Exception as e:
        logger.exception(f"Error setting opt-out: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/analytics/dashboard")
async def get_learning_dashboard(
    days: int = 30,
    db=Depends(get_supabase),
):
    """
    Holt das Global Learning Dashboard
    """
    try:
        from datetime import datetime, timedelta
        
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        result = db.table("rlhf_feedback_sessions").select(
            "created_at, outcome, composite_reward, user_id"
        ).gte("created_at", start_date).execute()
        
        # Aggregation
        by_date = {}
        for row in result.data or []:
            date = row["created_at"].split("T")[0]
            if date not in by_date:
                by_date[date] = {
                    "date": date,
                    "total_sessions": 0,
                    "conversions": 0,
                    "positive_replies": 0,
                    "reward_sum": 0,
                    "active_users": set(),
                }
            
            entry = by_date[date]
            entry["total_sessions"] += 1
            entry["active_users"].add(row["user_id"])
            
            if row["outcome"] == "converted":
                entry["conversions"] += 1
            if row["outcome"] == "positive_reply":
                entry["positive_replies"] += 1
            if row["composite_reward"]:
                entry["reward_sum"] += row["composite_reward"]
        
        # Finalisierung
        dashboard = []
        for date, entry in sorted(by_date.items(), reverse=True):
            dashboard.append({
                "date": entry["date"],
                "total_sessions": entry["total_sessions"],
                "conversions": entry["conversions"],
                "positive_replies": entry["positive_replies"],
                "avg_reward": entry["reward_sum"] / entry["total_sessions"] if entry["total_sessions"] > 0 else 0,
                "active_users": len(entry["active_users"]),
            })
        
        return {"dashboard": dashboard, "total_days": len(dashboard)}
        
    except Exception as e:
        logger.exception(f"Error getting dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/user-performance")
async def get_user_performance(
    user_id: str = Depends(get_user_id),
    db=Depends(get_supabase),
):
    """
    Holt User-spezifische Performance-Metriken
    """
    try:
        result = db.table("rlhf_feedback_sessions").select(
            "outcome, user_rating, input_context"
        ).eq("user_id", user_id).not_.is_("outcome", "null").execute()
        
        sessions = result.data or []
        conversions = len([s for s in sessions if s["outcome"] == "converted"])
        ratings = [s["user_rating"] for s in sessions if s.get("user_rating")]
        
        # Top Strategien
        strategy_counts = {}
        for session in [s for s in sessions if s["outcome"] == "converted"]:
            strategy = (session.get("input_context") or {}).get("objection_category", "general")
            strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1
        
        top_strategies = sorted(strategy_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_sessions": len(sessions),
            "conversions": conversions,
            "conversion_rate": (conversions / len(sessions) * 100) if sessions else 0,
            "avg_rating": sum(ratings) / len(ratings) if ratings else 0,
            "top_strategies": [s[0] for s in top_strategies],
        }
        
    except Exception as e:
        logger.exception(f"Error getting user performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]

