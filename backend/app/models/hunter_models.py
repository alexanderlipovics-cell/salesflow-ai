"""
Lead Hunter Models for SalesFlow AI.

Defines all lead source types, scoring models, and hunter configurations.
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, EmailStr


# ============= Enums =============

class LeadSource(str, Enum):
    """Lead acquisition source."""
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    EVENT = "event"
    REFERRAL = "referral"
    WARM_MARKET = "warm_market"
    LOOKALIKE = "lookalike"
    WEBSITE = "website"
    MANUAL = "manual"


class LeadTemperature(str, Enum):
    """Lead warmth/readiness level."""
    COLD = "cold"
    COOL = "cool"
    WARM = "warm"
    HOT = "hot"
    BURNING = "burning"  # Ready to close


class LeadCategory(str, Enum):
    """Network Marketing lead categories."""
    CUSTOMER = "customer"  # Product buyer
    BUSINESS_BUILDER = "business_builder"  # Wants to build team
    HYBRID = "hybrid"  # Both customer & builder
    UNKNOWN = "unknown"


class InterestLevel(str, Enum):
    """Interest indicators from social analysis."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class EngagementType(str, Enum):
    """Types of social engagement."""
    LIKE = "like"
    COMMENT = "comment"
    SHARE = "share"
    SAVE = "save"
    DM = "dm"
    STORY_VIEW = "story_view"
    STORY_REPLY = "story_reply"
    LIVE_COMMENT = "live_comment"
    PROFILE_VISIT = "profile_visit"


# ============= Social Profile Models =============

class SocialProfile(BaseModel):
    """Social media profile information."""
    platform: LeadSource
    username: str
    profile_url: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    followers: Optional[int] = None
    following: Optional[int] = None
    posts_count: Optional[int] = None
    engagement_rate: Optional[float] = None
    is_business_account: bool = False
    is_verified: bool = False
    profile_picture_url: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    last_post_date: Optional[datetime] = None
    interests: list[str] = Field(default_factory=list)
    hashtags_used: list[str] = Field(default_factory=list)


class SocialEngagement(BaseModel):
    """Record of social media engagement."""
    id: UUID = Field(default_factory=uuid4)
    platform: LeadSource
    engagement_type: EngagementType
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sentiment: Optional[str] = None  # positive, neutral, negative


# ============= Lead Scoring =============

class LeadScoreFactors(BaseModel):
    """Factors contributing to lead score."""
    # Profile factors (0-25)
    profile_completeness: int = Field(default=0, ge=0, le=25)
    
    # Engagement factors (0-25)
    engagement_frequency: int = Field(default=0, ge=0, le=25)
    
    # Interest indicators (0-25)
    interest_signals: int = Field(default=0, ge=0, le=25)
    
    # Fit factors (0-25)
    ideal_customer_fit: int = Field(default=0, ge=0, le=25)
    
    @property
    def total_score(self) -> int:
        return (
            self.profile_completeness +
            self.engagement_frequency +
            self.interest_signals +
            self.ideal_customer_fit
        )


class LeadScore(BaseModel):
    """Complete lead scoring model."""
    lead_id: UUID
    factors: LeadScoreFactors
    total_score: int = Field(ge=0, le=100)
    temperature: LeadTemperature
    category: LeadCategory
    confidence: float = Field(ge=0, le=1)
    scored_at: datetime = Field(default_factory=datetime.utcnow)
    reasons: list[str] = Field(default_factory=list)


# ============= Hunter Lead Model =============

class HunterLead(BaseModel):
    """Lead discovered by the Lead Hunter."""
    id: UUID = Field(default_factory=uuid4)
    
    # Basic info
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    # Source & discovery
    source: LeadSource
    source_url: Optional[str] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    discovered_via: str = ""  # e.g., "hashtag:#networkmarketing"
    
    # Social profiles
    social_profiles: list[SocialProfile] = Field(default_factory=list)
    engagements: list[SocialEngagement] = Field(default_factory=list)
    
    # Scoring
    score: Optional[LeadScore] = None
    temperature: LeadTemperature = LeadTemperature.COLD
    category: LeadCategory = LeadCategory.UNKNOWN
    
    # Analysis
    interests: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    talking_points: list[str] = Field(default_factory=list)
    
    # Lookalike info
    similar_to_lead_id: Optional[UUID] = None
    similarity_score: Optional[float] = None
    
    # Status
    is_imported: bool = False
    imported_at: Optional[datetime] = None
    imported_lead_id: Optional[UUID] = None
    
    # Warm market specific
    relationship_type: Optional[str] = None  # friend, family, colleague
    relationship_strength: Optional[int] = None  # 1-10
    last_interaction: Optional[datetime] = None
    
    # Metadata
    raw_data: Optional[dict] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


