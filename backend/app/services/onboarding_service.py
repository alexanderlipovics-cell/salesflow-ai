"""
Magic Onboarding System for SalesFlow AI.

Provides a guided onboarding experience for Network Marketers:
1. Company & Compensation Plan Selection
2. Warm Market Import
3. First Lead Creation
4. Initial Follow-up Sequence Setup
5. Daily Action Plan Configuration
"""
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4
import logging

from pydantic import BaseModel, Field, EmailStr

logger = logging.getLogger(__name__)


# ============= Onboarding Step Models =============

class OnboardingStep(str, Enum):
    """Onboarding flow steps."""
    WELCOME = "welcome"
    COMPANY_SELECTION = "company_selection"
    COMPENSATION_PLAN = "compensation_plan"
    PROFILE_SETUP = "profile_setup"
    WARM_MARKET_IMPORT = "warm_market_import"
    FIRST_LEAD = "first_lead"
    FOLLOW_UP_SEQUENCE = "follow_up_sequence"
    DAILY_ACTIONS = "daily_actions"
    COMPLETION = "completion"


class OnboardingStatus(str, Enum):
    """Onboarding progress status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class CompanyType(str, Enum):
    """Network Marketing company types."""
    HEALTH_WELLNESS = "health_wellness"
    BEAUTY_SKINCARE = "beauty_skincare"
    ESSENTIAL_OILS = "essential_oils"
    NUTRITION = "nutrition"
    FINANCIAL_SERVICES = "financial_services"
    TRAVEL = "travel"
    OTHER = "other"


# ============= Company & Compensation Plan =============

class CompensationPlanType(str, Enum):
    """Types of MLM compensation plans."""
    UNILEVEL = "unilevel"
    BINARY = "binary"
    MATRIX = "matrix"
    BREAKAWAY = "breakaway"
    HYBRID = "hybrid"


class CompanyInfo(BaseModel):
    """Network Marketing company information."""
    id: str
    name: str
    type: CompanyType
    compensation_type: CompensationPlanType
    logo_url: Optional[str] = None
    website: Optional[str] = None
    product_categories: list[str] = Field(default_factory=list)
    rank_titles: list[str] = Field(default_factory=list)
    commission_rates: Optional[dict[str, float]] = None


class UserCompanySetup(BaseModel):
    """User's company configuration."""
    company_id: str
    company_name: str
    compensation_type: CompensationPlanType
    current_rank: Optional[str] = None
    team_size: int = 0
    monthly_volume: float = 0.0
    upline_name: Optional[str] = None
    upline_contact: Optional[str] = None
    goals: dict[str, Any] = Field(default_factory=dict)


# ============= Warm Market =============

class WarmMarketContact(BaseModel):
    """Contact from warm market import."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    relationship: str  # friend, family, colleague, acquaintance
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    social_profiles: dict[str, str] = Field(default_factory=dict)
    notes: Optional[str] = None
    priority: int = Field(default=5, ge=1, le=10)
    last_contacted: Optional[datetime] = None
    interest_level: Optional[str] = None  # none, low, medium, high


class WarmMarketImport(BaseModel):
    """Warm market import data."""
    source: str  # facebook, contacts, manual
    contacts: list[WarmMarketContact]
    total_imported: int = 0
    duplicates_skipped: int = 0


# ============= Follow-up Sequence =============

class FollowUpAction(str, Enum):
    """Types of follow-up actions."""
    SEND_MESSAGE = "send_message"
    SEND_EMAIL = "send_email"
    MAKE_CALL = "make_call"
    SEND_VIDEO = "send_video"
    SHARE_TESTIMONIAL = "share_testimonial"
    INVITE_EVENT = "invite_event"
    CHECK_IN = "check_in"


class FollowUpStep(BaseModel):
    """Single step in a follow-up sequence."""
    step_number: int
    action: FollowUpAction
    delay_days: int = 0
    delay_hours: int = 0
    template_id: Optional[str] = None
    subject: Optional[str] = None
    content: str
    is_automated: bool = False
    stop_on_reply: bool = True


class FollowUpSequence(BaseModel):
    """Complete follow-up sequence."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    target_type: str  # new_lead, warm_market, customer, builder
    steps: list[FollowUpStep] = Field(default_factory=list)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============= Daily Actions =============

