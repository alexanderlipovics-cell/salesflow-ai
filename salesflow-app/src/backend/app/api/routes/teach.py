"""
╔════════════════════════════════════════════════════════════════════════════╗
║  TEACH API ROUTES                                                          ║
║  Endpoints für Learning System                                             ║
╚════════════════════════════════════════════════════════════════════════════╝

Endpoints:
    
    TEACH ACTIONS:
    - POST   /living-os/teach              - Teach-Action verarbeiten
    - POST   /living-os/teach/ignore       - Ignore-Action loggen
    - GET    /living-os/teach/stats        - Teach-Statistiken abrufen
    - POST   /living-os/teach/analyze      - Deep Analysis mit Claude
    
    PATTERNS:
    - GET    /living-os/patterns/pending   - Pending Patterns abrufen
    - POST   /living-os/patterns/{id}/activate - Pattern aktivieren
    - POST   /living-os/patterns/{id}/dismiss  - Pattern ablehnen
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID

from app.db.deps import get_db, get_current_user, CurrentUser
from app.api.schemas.teach import (
    TeachRequestSchema,
    TeachResponseSchema,
    TeachStatsSchema,
    IgnoreRequestSchema,
    DeepAnalysisRequestSchema,
    DeepAnalysisResponseSchema,
    PendingPatternSchema,
    PatternActivateResponseSchema,
)
from app.services.teach import TeachService


router = APIRouter(prefix="/living-os", tags=["teach"])


# =============================================================================
# TEACH ACTIONS
# =============================================================================

@router.post("/teach", response_model=TeachResponseSchema)
async def submit_teach(
    request: TeachRequestSchema,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Verarbeitet Teach-Action.
    
    Flow:
    1. Learning Signal speichern
    2. Je nach Scope: Rule (personal) oder Broadcast-Suggestion (team)
    3. Pattern Detection triggern
    4. XP vergeben
    
    Returns:
        TeachResponseSchema mit created IDs, XP und Pattern-Info
    """
    service = TeachService(db)
    
    return service.process_teach(
        user_id=current_user.id,
        company_id=current_user.company_id,
        request=request,
    )


@router.post("/teach/ignore")
async def log_ignore(
    request: IgnoreRequestSchema,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Loggt Ignore-Action für Analytics.
    
    Signal wird gespeichert, aber keine Regel erstellt.
    """
    service = TeachService(db)
    
    service.log_ignore(
        user_id=current_user.id,
        company_id=current_user.company_id,
        original_text=request.original_text,
        final_text=request.final_text,
        similarity_score=request.similarity_score,
        context=request.context.model_dump(),
    )
    
    return {"success": True}


@router.get("/teach/stats", response_model=TeachStatsSchema)
async def get_teach_stats(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Teach-Statistiken für aktuellen User.
    
    Enthält:
    - Anzahl Teach-Actions
    - Erstellte Regeln
    - Entdeckte Patterns
    - XP aus Teaching
    """
    service = TeachService(db)
    return service.get_teach_stats(current_user.id)


@router.post("/teach/analyze", response_model=DeepAnalysisResponseSchema)
async def deep_analyze(
    request: DeepAnalysisRequestSchema,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Tiefe Analyse mit Claude.
    
    Für komplexe Änderungen die Quick-Detection nicht klassifizieren kann.
    """
    service = TeachService(db)
    result = service.deep_analyze(request.original_text, request.final_text)
    
    return DeepAnalysisResponseSchema(
        changes=result.get("changes", []),
        pattern=result.get("pattern"),
        insights=result.get("insights", ""),
        suggested_rule_name=result.get("suggested_rule_name", "Eigene Anpassung"),
    )


# =============================================================================
# PATTERNS
# =============================================================================

@router.get("/patterns/pending", response_model=List[PendingPatternSchema])
async def get_pending_patterns(
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Holt Pending Patterns (Kandidaten, noch nicht aktiviert).
    """
    service = TeachService(db)
    patterns = service.get_pending_patterns(current_user.id)
    
    return [
        PendingPatternSchema(
            id=p["id"],
            pattern_type=p["pattern_type"],
            signal_count=p["signal_count"],
            success_rate=p.get("success_rate", 0),
            last_signal_at=p.get("last_signal_at"),
        )
        for p in patterns
    ]


@router.post("/patterns/{pattern_id}/activate", response_model=PatternActivateResponseSchema)
async def activate_pattern(
    pattern_id: UUID,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Aktiviert ein Pattern (wandelt es in Rule um).
    
    Vergibt XP für Pattern-Aktivierung.
    """
    service = TeachService(db)
    
    try:
        result = service.activate_pattern(current_user.id, str(pattern_id))
        return PatternActivateResponseSchema(
            rule_id=result["rule_id"],
            xp_earned=result["xp_earned"],
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/patterns/{pattern_id}/dismiss")
async def dismiss_pattern(
    pattern_id: UUID,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Lehnt ein Pattern ab.
    """
    service = TeachService(db)
    service.dismiss_pattern(current_user.id, str(pattern_id))
    
    return {"success": True}


# =============================================================================
# TEMPLATE FROM TEACH
# =============================================================================

@router.post("/templates/from-teach")
async def create_template_from_teach(
    text: str,
    context: dict,
    source: str,
    db = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Erstellt ein Template aus einer Teach-Action.
    """
    # Insert into templates table
    template_data = {
        "company_id": current_user.company_id,
        "user_id": current_user.id,
        "name": f"Aus Korrektur: {context.get('message_type', 'Allgemein')}",
        "content": text,
        "category": context.get("message_type", "custom"),
        "channel": context.get("channel"),
        "is_active": True,
        "source": source,
        "metadata": context,
    }
    
    result = db.table("templates").insert(template_data).execute()
    
    if not result.data:
        raise HTTPException(500, "Template konnte nicht erstellt werden")
    
    return {"template_id": result.data[0]["id"]}

