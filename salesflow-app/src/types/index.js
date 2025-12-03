/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - TYPES INDEX                                               ║
 * ║  Zentraler Export aller Type Definitions                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// Lead Scoring Types
export {
  BANTScoresSchema,
  ScoreCategorySchema,
  DISGTypeSchema,
  ScoredLeadSchema,
  LeadScoreResultSchema,
  LeadScoreStatsSchema,
  BANTUpdateRequestSchema,
  RecommendedActionSchema,
  DISG_CONFIG,
  SCORE_LEVELS,
  BANT_SLIDER_STEPS,
  validateBANTScores,
  validateLeadScoreResult,
  validateLeadScoreStats
} from './leadScoring.types';

// Daily Flow Types (falls vorhanden)
export * from './dailyFlow';

// Proposal Reminder Types (falls vorhanden)
export * from './proposalReminder';

// Personality & Contact Plan Types (DISG / No-Lead-Left-Behind)
export * from './personality';

// Activity Tracking Types
export * from './activity';

// Compensation Plan & Goal Engine Types
export * from './compensation';

// Generic Goal Types (Vertriebsagnostisch)
export * from './goals';

// Vertical Adapter Types (sync mit Python Backend)
export * from './verticalAdapter';