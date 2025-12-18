"""
Tests für den Onboarding Service.

Testet den Magic Onboarding Flow für Networker.
"""
import pytest
from uuid import uuid4
from datetime import datetime

from app.services.onboarding_service import (
    OnboardingService,
    OnboardingStep,
    OnboardingStatus,
    WarmMarketContact,
    FollowUpStep,
    FollowUpAction,
    DailyAction,
    DailyActionType,
    DailyActionPlan,
    SUPPORTED_COMPANIES,
    DEFAULT_FOLLOW_UP_SEQUENCES,
    DEFAULT_DAILY_ACTIONS,
)


# ============= Fixtures =============

@pytest.fixture
def service():
    """Erstellt einen Test-Service."""
    return OnboardingService()


@pytest.fixture
def user_id():
    """Erstellt eine Test-User-ID."""
    return uuid4()


# ============= State Management Tests =============

class TestOnboardingStateManagement:
    """Tests für State Management."""
    
    @pytest.mark.asyncio
    async def test_get_state_creates_new(self, service, user_id):
        """Testet, dass ein neuer State erstellt wird."""
        state = await service.get_state(user_id)
        
        assert state.user_id == user_id
        assert state.current_step == OnboardingStep.WELCOME
        assert state.is_complete is False
        assert len(state.steps) == len(OnboardingStep)
    
    @pytest.mark.asyncio
    async def test_get_state_returns_existing(self, service, user_id):
        """Testet, dass existierender State zurückgegeben wird."""
        state1 = await service.get_state(user_id)
        state2 = await service.get_state(user_id)
        
        assert state1.user_id == state2.user_id
        assert state1.started_at == state2.started_at
    
    @pytest.mark.asyncio
    async def test_progress_percent_calculation(self, service, user_id):
        """Testet die Fortschrittsberechnung."""
        state = await service.get_state(user_id)
        
        # Initial: 0%
        assert state.get_progress_percent() == 0
        
        # Starte Onboarding (1 Schritt)
        state = await service.start_onboarding(user_id)
        assert state.get_progress_percent() > 0


# ============= Onboarding Flow Tests =============

class TestOnboardingFlow:
    """Tests für den Onboarding Flow."""
    
    @pytest.mark.asyncio
    async def test_start_onboarding(self, service, user_id):
        """Testet das Starten des Onboardings."""
        state = await service.start_onboarding(user_id)
        
        assert state.current_step == OnboardingStep.COMPANY_SELECTION
        assert state.steps[OnboardingStep.WELCOME.value].status == OnboardingStatus.COMPLETED
    
    @pytest.mark.asyncio
    async def test_start_onboarding_idempotent(self, service, user_id):
        """Testet, dass Start idempotent ist."""
        state1 = await service.start_onboarding(user_id)
        state2 = await service.start_onboarding(user_id)
        
        assert state1.current_step == state2.current_step
    
    @pytest.mark.asyncio
    async def test_company_selection(self, service, user_id):
        """Testet die Firmenauswahl."""
        await service.start_onboarding(user_id)
        
        state = await service.complete_company_selection(
            user_id=user_id,
            company_id="herbalife"
        )
        
        assert state.company_setup is not None
        assert state.company_setup.company_id == "herbalife"
        assert state.company_setup.company_name == "Herbalife"
        assert state.current_step == OnboardingStep.COMPENSATION_PLAN
    
    @pytest.mark.asyncio
    async def test_company_selection_custom_name(self, service, user_id):
        """Testet Firmenauswahl mit Custom Name."""
        await service.start_onboarding(user_id)
        
        state = await service.complete_company_selection(
            user_id=user_id,
            company_id="other",
            custom_company_name="Meine Firma"
        )
        
        assert state.company_setup.company_name == "Meine Firma"
    
    @pytest.mark.asyncio
    async def test_compensation_plan_setup(self, service, user_id):
        """Testet das Compensation Plan Setup."""
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        
        state = await service.complete_compensation_plan(
            user_id=user_id,
            current_rank="Distributor",
            team_size=5,
            monthly_volume=1000.0,
            goals={"monthly_income": 500}
        )
        
        assert state.company_setup.current_rank == "Distributor"
        assert state.company_setup.team_size == 5
        assert state.company_setup.monthly_volume == 1000.0
        assert state.current_step == OnboardingStep.PROFILE_SETUP
    
    @pytest.mark.asyncio
    async def test_profile_setup(self, service, user_id):
        """Testet das Profil Setup."""
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        
        state = await service.complete_profile_setup(
            user_id=user_id,
            profile_data={
                "display_name": "Max Mustermann",
                "bio": "Network Marketer",
                "timezone": "Europe/Berlin"
            }
        )
        
        assert state.current_step == OnboardingStep.WARM_MARKET_IMPORT
    
    @pytest.mark.asyncio
    async def test_skip_step(self, service, user_id):
        """Testet das Überspringen eines Schritts."""
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        await service.complete_profile_setup(user_id, {})
        
        state = await service.skip_step(user_id, OnboardingStep.WARM_MARKET_IMPORT)
        
        assert state.steps[OnboardingStep.WARM_MARKET_IMPORT.value].status == OnboardingStatus.SKIPPED
        assert state.current_step == OnboardingStep.FIRST_LEAD
    
    @pytest.mark.asyncio
    async def test_complete_onboarding(self, service, user_id):
        """Testet das Abschließen des Onboardings."""
        # Durchlaufe alle Schritte
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        await service.complete_profile_setup(user_id, {})
        await service.skip_step(user_id, OnboardingStep.WARM_MARKET_IMPORT)
        await service.skip_step(user_id, OnboardingStep.FIRST_LEAD)
        await service.setup_follow_up_sequence(user_id)
        await service.setup_daily_actions(user_id)
        
        state = await service.complete_onboarding(user_id)
        
        assert state.is_complete is True
        assert state.completed_at is not None
        assert state.get_progress_percent() == 100.0


