# app/api/schemas - Pydantic Schemas für API Requests/Responses

from .chat_import import (
    ChatChannel,
    LeadTemperature,
    NextStepType,
    ImportFromChatRequest,
    ExtractedLeadData,
    ConversationInsights,
    SuggestedNextStep,
    ImportFromChatResponse,
    SaveImportedLeadRequest,
)

from .voice import (
    VoiceInRequestMeta,
    SuggestedVoiceReply,
    VoiceInAnalysis,
    VoiceInResponse,
    VoiceOutRequest,
    VoiceOutResponse,
)

from .learning import (
    # Enums
    LearningEventType,
    OutcomeType,
    TemplateCategory,
    AggregateType,
    TrendDirection,
    # Learning Events
    LearningEventCreate,
    LearningEventResponse,
    # Templates
    TemplateCreate,
    TemplateResponse,
    TemplateWithPerformance,
    # Analytics
    TemplatePerformanceStats,
    TopTemplatesResponse,
    ChannelBreakdown,
    CategoryBreakdown,
    LearningAggregateResponse,
    # Dashboard
    AnalyticsKPI,
    AnalyticsDashboardResponse,
    # CHIEF Integration
    TemplateInsight,
    ChiefTemplateInsightsResponse,
    # Query Params
    AnalyticsQueryParams,
)

from .brain import (
    # Enums
    RuleType,
    RuleScope,
    RulePriority,
    FeedbackType,
    # Rules
    RuleCreate,
    RuleUpdate,
    RuleResponse,
    RulesForContext,
    # Corrections
    CorrectionCreate,
    CorrectionResponse,
    CorrectionFeedback,
    CorrectionAnalysis,
    DetectedChange,
    # Push
    PushScheduleUpdate,
    PushScheduleResponse,
    PushTokenRegister,
    # Briefings
    TopLead,
    MorningBriefing,
    EveningRecap,
    # Tracking
    RuleApplicationLog,
    RuleFeedback,
    # CHIEF
    RulesForChief,
)

from .knowledge import (
    # Enums
    KnowledgeDomain,
    KnowledgeType,
    EvidenceStrength,
    ComplianceLevel,
    # Company
    CompanyCreate,
    CompanyResponse,
    # Knowledge Items
    KnowledgeItemCreate,
    KnowledgeItemUpdate,
    KnowledgeItemResponse,
    # Search
    KnowledgeSearchQuery,
    KnowledgeSearchResult,
    KnowledgeSearchResponse,
    # Bulk Import
    BulkImportRequest,
    BulkImportResponse,
    # CHIEF Integration
    KnowledgeContextItem,
    KnowledgeContextRequest,
    KnowledgeContextResponse,
    # Health Pro
    HealthProProfileCreate,
    HealthProProfileResponse,
    LabResultCreate,
    LabResultResponse,
    # Analytics
    KnowledgeUsageStats,
    KnowledgeHealthCheck,
)

from .living_os import (
    # Enums
    SignalType,
    RuleStatus,
    BroadcastStatus,
    RuleScope as LivingOSRuleScope,
    ProcessingStatus,
    # Override Loop
    OverrideContext,
    OverrideDetectRequest,
    OverrideAnalysisResponse,
    LearningSignalResponse,
    LearningPatternResponse,
    # Command Line
    CommandParseRequest,
    CommandParseResponse,
    CreateRuleRequest,
    CommandRuleResponse,
    RulesListResponse,
    ParsedCommand,
    TriggerConfig,
    ActionConfig,
    RuleExample,
    # Team Broadcasts
    BroadcastCandidate,
    CreateBroadcastRequest,
    ApproveBroadcastRequest,
    TeamBroadcastResponse,
    BroadcastsListResponse,
    BroadcastCandidatesResponse,
    # Learning Cases
    ImportCaseRequest,
    ImportCaseResponse,
    ProcessCaseResponse,
    LearningCaseResponse,
    CasesListResponse,
    ExtractedTemplate,
    ExtractedObjection,
    ExtractedTemplatesResponse,
    ObjectionHandlersResponse,
    SellerStyle,
    ExtractedData,
    # Context
    LivingOSContext,
)

