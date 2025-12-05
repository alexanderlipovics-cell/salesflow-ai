# file: app/services/followup_engine.py
"""
Follow-Up Engine - Das Herzstück des intelligenten Follow-Up Systems

GPT-5.1 Design - Zentrale Engine die entscheidet:
- OB ein Follow-up fällig ist
- WELCHER Channel (WhatsApp, SMS, Email, Call, DM)
- WANN (konkrete Uhrzeit / Tag)
- WIE dringend (Priorität / Score)
- WELCHE Sequenz / Stufe der Lead gerade ist

Die Engine kombiniert:
- Regel-Logik (Sequenzen / Steps / Delays)
- AI-Logik (Message-Text & Winkel)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Protocol
from uuid import UUID

from app.models.followup import (
    AIMessage,
    FollowUpChannel,
    FollowUpCondition,
    FollowUpPriority,
    FollowUpSequence,
    FollowUpSequenceState,
    FollowUpSequenceStatus,
    FollowUpStep,
    FollowUpSuggestion,
    LeadContext,
)


# ─────────────────────────────────────
# Protocols für Abhängigkeiten
# (damit der Code testbar & austauschbar bleibt)
# ─────────────────────────────────────

class FollowUpRepository(Protocol):
    """
    Repository-Interface für Zugriff auf Sequenzen, States & Logs.
    Implementierung mit Supabase/Postgres.
    """

    async def get_lead_context(self, lead_id: UUID) -> Optional[LeadContext]:
        ...

    async def get_active_sequence_state(self, lead_id: UUID) -> Optional[FollowUpSequenceState]:
        ...

    async def get_sequence_by_id(self, sequence_id: UUID) -> Optional[FollowUpSequence]:
        ...

    async def get_default_sequence_for_lead(self, lead: LeadContext) -> Optional[FollowUpSequence]:
        ...

    async def get_recent_interactions(self, lead_id: UUID, limit: int = 20) -> List[Dict[str, Any]]:
        """Liste von Events/Message-Logs."""
        ...

    async def upsert_sequence_state(self, state: FollowUpSequenceState) -> FollowUpSequenceState:
        ...

    async def log_followup_suggestion(self, suggestion: FollowUpSuggestion) -> None:
        ...

    async def log_followup_message(self, message: AIMessage) -> None:
        ...
    
    async def list_all_leads(self) -> List[LeadContext]:
        """Liefert alle Leads (für /today Endpoint)."""
        ...


class AIRouterProtocol(Protocol):
    """
    High-level AI-Interface (siehe AI Integration Architecture).
    """

    async def generate(
        self,
        task_type: str,
        user_payload: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        task_type z.B. 'FOLLOWUP_GENERATION'
        expected response: {"content": str, "model": str, "prompt_version": str, "tokens_used": int, ...}
        """
        ...


class TimezoneServiceProtocol(Protocol):
    """Service für Zeitzonen & "beste Tageszeit" Berechnung."""

    def now_in_tz(self, tz_name: Optional[str]) -> datetime:
        ...

    def next_best_contact_time(
        self,
        tz_name: Optional[str],
        base: Optional[datetime] = None,
    ) -> datetime:
        ...


# ─────────────────────────────────────
# FollowUpEngine
# ─────────────────────────────────────

