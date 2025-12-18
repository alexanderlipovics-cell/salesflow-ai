"""
Sales Flow AI - CRM Schemas

Pydantic models for all CRM entities
"""

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ============================================================================
# ENUMS
# ============================================================================


class Vertical(str, Enum):
    NETWORK = "network"
    IMMO = "immo"
    FINANCE = "finance"
    COACHING = "coaching"
    GENERIC = "generic"


class ContactStatus(str, Enum):
    LEAD = "lead"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CUSTOMER = "customer"
    LOST = "lost"
    NICHT_INTERESSIERT = "nicht_interessiert"
    INACTIVE = "inactive"
    NURTURE = "nurture"


class LifecycleStage(str, Enum):
    SUBSCRIBER = "subscriber"
    LEAD = "lead"
    MQL = "mql"
    SQL = "sql"
    OPPORTUNITY = "opportunity"
    CUSTOMER = "customer"
    EVANGELIST = "evangelist"


class PreferredChannel(str, Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    PHONE = "phone"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"


class ActivityType(str, Enum):
    CALL = "call"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    LINKEDIN_MESSAGE = "linkedin_message"
    INSTAGRAM_DM = "instagram_dm"
    MEETING = "meeting"
    VIDEO_CALL = "video_call"
    NOTE = "note"
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    STATUS_CHANGE = "status_change"
    STAGE_CHANGE = "stage_change"
    SCORE_CHANGE = "score_change"
    OWNER_CHANGE = "owner_change"
    EMAIL_OPENED = "email_opened"
    LINK_CLICKED = "link_clicked"
    FORM_SUBMITTED = "form_submitted"
    CREATED = "created"
    IMPORTED = "imported"
    MERGED = "merged"


class ActivityDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class DealStage(str, Enum):
    NEW = "new"
    QUALIFIED = "qualified"
    MEETING = "meeting"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class TaskType(str, Enum):
    FOLLOWUP = "followup"
    CALL = "call"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    MEETING = "meeting"
    PROPOSAL = "proposal"
    REMINDER = "reminder"
    CUSTOM = "custom"


class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    SNOOZED = "snoozed"


class TemplateCategory(str, Enum):
    COLD_OUTREACH = "cold_outreach"
    FOLLOWUP = "followup"
    MEETING_REQUEST = "meeting_request"
    PROPOSAL = "proposal"
    DELAY = "delay"
    THANK_YOU = "thank_you"
    OBJECTION = "objection"
    CLOSING = "closing"
    NURTURE = "nurture"
    CUSTOM = "custom"


class ScenarioType(str, Enum):
    OBJECTION = "objection"
    CLOSING = "closing"
    FOLLOWUP = "followup"
    COLD_OUTREACH = "cold_outreach"
    REACTIVATION = "reactivation"
    UPSELL = "upsell"
    REFERRAL = "referral"


# ============================================================================
# CONTACTS
# ============================================================================


class ContactBase(BaseModel):
    """Base contact fields"""

    name: str = Field(..., min_length=1, max_length=200)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None

    # Social
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    website: Optional[str] = None

    # Company
    company: Optional[str] = None
    position: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None

    # Location
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "AT"
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

    # CRM
    status: ContactStatus = ContactStatus.LEAD
    lifecycle_stage: LifecycleStage = LifecycleStage.LEAD
    source: Optional[str] = None
    source_detail: Optional[str] = None
    vertical: Optional[Vertical] = None
    segment: Optional[str] = None

    # Preferences
    preferred_channel: PreferredChannel = PreferredChannel.WHATSAPP
    formal_address: bool = False
    do_not_contact: bool = False

    # Meta
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    """Create a new contact"""

    owner_id: Optional[UUID] = None


class ContactUpdate(BaseModel):
    """Update contact - all fields optional"""

    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None

    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    website: Optional[str] = None

    company: Optional[str] = None
    position: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None

    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None

    status: Optional[ContactStatus] = None
    lifecycle_stage: Optional[LifecycleStage] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    vertical: Optional[Vertical] = None
    segment: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)

    preferred_channel: Optional[PreferredChannel] = None
    formal_address: Optional[bool] = None
    do_not_contact: Optional[bool] = None

    owner_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None

    next_followup_at: Optional[datetime] = None


