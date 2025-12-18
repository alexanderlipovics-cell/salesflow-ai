"""
Onboarding API Router für SalesFlow AI.

Magic Onboarding System für Network Marketers:
- Geführter Onboarding-Flow in 9 Schritten
- Company & Compensation Plan Auswahl
- Warm Market Import
- Follow-Up Sequence Setup
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr

from app.services.onboarding_service import (
    OnboardingService,
    OnboardingState,
    OnboardingStep,
    OnboardingStatus,
    CompanyInfo,
    WarmMarketContact,
    FollowUpStep,
    DailyAction,
    DailyActionPlan,
    SUPPORTED_COMPANIES,
    DEFAULT_FOLLOW_UP_SEQUENCES,
    DEFAULT_DAILY_ACTIONS,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# Singleton Service Instance
_onboarding_service: Optional[OnboardingService] = None

def get_onboarding_service() -> OnboardingService:
    global _onboarding_service
    if _onboarding_service is None:
        _onboarding_service = OnboardingService()
    return _onboarding_service


# ============= Request/Response Models =============

class OnboardingStateResponse(BaseModel):
    """Response für Onboarding Status."""
    user_id: str
    current_step: OnboardingStep
    progress_percent: float
    is_complete: bool
    next_action: str = ""


class CompanySelectionRequest(BaseModel):
    """Request für Firmenauswahl."""
    company_id: str
    custom_name: Optional[str] = None


class CompensationPlanRequest(BaseModel):
    """Request für Compensation Plan Setup."""
    current_rank: str
    team_size: int = 0
    monthly_volume: float = 0.0
    goals: dict[str, Any] = Field(default_factory=dict)


class ProfileSetupRequest(BaseModel):
    """Request für Profil Setup."""
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    language: str = "de"


class WarmMarketImportRequest(BaseModel):
    """Request für Warm Market Import."""
    contacts: list[WarmMarketContact]
    source: str = "manual"


class FirstLeadRequest(BaseModel):
    """Request für ersten Lead."""
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "manual"
    notes: Optional[str] = None


class FollowUpSequenceRequest(BaseModel):
    """Request für Follow-Up Sequence."""
    sequence_type: str = "new_lead"
    custom_steps: Optional[list[dict]] = None


class DailyActionsRequest(BaseModel):
    """Request für Daily Actions."""
    actions: Optional[list[dict]] = None
    total_points_goal: int = 100


# ============= Endpoints =============

@router.get("/status/{user_id}", response_model=OnboardingStateResponse)
async def get_onboarding_status(
    user_id: UUID,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Holt den aktuellen Onboarding-Status für einen User.
    """
    state = await service.get_state(user_id)
    
    # Nächste Aktion bestimmen
    next_actions = {
        OnboardingStep.WELCOME: "Starte dein Onboarding",
        OnboardingStep.COMPANY_SELECTION: "Wähle deine Network Marketing Firma",
        OnboardingStep.COMPENSATION_PLAN: "Konfiguriere deinen Vergütungsplan",
        OnboardingStep.PROFILE_SETUP: "Vervollständige dein Profil",
        OnboardingStep.WARM_MARKET_IMPORT: "Importiere deine warmen Kontakte",
        OnboardingStep.FIRST_LEAD: "Erstelle deinen ersten Lead",
        OnboardingStep.FOLLOW_UP_SEQUENCE: "Wähle eine Follow-Up Sequenz",
        OnboardingStep.DAILY_ACTIONS: "Konfiguriere deinen Daily Flow",
        OnboardingStep.COMPLETION: "🎉 Onboarding abgeschlossen!",
    }
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action=next_actions.get(state.current_step, "")
    )