# ============= Warm Market Tests =============

class TestWarmMarketImport:
    """Tests für Warm Market Import."""
    
    @pytest.mark.asyncio
    async def test_import_contacts(self, service, user_id):
        """Testet den Import von Kontakten."""
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        await service.complete_profile_setup(user_id, {})
        
        contacts = [
            WarmMarketContact(
                name="Anna Schmidt",
                relationship="friend",
                phone="+49123456789",
                email="anna@example.com",
                priority=8
            ),
            WarmMarketContact(
                name="Thomas Müller",
                relationship="family",
                priority=9
            ),
        ]
        
        state = await service.import_warm_market(user_id, contacts, "manual")
        
        assert state.warm_market is not None
        assert len(state.warm_market.contacts) == 2
        assert state.current_step == OnboardingStep.FIRST_LEAD


# ============= Follow-Up Sequence Tests =============

class TestFollowUpSequence:
    """Tests für Follow-Up Sequences."""
    
    def test_default_sequences_exist(self):
        """Testet, dass Standard-Sequenzen existieren."""
        assert "new_lead" in DEFAULT_FOLLOW_UP_SEQUENCES
        assert "warm_market" in DEFAULT_FOLLOW_UP_SEQUENCES
    
    def test_new_lead_sequence_steps(self):
        """Testet die New Lead Sequenz."""
        sequence = DEFAULT_FOLLOW_UP_SEQUENCES["new_lead"]
        
        assert sequence.name == "New Lead Nurture"
        assert len(sequence.steps) == 5
        assert sequence.steps[0].step_number == 1
        assert sequence.steps[0].action == FollowUpAction.SEND_MESSAGE
    
    def test_warm_market_sequence_steps(self):
        """Testet die Warm Market Sequenz."""
        sequence = DEFAULT_FOLLOW_UP_SEQUENCES["warm_market"]
        
        assert sequence.name == "Warm Market Approach"
        assert len(sequence.steps) == 3
        assert sequence.steps[0].action == FollowUpAction.CHECK_IN
    
    @pytest.mark.asyncio
    async def test_setup_follow_up_sequence(self, service, user_id):
        """Testet das Setup einer Follow-Up Sequenz."""
        # Setup vorbereiten
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        await service.complete_profile_setup(user_id, {})
        await service.skip_step(user_id, OnboardingStep.WARM_MARKET_IMPORT)
        await service.skip_step(user_id, OnboardingStep.FIRST_LEAD)
        
        state = await service.setup_follow_up_sequence(user_id, "new_lead")
        
        assert state.follow_up_sequence is not None
        assert state.follow_up_sequence.name == "New Lead Nurture"


