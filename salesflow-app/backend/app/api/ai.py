"""
Sales Flow AI - AI Chat API
CHIEF Coach Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user, User
from app.services.ai_service import ai_service
from app.services.chief_context import chief_context_service, format_context_for_llm

router = APIRouter()


# ===========================================
# MODELS
# ===========================================

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_history: Optional[List[ChatMessage]] = None
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    tokens_used: int = 0
    memories_used: int = 0
    patterns_used: int = 0
    conversation_id: Optional[str] = None


class QuickActionRequest(BaseModel):
    action_type: str = Field(..., description="Typ der Quick Action")
    context: str = Field(..., description="Kontext/Prompt")
    user_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    message: str
    response: str
    feedback: str  # "positive" oder "negative"
    pattern_type: Optional[str] = "general"
    user_id: Optional[str] = None
    comment: Optional[str] = None


# ===========================================
# ENDPOINTS
# ===========================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Chat mit CHIEF Coach.
    Unterstützt Konversationshistorie und Kontext.
    """
    # Prepare conversation history
    history = None
    if request.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    
    # Get user context
    user_context = None
    if user:
        user_context = {
            "role": user.role,
            "name": user.full_name
        }
    
    try:
        result = await ai_service.chat(
            message=request.message,
            conversation_history=history,
            user_context=user_context,
            company_context=request.context
        )
        
        return ChatResponse(
            response=result["response"],
            tokens_used=result.get("tokens_used", 0),
            memories_used=result.get("memories_used", 0),
            patterns_used=result.get("patterns_used", 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-action")
async def quick_action(
    request: QuickActionRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Quick Actions für häufige Anfragen.
    
    Unterstützte action_types:
    - objection_help: Einwandbehandlung
    - opener_suggest: Opener vorschlagen
    - closing_tip: Closing Tipps
    - followup_suggest: Follow-up Ideen
    """
    action_prompts = {
        "objection_help": "Hilf mir bei diesem Einwand: ",
        "opener_suggest": "Schlage einen guten Opener vor für: ",
        "closing_tip": "Gib mir einen Closing-Tipp für: ",
        "followup_suggest": "Erstelle eine Follow-up Nachricht für: "
    }
    
    base_prompt = action_prompts.get(request.action_type, "")
    full_prompt = f"{base_prompt}{request.context}"
    
    try:
        result = await ai_service.chat(
            message=full_prompt,
            conversation_history=None,
            user_context={"role": user.role if user else "rep"}
        )
        
        return {
            "suggestion": result["response"],
            "action_type": request.action_type,
            "tokens_used": result.get("tokens_used", 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Feedback zu KI-Antworten speichern.
    Wird für Modell-Verbesserung genutzt.
    """
    # In production: Save to database
    # For now: Just acknowledge
    
    return {
        "success": True,
        "feedback_type": request.feedback,
        "message": "Danke für dein Feedback! Ich lerne daraus."
    }


# ===========================================
# CHIEF CONTEXT ENDPOINTS
# ===========================================

class ChiefContextRequest(BaseModel):
    """Request für CHIEF Context."""
    company_id: str = Field(..., description="Company ID")
    format: Optional[str] = Field("json", description="Format: 'json' oder 'text'")


class ChiefContextResponse(BaseModel):
    """Response mit CHIEF Context."""
    context: Optional[Dict[str, Any]] = None
    formatted_text: Optional[str] = None
    success: bool = True
    error: Optional[str] = None


@router.post("/chief/context", response_model=ChiefContextResponse)
async def get_chief_context(
    request: ChiefContextRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Holt den kompletten CHIEF Context für einen User.
    
    Enthält:
    - Daily Flow Status (Fortschritt heute)
    - Remaining Counts (was noch fehlt)
    - Lead Suggestions (passende Leads)
    - Vertical Profile (Branchen-Kontext)
    - Goal Summary (aktuelles Ziel)
    
    Wird vom Frontend genutzt um CHIEF mit aktuellem Kontext zu füttern.
    """
    if not user:
        return ChiefContextResponse(
            success=False,
            error="Nicht authentifiziert"
        )
    
    try:
        context = chief_context_service.get_context(
            user_id=user.id,
            company_id=request.company_id,
            user_name=user.full_name,
        )
        
        if context is None:
            return ChiefContextResponse(
                success=False,
                error="Konnte Context nicht laden"
            )
        
        formatted_text = None
        if request.format == "text":
            formatted_text = format_context_for_llm(context)
        
        return ChiefContextResponse(
            context=dict(context),
            formatted_text=formatted_text,
            success=True,
        )
        
    except Exception as e:
        return ChiefContextResponse(
            success=False,
            error=str(e)
        )


@router.post("/chief/chat")
async def chief_chat(
    request: ChatRequest,
    user: Optional[User] = Depends(get_current_user)
):
    """
    Chat mit CHIEF Coach - mit automatischem Context.
    
    Erweitert den Standard-Chat um:
    - Automatisches Laden des CHIEF Context
    - Personalisierte System Prompts basierend auf Status
    - Lead-basierte Vorschläge
    """
    # Prepare conversation history
    history = None
    if request.conversation_history:
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
    
    # Build CHIEF Context wenn user_id und company_id vorhanden
    chief_context = None
    if user and request.context and request.context.get("company_id"):
        chief_context = chief_context_service.get_context(
            user_id=user.id,
            company_id=request.context["company_id"],
            user_name=user.full_name,
        )
    
    # Build enriched context
    enriched_context = request.context or {}
    if chief_context:
        enriched_context["chief_context"] = format_context_for_llm(chief_context)
        enriched_context["remaining_today"] = dict(chief_context["remaining_today"])
        enriched_context["suggested_leads"] = [dict(l) for l in chief_context["suggested_leads"]]
    
    try:
        result = await ai_service.chat(
            message=request.message,
            conversation_history=history,
            user_context={
                "role": user.role if user else "rep",
                "name": user.full_name if user else None,
            },
            company_context=enriched_context
        )
        
        return ChatResponse(
            response=result["response"],
            tokens_used=result.get("tokens_used", 0),
            memories_used=result.get("memories_used", 0),
            patterns_used=result.get("patterns_used", 0)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

