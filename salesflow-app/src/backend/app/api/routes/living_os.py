"""
╔════════════════════════════════════════════════════════════════════════════╗
║  LIVING OS - API ROUTES                                                   ║
║  Self-Evolving Sales Intelligence System                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
- /override/*    - Override Loop (Korrekturen erkennen)
- /command/*     - Command Line (Befehle parsen & Regeln erstellen)
- /rules/*       - Regeln verwalten
- /broadcasts/*  - Team Broadcasts
- /cases/*       - Learning Cases (Gespräche importieren)
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from uuid import UUID

from ..schemas.living_os import (
    # Override
    OverrideDetectRequest,
    OverrideAnalysisResponse,
    LearningSignalResponse,
    LearningPatternResponse,
    # Command
    CommandParseRequest,
    CommandParseResponse,
    CreateRuleRequest,
    CommandRuleResponse,
    RulesListResponse,
    ParsedCommand,
    # Broadcasts
    BroadcastCandidatesResponse,
    CreateBroadcastRequest,
    ApproveBroadcastRequest,
    TeamBroadcastResponse,
    BroadcastsListResponse,
    # Cases
    ImportCaseRequest,
    ImportCaseResponse,
    ProcessCaseResponse,
    LearningCaseResponse,
    CasesListResponse,
    ExtractedTemplatesResponse,
    ObjectionHandlersResponse,
    ExtractedTemplate,
    ExtractedObjection,
    # Context
    LivingOSContext,
)
from ...services.living_os import (
    OverrideService,
    CommandService,
    BroadcastService,
    LearningCasesService,
    CollectiveIntelligenceService,
)
from ...db.deps import get_supabase, get_current_user, CurrentUser

router = APIRouter(prefix="/living-os", tags=["living-os"])


# =============================================================================
# OVERRIDE LOOP
# =============================================================================

@router.post("/override/detect", response_model=OverrideAnalysisResponse)
def detect_override(
    request: OverrideDetectRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Analysiert ob eine signifikante Korrektur stattfand.
    
    Wenn User einen CHIEF-Vorschlag modifiziert, wird das analysiert:
    - Was wurde geändert?
    - Ist das ein wiederkehrendes Muster?
    - Sollte daraus eine Regel werden?
    """
    service = OverrideService(db)
    
    analysis = service.detect_override(
        request.original_text,
        request.final_text,
        request.context.dict() if request.context else {},
    )
    
    # Log signal if significant
    signal_id = None
    if analysis.is_significant:
        signal_id = service.log_signal(
            user_id=str(current_user.id),
            company_id=current_user.company_id,
            original_text=request.original_text,
            final_text=request.final_text,
            context=request.context.dict() if request.context else {},
            analysis=analysis,
        )
    
    return OverrideAnalysisResponse(
        is_significant=analysis.is_significant,
        similarity_score=analysis.similarity_score,
        detected_changes=analysis.detected_changes,
        pattern=analysis.pattern,
        significance=analysis.significance,
        could_be_template=analysis.could_be_template,
        template_use_case=analysis.template_use_case,
        signal_id=signal_id,
    )


