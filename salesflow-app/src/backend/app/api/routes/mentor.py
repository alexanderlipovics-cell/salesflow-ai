"""
╔════════════════════════════════════════════════════════════════════════════╗
║  MENTOR AI API v2                                                          ║
║  /api/v2/mentor/* Endpoints                                                ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- POST /chat - Chat mit MENTOR
- GET /context - Aktuellen Kontext abrufen
- POST /feedback - Feedback zu Antwort geben
- POST /quick-action - Quick Actions für häufige Anfragen
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from supabase import Client

from ...db.deps import get_db, get_current_user, CurrentUser
from ...services.mentor import MentorService, get_mentor_service


# ═══════════════════════════════════════════════════════════════════════════
# ROUTER
# ═══════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/mentor", tags=["mentor", "ai"])


# ═══════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    """Eine Nachricht im Chatverlauf."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class MentorChatRequest(BaseModel):
    """Request für MENTOR Chat."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="User-Nachricht an MENTOR"
    )
    include_context: bool = Field(
        default=True,
        description="Daily Flow Kontext einbeziehen?"
    )
    conversation_history: List[ChatMessage] = Field(
        default_factory=list,
        description="Bisheriger Chatverlauf"
    )
    disc_type: Optional[str] = Field(
        None,
        pattern="^[DISG]$",
        description="DISC-Typ für Lead-Anpassung"
    )


class ActionResponse(BaseModel):
    """Ein Action Tag."""
    action: str
    params: List[str] = []


class ContextSummary(BaseModel):
    """Zusammenfassung des Kontexts."""
    daily_flow_completion: Optional[float] = None
    suggested_leads_count: int = 0
    streak_days: int = 0


class MentorChatResponse(BaseModel):
    """Response von MENTOR."""
    response: str = Field(..., description="MENTOR's Antwort")
    actions: List[ActionResponse] = Field(
        default_factory=list,
        description="Extrahierte Actions für Frontend"
    )
    tokens_used: Optional[int] = Field(
        None,
        description="Verbrauchte Tokens (geschätzt)"
    )
    context_summary: Optional[ContextSummary] = Field(
        None,
        description="Zusammenfassung des verwendeten Kontexts"
    )
    compliance_warning: Optional[dict] = Field(
        None,
        description="Compliance-Warnung falls Verstöße gefunden wurden"
    )


class MentorContextResponse(BaseModel):
    """Aktueller Kontext."""
    user_name: str
    vertical: str
    vertical_label: str
    daily_flow: Optional[dict] = None
    remaining_today: Optional[dict] = None
    suggested_leads: Optional[List[dict]] = None
    current_goal: Optional[dict] = None
    streak_days: int = 0


class FeedbackRequest(BaseModel):
    """Request für Feedback."""
    interaction_id: str
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = Field(None, max_length=1000)
    was_helpful: Optional[bool] = None


class FeedbackResponse(BaseModel):
    """Response für Feedback."""
    success: bool
    message: str


class QuickActionRequest(BaseModel):
    """Request für Quick Action."""
    action_type: str = Field(
        ...,
        description="Typ der Quick Action: objection_help, opener_suggest, closing_tip, followup_suggest, motivation, dmo_status"
    )
    context: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Kontext/Prompt für die Action"
    )


class QuickActionResponse(BaseModel):
    """Response für Quick Action."""
    suggestion: str = Field(..., description="Generierte Antwort/Vorschlag")
    action_type: str
    tokens_used: Optional[int] = 0


# ═══════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/chat", response_model=MentorChatResponse)
async def mentor_chat(
    payload: MentorChatRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Chat mit MENTOR – dem AI Sales-Coach.
    
    ## Features
    
    - **Kontextbezogen**: Nutzt Daily Flow, Leads, Goals
    - **Personalisiert**: Passt sich an User und Vertical an
    - **Actionable**: Gibt konkrete nächste Schritte
    - **Action Tags**: Kann Frontend-Actions auslösen
    
    ## Action Tags
    
    MENTOR kann in seinen Antworten Action Tags einbauen:
    - `FOLLOWUP_LEADS` - Öffnet Follow-up für Leads
    - `NEW_CONTACT_LIST` - Zeigt neue Kontakte
    - `COMPOSE_MESSAGE` - Öffnet Message Composer
    - `OBJECTION_HELP` - Öffnet Objection Brain
    
    ## Conversation History
    
    Für Kontext können vorherige Nachrichten mitgesendet werden:
    ```json
    {
      "message": "Und wie mache ich das am besten?",
      "conversation_history": [
        {"role": "user", "content": "Wie behandle ich 'keine Zeit'?"},
        {"role": "assistant", "content": "..."}
      ]
    }
    ```
    """
    service = get_mentor_service(db)
    
    # Conversation History konvertieren
    history = [
        {"role": m.role, "content": m.content}
        for m in payload.conversation_history
    ]
    
    try:
        result = await service.chat(
            user_id=current_user.id,
            message=payload.message,
            company_id=current_user.company_id,
            user_name=current_user.name,
            include_context=payload.include_context,
            conversation_history=history,
            disc_type=payload.disc_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"MENTOR chat failed: {str(e)}"
        )
    
    # Response formatieren
    actions = [
        ActionResponse(action=a.action, params=a.params)
        for a in result.actions
    ]
    
    context_summary = None
    if result.context_summary:
        context_summary = ContextSummary(**result.context_summary)
    
    return MentorChatResponse(
        response=result.response,
        actions=actions,
        tokens_used=result.tokens_used,
        context_summary=context_summary,
        compliance_warning=result.compliance_warning,
    )


