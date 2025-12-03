"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES INTELLIGENCE API SCHEMAS v3.0                                       ║
║  Schemas für Multi-Language, Buyer Psychology, Frameworks, Industries     ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class LanguageCode(str, Enum):
    DE = "de"
    DE_AT = "de-at"
    DE_CH = "de-ch"
    EN_US = "en-us"
    EN_UK = "en-uk"
    ES = "es"
    ES_LATAM = "es-latam"
    FR = "fr"
    IT = "it"
    PT = "pt"
    NL = "nl"
    PL = "pl"
    TR = "tr"


class BuyerType(str, Enum):
    ANALYTICAL = "analytical"
    DRIVER = "driver"
    EXPRESSIVE = "expressive"
    AMIABLE = "amiable"


class BuyingStage(str, Enum):
    AWARENESS = "awareness"
    CONSIDERATION = "consideration"
    DECISION = "decision"
    VALIDATION = "validation"


class RiskProfile(str, Enum):
    RISK_AVERSE = "risk_averse"
    RISK_NEUTRAL = "risk_neutral"
    RISK_TAKER = "risk_taker"


class AuthorityLevel(str, Enum):
    DECISION_MAKER = "decision_maker"
    INFLUENCER = "influencer"
    GATEKEEPER = "gatekeeper"
    CHAMPION = "champion"
    USER = "user"


class FrameworkType(str, Enum):
    SPIN = "spin"
    CHALLENGER = "challenger"
    GAP = "gap"
    SANDLER = "sandler"
    SNAP = "snap"
    MEDDIC = "meddic"
    SOLUTION = "solution"


class IndustryType(str, Enum):
    NETWORK_MARKETING = "network_marketing"
    REAL_ESTATE = "real_estate"
    INSURANCE = "insurance"
    FINANCE = "finance"
    B2B_SAAS = "b2b_saas"
    B2B_SERVICES = "b2b_services"
    COACHING = "coaching"
    AUTOMOTIVE = "automotive"
    RECRUITING = "recruiting"
    HEALTHCARE = "healthcare"
    EVENT_SALES = "event_sales"
    RETAIL_HIGH_TICKET = "retail_high_ticket"