from .storybook import (
    # Story Schemas
    StoryBase,
    StoryCreate,
    StoryResponse,
    StoryListResponse,
    # Product Schemas
    ProductBase,
    ProductCreate,
    ProductResponse,
    ProductListResponse,
    # Guardrail Schemas
    GuardrailBase,
    GuardrailCreate,
    GuardrailResponse,
    GuardrailListResponse,
    # Compliance Schemas
    ComplianceCheckRequest,
    ComplianceViolation,
    ComplianceCheckResponse,
    ComplianceSuggestionResponse,
    # Import Schemas
    ImportSeedRequest,
    ImportResult,
    ImportStatus,
    ImportHistoryItem,
    # Company Context
    CompanyBrandConfig,
    CompanyContextResponse,
    StoryForContextRequest,
)

from .live_assist import (
    # Enums
    AssistIntent,
    QueryType,
    SessionOutcome,
    ObjectionType,
    FactType,
    # Session
    StartSessionRequest,
    StartSessionResponse,
    LiveQueryRequest,
    LiveQueryResponse,
    EndSessionRequest,
    SessionStatsResponse,
    # Quick Access
    QuickFactItem,
    QuickFactsRequest,
    ObjectionResponseRequest,
    ObjectionResponseItem,
    VerticalKnowledgeItem,
    # Create/Seed
    QuickFactCreate,
    ObjectionResponseCreate,
    VerticalKnowledgeCreate,
)

