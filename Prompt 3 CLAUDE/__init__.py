"""
Pydantic Schemas for SalesFlow AI.

Defines all request/response models with validation.
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

T = TypeVar("T")


# ============= Common =============

class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    items: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


# ============= Leads =============

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class LeadSource(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    COLD_OUTREACH = "cold_outreach"
    TRADE_SHOW = "trade_show"
    ADVERTISEMENT = "advertisement"
    OTHER = "other"


class LeadPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class LeadBase(BaseModel):
    """Base lead fields."""
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    company: Optional[str] = Field(None, max_length=200)
    title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    source: LeadSource = LeadSource.OTHER
    priority: LeadPriority = LeadPriority.MEDIUM


class LeadCreate(LeadBase):
    """Lead creation request."""
    notes: Optional[str] = None
    tags: Optional[list[str]] = Field(default_factory=list)
    custom_fields: Optional[dict[str, Any]] = Field(default_factory=dict)


class LeadUpdate(BaseModel):
    """Lead update request (all fields optional)."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    company: Optional[str] = Field(None, max_length=200)
    title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    source: Optional[LeadSource] = None
    priority: Optional[LeadPriority] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    custom_fields: Optional[dict[str, Any]] = None


class LeadResponse(LeadBase):
    """Lead response model."""
    id: UUID
    status: LeadStatus
    score: int = Field(ge=0, le=100)
    estimated_value: Optional[Decimal] = None
    assigned_to: Optional[UUID] = None
    notes: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)
    last_contacted_at: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LeadListResponse(PaginatedResponse[LeadResponse]):
    """Paginated list of leads."""
    items: list[LeadResponse]


class LeadSearchParams(BaseModel):
    """Lead search/filter parameters."""
    status: Optional[list[LeadStatus]] = None
    source: Optional[list[LeadSource]] = None
    priority: Optional[list[LeadPriority]] = None
    assigned_to: Optional[UUID] = None
    unassigned_only: bool = False
    min_score: Optional[int] = Field(None, ge=0, le=100)
    max_score: Optional[int] = Field(None, ge=0, le=100)
    min_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    tags: Optional[list[str]] = None
    search_query: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    needs_follow_up: bool = False
    sort_by: str = "created_at"
    sort_order: SortOrder = SortOrder.DESC


class LeadStatusUpdate(BaseModel):
    """Lead status change request."""
    status: LeadStatus
    reason: Optional[str] = None


class LeadAssignment(BaseModel):
    """Lead assignment request."""
    assigned_to: UUID
    notify: bool = True


class LeadBulkAction(BaseModel):
    """Bulk action on multiple leads."""
    lead_ids: list[UUID] = Field(min_length=1, max_length=100)
    action: str
    params: Optional[dict[str, Any]] = None


# ============= Contacts =============

class ContactType(str, Enum):
    PRIMARY = "primary"
    BILLING = "billing"
    TECHNICAL = "technical"
    DECISION_MAKER = "decision_maker"
    INFLUENCER = "influencer"
    OTHER = "other"


class ContactBase(BaseModel):
    """Base contact fields."""
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=100)
    contact_type: ContactType = ContactType.OTHER


class ContactCreate(ContactBase):
    """Contact creation request."""
    lead_id: UUID
    is_primary: bool = False
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    """Contact update request."""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    title: Optional[str] = Field(None, max_length=100)
    contact_type: Optional[ContactType] = None
    is_primary: Optional[bool] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactResponse(ContactBase):
    """Contact response model."""
    id: UUID
    lead_id: UUID
    is_primary: bool
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ContactListResponse(PaginatedResponse[ContactResponse]):
    """Paginated list of contacts."""
    items: list[ContactResponse]


# ============= Deals =============

class DealStage(str, Enum):
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class DealBase(BaseModel):
    """Base deal fields."""
    name: str = Field(min_length=1, max_length=200)
    value: Decimal = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    stage: DealStage = DealStage.DISCOVERY
    probability: int = Field(default=0, ge=0, le=100)
    expected_close_date: Optional[datetime] = None


