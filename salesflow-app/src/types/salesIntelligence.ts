/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES INTELLIGENCE TYPES v3.0                                             ║
 * ║  TypeScript Types für Multi-Language, Buyer Psychology, Frameworks, etc.  ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum LanguageCode {
  DE = 'de',
  DE_AT = 'de-at',
  DE_CH = 'de-ch',
  EN_US = 'en-us',
  EN_UK = 'en-uk',
  ES = 'es',
  ES_LATAM = 'es-latam',
  FR = 'fr',
  IT = 'it',
  PT = 'pt',
  NL = 'nl',
  PL = 'pl',
  TR = 'tr',
}

export enum BuyerType {
  ANALYTICAL = 'analytical',
  DRIVER = 'driver',
  EXPRESSIVE = 'expressive',
  AMIABLE = 'amiable',
}

export enum BuyingStage {
  AWARENESS = 'awareness',
  CONSIDERATION = 'consideration',
  DECISION = 'decision',
  VALIDATION = 'validation',
}

export enum RiskProfile {
  RISK_AVERSE = 'risk_averse',
  RISK_NEUTRAL = 'risk_neutral',
  RISK_TAKER = 'risk_taker',
}

export enum AuthorityLevel {
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  GATEKEEPER = 'gatekeeper',
  CHAMPION = 'champion',
  USER = 'user',
}

export enum FrameworkType {
  SPIN = 'spin',
  CHALLENGER = 'challenger',
  GAP = 'gap',
  SANDLER = 'sandler',
  SNAP = 'snap',
  MEDDIC = 'meddic',
  SOLUTION = 'solution',
}

export enum IndustryType {
  NETWORK_MARKETING = 'network_marketing',
  REAL_ESTATE = 'real_estate',
  INSURANCE = 'insurance',
  FINANCE = 'finance',
  B2B_SAAS = 'b2b_saas',
  B2B_SERVICES = 'b2b_services',
  COACHING = 'coaching',
  AUTOMOTIVE = 'automotive',
  RECRUITING = 'recruiting',
  HEALTHCARE = 'healthcare',
  EVENT_SALES = 'event_sales',
  RETAIL_HIGH_TICKET = 'retail_high_ticket',
}

export enum MomentumTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

// =============================================================================
// LABELS & DISPLAY HELPERS
// =============================================================================

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  [LanguageCode.DE]: '🇩🇪 Deutsch',
  [LanguageCode.DE_AT]: '🇦🇹 Österreichisch',
  [LanguageCode.DE_CH]: '🇨🇭 Schweizerdeutsch',
  [LanguageCode.EN_US]: '🇺🇸 US English',
  [LanguageCode.EN_UK]: '🇬🇧 British English',
  [LanguageCode.ES]: '🇪🇸 Español',
  [LanguageCode.ES_LATAM]: '🌎 Español (Latam)',
  [LanguageCode.FR]: '🇫🇷 Français',
  [LanguageCode.IT]: '🇮🇹 Italiano',
  [LanguageCode.PT]: '🇵🇹 Português',
  [LanguageCode.NL]: '🇳🇱 Nederlands',
  [LanguageCode.PL]: '🇵🇱 Polski',
  [LanguageCode.TR]: '🇹🇷 Türkçe',
};

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  [BuyerType.ANALYTICAL]: '🧮 Analytiker',
  [BuyerType.DRIVER]: '🎯 Macher',
  [BuyerType.EXPRESSIVE]: '✨ Visionär',
  [BuyerType.AMIABLE]: '🤝 Beziehungsmensch',
};

export const BUYER_TYPE_COLORS: Record<BuyerType, string> = {
  [BuyerType.ANALYTICAL]: '#3B82F6', // Blue
  [BuyerType.DRIVER]: '#EF4444',     // Red
  [BuyerType.EXPRESSIVE]: '#F59E0B', // Amber
  [BuyerType.AMIABLE]: '#10B981',    // Green
};

export const BUYING_STAGE_LABELS: Record<BuyingStage, string> = {
  [BuyingStage.AWARENESS]: '👀 Awareness',
  [BuyingStage.CONSIDERATION]: '🤔 Consideration',
  [BuyingStage.DECISION]: '✅ Decision',
  [BuyingStage.VALIDATION]: '🎉 Validation',
};