class FollowUpEngine:
    """
    Zentrale Engine für intelligente Follow-ups.
    
    Features:
    - Entscheidet welcher Follow-up als nächstes dran ist
    - Generiert AI-Nachrichten mit Kontext
    - Berechnet Prioritäten & optimales Timing
    - Respektiert Sequenz-Regeln und Conditions
    """

    def __init__(
        self,
        repo: FollowUpRepository,
        ai_router: AIRouterProtocol,
        tz_service: TimezoneServiceProtocol,
    ) -> None:
        self.repo = repo
        self.ai = ai_router
        self.tz = tz_service

    # ─────────────────────────────────
    # PUBLIC API
    # ─────────────────────────────────

    async def get_next_follow_up(self, lead_id: UUID) -> Optional[FollowUpSuggestion]:
        """
        Bestimmt den nächsten Follow-up für einen Lead.
        
        Flow:
        1. Lead-Kontext laden
        2. Aktiven Sequenz-State laden oder neue Sequenz wählen
        3. Nächsten Step bestimmen (basierend auf day_offset, Status, Interaktionen)
        4. Channel & Zeitpunkt bestimmen
        5. Priorität berechnen
        
        Returns:
            FollowUpSuggestion oder None wenn kein Follow-up fällig
        """
        lead = await self.repo.get_lead_context(lead_id)
        if not lead:
            return None

        state = await self.repo.get_active_sequence_state(lead_id)

        if not state:
            # Falls keine Sequenz aktiv, versuche Standard-Sequenz zu wählen
            sequence = await self.repo.get_default_sequence_for_lead(lead)
            if not sequence:
                return None
            state = self._init_sequence_state(lead, sequence)
            # State direkt persistieren
            state = await self.repo.upsert_sequence_state(state)
        else:
            sequence = await self.repo.get_sequence_by_id(state.sequence_id)
            if not sequence:
                return None

        # Beendete Sequenzen überspringen
        if state.status in {
            FollowUpSequenceStatus.COMPLETED,
            FollowUpSequenceStatus.STOPPED,
            FollowUpSequenceStatus.GHOSTED,
        }:
            return None

        next_step = self._determine_next_step(sequence, state, lead)
        if not next_step:
            return None

        # Conditions prüfen (z.B. NO_REPLY etc.)
        interactions = await self.repo.get_recent_interactions(lead_id)
        if not self._condition_satisfied(next_step, interactions):
            return None

        # Zeitpunkt bestimmen
        recommended_time = self._compute_recommended_time(lead, state, next_step)

        # Priorität bestimmen
        priority = self._compute_priority(lead, state, next_step)

        suggestion = FollowUpSuggestion(
            lead_id=lead.id,
            workspace_id=lead.workspace_id,
            owner_id=lead.owner_id,
            sequence_id=sequence.id,
            step_id=next_step.id,
            recommended_channel=next_step.channel,
            recommended_time=recommended_time,
            priority=priority,
            reason=self._build_reason(lead, state, next_step),
            meta={
                "sequence_name": sequence.name,
                "step_action": next_step.action,
                "day_offset": next_step.day_offset,
                "template_key": next_step.template_key,
            },
        )

        # Logging
        await self.repo.log_followup_suggestion(suggestion)

        return suggestion

    async def generate_message(
        self,
        lead_id: UUID,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[AIMessage]:
        """
        Generiert eine personalisierte Follow-up Nachricht.
        
        Flow:
        1. Suggestion holen
        2. AI-Prompt Payload bauen
        3. AI-Router Text generieren lassen
        4. AIMessage-Objekt erstellen
        
        Args:
            lead_id: ID des Leads
            context: Optionaler zusätzlicher Kontext
            
        Returns:
            AIMessage oder None
        """
        suggestion = await self.get_next_follow_up(lead_id)
        if not suggestion:
            return None

        lead = await self.repo.get_lead_context(lead_id)
        if not lead:
            return None

        # AI-Payload vorbereiten
        payload: Dict[str, Any] = {
            "lead": lead.dict(),
            "suggestion": suggestion.dict(),
            "user_context": context or {},
        }

        ai_response = await self.ai.generate(
            task_type="FOLLOWUP_GENERATION",
            user_payload=payload,
            config={
                "importance": "high",
                "cost_sensitivity": "medium",
            },
        )

        content = ai_response.get("content", "").strip()
        if not content:
            return None

        message = AIMessage(
            lead_id=lead.id,
            workspace_id=lead.workspace_id,
            owner_id=lead.owner_id,
            channel=suggestion.recommended_channel,
            content=content,
            language=lead.language or "de",
            template_key=suggestion.meta.get("template_key"),
            used_sequence_id=suggestion.sequence_id,
            used_step_id=suggestion.step_id,
            model_name=ai_response.get("model"),
            prompt_version=ai_response.get("prompt_version"),
            tokens_used=ai_response.get("tokens_used"),
            meta={"raw_ai_response": ai_response},
        )

        await self.repo.log_followup_message(message)
        return message

    async def get_today_followups(self, user_id: Optional[UUID] = None) -> List[FollowUpSuggestion]:
        """
        Holt alle Follow-ups die heute fällig sind.
        
        Args:
            user_id: Optional - Filter auf User
            
        Returns:
            Liste von FollowUpSuggestions, sortiert nach Priorität
        """
        leads = await self.repo.list_all_leads()
        suggestions: List[FollowUpSuggestion] = []
        
        for lead in leads:
            # Optional: Filter auf User
            if user_id and lead.owner_id != user_id:
                continue
                
            suggestion = await self.get_next_follow_up(lead.id)
            if suggestion:
                # Nur heute fällige
                if suggestion.recommended_time.date() <= datetime.now().date():
                    suggestions.append(suggestion)
        
        # Nach Priorität sortieren
        priority_order = {
            FollowUpPriority.CRITICAL: 0,
            FollowUpPriority.HIGH: 1,
            FollowUpPriority.MEDIUM: 2,
            FollowUpPriority.LOW: 3,
        }
        suggestions.sort(key=lambda s: priority_order.get(s.priority, 99))
        
        return suggestions

    # ─────────────────────────────────
    # INTERNAL HELPERS
    # ─────────────────────────────────

    def _init_sequence_state(
        self,
        lead: LeadContext,
        sequence: FollowUpSequence,
    ) -> FollowUpSequenceState:
        """Initialisiert eine neue Sequenz für einen Lead."""
        from uuid import uuid4
        now = self.tz.now_in_tz(lead.timezone)
        return FollowUpSequenceState(
            id=uuid4(),
            workspace_id=lead.workspace_id,
            lead_id=lead.id,
            sequence_id=sequence.id,
            status=FollowUpSequenceStatus.IN_PROGRESS,
            current_step_id=None,
            current_step_index=None,
            started_at=now,
            last_step_scheduled_at=None,
            last_step_completed_at=None,
            last_interaction_type=None,
            last_interaction_at=None,
        )

    def _determine_next_step(
        self,
        sequence: FollowUpSequence,
        state: FollowUpSequenceState,
        lead: LeadContext,
    ) -> Optional[FollowUpStep]:
        """
        Findet den nächsten Step innerhalb der Sequenz.
        
        Logik:
        - Wenn noch kein Step gestartet → erster Step
        - Sonst: nächster Step mit höherem order_index
        """
        if not sequence.steps:
            return None

        sorted_steps = sorted(sequence.steps, key=lambda s: (s.day_offset, s.order_index))

        if state.current_step_index is None:
            return sorted_steps[0]

        if state.current_step_index + 1 >= len(sorted_steps):
            return None

        return sorted_steps[state.current_step_index + 1]

    def _condition_satisfied(
        self,
        step: FollowUpStep,
        interactions: List[Dict[str, Any]],
    ) -> bool:
        """
        Prüft Step-Condition gegen Interaktions-Historie.
        """
        if step.condition == FollowUpCondition.ALWAYS:
            return True

        if not interactions:
            return step.condition == FollowUpCondition.NO_REPLY

        last_type = interactions[0].get("type", "")

        if step.condition == FollowUpCondition.NO_REPLY:
            return not last_type.startswith("reply_")

        if step.condition == FollowUpCondition.REPLIED_POSITIVE:
            return last_type == "reply_positive"

        if step.condition == FollowUpCondition.REPLIED_NEGATIVE:
            return last_type == "reply_negative"

        return True

    def _compute_recommended_time(
        self,
        lead: LeadContext,
        state: FollowUpSequenceState,
        step: FollowUpStep,
    ) -> datetime:
        """
        Berechnet optimalen Follow-up Zeitpunkt.
        
        Basis: Sequenz-Start + day_offset
        Falls in der Vergangenheit → nächstbeste Tageszeit
        """
        base = state.started_at or self.tz.now_in_tz(lead.timezone)
        candidate = base + timedelta(days=step.day_offset)

        now_local = self.tz.now_in_tz(lead.timezone)

        if candidate < now_local:
            return self.tz.next_best_contact_time(lead.timezone, base=now_local)

        return candidate

    def _compute_priority(
        self,
        lead: LeadContext,
        state: FollowUpSequenceState,
        step: FollowUpStep,
    ) -> FollowUpPriority:
        """
        Berechnet Priorität basierend auf Lead Score und Zeit seit letztem Kontakt.
        
        Heuristik:
        - Hoher Lead Score + lange Funkstille → CRITICAL
        - Mittlerer Score + paar Tage → HIGH
        - Sonst MEDIUM/LOW
        """
        score = lead.lead_score or 0.0
        now_local = self.tz.now_in_tz(lead.timezone)
        last_contact = lead.last_contacted_at or (now_local - timedelta(days=999))

        days_since_contact = (now_local - last_contact).days

        if score >= 80 and days_since_contact >= 7:
            return FollowUpPriority.CRITICAL
        if score >= 50 and days_since_contact >= 3:
            return FollowUpPriority.HIGH
        if days_since_contact >= 7:
            return FollowUpPriority.HIGH

        return FollowUpPriority.MEDIUM

    def _build_reason(
        self,
        lead: LeadContext,
        state: FollowUpSequenceState,
        step: FollowUpStep,
    ) -> str:
        """Baut menschlich lesbare Begründung für UI."""
        parts: List[str] = []

        if lead.first_name:
            parts.append(f"Follow-up für {lead.first_name}")
        else:
            parts.append("Follow-up für Lead")

        parts.append(f"Sequenz-Step: {step.action}")

        if lead.lead_score is not None:
            parts.append(f"Score: {int(lead.lead_score)}")

        return " | ".join(parts)


__all__ = [
    "FollowUpEngine",
    "FollowUpRepository",
    "AIRouterProtocol",
    "TimezoneServiceProtocol",
]