class DailyActionType(str, Enum):
    """Types of daily actions."""
    REACH_OUT = "reach_out"
    FOLLOW_UP = "follow_up"
    SHARE_CONTENT = "share_content"
    GO_LIVE = "go_live"
    POST_STORY = "post_story"
    ATTEND_TRAINING = "attend_training"
    PRODUCT_DEMO = "product_demo"
    TEAM_SUPPORT = "team_support"


class DailyAction(BaseModel):
    """Single daily action goal."""
    action_type: DailyActionType
    target_count: int
    description: str
    points: int = 10
    is_required: bool = False


class DailyActionPlan(BaseModel):
    """Daily action plan configuration."""
    actions: list[DailyAction]
    total_points_goal: int = 100
    active_days: list[str] = ["monday", "tuesday", "wednesday", "thursday", "friday"]


# ============= Onboarding State =============

class OnboardingStepState(BaseModel):
    """State of a single onboarding step."""
    step: OnboardingStep
    status: OnboardingStatus = OnboardingStatus.NOT_STARTED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)


class OnboardingState(BaseModel):
    """Complete onboarding state for a user."""
    user_id: UUID
    current_step: OnboardingStep = OnboardingStep.WELCOME
    steps: dict[str, OnboardingStepState] = Field(default_factory=dict)
    is_complete: bool = False
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Collected data
    company_setup: Optional[UserCompanySetup] = None
    warm_market: Optional[WarmMarketImport] = None
    first_leads_created: list[UUID] = Field(default_factory=list)
    follow_up_sequence: Optional[FollowUpSequence] = None
    daily_action_plan: Optional[DailyActionPlan] = None
    
    def get_progress_percent(self) -> float:
        """Calculate completion percentage."""
        total_steps = len(OnboardingStep)
        completed = sum(
            1 for s in self.steps.values()
            if s.status == OnboardingStatus.COMPLETED
        )
        return (completed / total_steps) * 100


# ============= Predefined Data =============

SUPPORTED_COMPANIES = [
    CompanyInfo(
        id="herbalife",
        name="Herbalife",
        type=CompanyType.NUTRITION,
        compensation_type=CompensationPlanType.BREAKAWAY,
        product_categories=["Weight Management", "Sports Nutrition", "Skin Care"],
        rank_titles=["Distributor", "Senior Consultant", "Success Builder", 
                     "Qualified Producer", "Supervisor", "World Team", 
                     "Global Expansion Team", "Millionaire Team", "Presidents Team"]
    ),
    CompanyInfo(
        id="pm_international",
        name="PM-International",
        type=CompanyType.HEALTH_WELLNESS,
        compensation_type=CompensationPlanType.UNILEVEL,
        product_categories=["FitLine", "BeautyLine", "Activize"],
        rank_titles=["Team Partner", "Sales Manager", "Director", 
                     "Vice President", "President", "Chairman"]
    ),
    CompanyInfo(
        id="lr_health",
        name="LR Health & Beauty",
        type=CompanyType.HEALTH_WELLNESS,
        compensation_type=CompensationPlanType.UNILEVEL,
        product_categories=["Aloe Vera", "Essential Oils", "Fragrances", "Cosmetics"],
        rank_titles=["Partner", "Junior Partner", "Partner", "Senior Partner",
                     "1-Star Manager", "2-Star Manager", "3-Star Manager", "4-Star Manager"]
    ),
    CompanyInfo(
        id="doterra",
        name="doTERRA",
        type=CompanyType.ESSENTIAL_OILS,
        compensation_type=CompensationPlanType.UNILEVEL,
        product_categories=["Essential Oils", "Supplements", "Personal Care"],
        rank_titles=["Wellness Advocate", "Manager", "Director", "Executive",
                     "Elite", "Premier", "Silver", "Gold", "Platinum",
                     "Diamond", "Blue Diamond", "Presidential Diamond"]
    ),
    CompanyInfo(
        id="other",
        name="Other Company",
        type=CompanyType.OTHER,
        compensation_type=CompensationPlanType.HYBRID,
        product_categories=[],
        rank_titles=[]
    )
]