export const FRAMEWORK_LABELS: Record<FrameworkType, string> = {
  [FrameworkType.SPIN]: 'SPIN Selling',
  [FrameworkType.CHALLENGER]: 'Challenger Sale',
  [FrameworkType.GAP]: 'GAP Selling',
  [FrameworkType.SANDLER]: 'Sandler System',
  [FrameworkType.SNAP]: 'SNAP Selling',
  [FrameworkType.MEDDIC]: 'MEDDIC',
  [FrameworkType.SOLUTION]: 'Solution Selling',
};

export const INDUSTRY_LABELS: Record<IndustryType, string> = {
  [IndustryType.NETWORK_MARKETING]: 'Network Marketing',
  [IndustryType.REAL_ESTATE]: 'Immobilien',
  [IndustryType.INSURANCE]: 'Versicherungen',
  [IndustryType.FINANCE]: 'Finanzdienstleistungen',
  [IndustryType.B2B_SAAS]: 'B2B SaaS',
  [IndustryType.B2B_SERVICES]: 'B2B Services',
  [IndustryType.COACHING]: 'Coaching & Training',
  [IndustryType.AUTOMOTIVE]: 'Automotive',
  [IndustryType.RECRUITING]: 'Recruiting',
  [IndustryType.HEALTHCARE]: 'Healthcare',
  [IndustryType.EVENT_SALES]: 'Event Sales',
  [IndustryType.RETAIL_HIGH_TICKET]: 'High-Ticket Retail',
};

export const MOMENTUM_TREND_LABELS: Record<MomentumTrend, string> = {
  [MomentumTrend.IMPROVING]: '📈 Steigend',
  [MomentumTrend.STABLE]: '➡️ Stabil',
  [MomentumTrend.DECLINING]: '📉 Fallend',
};

// =============================================================================
// LANGUAGE TYPES
// =============================================================================

export interface CulturalProfile {
  language_code: string;
  language_name: string;
  formality_default: string;
  directness: string;
  relationship_first: boolean;
  urgency_acceptable: boolean;
  small_talk_expected: boolean;
  emoji_tolerance: string;
  typical_objection_style: string;
  trust_building_approach: string;
  closing_style: string;
}

export interface LanguageDetectionResult {
  language_code: string;
  regional_variant?: string;
  formality_detected: string;
  dialect_markers: string[];
  confidence: number;
}

export interface LocalizedTemplate {
  template_key: string;
  language_code: string;
  template_text: string;
}

// =============================================================================
// BUYER PSYCHOLOGY TYPES
// =============================================================================

export interface BuyerProfileAnalysis {
  buyer_type: BuyerType;
  buyer_type_confidence: number;
  buyer_type_signals: string[];
  
  buying_stage: BuyingStage;
  buying_stage_confidence: number;
  buying_stage_signals: string[];
  
  risk_profile: RiskProfile;
  risk_profile_confidence: number;
  risk_profile_signals: string[];
  
  authority_level: AuthorityLevel;
  authority_level_confidence: number;
  authority_level_signals: string[];
}

export interface CommunicationRecommendation {
  tone: string;
  message_length: string;
  emphasis: string[];
  avoid: string[];
  ideal_next_message: string;
}

export interface BuyerTypeInfo {
  buyer_type: BuyerType;
  name: string;
  emoji: string;
  characteristics: string[];
  communication_do: string[];
  communication_dont: string[];
  ideal_pitch: string;
  objection_handling: string;
  closing_approach: string;
  typical_questions: string[];
}

export interface ObjectionByBuyerType {
  buyer_type: BuyerType;
  objection_type: string;
  strategy: string;
  example: string;
}

// =============================================================================
// SALES FRAMEWORK TYPES
// =============================================================================

export interface FrameworkStage {
  name: string;
  goal: string;
  description: string;
  example_questions?: string[];
  example_approach?: string;
}

export interface SalesFramework {
  id: string;
  name: string;
  best_for: string[];
  core_principle: string;
  stages: FrameworkStage[];
  key_questions: string[];
  common_mistakes: string[];
}

export interface FrameworkRecommendation {
  recommended_framework: FrameworkType;
  reasoning: string;
  alternatives: FrameworkType[];
}

export interface ObjectionByFramework {
  framework_id: string;
  objection_type: string;
  response: string;
}

// =============================================================================
// INDUSTRY TYPES
// =============================================================================

export interface BuyerPersona {
  name: string;
  desc: string;
}

