/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - LEAD SCORING TYPES                                        ║
 * ║  Type Definitions für BANT-Score und Lead-Qualifizierung                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BANT Score Values (0-25 pro Kategorie)
 */
export const BANTScoresSchema = z.object({
  budget: z.number().min(0).max(25).default(0),
  authority: z.number().min(0).max(25).default(0),
  need: z.number().min(0).max(25).default(0),
  timeline: z.number().min(0).max(25).default(0)
});

/**
 * Score Kategorie
 */
export const ScoreCategorySchema = z.enum(['hot', 'warm', 'cool', 'cold']);

/**
 * DISG Persönlichkeitstyp
 */
export const DISGTypeSchema = z.enum(['d', 'i', 's', 'g']).nullable();

/**
 * Lead mit Score
 */
export const ScoredLeadSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  status: z.string(),
  lead_score: z.number().min(0).max(100).default(0),
  score_category: ScoreCategorySchema.default('cold'),
  bant: BANTScoresSchema.optional(),
  disg_type: DISGTypeSchema.optional(),
  created_at: z.string().datetime().optional()
});

/**
 * Lead Score Ergebnis (von RPC)
 */
export const LeadScoreResultSchema = z.object({
  lead_id: z.string().uuid(),
  bant_scores: BANTScoresSchema,
  total_score: z.number().min(0).max(100),
  category: ScoreCategorySchema,
  category_emoji: z.string()
});

/**
 * Lead Score Statistiken
 */
export const LeadScoreStatsSchema = z.object({
  total_leads: z.number(),
  avg_score: z.number(),
  hot_leads: z.number(),
  warm_leads: z.number(),
  cool_leads: z.number(),
  cold_leads: z.number(),
  unscored_leads: z.number(),
  top_lead: z.object({
    id: z.string().uuid(),
    name: z.string(),
    score: z.number()
  }).nullable().optional()
});

/**
 * BANT Update Request
 */
export const BANTUpdateRequestSchema = z.object({
  budget: z.number().min(0).max(25).optional(),
  authority: z.number().min(0).max(25).optional(),
  need: z.number().min(0).max(25).optional(),
  timeline: z.number().min(0).max(25).optional(),
  disgType: DISGTypeSchema.optional()
});

/**
 * Empfohlene Aktion
 */
export const RecommendedActionSchema = z.object({
  focus: z.enum(['budget', 'authority', 'need', 'timeline', 'close']),
  action: z.string(),
  question: z.string()
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS (für JSDoc)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {z.infer<typeof BANTScoresSchema>} BANTScores
 * @typedef {z.infer<typeof ScoreCategorySchema>} ScoreCategory
 * @typedef {z.infer<typeof DISGTypeSchema>} DISGType
 * @typedef {z.infer<typeof ScoredLeadSchema>} ScoredLead
 * @typedef {z.infer<typeof LeadScoreResultSchema>} LeadScoreResult
 * @typedef {z.infer<typeof LeadScoreStatsSchema>} LeadScoreStats
 * @typedef {z.infer<typeof BANTUpdateRequestSchema>} BANTUpdateRequest
 * @typedef {z.infer<typeof RecommendedActionSchema>} RecommendedAction
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DISG Typen Konfiguration
 */
export const DISG_CONFIG = {
  d: {
    name: 'Dominant',
    emoji: '🦁',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    traits: ['Direkt', 'Ergebnisorientiert', 'Entscheidungsfreudig'],
    approach: 'Schnell auf den Punkt kommen, Fakten & ROI zeigen'
  },
  i: {
    name: 'Initiativ',
    emoji: '🦋',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    traits: ['Enthusiastisch', 'Beziehungsorientiert', 'Optimistisch'],
    approach: 'Begeisterung zeigen, Visionen malen, persönliche Connection'
  },
  s: {
    name: 'Stetig',
    emoji: '🐢',
    color: '#10B981',
    bgColor: '#DCFCE7',
    traits: ['Geduldig', 'Teamorientiert', 'Loyal'],
    approach: 'Zeit geben, Sicherheit bieten, schrittweise vorgehen'
  },
  g: {
    name: 'Gewissenhaft',
    emoji: '🦉',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    traits: ['Analytisch', 'Detailorientiert', 'Qualitätsbewusst'],
    approach: 'Daten & Fakten liefern, technische Details, Beweise'
  }
};

/**
 * Score-Level für Visualisierung
 */
export const SCORE_LEVELS = [
  { min: 0, max: 24, level: 1, label: 'Kalt', icon: '🧊' },
  { min: 25, max: 49, level: 2, label: 'Cool', icon: '❄️' },
  { min: 50, max: 74, level: 3, label: 'Warm', icon: '🌡️' },
  { min: 75, max: 100, level: 4, label: 'Hot', icon: '🔥' }
];

/**
 * BANT Slider Konfiguration
 */
export const BANT_SLIDER_STEPS = [
  { value: 0, label: '?' },
  { value: 5, label: '−' },
  { value: 10, label: '○' },
  { value: 15, label: '◐' },
  { value: 20, label: '●' },
  { value: 25, label: '★' }
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validiert BANT Scores
 * @param {unknown} data
 * @returns {BANTScores}
 */
export function validateBANTScores(data) {
  return BANTScoresSchema.parse(data);
}

/**
 * Validiert Lead Score Ergebnis
 * @param {unknown} data
 * @returns {LeadScoreResult}
 */
export function validateLeadScoreResult(data) {
  return LeadScoreResultSchema.parse(data);
}

/**
 * Validiert Lead Score Stats
 * @param {unknown} data
 * @returns {LeadScoreStats}
 */
export function validateLeadScoreStats(data) {
  return LeadScoreStatsSchema.parse(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default {
  // Schemas
  BANTScoresSchema,
  ScoreCategorySchema,
  DISGTypeSchema,
  ScoredLeadSchema,
  LeadScoreResultSchema,
  LeadScoreStatsSchema,
  BANTUpdateRequestSchema,
  RecommendedActionSchema,
  
  // Constants
  DISG_CONFIG,
  SCORE_LEVELS,
  BANT_SLIDER_STEPS,
  
  // Validators
  validateBANTScores,
  validateLeadScoreResult,
  validateLeadScoreStats
};