class MomentumTrend(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


# =============================================================================
# LANGUAGE DETECTION
# =============================================================================

class LanguageDetectionRequest(BaseModel):
    """Request für Spracherkennung"""
    text: str = Field(..., description="Text zur Analyse")


class LanguageDetectionResponse(BaseModel):
    """Response der Spracherkennung"""
    language_code: str
    regional_variant: Optional[str] = None
    formality_detected: str
    dialect_markers: List[str] = []
    confidence: float


class CulturalProfileResponse(BaseModel):
    """Kulturelles Profil für eine Sprache"""
    language_code: str
    language_name: str
    formality_default: str
    directness: str
    relationship_first: bool
    urgency_acceptable: bool
    small_talk_expected: bool
    emoji_tolerance: str
    typical_objection_style: str
    trust_building_approach: str
    closing_style: str


class LocalizedTemplateRequest(BaseModel):
    """Request für lokalisiertes Template"""
    template_key: str = Field(..., description="z.B. 'follow_up', 'price_objection', 'ghost_buster'")
    language_code: str = Field(default="de")
    lead_name: str = Field(default="[Name]")


class LocalizedTemplateResponse(BaseModel):
    """Response mit lokalisiertem Template"""
    template_key: str
    language_code: str
    template_text: str


# =============================================================================
# BUYER PSYCHOLOGY
# =============================================================================

class BuyerProfileRequest(BaseModel):
    """Request für Buyer Profile Analysis"""
    chat_text: str = Field(..., description="Chat-Verlauf zur Analyse")
    lead_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class BuyerProfileAnalysis(BaseModel):
    """Ergebnis der Buyer Profile Analyse"""
    buyer_type: BuyerType
    buyer_type_confidence: float
    buyer_type_signals: List[str]
    
    buying_stage: BuyingStage
    buying_stage_confidence: float
    buying_stage_signals: List[str]
    
    risk_profile: RiskProfile
    risk_profile_confidence: float
    risk_profile_signals: List[str]
    
    authority_level: AuthorityLevel
    authority_level_confidence: float
    authority_level_signals: List[str]


class CommunicationRecommendation(BaseModel):
    """Empfehlungen für Kommunikation basierend auf Buyer Profile"""
    tone: str
    message_length: str
    emphasis: List[str]
    avoid: List[str]
    ideal_next_message: str


class BuyerProfileResponse(BaseModel):
    """Vollständige Buyer Profile Response"""
    buyer_profile: BuyerProfileAnalysis
    communication_recommendations: CommunicationRecommendation
    objection_prediction: Dict[str, Any]
    adapted_prompt_section: str


class BuyerTypeInfoResponse(BaseModel):
    """Info zu einem Buyer Type"""
    buyer_type: BuyerType
    name: str
    emoji: str
    characteristics: List[str]
    communication_do: List[str]
    communication_dont: List[str]
    ideal_pitch: str
    objection_handling: str
    closing_approach: str
    typical_questions: List[str]


class ObjectionByBuyerTypeRequest(BaseModel):
    """Request für Einwandbehandlung nach Buyer Type"""
    buyer_type: BuyerType
    objection_type: str = Field(..., description="z.B. 'price', 'time', 'trust'")


class ObjectionByBuyerTypeResponse(BaseModel):
    """Response für Einwandbehandlung nach Buyer Type"""
    buyer_type: BuyerType
    objection_type: str
    strategy: str
    example: str


# =============================================================================
# SALES FRAMEWORKS
# =============================================================================

class FrameworkRecommendationRequest(BaseModel):
    """Request für Framework-Empfehlung"""
    deal_size: Optional[str] = Field(None, description="'small', 'medium', 'large', 'enterprise'")
    sales_cycle: Optional[str] = Field(None, description="'short', 'medium', 'long'")
    lead_type: Optional[str] = Field(None, description="'cold', 'warm', 'hot'")
    situation: Optional[str] = Field(None, description="Beschreibung der Situation")


class FrameworkRecommendationResponse(BaseModel):
    """Response mit Framework-Empfehlung"""
    recommended_framework: FrameworkType
    reasoning: str
    alternatives: List[FrameworkType]


class FrameworkInfoResponse(BaseModel):
    """Info zu einem Sales Framework"""
    id: str
    name: str
    best_for: List[str]
    core_principle: str
    stages: List[Dict[str, Any]]
    key_questions: List[str]
    common_mistakes: List[str]


class FrameworkPromptRequest(BaseModel):
    """Request für Framework-spezifischen Prompt"""
    framework_id: FrameworkType
    current_stage: Optional[str] = None
    lead_context: Optional[Dict[str, Any]] = None


class FrameworkPromptResponse(BaseModel):
    """Response mit Framework-spezifischem Prompt"""
    framework_id: str
    framework_name: str
    prompt_section: str
    stage_questions: List[str]


class ObjectionByFrameworkRequest(BaseModel):
    """Request für Einwandbehandlung nach Framework"""
    framework_id: FrameworkType
    objection_type: str = Field(..., description="z.B. 'price', 'time', 'think'")


class ObjectionByFrameworkResponse(BaseModel):
    """Response für Einwandbehandlung nach Framework"""
    framework_id: str
    objection_type: str
    response: str


# =============================================================================
# INDUSTRIES
# =============================================================================

class IndustryInfoResponse(BaseModel):
    """Info zu einer Branche"""
    id: str
    name: str
    description: str
    typical_sales_cycle: str
    avg_deal_size: str
    key_decision_factors: List[str]
    typical_objections: List[str]
    compliance_rules: List[str]
    recommended_frameworks: List[str]
    buyer_personas: List[Dict[str, str]]
    communication_style: Dict[str, str]
    trust_builders: List[str]
    red_flags: List[str]


class IndustryListItem(BaseModel):
    """Eintrag in der Branchen-Liste"""
    id: str
    name: str
    description: str


class IndustryPromptResponse(BaseModel):
    """Response mit branchenspezifischem Prompt"""
    industry_id: str
    industry_name: str
    prompt_section: str


class IndustryObjectionRequest(BaseModel):
    """Request für branchenspezifische Einwandbehandlung"""
    industry_id: IndustryType
    objection_type: str


class IndustryObjectionResponse(BaseModel):
    """Response für branchenspezifische Einwandbehandlung"""
    industry_id: str
    objection_type: str
    strategy: str
    example: str


# =============================================================================
# DEAL MOMENTUM
# =============================================================================

class MomentumSignalInput(BaseModel):
    """Ein Momentum-Signal"""
    type: Literal["positive", "negative", "neutral"]
    signal: str
    weight: float = Field(default=1.0, ge=0.1, le=2.0)
    description: str


class MomentumCalculationRequest(BaseModel):
    """Request für Momentum-Berechnung"""
    lead_id: str
    signals: List[MomentumSignalInput]


class MomentumScoreResponse(BaseModel):
    """Response mit Momentum Score"""
    lead_id: str
    score: float = Field(..., ge=1, le=10)
    trend: MomentumTrend
    recommendation: str
    signals_count: int
    positive_signals: int
    negative_signals: int
    alert: Optional[str] = None


# =============================================================================
# MICRO-COACHING
# =============================================================================

class MicroCoachingRequest(BaseModel):
    """Request für Micro-Coaching Feedback"""
    action_type: Literal["message_sent", "response_received", "deal_closed", "deal_lost"]
    context: Dict[str, Any] = Field(default_factory=dict)


class MicroCoachingResponse(BaseModel):
    """Response mit Micro-Coaching Feedback"""
    feedback: str
    feedback_type: Literal["positive", "tip", "warning"]


# =============================================================================
# PHONE MODE
# =============================================================================

class PhoneModeStartRequest(BaseModel):
    """Request zum Starten des Phone Mode"""
    lead_id: str
    lead_name: str
    call_type: Literal["discovery", "pitch", "close", "follow_up"]


class PhoneModeCoachingResponse(BaseModel):
    """Live-Coaching Response während Phone Call"""
    tag: str  # z.B. "[ÖFFNER]", "[EINWAND]", "[SIGNAL]"
    coaching: str
    urgency: Literal["low", "medium", "high"]


# =============================================================================
# COMPETITIVE INTELLIGENCE
# =============================================================================

class CompetitorMentionRequest(BaseModel):
    """Request wenn Wettbewerber erwähnt wird"""
    competitor_name: str
    mention_type: Literal["lock", "price", "feature", "third_party"]
    context: Optional[str] = None


class CompetitorHandlingResponse(BaseModel):
    """Response für Wettbewerber-Handling"""
    competitor_name: str
    strategy: str
    response_template: str
    do: List[str]
    dont: List[str]


# =============================================================================
# A/B TESTING
# =============================================================================

class ABTestCreateRequest(BaseModel):
    """Request zum Erstellen eines A/B Tests"""
    name: str
    description: Optional[str] = None
    test_type: Literal["framework", "industry", "buyer_type", "language"]
    variant_a: str
    variant_b: str
    target_metric: str = Field(default="conversion_rate")
    target_industry: Optional[IndustryType] = None
    target_buyer_type: Optional[BuyerType] = None


class ABTestResponse(BaseModel):
    """Response für A/B Test"""
    id: str
    name: str
    test_type: str
    variant_a: str
    variant_b: str
    variant_a_count: int
    variant_b_count: int
    variant_a_conversions: int
    variant_b_conversions: int
    variant_a_rate: float
    variant_b_rate: float
    winner: Optional[str] = None
    statistical_significance: float
    status: Literal["running", "completed", "paused"]
    created_at: datetime
    updated_at: datetime


class ABTestResultRequest(BaseModel):
    """Request zum Loggen eines A/B Test Ergebnisses"""
    test_id: str
    variant: Literal["a", "b"]
    converted: bool
    lead_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# ANALYTICS - FRAMEWORK EFFECTIVENESS
# =============================================================================

class FrameworkEffectivenessRequest(BaseModel):
    """Request für Framework-Effectiveness Analyse"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    industry_filter: Optional[IndustryType] = None
    buyer_type_filter: Optional[BuyerType] = None


class FrameworkEffectivenessItem(BaseModel):
    """Effectiveness eines Frameworks"""
    framework_id: str
    framework_name: str
    total_uses: int
    conversions: int
    conversion_rate: float
    avg_deal_value: Optional[float] = None
    avg_time_to_close_days: Optional[float] = None
    best_for_buyer_types: List[str]
    best_for_industries: List[str]


class FrameworkEffectivenessResponse(BaseModel):
    """Response für Framework-Effectiveness"""
    period_start: datetime
    period_end: datetime
    total_deals: int
    frameworks: List[FrameworkEffectivenessItem]
    top_framework: str
    insights: List[str]


class BuyerTypeEffectivenessItem(BaseModel):
    """Effectiveness nach Buyer Type"""
    buyer_type: BuyerType
    total_leads: int
    conversions: int
    conversion_rate: float
    best_framework: str
    avg_touchpoints: float


class BuyerTypeEffectivenessResponse(BaseModel):
    """Response für Buyer Type Effectiveness"""
    period_start: datetime
    period_end: datetime
    buyer_types: List[BuyerTypeEffectivenessItem]
    insights: List[str]


class IndustryEffectivenessItem(BaseModel):
    """Effectiveness nach Industry"""
    industry_id: str
    industry_name: str
    total_deals: int
    conversions: int
    conversion_rate: float
    best_framework: str
    best_buyer_approach: str
    avg_deal_size: float


class IndustryEffectivenessResponse(BaseModel):
    """Response für Industry Effectiveness"""
    period_start: datetime
    period_end: datetime
    industries: List[IndustryEffectivenessItem]
    insights: List[str]