# ============= Daily Actions Tests =============

class TestDailyActions:
    """Tests für Daily Actions."""
    
    def test_default_daily_actions_exist(self):
        """Testet, dass Standard Daily Actions existieren."""
        assert DEFAULT_DAILY_ACTIONS is not None
        assert len(DEFAULT_DAILY_ACTIONS.actions) > 0
        assert DEFAULT_DAILY_ACTIONS.total_points_goal == 100
    
    def test_reach_out_action(self):
        """Testet die Reach Out Action."""
        reach_out = next(
            (a for a in DEFAULT_DAILY_ACTIONS.actions 
             if a.action_type == DailyActionType.REACH_OUT),
            None
        )
        
        assert reach_out is not None
        assert reach_out.target_count == 5
        assert reach_out.is_required is True
    
    def test_follow_up_action(self):
        """Testet die Follow Up Action."""
        follow_up = next(
            (a for a in DEFAULT_DAILY_ACTIONS.actions 
             if a.action_type == DailyActionType.FOLLOW_UP),
            None
        )
        
        assert follow_up is not None
        assert follow_up.target_count == 10
        assert follow_up.is_required is True
    
    @pytest.mark.asyncio
    async def test_setup_custom_daily_actions(self, service, user_id):
        """Testet das Setup von Custom Daily Actions."""
        # Setup vorbereiten
        await service.start_onboarding(user_id)
        await service.complete_company_selection(user_id, "herbalife")
        await service.complete_compensation_plan(user_id, "Distributor", 0, 0, {})
        await service.complete_profile_setup(user_id, {})
        await service.skip_step(user_id, OnboardingStep.WARM_MARKET_IMPORT)
        await service.skip_step(user_id, OnboardingStep.FIRST_LEAD)
        await service.setup_follow_up_sequence(user_id)
        
        custom_plan = DailyActionPlan(
            actions=[
                DailyAction(
                    action_type=DailyActionType.REACH_OUT,
                    target_count=10,
                    description="Reach out to 10 people",
                    points=50,
                    is_required=True
                )
            ],
            total_points_goal=50
        )
        
        state = await service.setup_daily_actions(user_id, custom_plan)
        
        assert state.daily_action_plan is not None
        assert state.daily_action_plan.total_points_goal == 50


# ============= Supported Companies Tests =============

class TestSupportedCompanies:
    """Tests für unterstützte Firmen."""
    
    def test_companies_exist(self):
        """Testet, dass Firmen existieren."""
        assert len(SUPPORTED_COMPANIES) >= 5
    
    def test_herbalife_company(self):
        """Testet Herbalife Company Info."""
        herbalife = next(
            (c for c in SUPPORTED_COMPANIES if c.id == "herbalife"),
            None
        )
        
        assert herbalife is not None
        assert herbalife.name == "Herbalife"
        assert "Distributor" in herbalife.rank_titles
    
    def test_pm_international_company(self):
        """Testet PM-International Company Info."""
        pm = next(
            (c for c in SUPPORTED_COMPANIES if c.id == "pm_international"),
            None
        )
        
        assert pm is not None
        assert pm.name == "PM-International"
    
    def test_doterra_company(self):
        """Testet doTERRA Company Info."""
        doterra = next(
            (c for c in SUPPORTED_COMPANIES if c.id == "doterra"),
            None
        )
        
        assert doterra is not None
        assert doterra.name == "doTERRA"
    
    def test_other_company_exists(self):
        """Testet, dass 'Other' Option existiert."""
        other = next(
            (c for c in SUPPORTED_COMPANIES if c.id == "other"),
            None
        )
        
        assert other is not None
        assert other.name == "Other Company"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