DEFAULT_FOLLOW_UP_SEQUENCES = {
    "new_lead": FollowUpSequence(
        name="New Lead Nurture",
        description="5-touch sequence for new leads",
        target_type="new_lead",
        steps=[
            FollowUpStep(
                step_number=1,
                action=FollowUpAction.SEND_MESSAGE,
                delay_hours=0,
                content="Hey {first_name}! 👋 Saw your profile and loved your energy. Would love to connect!",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=2,
                action=FollowUpAction.SEND_MESSAGE,
                delay_days=2,
                content="Hey {first_name}, hope you're having an amazing week! Quick question - are you open to exploring ways to create extra income?",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=3,
                action=FollowUpAction.SEND_VIDEO,
                delay_days=3,
                content="I put together a quick video explaining what I do. Would love your thoughts! 🎥 {video_link}",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=4,
                action=FollowUpAction.SHARE_TESTIMONIAL,
                delay_days=4,
                content="Wanted to share this amazing story from someone who started just like you... 🌟 {testimonial}",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=5,
                action=FollowUpAction.INVITE_EVENT,
                delay_days=5,
                content="We're having a virtual event this week - no pressure, just good vibes and info. Want me to save you a spot? 🎉",
                stop_on_reply=True
            )
        ]
    ),
    "warm_market": FollowUpSequence(
        name="Warm Market Approach",
        description="Gentle approach for friends and family",
        target_type="warm_market",
        steps=[
            FollowUpStep(
                step_number=1,
                action=FollowUpAction.CHECK_IN,
                delay_hours=0,
                content="Hey {first_name}! Been thinking about you. How have you been? 💕",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=2,
                action=FollowUpAction.SEND_MESSAGE,
                delay_days=3,
                content="By the way, I've started something new that I'm really excited about. Would love to share it with you when you have a moment!",
                stop_on_reply=True
            ),
            FollowUpStep(
                step_number=3,
                action=FollowUpAction.SEND_VIDEO,
                delay_days=5,
                content="Here's a little video about what I've been up to. No pressure at all, just wanted you to know! 🙏 {video_link}",
                stop_on_reply=True
            )
        ]
    )
}

DEFAULT_DAILY_ACTIONS = DailyActionPlan(
    actions=[
        DailyAction(
            action_type=DailyActionType.REACH_OUT,
            target_count=5,
            description="Reach out to 5 new potential leads",
            points=20,
            is_required=True
        ),
        DailyAction(
            action_type=DailyActionType.FOLLOW_UP,
            target_count=10,
            description="Follow up with 10 existing contacts",
            points=30,
            is_required=True
        ),
        DailyAction(
            action_type=DailyActionType.SHARE_CONTENT,
            target_count=2,
            description="Share 2 pieces of valuable content",
            points=15
        ),
        DailyAction(
            action_type=DailyActionType.POST_STORY,
            target_count=3,
            description="Post 3 stories on social media",
            points=15
        ),
        DailyAction(
            action_type=DailyActionType.TEAM_SUPPORT,
            target_count=2,
            description="Support 2 team members",
            points=20
        )
    ],
    total_points_goal=100
)


# ============= Onboarding Service =============

