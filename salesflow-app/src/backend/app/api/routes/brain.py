"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES BRAIN API ROUTES v2                                                 ║
║  Self-Learning Rules, Detection, Push Notifications                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    
    RULES:
    - POST   /brain/rules              - Neue Regel erstellen
    - GET    /brain/rules              - Regeln für Kontext abrufen
    - GET    /brain/rules/{id}         - Einzelne Regel abrufen
    - PATCH  /brain/rules/{id}         - Regel aktualisieren
    - DELETE /brain/rules/{id}         - Regel deaktivieren
    
    CORRECTIONS (v2 - mit Detection):
    - POST   /brain/corrections/detect  - Korrektur erkennen (NEU)
    - POST   /brain/corrections/feedback - Feedback verarbeiten (NEU)
    - POST   /brain/corrections        - Korrektur loggen
    - GET    /brain/corrections/pending - Unverarbeitete Korrekturen
    - POST   /brain/corrections/{id}/analyze - Korrektur analysieren
    
    PUSH:
    - GET    /brain/push/schedule      - Push-Schedule abrufen
    - PUT    /brain/push/schedule      - Push-Schedule aktualisieren
    - POST   /brain/push/register-token - Push Token registrieren
    - GET    /brain/push/morning-briefing - Morning Briefing generieren
    - GET    /brain/push/evening-recap    - Evening Recap generieren
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
from uuid import UUID

from app.db.deps import get_db, get_current_user, CurrentUser
from app.api.schemas.brain import (
    # Rules
    RuleCreate, RuleUpdate, RuleResponse, RulesForContext,
    # Corrections
    CorrectionCreate, CorrectionResponse, CorrectionFeedback, CorrectionAnalysis,
    # Detection v2
    CorrectionDetectionRequest, CorrectionDetectionResponse, SuggestedRulePreview,
    CorrectionFeedbackRequest, CorrectionFeedbackResponse,
    # Push
    PushScheduleUpdate, PushScheduleResponse, PushTokenRegister,
    MorningBriefing, EveningRecap,
    # CHIEF
    RulesForChief,
)
from app.services.brain import (
    SalesBrainService,
    CorrectionDetectionService,
    CorrectionAnalysisService,
)
from app.services.push import PushService, PushContentGenerator
from app.services.gamification import GamificationService

router = APIRouter(prefix="/brain", tags=["brain"])


# =============================================================================
# RULES ENDPOINTS
# =============================================================================

