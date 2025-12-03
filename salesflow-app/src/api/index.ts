/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - API INDEX                                                       ║
 * ║  Zentrale Exports für alle API-Module                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// Analytics
export { analyticsApi } from './analytics';
export type {
  AnalyticsDashboard,
  TemplatePerformance,
  ChannelStats,
  CategoryStats,
  TimeSeriesData,
  PerformanceSummary,
  PulseFunnelByIntent,
} from './analytics';

// Autopilot
export { autopilotApi } from './autopilot';
export type {
  AutopilotSettings,
  AutopilotDraft,
  ActionLog,
  MorningBriefing,
  EveningSummary,
  AutopilotStats,
  LeadOverride,
  ChannelType,
  DraftStatus,
  ActionType as AutopilotActionType,
  IntentType,
  AutonomyLevel,
} from './autopilot';

// Chat Import
export { default as chatImportApi } from './chatImport';

// Chief V3
export { onboardingApi, ghostBusterApi, teamLeaderApi } from './chiefV3';
export type {
  OnboardingProgress,
  OnboardingTask,
  Ghost,
  GhostDetail,
  GhostReport,
  GhostType,
  ReEngagementStrategy,
  ReEngageResponse,
  TeamMember,
  TeamDashboard,
  TeamAlert,
  MeetingAgenda,
} from './chiefV3';

// Daily Flow
export { dailyFlowApi } from './dailyFlow';
export type {
  DailyAction,
  DailyFlowStatus,
  DailyFlowSettings,
  ActionCompletion,
  ActionType as DailyFlowActionType,
  ActionStatus,
  Priority,
} from './dailyFlow';

// Finance
export { financeApi } from './finance';
export type {
  FinanceOverview,
  CommissionEntry,
  MonthlyEarnings,
  RankProgress,
  TeamEarnings,
  GoalProgress,
} from './finance';

// Gamification
export { gamificationApi } from './gamification';
export type {
  Streak,
  Achievement,
  NewAchievement,
  GamificationSummary,
  StreakStatus,
} from './gamification';

// Knowledge
export { knowledgeApi } from './knowledge';
export type {
  KnowledgeItem,
  KnowledgeSearchResult,
  KnowledgeContext,
  KnowledgeContextItem,
  Company,
  KnowledgeHealth,
  KnowledgeDomain,
  KnowledgeType,
} from './knowledge';

// Learning
export { learningApi } from './learning';
export type {
  LearningEvent,
  TemplateStats,
  ChannelStats as LearningChannelStats,
  TopTemplate,
  LearningEventType,
} from './learning';

// Live Assist
export { liveAssistApi } from './liveAssist';

// Outreach
export { outreachApi } from './outreach';
export type {
  OutreachMessage,
  OutreachStats,
  PendingCheckIn,
  OutreachStatus,
  Platform,
  MessageType,
} from './outreach';

// Phoenix
export { default as phoenixApi } from './phoenix';

// Pulse Tracker
export { default as pulseTrackerApi } from './pulseTracker';

// Sales Brain
export { default as salesBrainApi } from './salesBrain';

// Sequencer
export { default as sequencerApi } from './sequencer';

// Storybook
export { storybookApi } from './storybook';
export type {
  Story,
  Product,
  Guardrail,
  ComplianceResult,
  ComplianceViolation,
  CompanyContext,
  ImportStatus,
  ImportResult,
  StoryType,
  Audience,
  GuardrailSeverity,
} from './storybook';

// Teach
export { default as teachApi } from './teach';

// Voice
export { voiceApi } from './voice';
export type {
  TranscriptionResult,
  SpeechSynthesisResult,
  VoiceNote,
  VoiceCommand,
} from './voice';

// Billing
export { billingApi } from './billing';
export type {
  Subscription,
  PlanLimits,
  UsageData,
  CheckoutSession,
} from './billing';

