"""
AI API Routes für Sales Flow AI.
Endpoints für CHIEF Coach, Feedback-Learning und Follow-up Generation.
"""

from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.ai_service import get_sales_flow_ai
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai", "chief"])


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════


class ChatRequest(BaseModel):
    """Request für AI Chat."""
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: Optional[List[Dict]] = Field(default=[])
    lead_id: Optional[str] = None
    user_id: Optional[str] = None  # Falls nicht aus Auth


class ChatResponse(BaseModel):
    """Response vom AI Chat."""
    response: str
    conversation_id: str
    tokens_used: int
    memories_used: int
    patterns_used: int
    response_time_ms: Optional[int] = None


class FeedbackRequest(BaseModel):
    """Request für Feedback-Learning."""
    message: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)
    feedback: str = Field(..., pattern="^(positive|negative)$")
    pattern_type: Optional[str] = Field(
        default="general",
        pattern="^(objection|closing|question|opener|followup|general)$"
    )
    user_id: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Response vom Feedback-Learning."""
    status: str
    pattern_id: Optional[str] = None
    new_success_rate: Optional[float] = None
    message: Optional[str] = None


class FollowUpRequest(BaseModel):
    """Request für Follow-up Generation."""
    lead_id: str
    trigger_type: str = Field(
        ...,
        pattern="^(inactivity|after_meeting|after_demo|no_response|interest_shown|custom)$"
    )
    channel: str = Field(
        default="email",
        pattern="^(email|whatsapp|sms|call|in_app)$"
    )
    user_id: Optional[str] = None


class FollowUpResponse(BaseModel):
    """Response von Follow-up Generation."""
    subject: Optional[str] = None
    body: str
    channel: str
    lead_id: str
    template_id: Optional[str] = None
    trigger_type: str
    error: Optional[str] = None


class InsightResponse(BaseModel):
    """Response für Strategic Insights."""
    id: str
    insight_type: str
    explanation: str
    insight_score: float
    evidence_count: int
    related_tags: Optional[List[str]] = None


class PatternResponse(BaseModel):
    """Response für Learned Patterns."""
    id: str
    pattern_type: str
    trigger_phrase: str
    best_response: str
    success_rate: float
    usage_count: int
    context_tags: Optional[List[str]] = None


# ═══════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat mit dem CHIEF AI Coach.
    
    Nutzt RAG (Retrieval Augmented Generation) um relevante
    vergangene Gespräche und gelernte Patterns einzubeziehen.
    """
    try:
        ai = get_sales_flow_ai()
        
        # Lead Context holen wenn lead_id angegeben
        lead_context = None
        if request.lead_id:
            try:
                from app.db.database import get_supabase
                supabase = get_supabase()
                lead = supabase.table('leads').select('*').eq('id', request.lead_id).single().execute()
                lead_context = lead.data if lead.data else None
            except Exception as e:
                logger.warning(f"Lead nicht gefunden: {e}")

        # User ID bestimmen (aus Request oder Default)
        user_id = request.user_id or "anonymous"

        result = await ai.generate_reply(
            user_id=user_id,
            message=request.message,
            conversation_history=request.conversation_history,
            lead_context=lead_context
        )

        if 'error' in result:
            raise HTTPException(status_code=500, detail=result['error'])

        return ChatResponse(
            response=result['response'],
            conversation_id=result['conversation_id'],
            tokens_used=result['tokens_used'],
            memories_used=result['memories_used'],
            patterns_used=result['patterns_used'],
            response_time_ms=result.get('response_time_ms')
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Feedback für AI Antwort - zum Lernen.
    
    Positives Feedback erstellt oder verstärkt Patterns.
    Negatives Feedback schwächt Patterns ab.
    """
    try:
        ai = get_sales_flow_ai()
        user_id = request.user_id or "anonymous"

        result = await ai.learn_from_feedback(
            user_id=user_id,
            message=request.message,
            response=request.response,
            feedback=request.feedback,
            pattern_type=request.pattern_type
        )

        return FeedbackResponse(
            status=result.get('status', 'unknown'),
            pattern_id=result.get('pattern_id'),
            new_success_rate=result.get('new_success_rate'),
            message=result.get('message')
        )

    except Exception as e:
        logger.error(f"Feedback-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-followup", response_model=FollowUpResponse)
async def generate_followup(request: FollowUpRequest):
    """
    Generiert personalisiertes Follow-up für einen Lead.
    
    Nutzt Templates und GPT-4 um personalisierte
    Follow-up Nachrichten zu erstellen.
    """
    try:
        ai = get_sales_flow_ai()

        result = await ai.generate_followup(
            lead_id=request.lead_id,
            trigger_type=request.trigger_type,
            channel=request.channel,
            user_id=request.user_id
        )

        if 'error' in result:
            return FollowUpResponse(
                body="",
                channel=request.channel,
                lead_id=request.lead_id,
                trigger_type=request.trigger_type,
                error=result['error']
            )

        return FollowUpResponse(
            subject=result.get('subject'),
            body=result['body'],
            channel=result['channel'],
            lead_id=result['lead_id'],
            template_id=result.get('template_id'),
            trigger_type=result['trigger_type']
        )

    except Exception as e:
        logger.error(f"Follow-up Generation Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
async def get_insights(
    user_id: Optional[str] = Query(None),
    insight_type: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Holt strategische AI Insights.
    
    Insights werden aus aggregierten Daten generiert und
    zeigen Trends und Best Practices.
    """
    try:
        ai = get_sales_flow_ai()

        insights = await ai.get_strategic_insights(
            user_id=user_id,
            insight_type=insight_type,
            limit=limit
        )

        return {"insights": insights, "count": len(insights)}

    except Exception as e:
        logger.error(f"Insights-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns")
async def get_learned_patterns(
    pattern_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    min_success_rate: float = Query(0.0, ge=0.0, le=1.0)
):
    """
    Holt gelernte Patterns.
    
    Patterns werden aus positivem Feedback gelernt und
    nach Erfolgsrate sortiert.
    """
    try:
        ai = get_sales_flow_ai()

        patterns = await ai.get_learned_patterns(
            pattern_type=pattern_type,
            limit=limit,
            min_success_rate=min_success_rate
        )

        return {"patterns": patterns, "count": len(patterns)}

    except Exception as e:
        logger.error(f"Patterns-Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health Check für den AI Service."""
    try:
        ai = get_sales_flow_ai()
        return {
            "status": "healthy",
            "service": "CHIEF AI Coach",
            "model": ai.chat_model,
            "embedding_model": ai.embedding_model
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════════════════
# QUICK ACTIONS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════


class QuickActionRequest(BaseModel):
    """Request für Quick Actions."""
    action_type: str = Field(
        ...,
        pattern="^(objection_help|opener_suggest|closing_tip|followup_suggest)$"
    )
    context: str = Field(..., min_length=1, max_length=500)
    user_id: Optional[str] = None


@router.post("/quick-action")
async def quick_action(request: QuickActionRequest):
    """
    Schnelle AI-Aktionen für häufige Sales-Situationen.
    """
    try:
        ai = get_sales_flow_ai()

        action_prompts = {
            "objection_help": f"Wie kann ich auf diesen Einwand reagieren: '{request.context}'. Gib mir 2-3 konkrete Formulierungen.",
            "opener_suggest": f"Schlage einen guten Gesprächseinstieg vor für diese Situation: '{request.context}'",
            "closing_tip": f"Wie kann ich dieses Gespräch zum Abschluss bringen: '{request.context}'",
            "followup_suggest": f"Was wäre eine gute Follow-up Nachricht für: '{request.context}'"
        }

        message = action_prompts.get(request.action_type, request.context)

        result = await ai.generate_reply(
            user_id=request.user_id or "anonymous",
            message=message,
            store_memory=False  # Quick Actions nicht in Memory speichern
        )

        return {
            "action_type": request.action_type,
            "suggestion": result['response'],
            "tokens_used": result['tokens_used']
        }

    except Exception as e:
        logger.error(f"Quick Action Fehler: {e}")
        raise HTTPException(status_code=500, detail=str(e))