class DealCreate(DealBase):
    """Deal creation request."""
    lead_id: UUID
    description: Optional[str] = None
    products: Optional[list[str]] = None


class DealUpdate(BaseModel):
    """Deal update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    value: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    stage: Optional[DealStage] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    products: Optional[list[str]] = None


class DealResponse(DealBase):
    """Deal response model."""
    id: UUID
    lead_id: UUID
    assigned_to: Optional[UUID] = None
    description: Optional[str] = None
    products: list[str] = Field(default_factory=list)
    closed_at: Optional[datetime] = None
    close_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DealListResponse(PaginatedResponse[DealResponse]):
    """Paginated list of deals."""
    items: list[DealResponse]


class DealStageUpdate(BaseModel):
    """Deal stage change request."""
    stage: DealStage
    reason: Optional[str] = None


class DealClose(BaseModel):
    """Close deal request."""
    won: bool
    reason: Optional[str] = None
    actual_value: Optional[Decimal] = None


# ============= Autopilot (Campaigns) =============

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignType(str, Enum):
    EMAIL_SEQUENCE = "email_sequence"
    NURTURE = "nurture"
    REENGAGEMENT = "reengagement"
    ONBOARDING = "onboarding"


class MessageChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"


class CampaignBase(BaseModel):
    """Base campaign fields."""
    name: str = Field(min_length=1, max_length=200)
    campaign_type: CampaignType
    channel: MessageChannel = MessageChannel.EMAIL
    description: Optional[str] = None


class CampaignCreate(CampaignBase):
    """Campaign creation request."""
    target_lead_filter: Optional[LeadSearchParams] = None
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None
    daily_limit: int = Field(default=50, ge=1, le=1000)
    time_zone: str = Field(default="UTC")


class CampaignUpdate(BaseModel):
    """Campaign update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    target_lead_filter: Optional[LeadSearchParams] = None
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None
    daily_limit: Optional[int] = Field(None, ge=1, le=1000)
    time_zone: Optional[str] = None


class CampaignResponse(CampaignBase):
    """Campaign response model."""
    id: UUID
    status: CampaignStatus
    target_lead_filter: Optional[dict[str, Any]] = None
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None
    daily_limit: int
    time_zone: str
    total_leads: int = 0
    leads_processed: int = 0
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_opened: int = 0
    messages_clicked: int = 0
    replies_received: int = 0
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CampaignListResponse(PaginatedResponse[CampaignResponse]):
    """Paginated list of campaigns."""
    items: list[CampaignResponse]


class CampaignStepBase(BaseModel):
    """Campaign step (message template)."""
    step_number: int = Field(ge=1)
    delay_days: int = Field(default=0, ge=0)
    delay_hours: int = Field(default=0, ge=0)
    subject: Optional[str] = Field(None, max_length=200)
    content: str
    send_time_preference: Optional[str] = None


class CampaignStepCreate(CampaignStepBase):
    """Create campaign step request."""
    pass


class CampaignStepResponse(CampaignStepBase):
    """Campaign step response."""
    id: UUID
    campaign_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CampaignMetrics(BaseModel):
    """Campaign performance metrics."""
    total_leads: int
    leads_active: int
    leads_completed: int
    leads_unsubscribed: int
    messages_sent: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    reply_rate: float
    unsubscribe_rate: float


# ============= Copilot (AI Assistance) =============

class CopilotAction(str, Enum):
    DRAFT_EMAIL = "draft_email"
    SUMMARIZE_LEAD = "summarize_lead"
    SUGGEST_NEXT_STEPS = "suggest_next_steps"
    ANALYZE_SENTIMENT = "analyze_sentiment"
    GENERATE_RESPONSE = "generate_response"
    QUALIFY_LEAD = "qualify_lead"
    RESEARCH_COMPANY = "research_company"