class OnboardingService:
    """
    Service for managing the Magic Onboarding flow.
    """
    
    def __init__(
        self,
        user_repo=None,
        lead_repo=None,
        campaign_repo=None,
        hunter_service=None
    ):
        self._user_repo = user_repo
        self._lead_repo = lead_repo
        self._campaign_repo = campaign_repo
        self._hunter_service = hunter_service
        self._states: dict[UUID, OnboardingState] = {}
    
    # ============= State Management =============
    
    async def get_state(self, user_id: UUID) -> OnboardingState:
        """Get or create onboarding state for user."""
        if user_id not in self._states:
            # Check if already completed in database
            if self._user_repo:
                user = await self._user_repo.get_by_id(user_id)
                if user and user.get("onboarding_completed"):
                    state = OnboardingState(
                        user_id=user_id,
                        is_complete=True,
                        current_step=OnboardingStep.COMPLETION
                    )
                    self._states[user_id] = state
                    return state
            
            # Create new state
            state = OnboardingState(user_id=user_id)
            self._init_steps(state)
            self._states[user_id] = state
        
        return self._states[user_id]
    
    def _init_steps(self, state: OnboardingState):
        """Initialize all step states."""
        for step in OnboardingStep:
            state.steps[step.value] = OnboardingStepState(step=step)
    
    async def save_state(self, state: OnboardingState):
        """Persist onboarding state."""
        self._states[state.user_id] = state
        
        # Save to database
        if self._user_repo:
            await self._user_repo.update(state.user_id, {
                "onboarding_state": state.model_dump(),
                "onboarding_completed": state.is_complete
            })
    
    # ============= Step Handlers =============
    
    async def start_onboarding(self, user_id: UUID) -> OnboardingState:
        """Start the onboarding flow."""
        state = await self.get_state(user_id)
        
        if state.is_complete:
            return state
        
        # Mark welcome as completed
        state.current_step = OnboardingStep.COMPANY_SELECTION
        state.steps[OnboardingStep.WELCOME.value].status = OnboardingStatus.COMPLETED
        state.steps[OnboardingStep.WELCOME.value].completed_at = datetime.utcnow()
        
        await self.save_state(state)
        return state
    
    async def complete_company_selection(
        self,
        user_id: UUID,
        company_id: str,
        custom_company_name: Optional[str] = None
    ) -> OnboardingState:
        """Complete company selection step."""
        state = await self.get_state(user_id)
        
        # Find company info
        company = next(
            (c for c in SUPPORTED_COMPANIES if c.id == company_id),
            SUPPORTED_COMPANIES[-1]  # "Other"
        )
        
        # Create company setup
        state.company_setup = UserCompanySetup(
            company_id=company_id,
            company_name=custom_company_name or company.name,
            compensation_type=company.compensation_type
        )
        
        # Update step state
        step_state = state.steps[OnboardingStep.COMPANY_SELECTION.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        step_state.data = {"company_id": company_id}
        
        # Move to next step
        state.current_step = OnboardingStep.COMPENSATION_PLAN
        
        await self.save_state(state)
        return state
    
    async def complete_compensation_plan(
        self,
        user_id: UUID,
        current_rank: str,
        team_size: int,
        monthly_volume: float,
        goals: dict[str, Any]
    ) -> OnboardingState:
        """Complete compensation plan configuration."""
        state = await self.get_state(user_id)
        
        if state.company_setup:
            state.company_setup.current_rank = current_rank
            state.company_setup.team_size = team_size
            state.company_setup.monthly_volume = monthly_volume
            state.company_setup.goals = goals
        
        # Update step state
        step_state = state.steps[OnboardingStep.COMPENSATION_PLAN.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        
        state.current_step = OnboardingStep.PROFILE_SETUP
        
        await self.save_state(state)
        return state
    
    async def complete_profile_setup(
        self,
        user_id: UUID,
        profile_data: dict[str, Any]
    ) -> OnboardingState:
        """Complete user profile setup."""
        state = await self.get_state(user_id)
        
        # Update user profile
        if self._user_repo:
            await self._user_repo.update(user_id, profile_data)
        
        # Update step state
        step_state = state.steps[OnboardingStep.PROFILE_SETUP.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        step_state.data = profile_data
        
        state.current_step = OnboardingStep.WARM_MARKET_IMPORT
        
        await self.save_state(state)
        return state
    
    async def import_warm_market(
        self,
        user_id: UUID,
        contacts: list[WarmMarketContact],
        source: str = "manual"
    ) -> OnboardingState:
        """Import warm market contacts."""
        state = await self.get_state(user_id)
        
        # Create leads from contacts
        created_count = 0
        duplicates = 0
        
        for contact in contacts:
            try:
                # Check for existing lead
                if self._lead_repo and contact.email:
                    existing = await self._lead_repo.get_by_email(contact.email)
                    if existing:
                        duplicates += 1
                        continue
                
                # Create lead
                if self._lead_repo:
                    lead_data = {
                        "first_name": contact.name.split()[0] if contact.name else "",
                        "last_name": " ".join(contact.name.split()[1:]) if contact.name else "",
                        "email": contact.email,
                        "phone": contact.phone,
                        "source": "warm_market",
                        "notes": f"Relationship: {contact.relationship}\n{contact.notes or ''}",
                        "tags": ["warm_market", contact.relationship],
                        "score": contact.priority * 10,
                        "assigned_to": str(user_id)
                    }
                    
                    lead = await self._lead_repo.create(lead_data)
                    state.first_leads_created.append(UUID(lead["id"]))
                    created_count += 1
                    
            except Exception as e:
                logger.warning(f"Failed to import contact {contact.name}: {e}")
        
        # Record import
        state.warm_market = WarmMarketImport(
            source=source,
            contacts=contacts,
            total_imported=created_count,
            duplicates_skipped=duplicates
        )
        
        # Update step state
        step_state = state.steps[OnboardingStep.WARM_MARKET_IMPORT.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        step_state.data = {
            "imported": created_count,
            "duplicates": duplicates,
            "total_contacts": len(contacts)
        }
        
        state.current_step = OnboardingStep.FIRST_LEAD
        
        await self.save_state(state)
        return state
    
    async def create_first_lead(
        self,
        user_id: UUID,
        lead_data: dict[str, Any]
    ) -> OnboardingState:
        """Create first lead manually."""
        state = await self.get_state(user_id)
        
        if self._lead_repo:
            lead_data["assigned_to"] = str(user_id)
            lead_data["source"] = lead_data.get("source", "manual")
            lead_data["tags"] = lead_data.get("tags", []) + ["onboarding"]
            
            lead = await self._lead_repo.create(lead_data)
            state.first_leads_created.append(UUID(lead["id"]))
        
        # Update step state
        step_state = state.steps[OnboardingStep.FIRST_LEAD.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        
        state.current_step = OnboardingStep.FOLLOW_UP_SEQUENCE
        
        await self.save_state(state)
        return state
    
    async def setup_follow_up_sequence(
        self,
        user_id: UUID,
        sequence_type: str = "new_lead",
        custom_steps: Optional[list[FollowUpStep]] = None
    ) -> OnboardingState:
        """Set up initial follow-up sequence."""
        state = await self.get_state(user_id)
        
        # Use default or custom sequence
        if custom_steps:
            sequence = FollowUpSequence(
                name="My First Sequence",
                target_type=sequence_type,
                steps=custom_steps
            )
        else:
            sequence = DEFAULT_FOLLOW_UP_SEQUENCES.get(
                sequence_type,
                DEFAULT_FOLLOW_UP_SEQUENCES["new_lead"]
            )
        
        state.follow_up_sequence = sequence
        
        # Create campaign in system
        if self._campaign_repo:
            campaign_data = {
                "name": sequence.name,
                "description": sequence.description,
                "campaign_type": "nurture",
                "status": "active",
                "created_by": str(user_id),
                "steps": [step.model_dump() for step in sequence.steps]
            }
            await self._campaign_repo.create(campaign_data)
        
        # Start sequence for existing leads
        for lead_id in state.first_leads_created[:5]:  # First 5 leads
            await self._start_sequence_for_lead(user_id, lead_id, sequence)
        
        # Update step state
        step_state = state.steps[OnboardingStep.FOLLOW_UP_SEQUENCE.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        
        state.current_step = OnboardingStep.DAILY_ACTIONS
        
        await self.save_state(state)
        return state
    
    async def setup_daily_actions(
        self,
        user_id: UUID,
        custom_plan: Optional[DailyActionPlan] = None
    ) -> OnboardingState:
        """Configure daily action plan."""
        state = await self.get_state(user_id)
        
        state.daily_action_plan = custom_plan or DEFAULT_DAILY_ACTIONS
        
        # Save to user preferences
        if self._user_repo:
            await self._user_repo.update(user_id, {
                "daily_action_plan": state.daily_action_plan.model_dump()
            })
        
        # Update step state
        step_state = state.steps[OnboardingStep.DAILY_ACTIONS.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        
        state.current_step = OnboardingStep.COMPLETION
        
        await self.save_state(state)
        return state
    
    async def complete_onboarding(self, user_id: UUID) -> OnboardingState:
        """Mark onboarding as complete."""
        state = await self.get_state(user_id)
        
        state.is_complete = True
        state.completed_at = datetime.utcnow()
        
        # Update step state
        step_state = state.steps[OnboardingStep.COMPLETION.value]
        step_state.status = OnboardingStatus.COMPLETED
        step_state.completed_at = datetime.utcnow()
        
        await self.save_state(state)
        
        logger.info(f"Onboarding completed for user {user_id}")
        
        return state
    
    # ============= Helper Methods =============
    
    async def skip_step(
        self,
        user_id: UUID,
        step: OnboardingStep
    ) -> OnboardingState:
        """Skip a non-required step."""
        state = await self.get_state(user_id)
        
        step_state = state.steps[step.value]
        step_state.status = OnboardingStatus.SKIPPED
        
        # Move to next step
        steps = list(OnboardingStep)
        current_idx = steps.index(step)
        if current_idx < len(steps) - 1:
            state.current_step = steps[current_idx + 1]
        
        await self.save_state(state)
        return state
    
    async def _start_sequence_for_lead(
        self,
        user_id: UUID,
        lead_id: UUID,
        sequence: FollowUpSequence
    ):
        """Start follow-up sequence for a lead."""
        # In production, this would queue the first message
        logger.info(f"Starting sequence '{sequence.name}' for lead {lead_id}")
    
    def get_supported_companies(self) -> list[CompanyInfo]:
        """Get list of supported companies."""
        return SUPPORTED_COMPANIES
    
    def get_default_sequences(self) -> dict[str, FollowUpSequence]:
        """Get default follow-up sequences."""
        return DEFAULT_FOLLOW_UP_SEQUENCES
    
    def get_default_daily_actions(self) -> DailyActionPlan:
        """Get default daily action plan."""
        return DEFAULT_DAILY_ACTIONS


# ============= API Models =============

class OnboardingResponse(BaseModel):
    """API response for onboarding state."""
    user_id: UUID
    current_step: OnboardingStep
    progress_percent: float
    is_complete: bool
    company_setup: Optional[UserCompanySetup] = None
    leads_created: int = 0
    next_action: str = ""


class CompanySelectionRequest(BaseModel):
    """Request to select company."""
    company_id: str
    custom_name: Optional[str] = None


class CompensationPlanRequest(BaseModel):
    """Request to configure compensation plan."""
    current_rank: str
    team_size: int = 0
    monthly_volume: float = 0.0
    goals: dict[str, Any] = Field(default_factory=dict)


class WarmMarketImportRequest(BaseModel):
    """Request to import warm market."""
    contacts: list[WarmMarketContact]
    source: str = "manual"


class CreateLeadRequest(BaseModel):
    """Request to create first lead."""
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    source: str = "manual"
    notes: Optional[str] = None


class FollowUpSequenceRequest(BaseModel):
    """Request to set up follow-up sequence."""
    sequence_type: str = "new_lead"
    custom_steps: Optional[list[FollowUpStep]] = None


class DailyActionsRequest(BaseModel):
    """Request to configure daily actions."""
    actions: Optional[list[DailyAction]] = None
    total_points_goal: int = 100

