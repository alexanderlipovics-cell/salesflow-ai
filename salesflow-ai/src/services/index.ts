/**
 * Services Index
 * 
 * Zentrale Exports aller API Services für SalesFlow AI.
 * 
 * Features:
 * - Follow-Up Engine (GPT-5.1)
 * - Lead Hunter (Claude)
 * - Screenshot Import (Gemini)
 * - Team Templates (GPT-5.1)
 * - Chat Import (Claude)
 */

// ============================================
// FOLLOW-UP ENGINE (GPT-5.1)
// ============================================
export {
  default as followUpService,
  getTodayFollowUps,
  getNextFollowUp,
  generateFollowUpMessage,
  snoozeFollowUp,
  batchGenerateFollowUps,
  followUpQueryKeys,
  type FollowUpSuggestion,
  type AIMessage,
  type TodayFollowUpResponse,
  type SnoozeResponse,
} from './followUpService';

// ============================================
// LEAD HUNTER (Claude)
// ============================================
export {
  default as leadHunterService,
  getDailySuggestions,
  huntLeads,
  findLookalikes,
  getReactivationCandidates,
  getDailyQuota,
  convertToLead,
  getRecommendedHashtags,
  getMLMSignals,
  leadHunterQueryKeys,
  type HuntedLead,
  type HuntCriteria,
  type HuntResult,
  type DailyHuntQuota,
  type HuntRequest,
} from './leadHunterService';

// ============================================
// SCREENSHOT IMPORT (Gemini)
// ============================================
export {
  default as screenshotService,
  analyzeScreenshot,
  importScreenshot,
  getSupportedPlatforms,
  getScreenshotTips,
  screenshotQueryKeys,
  type LeadFromImage,
  type ScreenshotUploadResponse,
  type SupportedPlatform,
} from './screenshotService';

// ============================================
// TEAM TEMPLATES (GPT-5.1)
// ============================================
export {
  default as teamTemplateService,
  listTeamTemplates,
  createTeamTemplate,
  getTeamTemplate,
  updateTeamTemplate,
  cloneTeamTemplate,
  shareTeamTemplate,
  getSyncStatus,
  syncWithOriginal,
  teamTemplateQueryKeys,
  type TeamTemplate,
  type TeamTemplateListItem,
  type CloneTemplateResponse,
  type TeamTemplateSyncStatus,
  type CreateTeamTemplateRequest,
} from './teamTemplateService';

// ============================================
// CHAT IMPORT (Claude)
// ============================================
export {
  default as chatImportService,
  importChatPaste,
  chatImportQueryKeys,
  type ParsedLeadData,
  type ChatImportResult,
} from './chatImportService';