@router.get("/context", response_model=MentorContextResponse)
async def get_mentor_context(
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Gibt den aktuellen Kontext zurück.
    
    Nützlich für das Frontend um den aktuellen Status anzuzeigen
    ohne einen vollständigen Chat zu starten.
    """
    service = get_mentor_service(db)
    
    try:
        context = await service.get_context(
            user_id=current_user.id,
            company_id=current_user.company_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load context: {str(e)}"
        )
    
    return MentorContextResponse(
        user_name=context.user_name,
        vertical=context.vertical,
        vertical_label=context.vertical_label,
        daily_flow=context.daily_flow,
        remaining_today=context.remaining_today,
        suggested_leads=context.suggested_leads,
        current_goal=context.current_goal,
        streak_days=context.streak_days,
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    payload: FeedbackRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Speichert Feedback zu einer MENTOR Antwort.
    
    ## Feedback-Optionen
    
    - `rating`: 1-5 Sterne
    - `feedback`: Freitext-Feedback
    - `was_helpful`: War die Antwort hilfreich?
    """
    service = get_mentor_service(db)
    
    success = await service.submit_feedback(
        interaction_id=payload.interaction_id,
        user_id=current_user.id,
        rating=payload.rating,
        feedback=payload.feedback,
        was_helpful=payload.was_helpful,
    )
    
    if success:
        return FeedbackResponse(
            success=True,
            message="Feedback gespeichert. Danke!"
        )
    
    raise HTTPException(
        status_code=500,
        detail="Feedback konnte nicht gespeichert werden"
    )


@router.post("/quick-action", response_model=QuickActionResponse)
async def quick_action(
    payload: QuickActionRequest,
    db: Client = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Quick Actions für häufige Anfragen.
    
    ## Unterstützte Action Types
    
    - `objection_help`: Einwandbehandlung (z.B. "keine Zeit", "zu teuer")
    - `opener_suggest`: Opener vorschlagen für neuen Kontakt
    - `closing_tip`: Closing-Tipps für warme Leads
    - `followup_suggest`: Follow-up Nachricht generieren
    - `motivation`: Motivations-Tipp für heute
    - `dmo_status`: DMO Status-Zusammenfassung
    
    ## Beispiel
    
    ```json
    {
      "action_type": "objection_help",
      "context": "Der Kunde sagt 'keine Zeit'"
    }
    ```
    """
    service = get_mentor_service(db)
    
    # Action-spezifische Prompts
    action_prompts = {
        "objection_help": "Hilf mir bei diesem Einwand: ",
        "opener_suggest": "Schlage einen guten Opener vor für: ",
        "closing_tip": "Gib mir einen Closing-Tipp für: ",
        "followup_suggest": "Erstelle eine Follow-up Nachricht für: ",
        "motivation": "Gib mir einen kurzen Motivations-Tipp für heute. Kontext: ",
        "dmo_status": "Zeig mir eine kurze Zusammenfassung meines DMO Status. Kontext: ",
    }
    
    base_prompt = action_prompts.get(payload.action_type, "")
    full_message = f"{base_prompt}{payload.context}"
    
    try:
        result = await service.chat(
            user_id=current_user.id,
            message=full_message,
            company_id=current_user.company_id,
            user_name=current_user.name,
            include_context=True,  # Quick Actions nutzen Kontext
            conversation_history=[],
        )
        
        return QuickActionResponse(
            suggestion=result.response,
            action_type=payload.action_type,
            tokens_used=result.tokens_used,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Quick Action failed: {str(e)}"
        )


@router.get("/status")
async def mentor_status():
    """Health Check für MENTOR Service."""
    from ...core.config import settings
    
    llm_status = "configured" if settings.OPENAI_API_KEY or settings.ANTHROPIC_API_KEY else "not_configured"
    
    return {
        "status": "online",
        "version": "2.0",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_status": llm_status,
        "features": [
            "context_aware",
            "action_tags",
            "disc_adaptation",
            "conversation_history",
            "feedback_tracking",
            "quick_actions",
        ],
    }