@router.post("/start/{user_id}", response_model=OnboardingStateResponse)
async def start_onboarding(
    user_id: UUID,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Startet den Onboarding-Flow für einen User.
    """
    state = await service.start_onboarding(user_id)
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Wähle deine Network Marketing Firma"
    )


@router.get("/companies")
async def get_supported_companies():
    """
    Gibt alle unterstützten Network Marketing Firmen zurück.
    """
    return {
        "companies": [c.model_dump() for c in SUPPORTED_COMPANIES],
        "total": len(SUPPORTED_COMPANIES)
    }


@router.post("/company/{user_id}", response_model=OnboardingStateResponse)
async def select_company(
    user_id: UUID,
    request: CompanySelectionRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 1: Firma auswählen.
    """
    state = await service.complete_company_selection(
        user_id=user_id,
        company_id=request.company_id,
        custom_company_name=request.custom_name
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Konfiguriere deinen Vergütungsplan"
    )


@router.post("/compensation-plan/{user_id}", response_model=OnboardingStateResponse)
async def configure_compensation_plan(
    user_id: UUID,
    request: CompensationPlanRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 2: Vergütungsplan konfigurieren.
    """
    state = await service.complete_compensation_plan(
        user_id=user_id,
        current_rank=request.current_rank,
        team_size=request.team_size,
        monthly_volume=request.monthly_volume,
        goals=request.goals
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Vervollständige dein Profil"
    )


@router.post("/profile/{user_id}", response_model=OnboardingStateResponse)
async def setup_profile(
    user_id: UUID,
    request: ProfileSetupRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 3: Profil vervollständigen.
    """
    state = await service.complete_profile_setup(
        user_id=user_id,
        profile_data=request.model_dump(exclude_none=True)
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Importiere deine warmen Kontakte"
    )


@router.post("/warm-market/{user_id}", response_model=OnboardingStateResponse)
async def import_warm_market(
    user_id: UUID,
    request: WarmMarketImportRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 4: Warm Market Kontakte importieren.
    """
    state = await service.import_warm_market(
        user_id=user_id,
        contacts=request.contacts,
        source=request.source
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Erstelle deinen ersten Lead"
    )


@router.post("/first-lead/{user_id}", response_model=OnboardingStateResponse)
async def create_first_lead(
    user_id: UUID,
    request: FirstLeadRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 5: Ersten Lead manuell erstellen.
    """
    state = await service.create_first_lead(
        user_id=user_id,
        lead_data=request.model_dump(exclude_none=True)
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Wähle eine Follow-Up Sequenz"
    )


@router.get("/sequences")
async def get_default_sequences():
    """
    Gibt Standard Follow-Up Sequenzen zurück.
    """
    return {
        "sequences": {
            key: seq.model_dump() 
            for key, seq in DEFAULT_FOLLOW_UP_SEQUENCES.items()
        }
    }


@router.post("/follow-up-sequence/{user_id}", response_model=OnboardingStateResponse)
async def setup_follow_up_sequence(
    user_id: UUID,
    request: FollowUpSequenceRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 6: Follow-Up Sequenz auswählen.
    """
    state = await service.setup_follow_up_sequence(
        user_id=user_id,
        sequence_type=request.sequence_type,
        custom_steps=None  # TODO: Parse custom steps
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Konfiguriere deinen Daily Flow"
    )


@router.get("/daily-actions/default")
async def get_default_daily_actions():
    """
    Gibt Standard Daily Actions zurück.
    """
    return DEFAULT_DAILY_ACTIONS.model_dump()


@router.post("/daily-actions/{user_id}", response_model=OnboardingStateResponse)
async def setup_daily_actions(
    user_id: UUID,
    request: DailyActionsRequest,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 7: Daily Actions konfigurieren.
    """
    custom_plan = None
    if request.actions:
        custom_plan = DailyActionPlan(
            actions=[DailyAction(**a) for a in request.actions],
            total_points_goal=request.total_points_goal
        )
    
    state = await service.setup_daily_actions(
        user_id=user_id,
        custom_plan=custom_plan
    )
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Schließe dein Onboarding ab"
    )


@router.post("/complete/{user_id}", response_model=OnboardingStateResponse)
async def complete_onboarding(
    user_id: UUID,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Schritt 8: Onboarding abschließen.
    """
    state = await service.complete_onboarding(user_id)
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=100.0,
        is_complete=True,
        next_action="🎉 Willkommen bei SalesFlow AI!"
    )


@router.post("/skip/{user_id}/{step}", response_model=OnboardingStateResponse)
async def skip_step(
    user_id: UUID,
    step: OnboardingStep,
    service: OnboardingService = Depends(get_onboarding_service)
):
    """
    Überspringt einen optionalen Schritt.
    """
    state = await service.skip_step(user_id, step)
    
    return OnboardingStateResponse(
        user_id=str(user_id),
        current_step=state.current_step,
        progress_percent=state.get_progress_percent(),
        is_complete=state.is_complete,
        next_action="Weiter zum nächsten Schritt"
    )

