/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PROMPTS INDEX                                             ║
 * ║  Zentrale Exports für alle AI Prompts                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// CHIEF - Der persönliche AI Sales Coach
export {
  CHIEF_SYSTEM_PROMPT,
  CHIEF_CONTEXT_TEMPLATE,
  CHIEF_EXAMPLE_RESPONSES,
  buildChiefSystemMessages,
  formatChiefContext,
  extractActionTags,
  stripActionTags,
  shouldIncludeExamples,
} from './chief-prompt';

// DISG Analyzer
export {
  DISC_ANALYZER_SYSTEM_PROMPT,
  buildDiscAnalyzerPrompt,
  quickDiscEstimate,
  DISC_ANALYSIS_EXAMPLES
} from './disc-analyzer';

// Follow-up Generator
export {
  FOLLOWUP_GENERATOR_SYSTEM_PROMPT,
  buildFollowUpPrompt,
  getQuickFollowUpTemplate,
  adjustMessageForChannel,
  suggestNextContactTiming
} from './followup-generator';

// Vertical-Specific Objection Prompts
export {
  VERTICAL_OBJECTION_PROMPTS,
  getObjectionSystemPrompt,
  getExampleObjections,
  buildObjectionPrompt
} from './objection-vertical-prompts';

// Brain Autonomy System
export {
  AUTONOMY_LEVELS,
  BRAIN_DECISION_ENGINE_PROMPT,
  KNOWLEDGE_BASE_PROMPT,
  canActAutonomously,
  buildDecisionContext,
  processDecision
} from './brain-autonomy';

