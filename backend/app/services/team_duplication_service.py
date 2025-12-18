# file: app/services/team_duplication_service.py
"""
Team Duplikation Service - GPT-5.1 Design

Das Problem: Team-Leader haben einen guten Flow, aber das Team macht es NICHT genauso.

Die Lösung: Leader können ihre komplette "Sales-Maschine" teilen:
- Follow-Up Sequenzen
- Message Templates
- Daily Flow Config
- Objection Handler

Team-Members können mit 1 Klick alles klonen und sofort loslegen.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.models.followup import (
    TeamTemplate,
    TeamTemplateClone,
    FollowUpSequence,
)


# ─────────────────────────────────
# Request/Response Models
# ─────────────────────────────────

class CreateTeamTemplateRequest(BaseModel):
    """Request zum Erstellen eines Team Templates"""
    name: str = Field(..., description="Name des Templates (z.B. 'Meine Partner-Sequenz')")
    description: Optional[str] = Field(None, description="Beschreibung")
    sequence_ids: List[UUID] = Field(default_factory=list)
    message_template_ids: List[str] = Field(default_factory=list)
    daily_flow_config: Optional[Dict[str, Any]] = None
    objection_handler_ids: List[str] = Field(default_factory=list)
    is_public: bool = Field(False, description="Für alle im Workspace sichtbar?")


class UpdateTeamTemplateRequest(BaseModel):
    """Request zum Aktualisieren eines Templates"""
    name: Optional[str] = None
    description: Optional[str] = None
    sequence_ids: Optional[List[UUID]] = None
    message_template_ids: Optional[List[str]] = None
    daily_flow_config: Optional[Dict[str, Any]] = None
    objection_handler_ids: Optional[List[str]] = None
    is_public: Optional[bool] = None


class CloneTemplateRequest(BaseModel):
    """Request zum Klonen eines Templates"""
    customize_name: Optional[str] = Field(
        None, 
        description="Optional: Eigener Name für die Kopie"
    )


class CloneTemplateResponse(BaseModel):
    """Response nach erfolgreichem Klonen"""
    success: bool
    cloned_template_id: str
    cloned_sequences: int
    cloned_message_templates: int
    message: str


class TeamTemplateListItem(BaseModel):
    """Kurzform eines Templates für Listen"""
    id: str
    name: str
    description: Optional[str]
    created_by_name: str
    sequence_count: int
    template_count: int
    times_cloned: int
    is_public: bool
    created_at: datetime


class TeamTemplateSyncStatus(BaseModel):
    """Sync-Status zwischen Original und Klon"""
    clone_id: str
    original_template_id: str
    original_version: int
    current_version: int
    is_outdated: bool
    changes_available: List[str]
    last_sync_at: Optional[datetime]


# ─────────────────────────────────
# Service
# ─────────────────────────────────

class TeamDuplicationService:
    """
    Service für Team-Template Verwaltung und Kloning.
    
    Features:
    - Templates erstellen und verwalten
    - Mit Team teilen
    - 1-Klick Kloning für Members
    - Sync-Status zwischen Original und Klonen
    - Update-Push an Klone
    """
    
    def __init__(self):
        # In-Memory Storage für Tests
        self._templates: Dict[UUID, TeamTemplate] = {}
        self._clones: Dict[UUID, TeamTemplateClone] = {}
        self._bootstrap_demo_data()
    
    def _bootstrap_demo_data(self) -> None:
        """Erstellt Demo-Daten."""
        demo_workspace = uuid4()
        demo_leader = uuid4()
        
        # Demo Template vom Team-Leader
        template_id = uuid4()
        self._templates[template_id] = TeamTemplate(
            id=template_id,
            workspace_id=demo_workspace,
            name="🚀 Partner-Akquise Masterplan",
            description="Meine bewährte Strategie für neue Partner. Enthält 5-Step Sequenz + alle Nachrichten-Vorlagen.",
            created_by=demo_leader,
            sequence_ids=[uuid4(), uuid4()],  # Referenzen auf Sequenzen
            message_template_ids=["intro_v1", "video_invite_v1", "closing_v1"],
            daily_flow_config={
                "daily_contacts_goal": 5,
                "follow_up_priority": "high",
                "best_contact_hours": [18, 19, 20],
            },
            objection_handler_ids=["keine_zeit", "kein_interesse", "zu_teuer"],
            shared_with=[],
            is_public=True,
            version=1,
            times_cloned=12,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
    
    # ─────────────────────────────────
    # CRUD Operations
    # ─────────────────────────────────
    
    async def create_template(
        self,
        workspace_id: UUID,
        user_id: UUID,
        request: CreateTeamTemplateRequest,
    ) -> TeamTemplate:
        """
        Erstellt ein neues Team Template.
        
        Args:
            workspace_id: Workspace des Leaders
            user_id: ID des Leaders
            request: Template-Daten
            
        Returns:
            Erstelltes TeamTemplate
        """
        template = TeamTemplate(
            id=uuid4(),
            workspace_id=workspace_id,
            name=request.name,
            description=request.description,
            created_by=user_id,
            sequence_ids=request.sequence_ids,
            message_template_ids=request.message_template_ids,
            daily_flow_config=request.daily_flow_config,
            objection_handler_ids=request.objection_handler_ids,
            shared_with=[],
            is_public=request.is_public,
            version=1,
            times_cloned=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        self._templates[template.id] = template
        return template
    
    async def get_template(self, template_id: UUID) -> Optional[TeamTemplate]:
        """Holt ein Template by ID."""
        return self._templates.get(template_id)
    
    async def list_templates(
        self,
        workspace_id: UUID,
        user_id: UUID,
        include_public: bool = True,
    ) -> List[TeamTemplateListItem]:
        """
        Listet alle verfügbaren Templates.
        
        Args:
            workspace_id: Workspace Filter
            user_id: User für Berechtigungsprüfung
            include_public: Auch öffentliche Templates?
            
        Returns:
            Liste von TeamTemplateListItems
        """
        result: List[TeamTemplateListItem] = []
        
        for template in self._templates.values():
            # Zugangsprüfung
            can_see = (
                template.created_by == user_id or  # Eigenes
                user_id in template.shared_with or  # Geteilt
                (include_public and template.is_public)  # Öffentlich
            )
            
            if can_see:
                result.append(TeamTemplateListItem(
                    id=str(template.id),
                    name=template.name,
                    description=template.description,
                    created_by_name="Team Leader",  # In Produktion: User lookup
                    sequence_count=len(template.sequence_ids),
                    template_count=len(template.message_template_ids),
                    times_cloned=template.times_cloned,
                    is_public=template.is_public,
                    created_at=template.created_at,
                ))
        
        return result
    
    async def update_template(
        self,
        template_id: UUID,
        user_id: UUID,
        request: UpdateTeamTemplateRequest,
    ) -> Optional[TeamTemplate]:
        """
        Aktualisiert ein Template.
        
        Inkrementiert die Version für Sync-Tracking.
        """
        template = self._templates.get(template_id)
        if not template:
            return None
        
        # Nur Owner darf updaten
        if template.created_by != user_id:
            return None
        
        # Felder aktualisieren
        update_data = request.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(template, key):
                setattr(template, key, value)
        
        # Version hochzählen + Timestamp
        template.version += 1
        template.updated_at = datetime.now()
        
        return template
    
    # ─────────────────────────────────
    # Cloning Operations
    # ─────────────────────────────────
    
    async def clone_template(
        self,
        template_id: UUID,
        user_id: UUID,
        workspace_id: UUID,
        request: CloneTemplateRequest,
    ) -> CloneTemplateResponse:
        """
        Klont ein Template für einen Team-Member.
        
        Was passiert:
        1. Template wird kopiert
        2. Sequenzen werden kopiert (neue IDs)
        3. Message Templates werden kopiert
        4. Clone wird als "synced" markiert
        
        Args:
            template_id: ID des zu klonenden Templates
            user_id: ID des klonenden Members
            workspace_id: Workspace des Members
            request: Optionale Anpassungen
            
        Returns:
            CloneTemplateResponse mit Statistiken
        """
        original = self._templates.get(template_id)
        if not original:
            return CloneTemplateResponse(
                success=False,
                cloned_template_id="",
                cloned_sequences=0,
                cloned_message_templates=0,
                message="Template nicht gefunden",
            )
        
        # Neues Template erstellen
        cloned_id = uuid4()
        cloned_name = request.customize_name or f"{original.name} (Kopie)"
        
        cloned_template = TeamTemplate(
            id=cloned_id,
            workspace_id=workspace_id,
            name=cloned_name,
            description=original.description,
            created_by=user_id,
            sequence_ids=original.sequence_ids.copy(),  # In Produktion: echte Kopien
            message_template_ids=original.message_template_ids.copy(),
            daily_flow_config=original.daily_flow_config.copy() if original.daily_flow_config else None,
            objection_handler_ids=original.objection_handler_ids.copy(),
            shared_with=[],
            is_public=False,
            version=1,
            times_cloned=0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        self._templates[cloned_id] = cloned_template
        
        # Clone-Tracking erstellen
        clone_tracking = TeamTemplateClone(
            id=uuid4(),
            template_id=template_id,
            original_template_version=original.version,
            cloned_by=user_id,
            cloned_at=datetime.now(),
            is_synced=True,
            last_sync_at=datetime.now(),
        )
        self._clones[clone_tracking.id] = clone_tracking
        
        # Original-Stats aktualisieren
        original.times_cloned += 1
        
        return CloneTemplateResponse(
            success=True,
            cloned_template_id=str(cloned_id),
            cloned_sequences=len(original.sequence_ids),
            cloned_message_templates=len(original.message_template_ids),
            message=f"Template erfolgreich geklont! Du hast jetzt alle Sequenzen und Vorlagen von '{original.name}'.",
        )
    
    async def get_sync_status(
        self,
        clone_id: UUID,
    ) -> Optional[TeamTemplateSyncStatus]:
        """
        Prüft ob ein Klon noch mit dem Original synchron ist.
        
        Returns:
            Sync-Status oder None wenn nicht gefunden
        """
        clone = self._clones.get(clone_id)
        if not clone:
            return None
        
        original = self._templates.get(clone.template_id)
        if not original:
            return None
        
        is_outdated = clone.original_template_version < original.version
        
        changes: List[str] = []
        if is_outdated:
            changes.append(f"Version {clone.original_template_version} → {original.version}")
            # In Produktion: Detaillierte Änderungen auflisten
        
        return TeamTemplateSyncStatus(
            clone_id=str(clone.id),
            original_template_id=str(clone.template_id),
            original_version=clone.original_template_version,
            current_version=original.version,
            is_outdated=is_outdated,
            changes_available=changes,
            last_sync_at=clone.last_sync_at,
        )
    
    async def sync_clone_with_original(
        self,
        clone_id: UUID,
        user_id: UUID,
    ) -> bool:
        """
        Synchronisiert einen Klon mit dem Original.
        
        Args:
            clone_id: ID des Clone-Trackings
            user_id: User der synchronisiert (muss Owner sein)
            
        Returns:
            True wenn erfolgreich
        """
        clone = self._clones.get(clone_id)
        if not clone or clone.cloned_by != user_id:
            return False
        
        original = self._templates.get(clone.template_id)
        if not original:
            return False
        
        # In Produktion: Hier würden die tatsächlichen Daten synchronisiert
        
        clone.original_template_version = original.version
        clone.is_synced = True
        clone.last_sync_at = datetime.now()
        
        return True
    
    # ─────────────────────────────────
    # Sharing Operations
    # ─────────────────────────────────
    
    async def share_with_users(
        self,
        template_id: UUID,
        owner_id: UUID,
        user_ids: List[UUID],
    ) -> bool:
        """
        Teilt ein Template mit spezifischen Usern.
        
        Args:
            template_id: Template ID
            owner_id: Owner (für Berechtigungsprüfung)
            user_ids: Liste der User die Zugang bekommen
            
        Returns:
            True wenn erfolgreich
        """
        template = self._templates.get(template_id)
        if not template or template.created_by != owner_id:
            return False
        
        # User hinzufügen (Duplikate vermeiden)
        for uid in user_ids:
            if uid not in template.shared_with:
                template.shared_with.append(uid)
        
        return True
    
    async def revoke_access(
        self,
        template_id: UUID,
        owner_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Entzieht einem User den Zugang zu einem Template."""
        template = self._templates.get(template_id)
        if not template or template.created_by != owner_id:
            return False
        
        if user_id in template.shared_with:
            template.shared_with.remove(user_id)
        
        return True


# Singleton
_duplication_service: Optional[TeamDuplicationService] = None


def get_team_duplication_service() -> TeamDuplicationService:
    """Gibt den Team Duplication Service zurück."""
    global _duplication_service
    if _duplication_service is None:
        _duplication_service = TeamDuplicationService()
    return _duplication_service


__all__ = [
    "TeamDuplicationService",
    "get_team_duplication_service",
    "CreateTeamTemplateRequest",
    "UpdateTeamTemplateRequest",
    "CloneTemplateRequest",
    "CloneTemplateResponse",
    "TeamTemplateListItem",
    "TeamTemplateSyncStatus",
]