export interface IndustryProfile {
  id: string;
  name: string;
  description: string;
  typical_sales_cycle: string;
  avg_deal_size: string;
  key_decision_factors: string[];
  typical_objections: string[];
  compliance_rules: string[];
  recommended_frameworks: string[];
  buyer_personas: BuyerPersona[];
  communication_style: {
    tone: string;
    channel: string;
    frequency: string;
  };
  trust_builders: string[];
  red_flags: string[];
}

export interface IndustryObjection {
  industry_id: string;
  objection_type: string;
  strategy: string;
  example: string;
}

// =============================================================================
// MOMENTUM TYPES
// =============================================================================

export interface MomentumSignal {
  type: 'positive' | 'negative' | 'neutral';
  signal: string;
  weight: number;
  description: string;
}

export interface MomentumScore {
  lead_id: string;
  score: number;
  trend: MomentumTrend;
  recommendation: string;
  signals_count: number;
  positive_signals: number;
  negative_signals: number;
  alert?: string;
}

// =============================================================================
// MICRO-COACHING TYPES
// =============================================================================

export interface MicroCoachingFeedback {
  feedback: string;
  feedback_type: 'positive' | 'tip' | 'warning';
}

// =============================================================================
// PHONE MODE TYPES
// =============================================================================

export interface PhoneModeSession {
  session_id: string;
  lead_id: string;
  lead_name: string;
  call_type: 'discovery' | 'pitch' | 'close' | 'follow_up';
  status: 'active' | 'ended';
}

export interface PhoneModeCoaching {
  tag: string;
  coaching: string;
  urgency: 'low' | 'medium' | 'high';
}

// =============================================================================
// COMPETITIVE INTELLIGENCE TYPES
// =============================================================================

export interface CompetitorHandling {
  competitor_name: string;
  strategy: string;
  response_template: string;
  do: string[];
  dont: string[];
}

// =============================================================================
// A/B TESTING TYPES
// =============================================================================

export interface ABTest {
  id: string;
  name: string;
  test_type: 'framework' | 'industry' | 'buyer_type' | 'language';
  variant_a: string;
  variant_b: string;
  variant_a_count: number;
  variant_b_count: number;
  variant_a_conversions: number;
  variant_b_conversions: number;
  variant_a_rate: number;
  variant_b_rate: number;
  winner?: 'a' | 'b';
  statistical_significance: number;
  status: 'running' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface ABTestCreateRequest {
  name: string;
  description?: string;
  test_type: 'framework' | 'industry' | 'buyer_type' | 'language';
  variant_a: string;
  variant_b: string;
  target_metric?: string;
  target_industry?: IndustryType;
  target_buyer_type?: BuyerType;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface FrameworkEffectiveness {
  framework_id: string;
  framework_name: string;
  total_uses: number;
  conversions: number;
  conversion_rate: number;
  avg_deal_value?: number;
  avg_time_to_close_days?: number;
  best_for_buyer_types: string[];
  best_for_industries: string[];
}

export interface FrameworkEffectivenessReport {
  period_start: string;
  period_end: string;
  total_deals: number;
  frameworks: FrameworkEffectiveness[];
  top_framework: string;
  insights: string[];
}

export interface BuyerTypeEffectiveness {
  buyer_type: BuyerType;
  total_leads: number;
  conversions: number;
  conversion_rate: number;
  best_framework: string;
  avg_touchpoints: number;
}

export interface BuyerTypeEffectivenessReport {
  period_start: string;
  period_end: string;
  buyer_types: BuyerTypeEffectiveness[];
  insights: string[];
}

export interface IndustryEffectiveness {
  industry_id: string;
  industry_name: string;
  total_deals: number;
  conversions: number;
  conversion_rate: number;
  best_framework: string;
  best_buyer_approach: string;
  avg_deal_size: number;
}

export interface IndustryEffectivenessReport {
  period_start: string;
  period_end: string;
  industries: IndustryEffectiveness[];
  insights: string[];
}

// =============================================================================
// API REQUEST/RESPONSE HELPERS
// =============================================================================

export interface SalesIntelligenceState {
  selectedLanguage: LanguageCode;
  selectedIndustry: IndustryType;
  selectedFramework?: FrameworkType;
  detectedBuyerType?: BuyerType;
  detectedBuyingStage?: BuyingStage;
  momentumScore?: number;
  activeABTests: ABTest[];
}

// Default state
export const DEFAULT_SALES_INTELLIGENCE_STATE: SalesIntelligenceState = {
  selectedLanguage: LanguageCode.DE,
  selectedIndustry: IndustryType.NETWORK_MARKETING,
  activeABTests: [],
};

