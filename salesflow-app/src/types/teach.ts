/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  TEACH-UI TYPES                                                            ║
 * ║  Integration mit Living OS & Sales Brain                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Types für das Teach-UI System - die User-Facing Komponente des Living OS,
 * die es Verkäufern ermöglicht, CHIEF in Echtzeit zu trainieren.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type RuleScope = 'personal' | 'team' | 'company';

export type TeachAction = 
  | 'ignore'           // User will nicht lernen
  | 'save_personal'    // Nur für mich
  | 'save_team'        // Fürs Team (Leader Approval)
  | 'save_template';   // Als Template speichern

export type ChangeType =
  | 'shorter_more_direct'
  | 'longer_more_detailed'
  | 'informal_tone'
  | 'formal_tone'
  | 'emoji_added'
  | 'emoji_removed'
  | 'question_added'
  | 'question_removed'
  | 'cta_changed'
  | 'greeting_changed'
  | 'closing_changed'
  | 'personalization_added'
  | 'urgency_added'
  | 'urgency_removed'
  | 'social_proof_added'
  | 'price_mention_removed'
  | 'enthusiasm_added'
  | 'enthusiasm_reduced'
  | 'length_reduced'
  | 'length_increased'
  | 'custom';

export type PatternStatus = 'candidate' | 'active' | 'testing' | 'archived' | 'rejected';

export type Significance = 'none' | 'low' | 'medium' | 'high';

// =============================================================================
// CONTEXT
// =============================================================================

export interface OverrideContext {
  // Vertical & Company
  verticalId?: string;        // 'network_marketing', 'coaching', 'real_estate'
  companyId?: string;         // 'zinzino', 'herbalife', etc.
  
  // Channel & Lead
  channel?: string;           // 'whatsapp', 'instagram_dm', 'email', 'sms'
  leadId?: string;
  leadStatus?: string;        // 'cold', 'warm', 'hot', 'customer'
  
  // Message Context
  messageType?: string;       // 'opening', 'follow_up', 'objection', 'closing'
  objectionType?: string;     // 'price', 'time', 'think_about_it', 'not_interested'
  templateId?: string;        // Falls von Template abgeleitet
  
  // DISG
  disgType?: string;          // 'D', 'I', 'S', 'G'
  
  // Meta
  language?: string;          // 'de', 'en'
  dayOfWeek?: number;         // 0-6
  timeOfDay?: string;         // 'morning', 'afternoon', 'evening'
}

// =============================================================================
// OVERRIDE EVENT
// =============================================================================

export interface DetectedChanges {
  changes: ChangeType[];
  pattern?: string;
  significance: Significance;
}

export interface OverrideEvent {
  // IDs
  id?: string;
  suggestionId?: string | null;
  
  // Texts
  originalText: string;       // Was CHIEF vorgeschlagen hat
  finalText: string;          // Was User gesendet hat
  
  // Analysis
  similarityScore: number;    // 0-1 (1 = identisch)
  isSignificant: boolean;     // < 0.85 oder > 10 Zeichen Differenz
  
  // Detected Changes
  detectedChanges: DetectedChanges;
  
  // Context
  context: OverrideContext;
  
  // Timestamps
  timestamp: Date;
}

// =============================================================================
// TEACH SHEET STATE
// =============================================================================

export interface TeachSheetState {
  visible: boolean;
  event: OverrideEvent | null;
  
  // User Input
  note?: string;
  tags?: string[];
  selectedScope: RuleScope;
  
  // UI State
  isLoading: boolean;
  showAdvanced: boolean;
}

// =============================================================================
// CREATE RULE PAYLOAD
// =============================================================================

export interface CreateRulePayload {
  // Scope
  scope: RuleScope;
  
  // Override Data
  override: {
    originalText: string;
    finalText: string;
    similarityScore: number;
    detectedChanges: ChangeType[];
    context: OverrideContext;
  };
  
  // User Additions
  note?: string;
  tags?: string[];
  