class Contact(ContactBase):
    """Full contact response"""

    id: UUID
    org_id: UUID
    owner_id: Optional[UUID] = None

    score: int = 0
    score_breakdown: dict = Field(default_factory=dict)

    first_contact_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    last_response_at: Optional[datetime] = None
    next_followup_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None

    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ContactListItem(BaseModel):
    """Lightweight contact for lists"""

    id: UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    status: ContactStatus
    score: int = 0
    vertical: Optional[Vertical] = None
    tags: List[str] = Field(default_factory=list)
    last_contact_at: Optional[datetime] = None
    next_followup_at: Optional[datetime] = None
    owner_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ContactFilter(BaseModel):
    """Filter options for contact list"""

    search: Optional[str] = None
    status: Optional[List[ContactStatus]] = None
    lifecycle_stage: Optional[List[LifecycleStage]] = None
    vertical: Optional[List[Vertical]] = None
    tags: Optional[List[str]] = None
    owner_id: Optional[UUID] = None
    city: Optional[str] = None
    min_score: Optional[int] = None
    max_score: Optional[int] = None
    has_phone: Optional[bool] = None
    has_email: Optional[bool] = None
    followup_overdue: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None


# ============================================================================
# ACTIVITIES
# ============================================================================


class ActivityBase(BaseModel):
    """Base activity fields"""

    type: ActivityType
    direction: Optional[ActivityDirection] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    content_html: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    attachments: List[dict] = Field(default_factory=list)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityCreate(ActivityBase):
    """Create an activity"""

    contact_id: UUID
    deal_id: Optional[UUID] = None


class Activity(ActivityBase):
    """Full activity response"""

    id: UUID
    org_id: UUID
    contact_id: UUID
    deal_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ActivityWithUser(Activity):
    """Activity with user info for timeline"""

    user_name: Optional[str] = None
    user_avatar: Optional[str] = None


# ============================================================================
# DEALS
# ============================================================================


class DealBase(BaseModel):
    """Base deal fields"""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    value: Decimal = Decimal("0")
    currency: str = "EUR"
    recurring_value: Optional[Decimal] = None
    recurring_interval: Optional[str] = None

    pipeline: str = "default"
    stage: DealStage = DealStage.NEW
    probability: int = Field(10, ge=0, le=100)

    expected_close_date: Optional[date] = None

    products: List[dict] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    custom_fields: dict = Field(default_factory=dict)
    notes: Optional[str] = None


class DealCreate(DealBase):
    """Create a deal"""

    contact_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None


class DealUpdate(BaseModel):
    """Update deal"""

    title: Optional[str] = None
    description: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    recurring_value: Optional[Decimal] = None
    recurring_interval: Optional[str] = None

    stage: Optional[DealStage] = None
    probability: Optional[int] = Field(None, ge=0, le=100)

    expected_close_date: Optional[date] = None
    lost_reason: Optional[str] = None
    lost_to_competitor: Optional[str] = None

    contact_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    products: Optional[List[dict]] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[dict] = None
    notes: Optional[str] = None


class Deal(DealBase):
    """Full deal response"""

    id: UUID
    org_id: UUID
    contact_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None

    stage_entered_at: datetime
    weighted_value: Decimal

    won: Optional[bool] = None
    closed_at: Optional[datetime] = None
    lost_reason: Optional[str] = None
    lost_to_competitor: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class DealListItem(BaseModel):
    """Lightweight deal for pipeline view"""

    id: UUID
    title: str
    value: Decimal
    stage: DealStage
    probability: int
    weighted_value: Decimal
    expected_close_date: Optional[date] = None
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    owner_id: Optional[UUID] = None
    stage_entered_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class DealFilter(BaseModel):
    """Filter options for deals"""

    search: Optional[str] = None
    stage: Optional[List[DealStage]] = None
    pipeline: Optional[str] = None
    owner_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    min_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    closing_this_month: Optional[bool] = None
    created_after: Optional[datetime] = None