# ============= Hunter Configuration =============

class HashtagScanConfig(BaseModel):
    """Configuration for hashtag scanning."""
    hashtags: list[str]
    platforms: list[LeadSource] = [LeadSource.INSTAGRAM]
    min_followers: int = 100
    max_followers: int = 100000
    min_engagement_rate: float = 0.01
    exclude_business_accounts: bool = False
    exclude_verified: bool = False
    languages: list[str] = ["en", "de"]
    locations: list[str] = Field(default_factory=list)
    max_results_per_hashtag: int = 100


class LookalikeScanConfig(BaseModel):
    """Configuration for lookalike lead finding."""
    source_lead_ids: list[UUID]
    min_similarity: float = 0.7
    max_results: int = 50
    match_criteria: list[str] = [
        "interests",
        "demographics",
        "engagement_patterns",
        "industry"
    ]


class EventScanConfig(BaseModel):
    """Configuration for event participant scanning."""
    event_name: str
    event_url: Optional[str] = None
    event_hashtags: list[str] = Field(default_factory=list)
    event_date: Optional[datetime] = None
    scan_attendees: bool = True
    scan_speakers: bool = True
    scan_engagers: bool = True


class WarmMarketConfig(BaseModel):
    """Configuration for warm market analysis."""
    include_friends: bool = True
    include_family: bool = True
    include_colleagues: bool = True
    include_acquaintances: bool = True
    min_relationship_strength: int = 3
    exclude_contacted: bool = True
    prioritize_by: str = "relationship_strength"  # or "last_interaction"


class HunterConfig(BaseModel):
    """Complete Lead Hunter configuration."""
    user_id: UUID
    
    # Scan configurations
    hashtag_config: Optional[HashtagScanConfig] = None
    lookalike_config: Optional[LookalikeScanConfig] = None
    event_config: Optional[EventScanConfig] = None
    warm_market_config: Optional[WarmMarketConfig] = None
    
    # Global settings
    auto_score: bool = True
    auto_categorize: bool = True
    exclude_existing_leads: bool = True
    daily_scan_limit: int = 500
    
    # Filters
    min_score: int = 30
    preferred_categories: list[LeadCategory] = Field(default_factory=list)
    blacklist_keywords: list[str] = Field(default_factory=list)
    
    # Scheduling
    scan_schedule: Optional[str] = None  # Cron expression
    last_scan_at: Optional[datetime] = None
    next_scan_at: Optional[datetime] = None


# ============= Hunter Results =============

class HunterScanResult(BaseModel):
    """Result of a lead hunting scan."""
    scan_id: UUID = Field(default_factory=uuid4)
    config: HunterConfig
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    # Results
    leads_found: int = 0
    leads_qualified: int = 0
    leads_imported: int = 0
    
    # Breakdown by source
    by_source: dict[str, int] = Field(default_factory=dict)
    by_temperature: dict[str, int] = Field(default_factory=dict)
    by_category: dict[str, int] = Field(default_factory=dict)
    
    # Discovered leads
    leads: list[HunterLead] = Field(default_factory=list)
    
    # Errors
    errors: list[str] = Field(default_factory=list)
    
    @property
    def duration_seconds(self) -> Optional[float]:
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


# ============= Network Marketing Specific =============

class NetworkMarketingSignals(BaseModel):
    """Signals indicating MLM/Network Marketing interest."""
    
    # Positive signals for BUSINESS BUILDER
    entrepreneurial_keywords: list[str] = Field(default_factory=list)
    side_hustle_interest: bool = False
    financial_freedom_mentions: bool = False
    leadership_indicators: bool = False
    network_size: Optional[int] = None
    
    # Positive signals for CUSTOMER
    health_wellness_interest: bool = False
    product_category_interest: list[str] = Field(default_factory=list)
    lifestyle_fit: bool = False
    budget_indicators: Optional[str] = None
    
    # Negative signals
    already_in_mlm: bool = False
    competitor_affiliated: Optional[str] = None
    anti_mlm_sentiment: bool = False
    
    # Overall assessment
    builder_score: int = Field(default=0, ge=0, le=100)
    customer_score: int = Field(default=0, ge=0, le=100)
    recommendation: LeadCategory = LeadCategory.UNKNOWN

