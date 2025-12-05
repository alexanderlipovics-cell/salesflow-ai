/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - HOOKS INDEX                                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// Success Patterns Hooks
export { 
  useSuccessPatterns,
  useMentors,
  usePatternSummary 
} from './useSuccessPatterns';

// Objection Brain Hooks
export {
  useObjectionBrain,
  useObjectionCategory,
  useQuickSearch
} from './useObjectionBrain';

// Lead Scoring Hooks
export {
  useLeadScoring,
  useSingleLeadScore,
  useBANTForm
} from './useLeadScoring';

// Proposal Reminder Hooks
export {
  useProposalReminders,
  useContactReminderStatus
} from './useProposalReminders';

// Daily Flow Hooks
export {
  useDailyFlow,
  useDailyFlowConfig,
  useDailyActions
} from './useDailyFlow';

// Daily Flow Status Hooks (Activity Tracking)
export {
  useDailyFlowStatus,
  useActivityLog
} from './useDailyFlowStatus';

// CHIEF AI Integration Hooks
export {
  useChiefDailyFlowContext,
  formatDailyFlowForChiefPrompt,
  getQuickSuggestions
} from './useChiefDailyFlowContext';

// CHIEF Chat Hook
export { useChiefChat } from './useChiefChat';

// Finance Hooks
export { default as useFinance } from './useFinance';

// Goal Engine Hooks (Compensation Plans)
export {
  useGoalEngine,
  useActiveGoal,
  useCompensationPlans
} from './useGoalEngine';

// Default Exports
export { default as useSuccessPatterns } from './useSuccessPatterns';
export { default as useObjectionBrain } from './useObjectionBrain';
export { default as useLeadScoring } from './useLeadScoring';
export { default as useProposalReminders } from './useProposalReminders';
export { default as useDailyFlow } from './useDailyFlow';
export { default as useDailyFlowStatus } from './useDailyFlowStatus';
export { default as useChiefDailyFlowContext } from './useChiefDailyFlowContext';
export { default as useChiefChat } from './useChiefChat';
export { default as useGoalEngine } from './useGoalEngine';

// Vertical Hooks
export {
  useVertical,
  useVerticalSelector,
  VERTICALS
} from './useVertical';
export { default as useVertical } from './useVertical';

// Sales Brain Hooks (Self-Learning Rules)
export { useSalesBrain } from './useSalesBrain';
export { default as useSalesBrain } from './useSalesBrain';

// Teach Detection Hook (v2)
export { useTeachDetection } from './useTeachDetection';
export { default as useTeachDetection } from './useTeachDetection';

// ═══════════════════════════════════════════════════════════════════════════
// CHIEF V3.0 HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Onboarding Hook
export { useOnboarding } from './useOnboarding';

// Ghost Buster Hook
export { useGhostBuster } from './useGhostBuster';

// Team Leader Hook
export { useTeamLeader } from './useTeamLeader';

// ═══════════════════════════════════════════════════════════════════════════
// CHAT IMPORT HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Contact Plans Hook (aus Chat-Import System)
export { useContactPlans, useTodaysContactPlans } from './useContactPlans';
export { default as useContactPlans } from './useContactPlans';

// Follow-ups Hook
export { useFollowUps } from './useFollowUps';
export { default as useFollowUps } from './useFollowUps';

// ═══════════════════════════════════════════════════════════════════════════
// NEW API-CONNECTED HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Analytics Hook
export { useAnalytics } from './useAnalytics';
export { default as useAnalytics } from './useAnalytics';

// Autopilot Hook
export { useAutopilot } from './useAutopilot';
export { default as useAutopilot } from './useAutopilot';

// Gamification Hook
export { useGamification } from './useGamification';
export { default as useGamification } from './useGamification';

// Knowledge Hook
export { useKnowledge } from './useKnowledge';
export { default as useKnowledge } from './useKnowledge';

// Learning Hook
export { useLearning } from './useLearning';
export { default as useLearning } from './useLearning';

// Storybook Hook
export { useStorybook } from './useStorybook';
export { default as useStorybook } from './useStorybook';

// Finance API Hook
export { useFinanceApi } from './useFinanceApi';
export { default as useFinanceApi } from './useFinanceApi';

// Outreach Hook
export { useOutreach } from './useOutreach';
export { default as useOutreach } from './useOutreach';

// Daily Flow API Hook
export { useDailyFlowApi } from './useDailyFlowApi';
export { default as useDailyFlowApi } from './useDailyFlowApi';

// Voice Hook
export { useVoice } from './useVoice';
export { default as useVoice } from './useVoice';

// Live Assist Hook
export { useLiveAssist } from './useLiveAssist';
export { default as useLiveAssist } from './useLiveAssist';

// Teach Hook
export { useTeach } from './useTeach';
export { default as useTeach } from './useTeach';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// API Hooks (with caching, retry, error handling)
export { 
  useApi, 
  useMutation, 
  useGet, 
  usePost, 
  usePut, 
  usePatch, 
  useDelete 
} from './useApi';
export { default as useApi } from './useApi';

// ═══════════════════════════════════════════════════════════════════════════
// BILLING HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// Billing Hook (Subscriptions, Usage, Payments)
export { useBilling } from './useBilling';
export { default as useBilling } from './useBilling';