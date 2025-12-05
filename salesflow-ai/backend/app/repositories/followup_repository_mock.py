# file: app/repositories/followup_repository_mock.py
"""
InMemory Follow-Up Repository - Für Tests & Prototyping

ACHTUNG: NICHT für Produktion gedacht!
Später durch Supabase-Implementierung ersetzen.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.models.followup import (
    AIMessage,
    FollowUpChannel,
    FollowUpCondition,
    FollowUpSequence,
    FollowUpSequenceState,
    FollowUpSequenceStatus,
    FollowUpStep,
    FollowUpSuggestion,
    LeadContext,
)
from app.services.followup_engine import FollowUpRepository


class InMemoryFollowUpRepository(FollowUpRepository):
    """
    Einfaches In-Memory-Repo für Tests & Prototyping.
    
    Enthält bereits Demo-Daten für Network Marketing Use Cases.
    """

    def __init__(self) -> None:
        self._workspace_id = uuid4()
        self._owner_id = uuid4()

        # In-Memory Stores
        self._leads: Dict[UUID, LeadContext] = {}
        self._sequences: Dict[UUID, FollowUpSequence] = {}
        self._states: Dict[UUID, FollowUpSequenceState] = {}
        self._interactions: Dict[UUID, List[Dict[str, Any]]] = {}
        self._suggestions_log: List[FollowUpSuggestion] = []
        self._messages_log: List[AIMessage] = []

        self._bootstrap_sample_data()

    # ─────────────────────────────────
    # Bootstrap Demo Data
    # ─────────────────────────────────

    def _bootstrap_sample_data(self) -> None:
        """Erstellt Demo-Daten für Network Marketing."""
        
        # ===== DEMO LEADS (Networker-typisch) =====
        
        # Lead 1: Hot Lead, interessiert an Business
        lead1_id = uuid4()
        self._leads[lead1_id] = LeadContext(
            id=lead1_id,
            workspace_id=self._workspace_id,
            owner_id=self._owner_id,
            full_name="Tamara Beispiel",
            first_name="Tamara",
            timezone="Europe/Vienna",
            primary_channel=FollowUpChannel.WHATSAPP,
            language="de",
            last_contacted_at=datetime.now() - timedelta(days=5),
            lead_score=75.0,
            tags=["network", "hot", "business_interest"],
            meta={"source": "instagram_dm"}
        )
        
        # Lead 2: Warm Lead, Produkt-Interesse
        lead2_id = uuid4()
        self._leads[lead2_id] = LeadContext(
            id=lead2_id,
            workspace_id=self._workspace_id,
            owner_id=self._owner_id,
            full_name="Max Müller",
            first_name="Max",
            timezone="Europe/Berlin",
            primary_channel=FollowUpChannel.WHATSAPP,
            language="de",
            last_contacted_at=datetime.now() - timedelta(days=2),
            lead_score=55.0,
            tags=["warm", "product_interest"],
            meta={"source": "whatsapp_chat"}
        )
        
        # Lead 3: Cold Lead, ghosted
        lead3_id = uuid4()
        self._leads[lead3_id] = LeadContext(
            id=lead3_id,
            workspace_id=self._workspace_id,
            owner_id=self._owner_id,
            full_name="Lisa Schmidt",
            first_name="Lisa",
            timezone="Europe/Zurich",
            primary_channel=FollowUpChannel.INSTAGRAM_DM,
            language="de",
            last_contacted_at=datetime.now() - timedelta(days=14),
            lead_score=30.0,
            tags=["cold", "ghosted"],
            meta={"source": "instagram_screenshot"}
        )

        # ===== DEMO SEQUENZEN =====
        
        # Sequenz 1: Interessent → Partner (Network Marketing Standard)
        seq1_id = uuid4()
        seq1_steps: List[FollowUpStep] = [
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq1_id,
                order_index=0,
                day_offset=0,
                action="erstes_interesse_checken",
                template_key="interest_intro",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.ALWAYS,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq1_id,
                order_index=1,
                day_offset=2,
                action="video_einladung",
                template_key="video_invite",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.NO_REPLY,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq1_id,
                order_index=2,
                day_offset=5,
                action="sanfter_reminder",
                template_key="gentle_followup",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.NO_REPLY,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq1_id,
                order_index=3,
                day_offset=10,
                action="anruf_versuch",
                template_key="call_attempt",
                channel=FollowUpChannel.PHONE,
                condition=FollowUpCondition.NO_REPLY,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq1_id,
                order_index=4,
                day_offset=21,
                action="letzter_check",
                template_key="final_checkin",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.NO_REPLY,
            ),
        ]
        
        self._sequences[seq1_id] = FollowUpSequence(
            id=seq1_id,
            workspace_id=self._workspace_id,
            name="Interessent → Partner (Standard)",
            description="Standard-Sequenz für Network Marketing Interessenten",
            trigger="new_lead_with_interest",
            steps=seq1_steps,
            is_active=True,
            is_default=True,
            created_by=self._owner_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        # Sequenz 2: Ghosted Reaktivierung
        seq2_id = uuid4()
        seq2_steps: List[FollowUpStep] = [
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq2_id,
                order_index=0,
                day_offset=0,
                action="reaktivierung_start",
                template_key="reactivation_hello",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.ALWAYS,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq2_id,
                order_index=1,
                day_offset=7,
                action="wert_reminder",
                template_key="value_reminder",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.NO_REPLY,
            ),
            FollowUpStep(
                id=uuid4(),
                sequence_id=seq2_id,
                order_index=2,
                day_offset=14,
                action="letzter_versuch",
                template_key="final_attempt",
                channel=FollowUpChannel.WHATSAPP,
                condition=FollowUpCondition.NO_REPLY,
            ),
        ]
        
        self._sequences[seq2_id] = FollowUpSequence(
            id=seq2_id,
            workspace_id=self._workspace_id,
            name="Ghosted → Reaktivierung",
            description="Reaktivierungs-Sequenz für Leads die nicht mehr antworten",
            trigger="lead_ghosted",
            steps=seq2_steps,
            is_active=True,
            is_default=False,
            created_by=self._owner_id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

    # ─────────────────────────────────
    # FollowUpRepository Interface
    # ─────────────────────────────────

    async def get_lead_context(self, lead_id: UUID) -> Optional[LeadContext]:
        return self._leads.get(lead_id)

    async def get_active_sequence_state(self, lead_id: UUID) -> Optional[FollowUpSequenceState]:
        return self._states.get(lead_id)

    async def get_sequence_by_id(self, sequence_id: UUID) -> Optional[FollowUpSequence]:
        return self._sequences.get(sequence_id)

    async def get_default_sequence_for_lead(self, lead: LeadContext) -> Optional[FollowUpSequence]:
        # Finde erste aktive Default-Sequenz
        for seq in self._sequences.values():
            if seq.is_default and seq.is_active:
                return seq
        return None

    async def get_recent_interactions(self, lead_id: UUID, limit: int = 20) -> List[Dict[str, Any]]:
        interactions = self._interactions.get(lead_id, [])
        return interactions[:limit]

    async def upsert_sequence_state(self, state: FollowUpSequenceState) -> FollowUpSequenceState:
        self._states[state.lead_id] = state
        return state

    async def log_followup_suggestion(self, suggestion: FollowUpSuggestion) -> None:
        self._suggestions_log.append(suggestion)

    async def log_followup_message(self, message: AIMessage) -> None:
        self._messages_log.append(message)

    async def list_all_leads(self) -> List[LeadContext]:
        return list(self._leads.values())

    # ─────────────────────────────────
    # Debug Helpers
    # ─────────────────────────────────

    def debug_get_info(self) -> Dict[str, Any]:
        """Debug-Infos für Tests."""
        return {
            "workspace_id": str(self._workspace_id),
            "owner_id": str(self._owner_id),
            "lead_ids": [str(lid) for lid in self._leads.keys()],
            "leads": [
                {
                    "id": str(l.id),
                    "name": l.full_name,
                    "score": l.lead_score,
                    "tags": l.tags,
                }
                for l in self._leads.values()
            ],
            "sequence_count": len(self._sequences),
            "sequences": [
                {"id": str(s.id), "name": s.name}
                for s in self._sequences.values()
            ],
        }
    
    def add_lead(self, lead: LeadContext) -> None:
        """Fügt einen Lead hinzu (für Tests)."""
        self._leads[lead.id] = lead
    
    def add_interaction(self, lead_id: UUID, interaction: Dict[str, Any]) -> None:
        """Fügt eine Interaktion hinzu (für Tests)."""
        if lead_id not in self._interactions:
            self._interactions[lead_id] = []
        self._interactions[lead_id].insert(0, interaction)  # Newest first


__all__ = ["InMemoryFollowUpRepository"]