# ============================================================================
# TASKS
# ============================================================================


class TaskBase(BaseModel):
    """Base task fields"""

    type: TaskType = TaskType.FOLLOWUP
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.NORMAL
    due_at: datetime


class TaskCreate(TaskBase):
    """Create a task"""

    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None


class TaskUpdate(BaseModel):
    """Update task"""

    type: Optional[TaskType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    due_at: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None


class Task(TaskBase):
    """Full task response"""

    id: UUID
    org_id: UUID
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    created_by: Optional[UUID] = None

    status: TaskStatus = TaskStatus.PENDING
    completed_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None

    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    parent_task_id: Optional[UUID] = None

    tags: List[str] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class TaskWithContext(Task):
    """Task with contact/deal info"""

    contact_name: Optional[str] = None
    deal_title: Optional[str] = None
    assigned_to_name: Optional[str] = None


class TaskFilter(BaseModel):
    """Filter options for tasks"""

    status: Optional[List[TaskStatus]] = None
    type: Optional[List[TaskType]] = None
    priority: Optional[List[TaskPriority]] = None
    assigned_to: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    due_today: Optional[bool] = None
    overdue: Optional[bool] = None
    due_before: Optional[datetime] = None
    due_after: Optional[datetime] = None


# ============================================================================
# TEMPLATES
# ============================================================================


class TemplateBase(BaseModel):
    """Base template fields"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: TemplateCategory
    channel: PreferredChannel
    vertical: Optional[Vertical] = None

    subject: Optional[str] = None
    content: str

    formal_address: bool = False
    language: str = "de"

    is_active: bool = True
    tags: List[str] = Field(default_factory=list)


class TemplateCreate(TemplateBase):
    """Create a template"""

    pass


class TemplateUpdate(BaseModel):
    """Update template"""

    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    channel: Optional[PreferredChannel] = None
    vertical: Optional[Vertical] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    formal_address: Optional[bool] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None


class Template(TemplateBase):
    """Full template response"""

    id: UUID
    org_id: UUID
    created_by: Optional[UUID] = None

    times_used: int = 0
    last_used_at: Optional[datetime] = None
    is_default: bool = False

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# SALES SCENARIOS
# ============================================================================


class ConversationMessage(BaseModel):
    """Single message in a conversation"""

    role: str  # "customer" or "sales"
    content: str
    timestamp: Optional[datetime] = None


class ScenarioBase(BaseModel):
    """Base scenario fields"""

    title: str = Field(..., min_length=1, max_length=200)
    vertical: Vertical
    scenario_type: ScenarioType

    context: Optional[str] = None
    customer_profile: Optional[str] = None
    conversation: List[ConversationMessage]

    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None

    key_takeaway: Optional[str] = None
    what_worked: Optional[str] = None
    what_didnt_work: Optional[str] = None

    tags: List[str] = Field(default_factory=list)
    is_template: bool = False
    is_public: bool = False


class ScenarioCreate(ScenarioBase):
    """Create a scenario"""

    contact_id: Optional[UUID] = None


class Scenario(ScenarioBase):
    """Full scenario response"""

    id: UUID
    org_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    created_by: Optional[UUID] = None

    quality_score: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# ============================================================================
# PAGINATION & RESPONSES
# ============================================================================


class PaginationParams(BaseModel):
    """Pagination parameters"""

    page: int = Field(1, ge=1)
    per_page: int = Field(25, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Generic paginated response"""

    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


class ContactsResponse(PaginatedResponse):
    """Paginated contacts response"""

    items: List[ContactListItem]


class DealsResponse(PaginatedResponse):
    """Paginated deals response"""

    items: List[DealListItem]


class TasksResponse(PaginatedResponse):
    """Paginated tasks response"""

    items: List[TaskWithContext]


# ============================================================================
# PHOENIX & DELAY MASTER (Enhanced)
# ============================================================================


class PhoenixContext(BaseModel):
    """Context for Phoenix suggestions"""

    location: str
    district: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    time_available_minutes: int = Field(30, ge=5, le=120)
    vertical: Vertical = Vertical.GENERIC
    include_contacts: bool = True  # Include nearby contacts from CRM


class PhoenixSuggestion(BaseModel):
    """Single Phoenix suggestion"""

    id: str
    type: str  # "contact", "spot", "action"
    title: str
    description: str
    priority: int = Field(1, ge=1, le=5)

    # If type == "contact"
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    distance_km: Optional[float] = None

    # Suggested message
    suggested_message: Optional[str] = None
    whatsapp_link: Optional[str] = None


class PhoenixResponse(BaseModel):
    """Phoenix API response"""

    suggestions: List[PhoenixSuggestion]
    location: str
    time_available: int
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class DelayMasterRequest(BaseModel):
    """Request for Delay Master message"""

    contact_id: Optional[UUID] = None
    name: str

    channel: PreferredChannel = PreferredChannel.WHATSAPP
    vertical: Vertical = Vertical.GENERIC
    formal_address: bool = False

    location: Optional[str] = None
    delay_minutes: int = Field(10, ge=1, le=120)
    context: Optional[str] = None

    # For rescheduling
    is_reschedule: bool = False
    new_time: Optional[str] = None


class DelayMasterResponse(BaseModel):
    """Delay Master message response"""

    message: str
    whatsapp_link: Optional[str] = None

    # For tracking
    contact_id: Optional[UUID] = None
    template_used: Optional[str] = None

    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# DAILY COMMAND
# ============================================================================


class DailyCommandSummary(BaseModel):
    """Daily Command dashboard data"""

    # Tasks
    tasks_due_today: int
    tasks_overdue: int
    tasks_completed_today: int

    # Follow-ups
    followups_due: int
    followups_overdue: int

    # Pipeline
    deals_in_progress: int
    deals_closing_this_week: int
    pipeline_value: Decimal
    weighted_pipeline_value: Decimal

    # Activity
    activities_today: int
    contacts_contacted_today: int

    # Leads
    new_leads_today: int
    leads_without_activity: int


class DailyCommandTask(BaseModel):
    """Task for Daily Command view"""

    id: UUID
    type: TaskType
    title: str
    priority: TaskPriority
    due_at: datetime
    is_overdue: bool

    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    deal_id: Optional[UUID] = None
    deal_title: Optional[str] = None


class DailyCommandResponse(BaseModel):
    """Daily Command API response"""

    summary: DailyCommandSummary
    priority_tasks: List[DailyCommandTask]
    suggested_actions: List[str]
    greeting: str
    date: date


__all__ = [
    "Activity",
    "ActivityCreate",
    "ActivityDirection",
    "ActivityType",
    "ActivityWithUser",
    "Contact",
    "ContactBase",
    "ContactCreate",
    "ContactFilter",
    "ContactListItem",
    "ContactStatus",
    "ContactUpdate",
    "ContactsResponse",
    "DailyCommandResponse",
    "DailyCommandSummary",
    "DailyCommandTask",
    "Deal",
    "DealBase",
    "DealCreate",
    "DealFilter",
    "DealListItem",
    "DealStage",
    "DealUpdate",
    "DealsResponse",
    "DelayMasterRequest",
    "DelayMasterResponse",
    "LifecycleStage",
    "PaginationParams",
    "PhoenixContext",
    "PhoenixResponse",
    "PhoenixSuggestion",
    "PreferredChannel",
    "Scenario",
    "ScenarioBase",
    "ScenarioCreate",
    "ScenarioType",
    "Task",
    "TaskBase",
    "TaskCreate",
    "TaskFilter",
    "TaskPriority",
    "TaskStatus",
    "TaskUpdate",
    "TaskWithContext",
    "TasksResponse",
    "Template",
    "TemplateBase",
    "TemplateCategory",
    "TemplateCreate",
    "TemplateUpdate",
    "Vertical",
]