__all__ = [
    # Chat Import
    "ChatChannel",
    "LeadTemperature",
    "NextStepType",
    "ImportFromChatRequest",
    "ExtractedLeadData",
    "ConversationInsights",
    "SuggestedNextStep",
    "ImportFromChatResponse",
    "SaveImportedLeadRequest",
    # Voice In/Out
    "VoiceInRequestMeta",
    "SuggestedVoiceReply",
    "VoiceInAnalysis",
    "VoiceInResponse",
    "VoiceOutRequest",
    "VoiceOutResponse",
    # Learning - Enums
    "LearningEventType",
    "OutcomeType",
    "TemplateCategory",
    "AggregateType",
    "TrendDirection",
    # Learning - Events
    "LearningEventCreate",
    "LearningEventResponse",
    # Learning - Templates
    "TemplateCreate",
    "TemplateResponse",
    "TemplateWithPerformance",
    # Learning - Analytics
    "TemplatePerformanceStats",
    "TopTemplatesResponse",
    "ChannelBreakdown",
    "CategoryBreakdown",
    "LearningAggregateResponse",
    # Learning - Dashboard
    "AnalyticsKPI",
    "AnalyticsDashboardResponse",
    # Learning - CHIEF
    "TemplateInsight",
    "ChiefTemplateInsightsResponse",
    # Learning - Query Params
    "AnalyticsQueryParams",
    # Knowledge - Enums
    "KnowledgeDomain",
    "KnowledgeType",
    "EvidenceStrength",
    "ComplianceLevel",
    # Knowledge - Company
    "CompanyCreate",
    "CompanyResponse",
    # Knowledge - Items
    "KnowledgeItemCreate",
    "KnowledgeItemUpdate",
    "KnowledgeItemResponse",
    # Knowledge - Search
    "KnowledgeSearchQuery",
    "KnowledgeSearchResult",
    "KnowledgeSearchResponse",
    # Knowledge - Bulk Import
    "BulkImportRequest",
    "BulkImportResponse",
    # Knowledge - CHIEF
    "KnowledgeContextItem",
    "KnowledgeContextRequest",
    "KnowledgeContextResponse",
    # Knowledge - Health Pro
    "HealthProProfileCreate",
    "HealthProProfileResponse",
    "LabResultCreate",
    "LabResultResponse",
    # Knowledge - Analytics
    "KnowledgeUsageStats",
    "KnowledgeHealthCheck",
    # Brain - Enums
    "RuleType",
    "RuleScope",
    "RulePriority",
    "FeedbackType",
    # Brain - Rules
    "RuleCreate",
    "RuleUpdate",
    "RuleResponse",
    "RulesForContext",
    # Brain - Corrections
    "CorrectionCreate",
    "CorrectionResponse",
    "CorrectionFeedback",
    "CorrectionAnalysis",
    "DetectedChange",
    # Brain - Push
    "PushScheduleUpdate",
    "PushScheduleResponse",
    "PushTokenRegister",
    # Brain - Briefings
    "TopLead",
    "MorningBriefing",
    "EveningRecap",
    # Brain - Tracking
    "RuleApplicationLog",
    "RuleFeedback",
    # Brain - CHIEF
    "RulesForChief",
    # Living OS - Enums
    "SignalType",
    "RuleStatus",
    "BroadcastStatus",
    "LivingOSRuleScope",
    "ProcessingStatus",
    # Living OS - Override Loop
    "OverrideContext",
    "OverrideDetectRequest",
    "OverrideAnalysisResponse",
    "LearningSignalResponse",
    "LearningPatternResponse",
    # Living OS - Command Line
    "CommandParseRequest",
    "CommandParseResponse",
    "CreateRuleRequest",
    "CommandRuleResponse",
    "RulesListResponse",
    "ParsedCommand",
    "TriggerConfig",
    "ActionConfig",
    "RuleExample",
    # Living OS - Team Broadcasts
    "BroadcastCandidate",
    "CreateBroadcastRequest",
    "ApproveBroadcastRequest",
    "TeamBroadcastResponse",
    "BroadcastsListResponse",
    "BroadcastCandidatesResponse",
    # Living OS - Learning Cases
    "ImportCaseRequest",
    "ImportCaseResponse",
    "ProcessCaseResponse",
    "LearningCaseResponse",
    "CasesListResponse",
    "ExtractedTemplate",
    "ExtractedObjection",
    "ExtractedTemplatesResponse",
    "ObjectionHandlersResponse",
    "SellerStyle",
    "ExtractedData",
    # Living OS - Context
    "LivingOSContext",
    # Storybook - Stories
    "StoryBase",
    "StoryCreate",
    "StoryResponse",
    "StoryListResponse",
    # Storybook - Products
    "ProductBase",
    "ProductCreate",
    "ProductResponse",
    "ProductListResponse",
    # Storybook - Guardrails
    "GuardrailBase",
    "GuardrailCreate",
    "GuardrailResponse",
    "GuardrailListResponse",
    # Storybook - Compliance
    "ComplianceCheckRequest",
    "ComplianceViolation",
    "ComplianceCheckResponse",
    "ComplianceSuggestionResponse",
    # Storybook - Import
    "ImportSeedRequest",
    "ImportResult",
    "ImportStatus",
    "ImportHistoryItem",
    # Storybook - Company Context
    "CompanyBrandConfig",
    "CompanyContextResponse",
    "StoryForContextRequest",
    # Live Assist - Enums
    "AssistIntent",
    "QueryType",
    "SessionOutcome",
    "ObjectionType",
    "FactType",
    # Live Assist - Session
    "StartSessionRequest",
    "StartSessionResponse",
    "LiveQueryRequest",
    "LiveQueryResponse",
    "EndSessionRequest",
    "SessionStatsResponse",
    # Live Assist - Quick Access
    "QuickFactItem",
    "QuickFactsRequest",
    "ObjectionResponseRequest",
    "ObjectionResponseItem",
    "VerticalKnowledgeItem",
    # Live Assist - Create/Seed
    "QuickFactCreate",
    "ObjectionResponseCreate",
    "VerticalKnowledgeCreate",
]