@router.post("/rules", response_model=RuleResponse)
async def create_rule(
    rule: RuleCreate,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt eine neue Lernregel manuell.
    
    - **rule_type**: Typ der Regel (tone, structure, vocabulary, etc.)
    - **scope**: personal (nur für User) oder team (für alle im Team)
    - **priority**: override > high > normal > suggestion
    - **instruction**: Die eigentliche Anweisung für CHIEF
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    service = SalesBrainService(db)
    return service.create_rule(
        company_id=current_user.company_id,
        user_id=current_user.id,
        rule=rule,
    )


@router.get("/rules", response_model=List[RuleResponse])
async def get_rules(
    channel: Optional[str] = Query(None, description="Filter nach Kanal (z.B. instagram_dm)"),
    lead_status: Optional[str] = Query(None, description="Filter nach Lead-Status (z.B. cold, warm)"),
    message_type: Optional[str] = Query(None, description="Filter nach Nachrichtentyp (first_contact, followup, reactivation)"),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt relevante Regeln für den gegebenen Kontext.
    
    Gibt Personal + Team + Global Regeln zurück, sortiert nach Priorität.
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    service = SalesBrainService(db)
    return service.get_rules_for_context(
        company_id=current_user.company_id,
        user_id=current_user.id,
        context=RulesForContext(
            channel=channel,
            lead_status=lead_status,
            message_type=message_type,
        ),
    )


@router.get("/rules/for-chief", response_model=RulesForChief)
async def get_rules_for_chief(
    channel: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    message_type: Optional[str] = Query(None),
    max_rules: int = Query(10, ge=1, le=20),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Regeln formatiert für den CHIEF Prompt.
    
    Gibt einen formatierten Prompt-Block zurück, der direkt in den
    System-Prompt eingebaut werden kann.
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    service = SalesBrainService(db)
    rules = service.get_rules_for_context(
        company_id=current_user.company_id,
        user_id=current_user.id,
        context=RulesForContext(
            channel=channel,
            lead_status=lead_status,
            message_type=message_type,
        ),
    )
    
    return service.format_rules_for_chief(rules, max_rules)


@router.get("/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: UUID,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt eine einzelne Regel."""
    service = SalesBrainService(db)
    rule = service.get_rule(str(rule_id))
    
    if not rule:
        raise HTTPException(404, "Regel nicht gefunden")
    
    return rule


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: UUID,
    update: RuleUpdate,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Aktualisiert eine Regel."""
    service = SalesBrainService(db)
    rule = service.update_rule(str(rule_id), current_user.id, update)
    
    if not rule:
        raise HTTPException(404, "Regel nicht gefunden")
    
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: UUID,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Deaktiviert eine Regel (Soft Delete)."""
    service = SalesBrainService(db)
    service.deactivate_rule(str(rule_id), current_user.id)
    return {"success": True, "message": "Regel deaktiviert"}


# =============================================================================
# CORRECTIONS ENDPOINTS (v2 - mit Detection)
# =============================================================================

@router.post("/corrections/detect", response_model=CorrectionDetectionResponse)
async def detect_correction(
    request: CorrectionDetectionRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erkennt ob eine Korrektur signifikant ist und das Modal gezeigt werden soll.
    
    Wird nach jeder gesendeten Nachricht aufgerufen um zu prüfen, ob der User
    den CHIEF-Vorschlag geändert hat und daraus eine Regel gelernt werden kann.
    
    Flow:
    1. Detection Service prüft Signifikanz der Änderung
    2. Wenn signifikant → Korrektur wird geloggt
    3. Analysis Service analysiert mit Claude
    4. Response enthält Info ob Modal gezeigt werden soll
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    # 1. Quick client-side-like check
    if request.original_suggestion == request.user_final_text:
        return CorrectionDetectionResponse(
            should_show_modal=False,
            similarity_score=1.0,
            change_significance="none",
            reason="Keine Änderung",
            change_summary=[],
        )
    
    # 2. Detect if significant
    detection_service = CorrectionDetectionService()
    detection_result = detection_service.detect(
        original=request.original_suggestion,
        final=request.user_final_text,
        context={
            "channel": request.channel,
            "lead_status": request.lead_status,
        },
    )
    
    if not detection_result.should_show_modal:
        return CorrectionDetectionResponse(
            should_show_modal=False,
            similarity_score=detection_result.similarity_score,
            change_significance=detection_result.change_significance,
            reason=detection_result.reason,
            change_summary=detection_service.get_change_summary(detection_result.detected_changes),
        )
    
    # 3. Log correction
    brain_service = SalesBrainService(db)
    correction = CorrectionCreate(
        lead_id=request.lead_id,
        original_suggestion=request.original_suggestion,
        user_final_text=request.user_final_text,
        channel=request.channel,
        lead_status=request.lead_status,
        message_type=request.message_type,
    )
    correction_id = brain_service.log_correction(
        company_id=current_user.company_id,
        user_id=current_user.id,
        correction=correction,
    )
    
    # 4. Analyze with Claude (could be async in background)
    suggested_rule = None
    try:
        analysis_service = CorrectionAnalysisService()
        analysis = analysis_service.analyze(
            original=request.original_suggestion,
            corrected=request.user_final_text,
            context={
                "channel": request.channel,
                "lead_status": request.lead_status,
                "message_type": request.message_type,
                "disg_type": request.disg_type,
            },
        )
        
        if analysis.is_learnable and analysis.suggested_rule:
            suggested_rule = SuggestedRulePreview(
                title=analysis.suggested_rule.title,
                instruction=analysis.suggested_rule.instruction,
                rule_type=analysis.suggested_rule.rule_type,
                confidence=analysis.suggested_rule.confidence,
            )
            
            # Update correction with analysis
            db.table("user_corrections").update({
                "ai_analysis": {
                    "is_learnable": analysis.is_learnable,
                    "change_type": analysis.change_type,
                    "change_description": analysis.change_description,
                    "reasoning": analysis.reasoning,
                },
                "suggested_rule": analysis.suggested_rule.model_dump() if analysis.suggested_rule else None,
            }).eq("id", correction_id).execute()
    except Exception as e:
        print(f"Analysis error (non-blocking): {e}")
    
    # 5. Check achievements in background
    background_tasks.add_task(
        check_achievements_after_message,
        db, current_user.id
    )
    
    return CorrectionDetectionResponse(
        should_show_modal=True,
        correction_id=correction_id,
        similarity_score=detection_result.similarity_score,
        change_significance=detection_result.change_significance,
        suggested_rule=suggested_rule,
        change_summary=detection_service.get_change_summary(detection_result.detected_changes),
    )


@router.post("/corrections/feedback", response_model=CorrectionFeedbackResponse)
async def submit_correction_feedback(
    request: CorrectionFeedbackRequest,
    background_tasks: BackgroundTasks,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Verarbeitet User-Feedback aus dem Teach-Modal.
    
    - personal: Erstellt persönliche Regel nur für diesen User
    - team: Erstellt Team-Regel für die ganze Company
    - ignore: Markiert als "nicht lernen"
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    brain_service = SalesBrainService(db)
    
    if request.feedback.value == "ignore":
        # Mark as ignored
        db.table("user_corrections").update({
            "user_feedback": "ignore",
            "status": "ignored",
            "feedback_at": "now()",
        }).eq("id", str(request.correction_id)).execute()
        
        return CorrectionFeedbackResponse(
            success=True,
            rule_created=False,
        )
    
    # Create rule from correction
    feedback = CorrectionFeedback(
        correction_id=request.correction_id,
        feedback=request.feedback,
    )
    
    rule = brain_service.process_feedback(
        company_id=current_user.company_id,
        user_id=current_user.id,
        feedback=feedback,
    )
    
    if rule:
        # Check achievements in background
        background_tasks.add_task(
            check_achievements_after_rule,
            db, current_user.id
        )
        
        return CorrectionFeedbackResponse(
            success=True,
            rule_created=True,
            rule_id=str(rule.id),
            rule_title=rule.title,
        )
    
    return CorrectionFeedbackResponse(
        success=True,
        rule_created=False,
    )


@router.post("/corrections", response_model=dict)
async def log_correction(
    correction: CorrectionCreate,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt eine User-Korrektur.
    
    Wird aufgerufen wenn der User einen CHIEF-Vorschlag ändert bevor er ihn sendet.
    
    HINWEIS: Für die neue Teach-UI sollte stattdessen /corrections/detect verwendet werden.
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    service = SalesBrainService(db)
    correction_id = service.log_correction(
        company_id=current_user.company_id,
        user_id=current_user.id,
        correction=correction,
    )
    
    return {"correction_id": correction_id}


@router.get("/corrections/pending", response_model=List[CorrectionResponse])
async def get_pending_corrections(
    limit: int = Query(10, ge=1, le=50),
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt unverarbeitete Korrekturen die auf Feedback warten.
    
    Nur Korrekturen mit signifikanter Änderung (similarity < 0.9).
    """
    service = SalesBrainService(db)
    return service.get_pending_corrections(current_user.id, limit)


@router.post("/corrections/{correction_id}/analyze", response_model=CorrectionAnalysis)
async def analyze_correction(
    correction_id: UUID,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert eine Korrektur und schlägt ggf. eine Regel vor.
    
    Nutzt Claude um die Änderung zu verstehen und eine passende
    Lernregel zu generieren.
    """
    service = SalesBrainService(db)
    
    try:
        return service.analyze_correction(str(correction_id))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/corrections/feedback", response_model=Optional[RuleResponse])
async def process_correction_feedback(
    feedback: CorrectionFeedback,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Verarbeitet User-Feedback zu einer Korrektur.
    
    - **personal**: Erstellt persönliche Regel nur für diesen User
    - **team**: Erstellt Team-Regel für die ganze Company
    - **ignore**: Markiert als "nicht lernen"
    """
    if not current_user.company_id:
        raise HTTPException(400, "User hat keine Company zugeordnet")
    
    service = SalesBrainService(db)
    return service.process_feedback(
        company_id=current_user.company_id,
        user_id=current_user.id,
        feedback=feedback,
    )


# =============================================================================
# RULE APPLICATION TRACKING
# =============================================================================

@router.post("/rules/{rule_id}/applied")
async def log_rule_applied(
    rule_id: UUID,
    message_id: Optional[UUID] = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Loggt dass eine Regel angewendet wurde."""
    service = SalesBrainService(db)
    application_id = service.log_rule_application(
        rule_id=str(rule_id),
        user_id=current_user.id,
        message_id=str(message_id) if message_id else None,
    )
    return {"application_id": application_id}


@router.post("/rules/application/{application_id}/feedback")
async def log_rule_application_feedback(
    application_id: UUID,
    was_helpful: bool,
    user_modified: bool = False,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt Feedback zu einer Regel-Anwendung.
    
    - **was_helpful**: Hat die Regel geholfen?
    - **user_modified**: Hat der User trotzdem geändert?
    """
    service = SalesBrainService(db)
    service.log_rule_feedback(
        application_id=str(application_id),
        was_helpful=was_helpful,
        user_modified=user_modified,
    )
    return {"success": True}


# =============================================================================
# PUSH NOTIFICATION ENDPOINTS
# =============================================================================

@router.get("/push/schedule", response_model=PushScheduleResponse)
async def get_push_schedule(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt Push-Schedule für den aktuellen User."""
    service = PushService(db)
    return service.get_schedule(current_user.id)


@router.put("/push/schedule", response_model=PushScheduleResponse)
async def update_push_schedule(
    update: PushScheduleUpdate,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Aktualisiert Push-Schedule.
    
    - **morning_time**: Uhrzeit für Morning Briefing (z.B. "08:00")
    - **morning_days**: Wochentage (1=Mo, 7=So)
    - **evening_time**: Uhrzeit für Evening Recap
    - **timezone**: Zeitzone (z.B. "Europe/Vienna")
    """
    service = PushService(db)
    return service.update_schedule(current_user.id, update)


@router.post("/push/register-token")
async def register_push_token(
    request: PushTokenRegister,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Registriert Push Token für Notifications.
    
    - **token**: Expo/Firebase Push Token
    - **platform**: "ios", "android", oder "web"
    """
    service = PushService(db)
    service.register_push_token(current_user.id, request.token, request.platform)
    return {"success": True, "message": "Push Token registriert"}


@router.get("/push/morning-briefing", response_model=MorningBriefing)
async def get_morning_briefing(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generiert Morning Briefing für den aktuellen User.
    
    Enthält:
    - Tagesziele
    - Top 3 Leads für heute
    - Streak-Information
    - Motivierende Nachricht
    - Quick Actions
    """
    service = PushService(db)
    return service.generate_morning_briefing(current_user.id)


@router.get("/push/evening-recap", response_model=EveningRecap)
async def get_evening_recap(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Generiert Evening Recap für den aktuellen User.
    
    Enthält:
    - Ergebnisse vs. Ziele
    - Completion Rate
    - Highlights/Wins
    - Gelernte Regeln
    - Vorschau auf morgen
    """
    service = PushService(db)
    return service.generate_evening_recap(current_user.id)


@router.post("/push/{push_id}/opened")
async def log_push_opened(
    push_id: UUID,
    action_taken: Optional[str] = None,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Loggt dass eine Push-Notification geöffnet wurde."""
    service = PushService(db)
    service.log_push_opened(str(push_id), action_taken)
    return {"success": True}


# =============================================================================
# BACKGROUND TASKS
# =============================================================================

async def check_achievements_after_message(db, user_id: str):
    """Background task to check achievements after sending a message."""
    try:
        gamification = GamificationService(db)
        gamification.check_and_unlock_achievements(user_id)
    except Exception as e:
        print(f"Error checking achievements after message: {e}")


async def check_achievements_after_rule(db, user_id: str):
    """Background task to check achievements after rule creation."""
    try:
        gamification = GamificationService(db)
        newly_unlocked = gamification.check_and_unlock_achievements(user_id)
        
        if newly_unlocked:
            # Could send push notification here
            print(f"User {user_id} unlocked {len(newly_unlocked)} achievements")
    except Exception as e:
        print(f"Error checking achievements after rule: {e}")