  // Rule Config (optional, für Advanced Users)
  ruleConfig?: {
    priority?: number;          // 0-100
    applyTo?: string[];         // Channels
    triggerConditions?: object; // Custom Triggers
  };
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface PatternDetectedInfo {
  patternType: string;
  signalCount: number;
  successRate: number;
  willBecomeRule: boolean;
}

export interface TeachResponse {
  success: boolean;
  
  // Was wurde erstellt?
  created: {
    signalId?: string;
    ruleId?: string;
    templateId?: string;
    patternId?: string;
    broadcastId?: string;
  };
  
  // XP Reward
  xpEarned?: number;
  
  // Feedback
  message: string;
  
  // Pattern Info (falls erkannt)
  patternDetected?: PatternDetectedInfo;
}

export interface PatternNotification {
  patternType: string;
  description: string;
  signalCount: number;
  successRate: number;
  suggestedAction: 'activate' | 'test' | 'review';
}

// =============================================================================
// TEACH STATS (für Gamification)
// =============================================================================

export interface TeachStats {
  totalTeachActions: number;
  rulesCreated: number;
  templatesCreated: number;
  patternsDiscovered: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  
  // XP
  totalXpFromTeaching: number;
  
  // Impact
  rulesAdoptedByTeam: number;
  templateUsageCount: number;
  
  // Pending
  pendingPatterns: number;
}

// =============================================================================
// PENDING PATTERN
// =============================================================================

export interface PendingPattern {
  id: string;
  patternType: string;
  signalCount: number;
  successRate: number;
  lastSignalAt: string;
}

// =============================================================================
// SIMILARITY RESULT
// =============================================================================

export interface SimilarityResult {
  combined: number;           // Gewichteter Durchschnitt
  jaccard: number;            // Wort-basiert
  levenshtein: number;        // Zeichen-basiert
  
  isSignificant: boolean;     // Sollte Teach-Sheet triggern?
  significance: Significance;
  
  lengthDiff: number;         // Absolute Längendifferenz
  lengthRatio: number;        // Verhältnis
}

// =============================================================================
// QUICK CHANGE RESULT
// =============================================================================

export interface QuickChangeResult {
  changes: ChangeType[];
  pattern?: string;
  confidence: number;
}

// =============================================================================
// DEEP ANALYSIS
// =============================================================================

export interface DeepAnalysisResult {
  changes: string[];
  pattern: string | null;
  insights: string;
  suggestedRuleName: string;
}

// =============================================================================
// SUGGESTED RULE PREVIEW
// =============================================================================

export interface SuggestedRulePreview {
  title: string;
  instruction: string;
  ruleType: string;
  confidence?: number;
}

// =============================================================================
// CHANGE LABELS (für UI)
// =============================================================================

export const CHANGE_LABELS: Record<ChangeType, string> = {
  shorter_more_direct: '✂️ Kürzer & direkter',
  longer_more_detailed: '📝 Ausführlicher',
  informal_tone: '👋 Lockerer Ton',
  formal_tone: '🎩 Formeller',
  emoji_added: '😊 Emojis hinzugefügt',
  emoji_removed: '🚫 Emojis entfernt',
  question_added: '❓ Frage eingebaut',
  question_removed: '❓ Frage entfernt',
  cta_changed: '👆 Call-to-Action geändert',
  greeting_changed: '👋 Begrüßung angepasst',
  closing_changed: '✍️ Abschluss geändert',
  personalization_added: '🎯 Persönlicher',
  urgency_added: '⚡ Dringlichkeit erhöht',
  urgency_removed: '😌 Druck rausgenommen',
  social_proof_added: '👥 Social Proof eingebaut',
  price_mention_removed: '💰 Preis rausgenommen',
  enthusiasm_added: '🎉 Mehr Begeisterung',
  enthusiasm_reduced: '😐 Weniger Begeisterung',
  length_reduced: '✂️ Gekürzt',
  length_increased: '📝 Verlängert',
  custom: '✨ Eigene Anpassung',
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  CHANGE_LABELS,
};