class CopilotRequest(BaseModel):
    """AI Copilot request."""
    action: CopilotAction
    context: dict[str, Any] = Field(default_factory=dict)
    lead_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    message_id: Optional[UUID] = None
    additional_instructions: Optional[str] = None


class EmailDraftRequest(BaseModel):
    """Email draft generation request."""
    lead_id: UUID
    purpose: str = Field(min_length=1, max_length=500)
    tone: str = Field(default="professional")
    include_signature: bool = True
    max_length: int = Field(default=500, ge=50, le=2000)


class EmailDraftResponse(BaseModel):
    """Generated email draft."""
    subject: str
    body: str
    suggested_send_time: Optional[datetime] = None
    confidence_score: float = Field(ge=0, le=1)
    warnings: list[str] = Field(default_factory=list)


class LeadSummaryRequest(BaseModel):
    """Lead summary generation request."""
    lead_id: UUID
    include_activity_history: bool = True
    include_deal_info: bool = True
    include_recommendations: bool = True


class LeadSummaryResponse(BaseModel):
    """Generated lead summary."""
    summary: str
    key_points: list[str]
    engagement_score: float = Field(ge=0, le=100)
    recommended_actions: list[str]
    risk_factors: list[str]
    opportunities: list[str]


class NextStepsRequest(BaseModel):
    """Next steps suggestion request."""
    lead_id: UUID
    deal_id: Optional[UUID] = None
    recent_activity_count: int = Field(default=10, ge=1, le=50)


class NextStepsResponse(BaseModel):
    """Suggested next steps."""
    recommendations: list[dict[str, Any]]
    priority_action: str
    reasoning: str
    estimated_impact: str


class SentimentAnalysisRequest(BaseModel):
    """Sentiment analysis request."""
    text: str = Field(min_length=1)
    context: Optional[str] = None


class SentimentAnalysisResponse(BaseModel):
    """Sentiment analysis result."""
    overall_sentiment: str
    sentiment_score: float = Field(ge=-1, le=1)
    emotions: dict[str, float]
    key_phrases: list[str]
    concerns: list[str]
    positive_signals: list[str]


class LeadQualificationRequest(BaseModel):
    """Lead qualification analysis request."""
    lead_id: UUID
    qualification_criteria: Optional[dict[str, Any]] = None


class LeadQualificationResponse(BaseModel):
    """Lead qualification result."""
    qualified: bool
    score: int = Field(ge=0, le=100)
    criteria_scores: dict[str, int]
    strengths: list[str]
    weaknesses: list[str]
    missing_info: list[str]
    recommendation: str


# ============= Analytics =============

class DateRange(BaseModel):
    """Date range for analytics."""
    start: datetime
    end: datetime
    
    @field_validator("end")
    @classmethod
    def end_after_start(cls, v, info):
        if "start" in info.data and v < info.data["start"]:
            raise ValueError("end must be after start")
        return v


class LeadAnalytics(BaseModel):
    """Lead analytics summary."""
    total_leads: int
    leads_by_status: dict[str, int]
    leads_by_source: dict[str, int]
    leads_by_priority: dict[str, int]
    conversion_rate: float
    average_time_to_qualify: Optional[float] = None
    average_time_to_close: Optional[float] = None


class DealAnalytics(BaseModel):
    """Deal analytics summary."""
    total_deals: int
    total_value: Decimal
    deals_by_stage: dict[str, int]
    value_by_stage: dict[str, Decimal]
    win_rate: float
    average_deal_size: Decimal
    average_sales_cycle_days: float


class CampaignAnalytics(BaseModel):
    """Campaign analytics summary."""
    total_campaigns: int
    active_campaigns: int
    total_messages_sent: int
    average_delivery_rate: float
    average_open_rate: float
    average_click_rate: float
    average_reply_rate: float
    best_performing_campaign: Optional[str] = None
