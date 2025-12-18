# file: app/routers/team_templates.py
"""
Team Templates API Router - GPT-5.1 Design

Endpoints für das Team-Duplikations-System:
- GET/POST /team-templates - Templates auflisten/erstellen
- GET/PUT/DELETE /team-templates/{id} - Einzelnes Template
- POST /team-templates/{id}/clone - Template klonen
- POST /team-templates/{id}/share - Mit Team teilen
- GET /team-templates/{id}/sync-status - Sync-Status prüfen
"""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.models.followup import TeamTemplate
from app.services.team_duplication_service import (
    TeamDuplicationService,
    get_team_duplication_service,
    CreateTeamTemplateRequest,
    UpdateTeamTemplateRequest,
    CloneTemplateRequest,
    CloneTemplateResponse,
    TeamTemplateListItem,
    TeamTemplateSyncStatus,
)

router = APIRouter(prefix="/team-templates", tags=["Team Templates"])


# ─────────────────────────────────
# Mock Auth (für Tests)
# ─────────────────────────────────

def get_current_user_id() -> UUID:
    """Mock: Gibt aktuelle User-ID zurück."""
    return uuid4()  # In Produktion: aus JWT Token


def get_current_workspace_id() -> UUID:
    """Mock: Gibt aktuelle Workspace-ID zurück."""
    return uuid4()  # In Produktion: aus JWT Token


# ─────────────────────────────────
# Request/Response Models
# ─────────────────────────────────

class ShareTemplateRequest(BaseModel):
    """Request zum Teilen eines Templates"""
    user_ids: List[UUID]


class ShareTemplateResponse(BaseModel):
    """Response nach Teilen"""
    success: bool
    shared_with_count: int
    message: str


# ─────────────────────────────────
# Endpoints
# ─────────────────────────────────

@router.get(
    "",
    response_model=List[TeamTemplateListItem],
    summary="Alle verfügbaren Templates auflisten",
    description="""
    Listet alle Team-Templates die der User sehen kann:
    - Eigene Templates
    - Mit ihm geteilte Templates
    - Öffentliche Templates (optional)
    
    **Perfekt für:** "Template-Marktplatz" im Team
    """
)
async def list_templates(
    include_public: bool = Query(True, description="Öffentliche Templates einbeziehen?"),
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
    workspace_id: UUID = Depends(get_current_workspace_id),
) -> List[TeamTemplateListItem]:
    """Listet alle verfügbaren Templates."""
    return await service.list_templates(
        workspace_id=workspace_id,
        user_id=user_id,
        include_public=include_public,
    )


@router.post(
    "",
    response_model=TeamTemplate,
    summary="Neues Team-Template erstellen",
    description="""
    Erstellt ein neues Team-Template.
    
    **Was kann ein Template enthalten?**
    - Follow-Up Sequenzen
    - Message Templates
    - Daily Flow Konfiguration
    - Objection Handler
    
    **Tipp:** Erstelle ein Template nachdem du deinen eigenen Flow perfektioniert hast!
    """
)
async def create_template(
    request: CreateTeamTemplateRequest,
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
    workspace_id: UUID = Depends(get_current_workspace_id),
) -> TeamTemplate:
    """Erstellt ein neues Template."""
    return await service.create_template(
        workspace_id=workspace_id,
        user_id=user_id,
        request=request,
    )


@router.get(
    "/{template_id}",
    response_model=Optional[TeamTemplate],
    summary="Template-Details abrufen",
)
async def get_template(
    template_id: UUID,
    service: TeamDuplicationService = Depends(get_team_duplication_service),
) -> Optional[TeamTemplate]:
    """Holt ein einzelnes Template."""
    template = await service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template nicht gefunden")
    return template


@router.put(
    "/{template_id}",
    response_model=Optional[TeamTemplate],
    summary="Template aktualisieren",
    description="""
    Aktualisiert ein Template.
    
    **Wichtig:** Nur der Ersteller kann aktualisieren.
    Bei Änderungen wird die Version erhöht, sodass Klone ein "Update verfügbar" sehen.
    """
)
async def update_template(
    template_id: UUID,
    request: UpdateTeamTemplateRequest,
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
) -> Optional[TeamTemplate]:
    """Aktualisiert ein Template."""
    template = await service.update_template(template_id, user_id, request)
    if not template:
        raise HTTPException(
            status_code=404,
            detail="Template nicht gefunden oder keine Berechtigung"
        )
    return template


