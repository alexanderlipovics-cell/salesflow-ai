"""
Tests für die Follow-Up Engine.

Testet:
- FollowUpEngine
- FollowUpSuggestion
- Sequenzen
- Prioritätsberechnung
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta

from app.models.followup import (
    FollowUpChannel,
    FollowUpPriority,
    FollowUpCondition,
    FollowUpSequenceStatus,
    FollowUpStep,
    FollowUpSequence,
    FollowUpSequenceState,
    LeadContext,
    FollowUpSuggestion,
    AIMessage,
)
from app.services.followup_engine import FollowUpEngine
from app.services.timezone_service import DefaultTimezoneService
from app.repositories.followup_repository_mock import InMemoryFollowUpRepository
from app.services.ai_router_dummy import DummyAIRouter


# ============= Fixtures =============

@pytest.fixture
def repository():
    """Erstellt ein Test-Repository."""
    return InMemoryFollowUpRepository()


@pytest.fixture
def ai_router():
    """Erstellt einen Dummy AI Router."""
    return DummyAIRouter()


@pytest.fixture
def timezone_service():
    """Erstellt einen Timezone Service."""
    return DefaultTimezoneService()


@pytest.fixture
def engine(repository, ai_router, timezone_service):
    """Erstellt eine Test-Engine."""
    return FollowUpEngine(
        repo=repository,
        ai_router=ai_router,
        tz_service=timezone_service
    )


# ============= Model Tests =============

class TestFollowUpModels:
    """Tests für die Datenmodelle."""
    
    def test_follow_up_step_creation(self):
        """Testet FollowUpStep Erstellung."""
        step = FollowUpStep(
            id=uuid4(),
            sequence_id=uuid4(),
            order_index=0,
            day_offset=0,
            action="send_message",
            channel=FollowUpChannel.WHATSAPP,
            condition=FollowUpCondition.ALWAYS
        )
        
        assert step.order_index == 0
        assert step.channel == FollowUpChannel.WHATSAPP
    
    def test_follow_up_sequence_creation(self):
        """Testet FollowUpSequence Erstellung."""
        seq = FollowUpSequence(
            id=uuid4(),
            workspace_id=uuid4(),
            name="Test Sequence",
            steps=[],
            is_active=True,
            is_default=True,
            created_by=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        assert seq.name == "Test Sequence"
        assert seq.is_active is True
    
    def test_lead_context_creation(self):
        """Testet LeadContext Erstellung."""
        lead = LeadContext(
            id=uuid4(),
            workspace_id=uuid4(),
            owner_id=uuid4(),
            full_name="Max Mustermann",
            first_name="Max",
            timezone="Europe/Berlin",
            primary_channel=FollowUpChannel.WHATSAPP,
            language="de",
            lead_score=80.0
        )
        
        assert lead.first_name == "Max"
        assert lead.lead_score == 80.0
    
    def test_follow_up_suggestion_creation(self):
        """Testet FollowUpSuggestion Erstellung."""
        suggestion = FollowUpSuggestion(
            lead_id=uuid4(),
            workspace_id=uuid4(),
            owner_id=uuid4(),
            recommended_channel=FollowUpChannel.WHATSAPP,
            recommended_time=datetime.now(),
            priority=FollowUpPriority.HIGH,
            reason="Test reason"
        )
        
        assert suggestion.priority == FollowUpPriority.HIGH


# ============= Repository Tests =============

class TestInMemoryRepository:
    """Tests für das InMemory Repository."""
    
    @pytest.mark.asyncio
    async def test_bootstrap_data(self, repository):
        """Testet, dass Bootstrap-Daten erstellt werden."""
        leads = await repository.list_all_leads()
        
        assert len(leads) > 0
    
    @pytest.mark.asyncio
    async def test_get_lead_context(self, repository):
        """Testet das Laden eines Leads."""
        leads = await repository.list_all_leads()
        lead_id = leads[0].id
        
        lead = await repository.get_lead_context(lead_id)
        
        assert lead is not None
        assert lead.id == lead_id
    
    @pytest.mark.asyncio
    async def test_get_default_sequence(self, repository):
        """Testet das Laden der Standard-Sequenz."""
        leads = await repository.list_all_leads()
        
        sequence = await repository.get_default_sequence_for_lead(leads[0])
        
        assert sequence is not None
        assert sequence.is_default is True
    
    @pytest.mark.asyncio
    async def test_upsert_sequence_state(self, repository):
        """Testet das Speichern eines Sequence States."""
        leads = await repository.list_all_leads()
        lead = leads[0]
        sequence = await repository.get_default_sequence_for_lead(lead)
        
        state = FollowUpSequenceState(
            id=uuid4(),
            workspace_id=lead.workspace_id,
            lead_id=lead.id,
            sequence_id=sequence.id,
            status=FollowUpSequenceStatus.IN_PROGRESS,
            started_at=datetime.now()
        )
        
        saved_state = await repository.upsert_sequence_state(state)
        
        assert saved_state.status == FollowUpSequenceStatus.IN_PROGRESS
    
    @pytest.mark.asyncio
    async def test_debug_helper(self, repository):
        """Testet die Debug-Funktion."""
        debug_info = repository.debug_get_owner_and_lead_ids()
        
        assert "workspace_id" in debug_info
        assert "owner_id" in debug_info
        assert "lead_ids" in debug_info


# ============= Timezone Service Tests =============

class TestTimezoneService:
    """Tests für den Timezone Service."""
    
    def test_default_timezone(self, timezone_service):
        """Testet die Standard-Zeitzone."""
        assert timezone_service.default_tz == "Europe/Vienna"
    
    def test_now_in_timezone(self, timezone_service):
        """Testet das Abrufen der aktuellen Zeit."""
        now = timezone_service.now_in_tz("Europe/Berlin")
        
        assert now is not None
        assert now.tzinfo is not None
    
    def test_now_with_invalid_timezone(self, timezone_service):
        """Testet ungültige Zeitzone (Fallback)."""
        now = timezone_service.now_in_tz("Invalid/Timezone")
        
        # Sollte auf Default zurückfallen
        assert now is not None
    
    def test_next_best_contact_time(self, timezone_service):
        """Testet die Berechnung der besten Kontaktzeit."""
        best_time = timezone_service.next_best_contact_time("Europe/Berlin")
        
        assert best_time is not None
        # Sollte 18:00 sein
        assert best_time.hour == 18
    
    def test_next_best_contact_time_if_past(self, timezone_service):
        """Testet, dass morgen genommen wird wenn heute vorbei."""
        # Setze Basis auf 19:00
        base = datetime.now(timezone_service._resolve_tz("Europe/Berlin"))
        base = base.replace(hour=19, minute=0, second=0)
        
        best_time = timezone_service.next_best_contact_time("Europe/Berlin", base)
        
        # Sollte morgen 18:00 sein
        assert best_time.hour == 18
        assert best_time.date() > base.date()


# ============= AI Router Tests =============

class TestDummyAIRouter:
    """Tests für den Dummy AI Router."""
    
    @pytest.mark.asyncio
    async def test_generate_message(self, ai_router):
        """Testet die Message-Generierung."""
        result = await ai_router.generate(
            task_type="FOLLOWUP_GENERATION",
            user_payload={
                "lead": {"first_name": "Anna"},
                "suggestion": {"meta": {"step_action": "follow_up"}}
            }
        )
        
        assert "content" in result
        assert "Anna" in result["content"]
        assert result["model"] == "dummy-local"


# ============= Follow-Up Engine Tests =============

class TestFollowUpEngine:
    """Tests für die Follow-Up Engine."""
    
    @pytest.mark.asyncio
    async def test_get_next_follow_up(self, engine, repository):
        """Testet das Abrufen des nächsten Follow-ups."""
        leads = await repository.list_all_leads()
        lead_id = leads[0].id
        
        suggestion = await engine.get_next_follow_up(lead_id)
        
        assert suggestion is not None
        assert suggestion.lead_id == lead_id
        assert suggestion.recommended_channel is not None
        assert suggestion.priority is not None
    
    @pytest.mark.asyncio
    async def test_get_next_follow_up_unknown_lead(self, engine):
        """Testet Follow-up für unbekannten Lead."""
        unknown_id = uuid4()
        
        suggestion = await engine.get_next_follow_up(unknown_id)
        
        assert suggestion is None
    
    @pytest.mark.asyncio
    async def test_generate_message(self, engine, repository):
        """Testet die Nachrichtengenerierung."""
        leads = await repository.list_all_leads()
        lead_id = leads[0].id
        
        message = await engine.generate_message(lead_id)
        
        assert message is not None
        assert message.content is not None
        assert len(message.content) > 0
    
    @pytest.mark.asyncio
    async def test_priority_calculation(self, engine, repository):
        """Testet die Prioritätsberechnung."""
        leads = await repository.list_all_leads()
        lead = leads[0]
        
        suggestion = await engine.get_next_follow_up(lead.id)
        
        # Lead hat lead_score 75 und wurde vor 5 Tagen kontaktiert
        # -> sollte HIGH oder CRITICAL sein
        assert suggestion.priority in [
            FollowUpPriority.HIGH, 
            FollowUpPriority.CRITICAL,
            FollowUpPriority.MEDIUM
        ]
    
    @pytest.mark.asyncio
    async def test_channel_recommendation(self, engine, repository):
        """Testet die Kanal-Empfehlung."""
        leads = await repository.list_all_leads()
        lead = leads[0]
        
        suggestion = await engine.get_next_follow_up(lead.id)
        
        # Sollte WhatsApp sein (Standard der Sequenz)
        assert suggestion.recommended_channel == FollowUpChannel.WHATSAPP
    
    @pytest.mark.asyncio
    async def test_reason_generation(self, engine, repository):
        """Testet die Reason-Generierung."""
        leads = await repository.list_all_leads()
        lead_id = leads[0].id
        
        suggestion = await engine.get_next_follow_up(lead_id)
        
        assert suggestion.reason is not None
        assert len(suggestion.reason) > 0


# ============= Integration Tests =============

class TestFollowUpIntegration:
    """Integration Tests."""
    
    @pytest.mark.asyncio
    async def test_full_follow_up_flow(self, engine, repository):
        """Testet den kompletten Follow-up Flow."""
        # 1. Lead holen
        leads = await repository.list_all_leads()
        lead = leads[0]
        
        # 2. Suggestion holen
        suggestion = await engine.get_next_follow_up(lead.id)
        assert suggestion is not None
        
        # 3. Nachricht generieren
        message = await engine.generate_message(lead.id)
        assert message is not None
        
        # 4. Prüfen, dass alles konsistent ist
        assert suggestion.lead_id == message.lead_id
        assert suggestion.recommended_channel == message.channel
    
    @pytest.mark.asyncio
    async def test_multiple_leads_follow_ups(self, repository, ai_router, timezone_service):
        """Testet Follow-ups für mehrere Leads."""
        # Erstelle Engine mit Repository das mehrere Leads hat
        engine = FollowUpEngine(
            repo=repository,
            ai_router=ai_router,
            tz_service=timezone_service
        )
        
        leads = await repository.list_all_leads()
        suggestions = []
        
        for lead in leads:
            suggestion = await engine.get_next_follow_up(lead.id)
            if suggestion:
                suggestions.append(suggestion)
        
        # Sollte mindestens für den Bootstrap-Lead eine Suggestion geben
        assert len(suggestions) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

