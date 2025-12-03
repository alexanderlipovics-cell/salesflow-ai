/**
 * 🧠 Sales Brain Types
 * Teach-UI & Rule Learning System
 */

// =============================================================================
// ENUMS
// =============================================================================

export type RuleScope = "user" | "team";

export type RuleStatus = "active" | "inactive" | "pending_review";

export type RulePriority = "low" | "medium" | "high" | "critical";

// =============================================================================
// OVERRIDE CONTEXT
// =============================================================================

/**
 * Kontext in dem der Override passierte
 */
export interface OverrideContext {
  /** Branche/Vertical z.B. "network_marketing", "real_estate" */
  verticalId?: string;
  /** Spezifisches Unternehmen z.B. "zinzino" */
  companyId?: string;
  /** Kanal: "whatsapp", "instagram_dm", "email", etc. */
  channel?: string;
  /** Anwendungsfall: "objection_too_expensive", "appointment_request", etc. */
  useCase?: string;
  /** Sprache: "de", "en" */
  language?: string;
  /** Lead-Status wenn relevant */
  leadStatus?: string;
  /** Deal-State wenn relevant */
  dealState?: string;
  /** Sentiment des Leads */
  leadSentiment?: "positive" | "neutral" | "negative";
}

// =============================================================================
// OVERRIDE EVENT
// =============================================================================

/**
 * Das Event wenn ein User den KI-Vorschlag überschreibt
 */
export interface OverrideEvent {
  /** ID des ursprünglichen Vorschlags (für Tracking) */
  suggestionId?: string | null;
  /** Original-Text vom KI-Vorschlag */
  originalText: string;
  /** Finaler Text den der User gesendet hat */
  finalText: string;
  /** Kontext des Overrides */
  context: OverrideContext;
  /** Ähnlichkeits-Score 0..1 (0 = komplett anders, 1 = identisch) */
  similarityScore: number;
  /** Wurde der Text komplett ersetzt oder nur editiert? */
  overrideType?: "full_replace" | "edit" | "append" | "prepend";
}

// =============================================================================
// CREATE RULE PAYLOAD
// =============================================================================

/**
 * Payload um eine neue Regel zu erstellen
 */
export interface CreateRulePayload {
  /** Scope: nur für User oder fürs ganze Team */
  scope: RuleScope;
  /** Das Override-Event mit allen Details */
  override: OverrideEvent;
  /** Optional: Kommentar/Tag vom User */
  note?: string;
  /** Auto-erkannter Use-Case Tag */
  autoTag?: string;
}

// =============================================================================
// SALES BRAIN RULE (Response)
// =============================================================================

/**
 * Eine gespeicherte Sales Brain Regel
 */
export interface SalesBrainRule {
  id: string;
  /** User-Owner (wenn scope = "user") */
  userId?: string;
  /** Team-Owner (wenn scope = "team") */
  teamId?: string;
  /** Scope der Regel */
  scope: RuleScope;
  /** Kontext-Filter */
  verticalId?: string;
  companyId?: string;
  channel?: string;
  useCase?: string;
  language: string;
  /** Original KI-Vorschlag */
  originalText: string;
  /** User's bevorzugte Version */
  preferredText: string;
  /** Ähnlichkeits-Score beim Erstellen */
  similarityScore: number;
  /** User-Notiz/Tag */
  note?: string;
  /** Status */
  status: RuleStatus;
  /** Priorität */
  priority: RulePriority;
  /** Wie oft wurde diese Regel angewendet */
  applyCount: number;
  /** Wie oft wurde die Regel vom User akzeptiert vs. überschrieben */
  acceptRate: number;
  /** Erstellt */
  createdAt: string;
  /** Zuletzt angewendet */
  lastAppliedAt?: string;
}

// =============================================================================
// SIMILARITY CONFIG
// =============================================================================

/**
 * Konfiguration für Similarity-Detection
 */
export interface SimilarityConfig {
  /** Threshold unter dem ein Override erkannt wird (default: 0.7) */
  overrideThreshold: number;
  /** Minimale Längen-Differenz für Override-Erkennung */
  minLengthDiff: number;
  /** Ob Whitespace ignoriert werden soll */
  ignoreWhitespace: boolean;
  /** Ob Case ignoriert werden soll */
  ignoreCase: boolean;
}

export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  overrideThreshold: 0.7,
  minLengthDiff: 40,
  ignoreWhitespace: true,
  ignoreCase: false,
};

// =============================================================================
// TEACH UI STATE
// =============================================================================

/**
 * State für das Teach-UI Bottom Sheet
 */
export interface TeachUIState {
  visible: boolean;
  overrideEvent: OverrideEvent | null;
  isSubmitting: boolean;
  error: string | null;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface CreateRuleResponse {
  id: string;
  message: string;
  templateCreated?: boolean;
  templateId?: string;
}

export interface GetRulesResponse {
  rules: SalesBrainRule[];
  total: number;
  page: number;
  pageSize: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Berechnet einfachen Levenshtein-basierten Similarity Score
 */
export function computeSimpleSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Bestimmt den Override-Typ basierend auf Original und Final
 */
export function detectOverrideType(
  original: string,
  final: string
): OverrideEvent["overrideType"] {
  if (!original || !final) return "full_replace";

  const originalLower = original.toLowerCase().trim();
  const finalLower = final.toLowerCase().trim();

  if (finalLower.startsWith(originalLower)) return "append";
  if (finalLower.endsWith(originalLower)) return "prepend";
  if (originalLower.includes(finalLower) || finalLower.includes(originalLower))
    return "edit";

  return "full_replace";
}

/**
 * Prüft ob ein Override signifikant genug ist für Teach-UI
 */
export function isSignificantOverride(
  original: string,
  final: string,
  config: SimilarityConfig = DEFAULT_SIMILARITY_CONFIG
): boolean {
  let a = original;
  let b = final;

  if (config.ignoreWhitespace) {
    a = a.replace(/\s+/g, " ").trim();
    b = b.replace(/\s+/g, " ").trim();
  }

  if (config.ignoreCase) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  const similarity = computeSimpleSimilarity(a, b);
  const lengthDiff = Math.abs(a.length - b.length);

  return similarity < config.overrideThreshold || lengthDiff > config.minLengthDiff;
}

/**
 * Generiert Use-Case Tag aus Context
 */
export function generateUseCaseTag(context: OverrideContext): string | undefined {
  const parts: string[] = [];

  if (context.useCase) {
    parts.push(context.useCase);
  }
  if (context.channel) {
    parts.push(context.channel);
  }
  if (context.leadStatus) {
    parts.push(context.leadStatus);
  }

  return parts.length > 0 ? parts.join("_") : undefined;
}

