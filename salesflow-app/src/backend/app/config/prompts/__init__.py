"""
╔════════════════════════════════════════════════════════════════════════════╗
║  SALES FLOW AI - PROMPTS v3.0                                              ║
║  System Prompts für AI-Module                                              ║
║                                                                            ║
║  NEU IN v3.0:                                                              ║
║  - Multi-Language Support (10+ Sprachen)                                   ║
║  - Buyer Psychology (DISC-basiert)                                         ║
║  - Sales Frameworks (SPIN, Challenger, GAP, Sandler, SNAP, MEDDIC)        ║
║  - Universal Industry Module (12 Branchen)                                 ║
║  - Phone/Voice Mode                                                        ║
║  - Competitive Intelligence                                                ║
║  - Deal Momentum Tracking                                                  ║
║  - Micro-Coaching                                                          ║
║                                                                            ║
║  NEU IN v3.1:                                                              ║
║  - Enterprise Mode (Compliance & Brand Voice)                              ║
║  - Revenue Engineering (Goal-Driven Activity)                              ║
║  - Signal Detector (Einwand vs. Vorwand)                                   ║
║  - Closer Library (Killer Phrases)                                         ║
║  - Natural Selection (Auto Best Practice)                                  ║
║  - Personality Matching (DISG-basiert)                                     ║
║  - Industry Module (erweitert)                                             ║
║  - Deal Medic (Post-Mortem Analyse)                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

# =============================================================================
# CORE CHIEF PROMPTS
# =============================================================================

from .chief_prompt import (
    CHIEF_SYSTEM_PROMPT,
    build_system_messages,
    build_objection_prompt,
    build_motivation_prompt,
)

# =============================================================================
# CHIEF v3 OPERATING SYSTEM - AI VERTRIEBSLEITER
# =============================================================================

from .chief_v3_core import (
    ChiefMode,
    UserLevel,
    CHIEF_V3_SYSTEM_PROMPT,
    CHIEF_MODE_PROMPTS,
    CELEBRATION_TRIGGERS,
    SKILL_LEVEL_V3_PROMPTS,
    get_mode_prompt,
    get_skill_level_prompt,
    get_celebration_template,
    build_chief_v3_prompt,
    map_skill_level_to_user_level,
)

from .chief_mode_router import (
    IntentPattern,
    ContextSignal,
    INTENT_PATTERNS,
    detect_message_intent,
    route_to_mode,
    get_proactive_messages,
    detect_celebration_event,
    detect_user_level,
    analyze_context_signals,
)

from .chief_driver import (
    PushLevel,
    PushTrigger,
    CHIEF_DRIVER_PROMPT,
    PUSH_LEVEL_PROMPTS,
    PUSH_MESSAGE_TEMPLATES,
    determine_push_level,
    get_push_prompt,
    get_push_message,
    build_driver_prompt,
    analyze_push_effectiveness,
)

from .chief_coach import (
    SkillGap,
    SkillGapInfo,
    DetectedGap,
    CHIEF_COACH_PROMPT,
    USER_LEVEL_COACHING,
    SKILL_GAP_DATABASE,
    MICRO_LEARNING_TEMPLATES,
    detect_skill_gaps,
    get_coaching_for_gap,
    generate_micro_learning,
    generate_weekly_skill_report,
    build_coach_prompt,
)

from .chief_analyst import (
    MetricCategory,
    MetricDefinition,
    MetricAnalysis,
    PeerComparison,
    Forecast,
    DetectedPattern,
    CHIEF_ANALYST_PROMPT,
    METRICS_DATABASE,
    analyze_metric,
    compare_with_peers,
    generate_forecast,
    detect_time_patterns,
    detect_channel_patterns,
    generate_performance_card,
    generate_trend_report,
    build_analyst_prompt,
)

from .chief_template_insights import (
    CHIEF_TEMPLATE_INSIGHTS_PROMPT,
    SKILL_LEVEL_PROMPTS,
    CHANNEL_PROMPTS,
    build_template_insights_prompt,
    format_templates_for_prompt,
    get_full_chief_prompt,
    build_templates_context_section,
)

from .chief_knowledge import (
    CHIEF_KNOWLEDGE_SYSTEM_PROMPT,
    CHIEF_HEALTH_PRO_PROMPT,
    LAB_RESULT_INTERPRETATION_PROMPT,
    EVIDENCE_USAGE_EXAMPLES,
    COMPLIANCE_STRICT_WARNING,
    INCOME_DISCLAIMER,
    KnowledgePromptConfig,
    build_knowledge_prompt,
    format_evidence_for_response,
    get_disclaimer_for_domain,
)

from .chief_evidence import (
    CHIEF_EVIDENCE_HUB_PROMPT,
    CHIEF_HEALTH_PRO_EVIDENCE_PROMPT,
    OMEGA3_INDEX_REFERENCE,
    EFSA_CLAIMS_REFERENCE,
    KEY_STUDIES_REFERENCE,
    OBJECTION_EVIDENCE_HANDLERS,
    EvidencePromptConfig,
    build_evidence_prompt,
    get_objection_evidence,
    detect_objection_type,
    format_study_citation,
)

from .chief_brain_rules import (
    CHIEF_BRAIN_RULES_PROMPT,
    format_rules_for_chief_prompt,
    get_priority_order,
    sort_rules_by_priority,
    filter_rules_for_context,
    build_brain_rules_section,
    format_rules_compact,
)

from .chief_company_mode import (
    build_company_mode_prompt,
    format_guardrails,
    format_products,
    format_brand_config,
    inject_company_context,
    get_company_stories_context,
    get_product_context_for_chief,
    check_message_compliance,
)

# =============================================================================
# v3.0 MODULES - MULTI-LANGUAGE
# =============================================================================

from .chief_multilang import (
    CULTURAL_PROFILES,
    CHIEF_MULTILANG_SYSTEM_PROMPT,
    LANGUAGE_DETECTION_PROMPT,
    CulturalProfile,
    get_cultural_profile,
    build_multilang_prompt,
    build_language_detection_prompt,
    get_localized_template,
)

# =============================================================================
# v3.0 MODULES - BUYER PSYCHOLOGY
# =============================================================================

from .chief_buyer_psychology import (
    BUYER_TYPE_PROFILES,
    BUYING_STAGES,
    CHIEF_BUYER_PSYCHOLOGY_PROMPT,
    BUYER_PROFILE_DETECTION_PROMPT,
    BuyerProfile,
    get_buyer_type_profile,
    get_buying_stage_info,
    build_buyer_profile_prompt,
    build_adapted_response_prompt,
    get_objection_response_by_buyer_type,
)

# =============================================================================
# v3.0 MODULES - SALES FRAMEWORKS
# =============================================================================

from .chief_sales_frameworks import (
    SALES_FRAMEWORKS,
    CHIEF_SALES_FRAMEWORKS_PROMPT,
    SalesFramework,
    get_framework,
    build_framework_prompt,
    recommend_framework,
    get_framework_questions,
    get_objection_response_by_framework,
)

# =============================================================================
# v3.0 MODULES - INDUSTRIES
# =============================================================================

from .chief_industries import (
    INDUSTRY_PROFILES,
    CHIEF_INDUSTRY_PROMPT,
    IndustryProfile,
    get_industry_profile,
    build_industry_prompt,
    get_industry_objection_response,
    list_all_industries,
)

# =============================================================================
# v3.0 MODULES - ADVANCED (Phone, Competitive, Momentum, Micro-Coaching)
# =============================================================================

from .chief_advanced import (
    CHIEF_PHONE_MODE_PROMPT,
    CHIEF_COMPETITIVE_PROMPT,
    CHIEF_MOMENTUM_PROMPT,
    CHIEF_MICRO_COACHING_PROMPT,
    MomentumSignal,
    build_phone_mode_prompt,
    build_competitive_prompt,
    calculate_momentum_score,
    get_micro_coaching_feedback,
)

# =============================================================================
# v3.1 ADDITIONS - AI SALES OPERATING SYSTEM
# =============================================================================

from .chief_v31_additions import (
    # Enums
    CompanyMode,
    ObjectionType,
    ClosingSituation,
    DISGType,
    
    # Dataclasses
    ComplianceRules,
    BrandVoice,
    UserGoal,
    DailyTargets,
    ObjectionAnalysis,
    OverrideEvent,
    EmergingBestPractice,
    PersonalityProfile,
    IndustryModule,
    DealEvent,
    DealPostMortem,
    
    # Prompts
    CHIEF_ENTERPRISE_PROMPT,
    CHIEF_REVENUE_ENGINEER_PROMPT,
    CHIEF_SIGNAL_DETECTOR_PROMPT,
    CHIEF_CLOSER_LIBRARY_PROMPT,
    CHIEF_NATURAL_SELECTION_PROMPT,
    CHIEF_PERSONALITY_MATCHING_PROMPT,
    CHIEF_INDUSTRY_MODULE_PROMPT,
    CHIEF_DEAL_MEDIC_PROMPT,
    
    # Static Data
    KILLER_PHRASES,
    DISG_PROFILES,
    INDUSTRY_MODULES,
    
    # Functions - Enterprise
    check_compliance,
    build_enterprise_prompt,
    
    # Functions - Revenue Engineer
    calculate_daily_targets,
    build_goal_analysis,
    
    # Functions - Signal Detector
    analyze_objection,
    
    # Functions - Closer Library
    get_killer_phrases,
    get_best_killer_phrase,
    
    # Functions - Natural Selection
    evaluate_override,
    identify_emerging_best_practices,
    
    # Functions - Personality Matching
    detect_personality_type,
    adapt_message_to_personality,
    
    # Functions - Industry Module
    load_industry_module,
    build_industry_module_prompt,
    
    # Functions - Deal Medic
    analyze_lost_deal,
    detect_deal_at_risk,
    
    # Builder
    build_v31_context,
)

# =============================================================================
# v3.2 AUTOPILOT - Self-Driving Sales System
# =============================================================================

from .chief_autopilot import (
    # Enums
    AutonomyLevel,
    AutopilotAction,
    MessageIntent,
    LeadTemperature,
    InboundChannel,
    
    # Dataclasses
    AutopilotSettings,
    LeadAutopilotOverride,
    IntentAnalysis,
    ConfidenceBreakdown,
    AutopilotDecision,
    InboundMessage,
    
    # Prompts
    CHIEF_AUTOPILOT_SYSTEM_PROMPT,
    CHIEF_INTENT_ACTION_ROUTER,
    CHIEF_CONFIDENCE_ENGINE,
    CHIEF_AUTOPILOT_ORCHESTRATOR,
    AUTONOMY_DESCRIPTIONS,
    INTENT_KEYWORDS,
    
    # Builder Functions
    build_autopilot_system_prompt,
    build_intent_router_prompt,
    build_confidence_engine_prompt,
    build_orchestrator_prompt,
    
    # Utility Functions
    calculate_confidence_score,
    decide_action,
    detect_intent_from_keywords,
)

__all__ = [
    # ==========================================================================
    # CORE CHIEF PROMPTS
    # ==========================================================================
    
    # Chief Prompt
    "CHIEF_SYSTEM_PROMPT",
    "build_system_messages",
    "build_objection_prompt",
    "build_motivation_prompt",
    
    # ==========================================================================
    # CHIEF v3 OPERATING SYSTEM - AI VERTRIEBSLEITER
    # ==========================================================================
    
    # v3 Core
    "ChiefMode",
    "UserLevel",
    "CHIEF_V3_SYSTEM_PROMPT",
    "CHIEF_MODE_PROMPTS",
    "CELEBRATION_TRIGGERS",
    "SKILL_LEVEL_V3_PROMPTS",
    "get_mode_prompt",
    "get_skill_level_prompt",
    "get_celebration_template",
    "build_chief_v3_prompt",
    "map_skill_level_to_user_level",
    
    # Mode Router
    "IntentPattern",
    "ContextSignal",
    "INTENT_PATTERNS",
    "detect_message_intent",
    "route_to_mode",
    "get_proactive_messages",
    "detect_celebration_event",
    "detect_user_level",
    "analyze_context_signals",
    
    # Driver System
    "PushLevel",
    "PushTrigger",
    "CHIEF_DRIVER_PROMPT",
    "PUSH_LEVEL_PROMPTS",
    "PUSH_MESSAGE_TEMPLATES",
    "determine_push_level",
    "get_push_prompt",
    "get_push_message",
    "build_driver_prompt",
    "analyze_push_effectiveness",
    
    # Coach System
    "SkillGap",
    "SkillGapInfo",
    "DetectedGap",
    "CHIEF_COACH_PROMPT",
    "USER_LEVEL_COACHING",
    "SKILL_GAP_DATABASE",
    "MICRO_LEARNING_TEMPLATES",
    "detect_skill_gaps",
    "get_coaching_for_gap",
    "generate_micro_learning",
    "generate_weekly_skill_report",
    "build_coach_prompt",
    
    # Analyst System
    "MetricCategory",
    "MetricDefinition",
    "MetricAnalysis",
    "PeerComparison",
    "Forecast",
    "DetectedPattern",
    "CHIEF_ANALYST_PROMPT",
    "METRICS_DATABASE",
    "analyze_metric",
    "compare_with_peers",
    "generate_forecast",
    "detect_time_patterns",
    "detect_channel_patterns",
    "generate_performance_card",
    "generate_trend_report",
    "build_analyst_prompt",
    
    # Template Insights
    "CHIEF_TEMPLATE_INSIGHTS_PROMPT",
    "SKILL_LEVEL_PROMPTS",
    "CHANNEL_PROMPTS",
    "build_template_insights_prompt",
    "format_templates_for_prompt",
    "get_full_chief_prompt",
    "build_templates_context_section",
    
    # Knowledge Prompts
    "CHIEF_KNOWLEDGE_SYSTEM_PROMPT",
    "CHIEF_HEALTH_PRO_PROMPT",
    "LAB_RESULT_INTERPRETATION_PROMPT",
    "EVIDENCE_USAGE_EXAMPLES",
    "COMPLIANCE_STRICT_WARNING",
    "INCOME_DISCLAIMER",
    "KnowledgePromptConfig",
    "build_knowledge_prompt",
    "format_evidence_for_response",
    "get_disclaimer_for_domain",
    
    # Evidence Prompts
    "CHIEF_EVIDENCE_HUB_PROMPT",
    "CHIEF_HEALTH_PRO_EVIDENCE_PROMPT",
    "OMEGA3_INDEX_REFERENCE",
    "EFSA_CLAIMS_REFERENCE",
    "KEY_STUDIES_REFERENCE",
    "OBJECTION_EVIDENCE_HANDLERS",
    "EvidencePromptConfig",
    "build_evidence_prompt",
    "get_objection_evidence",
    "detect_objection_type",
    "format_study_citation",
    
    # Brain Rules Prompts
    "CHIEF_BRAIN_RULES_PROMPT",
    "format_rules_for_chief_prompt",
    "get_priority_order",
    "sort_rules_by_priority",
    "filter_rules_for_context",
    "build_brain_rules_section",
    "format_rules_compact",
    
    # Company Mode Prompts
    "build_company_mode_prompt",
    "format_guardrails",
    "format_products",
    "format_brand_config",
    "inject_company_context",
    "get_company_stories_context",
    "get_product_context_for_chief",
    "check_message_compliance",
    
    # ==========================================================================
    # v3.0 MODULES - MULTI-LANGUAGE
    # ==========================================================================
    "CULTURAL_PROFILES",
    "CHIEF_MULTILANG_SYSTEM_PROMPT",
    "LANGUAGE_DETECTION_PROMPT",
    "CulturalProfile",
    "get_cultural_profile",
    "build_multilang_prompt",
    "build_language_detection_prompt",
    "get_localized_template",
    
    # ==========================================================================
    # v3.0 MODULES - BUYER PSYCHOLOGY
    # ==========================================================================
    "BUYER_TYPE_PROFILES",
    "BUYING_STAGES",
    "CHIEF_BUYER_PSYCHOLOGY_PROMPT",
    "BUYER_PROFILE_DETECTION_PROMPT",
    "BuyerProfile",
    "get_buyer_type_profile",
    "get_buying_stage_info",
    "build_buyer_profile_prompt",
    "build_adapted_response_prompt",
    "get_objection_response_by_buyer_type",
    
    # ==========================================================================
    # v3.0 MODULES - SALES FRAMEWORKS
    # ==========================================================================
    "SALES_FRAMEWORKS",
    "CHIEF_SALES_FRAMEWORKS_PROMPT",
    "SalesFramework",
    "get_framework",
    "build_framework_prompt",
    "recommend_framework",
    "get_framework_questions",
    "get_objection_response_by_framework",
    
    # ==========================================================================
    # v3.0 MODULES - INDUSTRIES
    # ==========================================================================
    "INDUSTRY_PROFILES",
    "CHIEF_INDUSTRY_PROMPT",
    "IndustryProfile",
    "get_industry_profile",
    "build_industry_prompt",
    "get_industry_objection_response",
    "list_all_industries",
    
    # ==========================================================================
    # v3.0 MODULES - ADVANCED
    # ==========================================================================
    "CHIEF_PHONE_MODE_PROMPT",
    "CHIEF_COMPETITIVE_PROMPT",
    "CHIEF_MOMENTUM_PROMPT",
    "CHIEF_MICRO_COACHING_PROMPT",
    "MomentumSignal",
    "build_phone_mode_prompt",
    "build_competitive_prompt",
    "calculate_momentum_score",
    "get_micro_coaching_feedback",
    
    # ==========================================================================
    # v3.1 ADDITIONS - AI SALES OPERATING SYSTEM
    # ==========================================================================
    
    # Enums
    "CompanyMode",
    "ObjectionType",
    "ClosingSituation",
    "DISGType",
    
    # Dataclasses
    "ComplianceRules",
    "BrandVoice",
    "UserGoal",
    "DailyTargets",
    "ObjectionAnalysis",
    "OverrideEvent",
    "EmergingBestPractice",
    "PersonalityProfile",
    "IndustryModule",
    "DealEvent",
    "DealPostMortem",
    
    # Prompts
    "CHIEF_ENTERPRISE_PROMPT",
    "CHIEF_REVENUE_ENGINEER_PROMPT",
    "CHIEF_SIGNAL_DETECTOR_PROMPT",
    "CHIEF_CLOSER_LIBRARY_PROMPT",
    "CHIEF_NATURAL_SELECTION_PROMPT",
    "CHIEF_PERSONALITY_MATCHING_PROMPT",
    "CHIEF_INDUSTRY_MODULE_PROMPT",
    "CHIEF_DEAL_MEDIC_PROMPT",
    
    # Static Data
    "KILLER_PHRASES",
    "DISG_PROFILES",
    "INDUSTRY_MODULES",
    
    # Functions - Enterprise
    "check_compliance",
    "build_enterprise_prompt",
    
    # Functions - Revenue Engineer
    "calculate_daily_targets",
    "build_goal_analysis",
    
    # Functions - Signal Detector
    "analyze_objection",
    
    # Functions - Closer Library
    "get_killer_phrases",
    "get_best_killer_phrase",
    
    # Functions - Natural Selection
    "evaluate_override",
    "identify_emerging_best_practices",
    
    # Functions - Personality Matching
    "detect_personality_type",
    "adapt_message_to_personality",
    
    # Functions - Industry Module
    "load_industry_module",
    "build_industry_module_prompt",
    
    # Functions - Deal Medic
    "analyze_lost_deal",
    "detect_deal_at_risk",
    
    # Builder
    "build_v31_context",
    
    # ==========================================================================
    # v3.2 AUTOPILOT - Self-Driving Sales System
    # ==========================================================================
    
    # Enums
    "AutonomyLevel",
    "AutopilotAction",
    "MessageIntent",
    "LeadTemperature",
    "InboundChannel",
    
    # Dataclasses
    "AutopilotSettings",
    "LeadAutopilotOverride",
    "IntentAnalysis",
    "ConfidenceBreakdown",
    "AutopilotDecision",
    "InboundMessage",
    
    # Prompts
    "CHIEF_AUTOPILOT_SYSTEM_PROMPT",
    "CHIEF_INTENT_ACTION_ROUTER",
    "CHIEF_CONFIDENCE_ENGINE",
    "CHIEF_AUTOPILOT_ORCHESTRATOR",
    "AUTONOMY_DESCRIPTIONS",
    "INTENT_KEYWORDS",
    
    # Builder Functions
    "build_autopilot_system_prompt",
    "build_intent_router_prompt",
    "build_confidence_engine_prompt",
    "build_orchestrator_prompt",
    
    # Utility Functions
    "calculate_confidence_score",
    "decide_action",
    "detect_intent_from_keywords",
]