@router.post(
    "/{template_id}/clone",
    response_model=CloneTemplateResponse,
    summary="Template klonen (1-Klick Duplikation)",
    description="""
    **DAS Killer-Feature für Team-Duplikation!**
    
    Mit einem Klick bekommt ein Team-Member:
    - Alle Follow-Up Sequenzen
    - Alle Message Templates
    - Die Daily Flow Konfiguration
    - Alle Objection Handler
    
    **Der Klon bleibt mit dem Original verknüpft:**
    - Wenn der Leader Updates macht, sieht der Member "Update verfügbar"
    - Optional: Auto-Sync aktivieren
    """
)
async def clone_template(
    template_id: UUID,
    request: CloneTemplateRequest = CloneTemplateRequest(),
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
    workspace_id: UUID = Depends(get_current_workspace_id),
) -> CloneTemplateResponse:
    """Klont ein Template für den aktuellen User."""
    result = await service.clone_template(
        template_id=template_id,
        user_id=user_id,
        workspace_id=workspace_id,
        request=request,
    )
    
    if not result.success:
        raise HTTPException(status_code=404, detail=result.message)
    
    return result


@router.post(
    "/{template_id}/share",
    response_model=ShareTemplateResponse,
    summary="Template mit Team teilen",
    description="""
    Teilt ein Template mit spezifischen Team-Mitgliedern.
    
    Alternativ: `is_public: true` setzen um es für alle im Workspace sichtbar zu machen.
    """
)
async def share_template(
    template_id: UUID,
    request: ShareTemplateRequest,
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
) -> ShareTemplateResponse:
    """Teilt ein Template mit ausgewählten Usern."""
    success = await service.share_with_users(
        template_id=template_id,
        owner_id=user_id,
        user_ids=request.user_ids,
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Template nicht gefunden oder keine Berechtigung"
        )
    
    return ShareTemplateResponse(
        success=True,
        shared_with_count=len(request.user_ids),
        message=f"Template mit {len(request.user_ids)} Team-Mitgliedern geteilt!",
    )


@router.get(
    "/{template_id}/sync-status",
    response_model=Optional[TeamTemplateSyncStatus],
    summary="Sync-Status prüfen",
    description="""
    Prüft ob ein geklontes Template noch mit dem Original synchron ist.
    
    **Wichtig für:**
    - "Update verfügbar" Badges in der UI
    - Entscheidung ob Sync sinnvoll ist
    """
)
async def get_sync_status(
    template_id: UUID,
    clone_id: UUID = Query(..., description="ID des Clone-Trackings"),
    service: TeamDuplicationService = Depends(get_team_duplication_service),
) -> Optional[TeamTemplateSyncStatus]:
    """Holt den Sync-Status für einen Klon."""
    status = await service.get_sync_status(clone_id)
    if not status:
        raise HTTPException(status_code=404, detail="Klon nicht gefunden")
    return status


@router.post(
    "/{template_id}/sync",
    summary="Mit Original synchronisieren",
    description="""
    Synchronisiert einen Klon mit dem Original-Template.
    
    **Was passiert:**
    1. Neue Sequenzen/Templates werden hinzugefügt
    2. Geänderte werden aktualisiert
    3. Eigene Anpassungen bleiben erhalten (Merge-Logik)
    """
)
async def sync_with_original(
    template_id: UUID,
    clone_id: UUID = Query(..., description="ID des Clone-Trackings"),
    service: TeamDuplicationService = Depends(get_team_duplication_service),
    user_id: UUID = Depends(get_current_user_id),
):
    """Synchronisiert Klon mit Original."""
    success = await service.sync_clone_with_original(clone_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Klon nicht gefunden oder keine Berechtigung"
        )
    
    return {"success": True, "message": "Erfolgreich synchronisiert!"}


__all__ = ["router"]