@router.post("/override/signal/{signal_id}/outcome")
def update_signal_outcome(
    signal_id: str,
    got_reply: bool = Query(...),
    reply_sentiment: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Aktualisiert ein Signal mit dem Outcome.
    
    Wenn bekannt ist ob die gesendete Nachricht eine Antwort bekommen hat,
    kann das hier nachgetragen werden um die Pattern-Erkennung zu verbessern.
    """
    service = OverrideService(db)
    service.update_signal_outcome(signal_id, got_reply, reply_sentiment)
    return {"success": True}


@router.get("/patterns")
def get_user_patterns(
    status: Optional[str] = Query(None, description="active, candidate, etc."),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt erkannte Patterns für den User.
    
    Patterns entstehen automatisch wenn der User wiederholt ähnliche
    Korrekturen an CHIEF-Vorschlägen macht.
    """
    service = OverrideService(db)
    patterns = service.get_user_patterns(str(current_user.id), status)
    
    return {
        "patterns": patterns,
        "total": len(patterns),
    }


@router.post("/patterns/detect")
def trigger_pattern_detection(
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Triggert manuelle Pattern-Erkennung.
    
    Normalerweise läuft das automatisch im Background,
    kann aber auch manuell angestoßen werden.
    """
    service = OverrideService(db)
    new_patterns = service.check_for_patterns(str(current_user.id))
    
    return {
        "new_patterns": new_patterns,
        "count": len(new_patterns),
    }


@router.get("/signals")
def get_recent_signals(
    limit: int = Query(20, ge=1, le=100),
    signal_type: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt die letzten Learning Signals des Users"""
    service = OverrideService(db)
    signals = service.get_recent_signals(str(current_user.id), limit, signal_type)
    
    return {
        "signals": signals,
        "total": len(signals),
    }


# =============================================================================
# COMMAND LINE
# =============================================================================

@router.post("/command/parse", response_model=CommandParseResponse)
def parse_command(
    request: CommandParseRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Parst einen natürlichsprachlichen Befehl.
    
    Beispiele:
    - "CHIEF, bei 'zu teuer' keine Rabatte anbieten"
    - "Ab jetzt immer Fragen am Ende stellen"
    - "Wenn jemand 'keine Zeit' sagt, mit Verständnis reagieren"
    """
    service = CommandService(db)
    
    if not service.is_command(request.command_text):
        return CommandParseResponse(is_command=False)
    
    parsed = service.parse_command(
        request.command_text,
        str(current_user.id),
        request.context,
    )
    
    return CommandParseResponse(
        is_command=True,
        understood=parsed.get("understood", False),
        parsed=ParsedCommand(**parsed) if parsed.get("understood") else None,
    )


@router.post("/command/create-rule", response_model=CommandRuleResponse)
def create_command_rule(
    request: CreateRuleRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt eine Regel aus einem geparsten Command.
    
    Der Ablauf ist:
    1. User gibt Befehl → /command/parse
    2. Frontend zeigt geparste Regel
    3. User bestätigt → /command/create-rule
    """
    service = CommandService(db)
    
    # Determine team_id if scope is team
    team_id = None
    if request.scope.value != "personal":
        # Get user's team
        broadcast_service = BroadcastService(db)
        teams = broadcast_service.get_user_teams(str(current_user.id))
        if teams:
            team_id = teams[0].get("id")
    
    rule = service.create_rule(
        user_id=str(current_user.id),
        company_id=current_user.company_id,
        team_id=team_id,
        original_command=request.original_command,
        parsed=request.parsed_rule.dict(),
        scope=request.scope.value,
    )
    
    return CommandRuleResponse(**rule)


@router.get("/rules", response_model=RulesListResponse)
def get_user_rules(
    include_team: bool = Query(True, description="Team-Regeln einbeziehen?"),
    active_only: bool = Query(True, description="Nur aktive Regeln?"),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle aktiven Regeln für den User.
    
    Zeigt persönliche Regeln und (optional) Team-Regeln.
    """
    service = CommandService(db)
    rules = service.get_user_rules(str(current_user.id), include_team, active_only)
    
    return RulesListResponse(
        rules=[CommandRuleResponse(**r) for r in rules],
        total=len(rules),
    )


@router.get("/rules/{rule_id}", response_model=CommandRuleResponse)
def get_rule(
    rule_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt eine einzelne Regel"""
    result = db.table("command_rules").select("*").eq("id", rule_id).execute()
    
    if not result.data:
        raise HTTPException(404, "Regel nicht gefunden")
    
    rule = result.data[0]
    if rule["user_id"] != str(current_user.id):
        # Check if team rule
        if rule.get("scope") not in ["team", "company"]:
            raise HTTPException(403, "Keine Berechtigung")
    
    return CommandRuleResponse(**rule)


@router.patch("/rules/{rule_id}")
def update_rule(
    rule_id: str,
    updates: dict,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Aktualisiert eine Regel"""
    service = CommandService(db)
    
    try:
        rule = service.update_rule(rule_id, str(current_user.id), updates)
        return {"success": True, "rule": rule}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Deaktiviert eine Regel (soft delete).
    
    Die Regel wird nicht gelöscht, sondern nur deaktiviert,
    damit die Historie erhalten bleibt.
    """
    service = CommandService(db)
    success = service.delete_rule(rule_id, str(current_user.id))
    
    if not success:
        raise HTTPException(404, "Regel nicht gefunden oder keine Berechtigung")
    
    return {"success": True}


@router.get("/rules/matching")
def get_matching_rules(
    trigger_type: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle Regeln die auf den aktuellen Kontext passen.
    
    Wird von CHIEF verwendet um die richtigen Regeln anzuwenden.
    """
    service = CommandService(db)
    
    context = {
        "trigger_type": trigger_type or "all",
        "channel": channel or "all",
        "lead_status": lead_status or "all",
    }
    
    rules = service.get_matching_rules(str(current_user.id), context)
    
    return {"rules": rules, "total": len(rules)}


# =============================================================================
# TEAM BROADCASTS
# =============================================================================

@router.get("/broadcasts/candidates", response_model=BroadcastCandidatesResponse)
def get_broadcast_candidates(
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Findet potenzielle Broadcasts (überdurchschnittliche Templates).
    
    Das System erkennt automatisch wenn ein User besonders gut
    performende Templates hat die fürs Team interessant sein könnten.
    """
    service = BroadcastService(db)
    
    # Get user's teams
    teams = service.get_user_teams(str(current_user.id))
    if not teams:
        return BroadcastCandidatesResponse(candidates=[])
    
    # Get candidates for first team
    team_id = teams[0].get("id")
    candidates = service.detect_broadcast_candidates(str(current_user.id), team_id)
    
    return BroadcastCandidatesResponse(candidates=candidates)


@router.post("/broadcasts", response_model=TeamBroadcastResponse)
def create_broadcast(
    request: CreateBroadcastRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt einen neuen Broadcast (Leader-Funktion).
    
    Leaders können manuell Best Practices fürs Team erstellen.
    """
    service = BroadcastService(db)
    
    broadcast = service.create_leader_broadcast(
        creator_user_id=str(current_user.id),
        team_id=request.team_id,
        company_id=current_user.company_id,
        broadcast_type=request.broadcast_type,
        title=request.title,
        description=request.description,
        content=request.content,
        show_in_morning_briefing=request.show_in_morning_briefing,
    )
    
    return TeamBroadcastResponse(**broadcast)


@router.get("/broadcasts", response_model=BroadcastsListResponse)
def get_team_broadcasts(
    team_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    broadcast_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt Broadcasts für ein Team"""
    service = BroadcastService(db)
    
    # Get team_id if not provided
    if not team_id:
        teams = service.get_user_teams(str(current_user.id))
        if teams:
            team_id = teams[0].get("id")
    
    if not team_id:
        return BroadcastsListResponse(broadcasts=[], total=0)
    
    broadcasts = service.get_team_broadcasts(team_id, status, broadcast_type, limit)
    
    return BroadcastsListResponse(
        broadcasts=[TeamBroadcastResponse(**b) for b in broadcasts],
        total=len(broadcasts),
    )


@router.get("/broadcasts/pending")
def get_pending_broadcasts(
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt ausstehende Broadcasts zur Genehmigung (für Leader).
    """
    service = BroadcastService(db)
    
    teams = service.get_user_teams(str(current_user.id))
    leader_teams = [t for t in teams if t.get("is_leader")]
    
    if not leader_teams:
        return {"broadcasts": [], "total": 0}
    
    all_pending = []
    for team in leader_teams:
        pending = service.get_pending_broadcasts(team["id"])
        all_pending.extend(pending)
    
    return {"broadcasts": all_pending, "total": len(all_pending)}


@router.get("/broadcasts/morning-briefing")
def get_morning_briefing_broadcasts(
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Broadcasts für das Morning Briefing.
    
    Diese werden im Daily Flow angezeigt.
    """
    service = BroadcastService(db)
    
    teams = service.get_user_teams(str(current_user.id))
    if not teams:
        return {"broadcasts": []}
    
    broadcasts = service.get_morning_briefing_broadcasts(teams[0]["id"])
    
    return {"broadcasts": broadcasts}


@router.post("/broadcasts/{broadcast_id}/approve", response_model=TeamBroadcastResponse)
def approve_broadcast(
    broadcast_id: str,
    request: ApproveBroadcastRequest,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Genehmigt einen Broadcast fürs Team (Leader-Funktion).
    """
    service = BroadcastService(db)
    
    broadcast = service.approve_broadcast(
        broadcast_id,
        str(current_user.id),
        request.show_in_morning_briefing,
    )
    
    return TeamBroadcastResponse(**broadcast)


@router.post("/broadcasts/{broadcast_id}/reject")
def reject_broadcast(
    broadcast_id: str,
    reason: str = Query(...),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Lehnt einen Broadcast ab (Leader-Funktion)"""
    service = BroadcastService(db)
    service.reject_broadcast(broadcast_id, reason)
    return {"success": True}


@router.post("/broadcasts/{broadcast_id}/adopt")
def adopt_broadcast(
    broadcast_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Trackt dass ein User einen Broadcast übernommen hat.
    """
    service = BroadcastService(db)
    service.track_adoption(broadcast_id, str(current_user.id))
    return {"success": True}


# =============================================================================
# LEARNING CASES
# =============================================================================

@router.post("/cases/import", response_model=ImportCaseResponse)
def import_learning_case(
    request: ImportCaseRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Importiert ein Gespräch als Learning Case.
    
    Das Gespräch wird im Hintergrund analysiert:
    - Templates werden extrahiert
    - Einwände werden erkannt
    - Verkäufer-Stil wird analysiert
    """
    service = LearningCasesService(db)
    
    result = service.import_case(
        user_id=str(current_user.id),
        company_id=current_user.company_id,
        raw_conversation=request.raw_conversation,
        metadata=request.dict(exclude={"raw_conversation"}),
    )
    
    # Process in background
    background_tasks.add_task(
        service.process_case,
        result["case_id"],
    )
    
    return ImportCaseResponse(
        case_id=result["case_id"],
        status="pending",
    )


@router.post("/cases/{case_id}/process", response_model=ProcessCaseResponse)
def process_case(
    case_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Verarbeitet ein Case manuell.
    
    Normalerweise passiert das automatisch im Background,
    kann aber auch manuell angestoßen werden.
    """
    service = LearningCasesService(db)
    
    # Verify ownership
    case = service.get_case(case_id, str(current_user.id))
    if not case:
        raise HTTPException(404, "Case nicht gefunden")
    
    result = service.process_case(case_id)
    
    return ProcessCaseResponse(**result)


@router.get("/cases", response_model=CasesListResponse)
def get_user_cases(
    status: Optional[str] = Query(None, description="pending, processing, completed, failed"),
    vertical: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt alle Learning Cases des Users"""
    service = LearningCasesService(db)
    cases = service.get_user_cases(str(current_user.id), status, vertical, limit)
    
    return CasesListResponse(
        cases=[LearningCaseResponse(**c) for c in cases],
        total=len(cases),
    )


@router.get("/cases/{case_id}", response_model=LearningCaseResponse)
def get_case(
    case_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Holt ein einzelnes Learning Case"""
    service = LearningCasesService(db)
    case = service.get_case(case_id, str(current_user.id))
    
    if not case:
        raise HTTPException(404, "Case nicht gefunden")
    
    return LearningCaseResponse(**case)


@router.delete("/cases/{case_id}")
def delete_case(
    case_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Löscht ein Learning Case"""
    service = LearningCasesService(db)
    success = service.delete_case(case_id, str(current_user.id))
    
    if not success:
        raise HTTPException(404, "Case nicht gefunden")
    
    return {"success": True}


@router.get("/templates/extracted", response_model=ExtractedTemplatesResponse)
def get_extracted_templates(
    use_case: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt extrahierte Templates aus allen Learning Cases.
    
    Diese Templates wurden automatisch aus erfolgreichen
    Gesprächen extrahiert.
    """
    service = LearningCasesService(db)
    templates = service.get_extracted_templates(str(current_user.id), use_case)
    
    return ExtractedTemplatesResponse(
        templates=[ExtractedTemplate(**t) for t in templates],
        total=len(templates),
    )


@router.get("/objections", response_model=ObjectionHandlersResponse)
def get_objection_handlers(
    objection_type: Optional[str] = Query(None, description="price, time, think_about_it, etc."),
    only_successful: bool = Query(True),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt extrahierte Einwandbehandlungen.
    
    Diese wurden aus Learning Cases extrahiert und zeigen
    welche Reaktionen auf Einwände funktioniert haben.
    """
    service = LearningCasesService(db)
    handlers = service.get_objection_handlers(
        str(current_user.id),
        objection_type,
        only_successful,
    )
    
    return ObjectionHandlersResponse(
        handlers=[ExtractedObjection(**h) for h in handlers],
        total=len(handlers),
    )


# =============================================================================
# LIVING OS CONTEXT
# =============================================================================

@router.get("/context", response_model=LivingOSContext)
def get_living_os_context(
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt den vollständigen Living OS Kontext für CHIEF.
    
    Enthält:
    - Aktive Regeln
    - Erkannte Patterns
    - Team Broadcasts
    - Formatierte Strings für den System Prompt
    """
    command_service = CommandService(db)
    override_service = OverrideService(db)
    broadcast_service = BroadcastService(db)
    
    # Get rules
    rules = command_service.get_user_rules(str(current_user.id))
    
    # Get patterns
    patterns = override_service.get_user_patterns(str(current_user.id), "active")
    
    # Get broadcasts
    teams = broadcast_service.get_user_teams(str(current_user.id))
    broadcasts = []
    if teams:
        broadcasts = broadcast_service.get_morning_briefing_broadcasts(teams[0]["id"])
    
    # Format for prompt
    formatted_rules = command_service.format_rules_for_prompt(rules)
    formatted_broadcasts = broadcast_service.format_broadcasts_for_prompt(broadcasts)
    
    # Format patterns
    formatted_patterns = "Keine aktiven Patterns." if not patterns else "\n".join([
        f"• **{p.get('pattern_type', 'Unbekannt')}** ({p.get('success_rate', 0) * 100:.0f}% Erfolg)"
        for p in patterns[:5]
    ])
    
    return LivingOSContext(
        rules=[CommandRuleResponse(**r) for r in rules],
        patterns=[LearningPatternResponse(**p) for p in patterns],
        broadcasts=[TeamBroadcastResponse(**b) for b in broadcasts],
        formatted_rules=formatted_rules,
        formatted_patterns=formatted_patterns,
        formatted_broadcasts=formatted_broadcasts,
    )


# =============================================================================
# COLLECTIVE INTELLIGENCE
# =============================================================================

@router.get("/collective/insights")
def get_collective_insights(
    limit: int = Query(5, ge=1, le=20),
    insight_type: Optional[str] = Query(None, description="top_template, best_pattern, winning_objection_handler"),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt anonymisierte Insights von anderen Usern.
    
    Das System lernt von erfolgreichen Strategien anderer User
    und schlägt diese (anonymisiert) vor.
    
    Insight-Typen:
    - top_template: Templates die bei vielen gut funktionieren
    - best_pattern: Muster die zu höheren Reply-Rates führen
    - winning_objection_handler: Einwandbehandlungen die funktionieren
    """
    service = CollectiveIntelligenceService(db)
    insights = service.get_insights_for_user(
        str(current_user.id),
        limit=limit,
        insight_type=insight_type,
    )
    
    return {
        "insights": insights,
        "total": len(insights),
        "message": "Diese Strategien haben bei anderen Usern gut funktioniert.",
    }


@router.get("/collective/benchmark")
def get_user_benchmark(
    benchmark_type: str = Query("reply_rate", description="reply_rate, conversion_rate"),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Zeigt dem User wo er im Vergleich zu anderen steht.
    
    Gibt zurück:
    - Aktueller Wert
    - Perzentil (z.B. "Top 25%")
    - Was die Top 10% erreichen
    - Verbesserungspotenzial
    - Konkreter Tipp
    """
    service = CollectiveIntelligenceService(db)
    benchmark = service.get_user_benchmark(str(current_user.id), benchmark_type)
    
    return benchmark


@router.post("/collective/insights/{insight_id}/adopt")
def adopt_insight(
    insight_id: str,
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    User übernimmt einen Insight.
    
    Trackt die Adoption um später messen zu können,
    ob es geholfen hat.
    """
    service = CollectiveIntelligenceService(db)
    
    try:
        result = service.adopt_insight(str(current_user.id), insight_id)
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/collective/insights/{insight_id}/dismiss")
def dismiss_insight(
    insight_id: str,
    reason: Optional[str] = Query(None),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    User lehnt Insight ab (nicht nochmal zeigen).
    """
    service = CollectiveIntelligenceService(db)
    service.dismiss_insight(str(current_user.id), insight_id, reason)
    return {"success": True}


@router.get("/collective/adoptions")
def get_user_adoptions(
    active_only: bool = Query(True),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt alle Insights die der User übernommen hat.
    
    Zeigt auch ob sie geholfen haben (vorher/nachher Vergleich).
    """
    service = CollectiveIntelligenceService(db)
    adoptions = service.get_user_adoptions(str(current_user.id), active_only)
    
    return {
        "adoptions": adoptions,
        "total": len(adoptions),
    }


@router.post("/collective/compute")
def trigger_collective_computation(
    company_id: Optional[str] = Query(None),
    vertical_id: Optional[str] = Query(None),
    days: int = Query(30, ge=7, le=90),
    db=Depends(get_supabase),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Triggert Berechnung der Collective Insights.
    
    Normalerweise läuft das als Background-Job,
    kann aber auch manuell angestoßen werden.
    
    (Nur für Admins sinnvoll)
    """
    service = CollectiveIntelligenceService(db)
    
    result = service.compute_insights(
        company_id=company_id or current_user.company_id,
        vertical_id=vertical_id,
        days=days,
    )
    
    return result

