/**
 * SalesFlow AI - Feature Flags
 * ============================
 * Schalte Features ein/aus ohne Code zu löschen
 * 
 * Usage:
 * import { isFeatureEnabled, FEATURES } from '@/config/feature_flags';
 * 
 * if (isFeatureEnabled('compliance_sentinel')) {
 *   // Show feature
 * }
 */

export type FeatureFlag = 
  // PHASE 1 - CORE MVP (ACTIVE)
  | 'mentor_chat'
  | 'contacts'
  | 'mlm_import'
  | 'dmo_tracker'
  | 'follow_ups'
  | 'team_basic'
  | 'playbooks'
  | 'settings'
  
  // PHASE 2 - DIFFERENZIERUNG (HIDDEN - Ready to activate)
  | 'compliance_sentinel'
  | 'predictive_alerts'
  | 'smart_follow_up'
  | 'webhooks_api'
  | 'mentor_memory'
  
  // PHASE 3 - PREMIUM (FUTURE)
  | 'voice_outreach'
  | 'video_outreach'
  | 'multi_region'
  | 'white_label'
  
  // DEACTIVATED (Code exists, UI hidden)
  | 'phoenix'
  | 'storybook'
  | 'tax_coach'
  | 'gamification'
  | 'sequencer'
  | 'live_assist'
  | 'brain_dashboard'
  | 'aura_os'
  | 'reactivation_agent';

interface FeatureConfig {
  enabled: boolean;
  phase: 1 | 2 | 3 | 'disabled';
  description: string;
  requiresSubscription?: 'free' | 'pro' | 'enterprise';
}

export const FEATURES: Record<FeatureFlag, FeatureConfig> = {
  // =========================================================================
  // PHASE 1 - CORE MVP (ACTIVE NOW)
  // =========================================================================
  mentor_chat: {
    enabled: true,
    phase: 1,
    description: 'MENTOR AI Chat - Persönlicher Sales Coach',
    requiresSubscription: 'free',
  },
  contacts: {
    enabled: true,
    phase: 1,
    description: 'Kontakte & Leads verwalten',
    requiresSubscription: 'free',
  },
  mlm_import: {
    enabled: true,
    phase: 1,
    description: 'MLM CSV Import (Zinzino, PM, doTERRA, Herbalife)',
    requiresSubscription: 'free',
  },
  dmo_tracker: {
    enabled: true,
    phase: 1,
    description: 'Daily Method of Operation Tracker',
    requiresSubscription: 'free',
  },
  follow_ups: {
    enabled: true,
    phase: 1,
    description: 'Follow-Up Reminders',
    requiresSubscription: 'free',
  },
  team_basic: {
    enabled: true,
    phase: 1,
    description: 'Team Dashboard (Basic)',
    requiresSubscription: 'free',
  },
  playbooks: {
    enabled: true,
    phase: 1,
    description: 'Sales Playbooks & Scripts',
    requiresSubscription: 'free',
  },
  settings: {
    enabled: true,
    phase: 1,
    description: 'App Settings',
    requiresSubscription: 'free',
  },

  // =========================================================================
  // PHASE 2 - DIFFERENZIERUNG (Ready, aber versteckt)
  // =========================================================================
  compliance_sentinel: {
    enabled: false, // ← FLIP TO TRUE WHEN READY
    phase: 2,
    description: 'HWG/DSGVO Compliance Check für ausgehende Nachrichten',
    requiresSubscription: 'pro',
  },
  predictive_alerts: {
    enabled: false,
    phase: 2,
    description: 'Vorhersage: Rang-Verlust, Churn-Risiko',
    requiresSubscription: 'pro',
  },
  smart_follow_up: {
    enabled: false,
    phase: 2,
    description: 'AI-generierte Follow-Up Nachrichten',
    requiresSubscription: 'pro',
  },
  webhooks_api: {
    enabled: false,
    phase: 2,
    description: 'Webhooks für externe Integrationen',
    requiresSubscription: 'pro',
  },
  mentor_memory: {
    enabled: false,
    phase: 2,
    description: 'MENTOR lernt aus deinen Deals',
    requiresSubscription: 'pro',
  },

  // =========================================================================
  // PHASE 3 - PREMIUM (Future)
  // =========================================================================
  voice_outreach: {
    enabled: false,
    phase: 3,
    description: 'AI Voice Calls (Vapi.ai)',
    requiresSubscription: 'enterprise',
  },
  video_outreach: {
    enabled: false,
    phase: 3,
    description: 'Personalisierte Video-Nachrichten (HeyGen)',
    requiresSubscription: 'enterprise',
  },
  multi_region: {
    enabled: false,
    phase: 3,
    description: 'Multi-Region Deployment',
    requiresSubscription: 'enterprise',
  },
  white_label: {
    enabled: false,
    phase: 3,
    description: 'White-Label für Teams',
    requiresSubscription: 'enterprise',
  },

  // =========================================================================
  // DEACTIVATED (Code exists, not shown)
  // =========================================================================
  phoenix: {
    enabled: false,
    phase: 'disabled',
    description: 'Phoenix Deal Recovery',
  },
  storybook: {
    enabled: false,
    phase: 'disabled',
    description: 'Brand Story Management',
  },
  tax_coach: {
    enabled: false,
    phase: 'disabled',
    description: 'Tax Coaching',
  },
  gamification: {
    enabled: false,
    phase: 'disabled',
    description: 'Points, Badges, Leaderboard',
  },
  sequencer: {
    enabled: false,
    phase: 'disabled',
    description: 'Email Sequencer',
  },
  live_assist: {
    enabled: false,
    phase: 'disabled',
    description: 'Live Call Coaching',
  },
  brain_dashboard: {
    enabled: false,
    phase: 'disabled',
    description: 'Autonomous AI Agents Dashboard',
  },
  aura_os: {
    enabled: false,
    phase: 'disabled',
    description: 'AURA OS Premium Theme',
  },
  reactivation_agent: {
    enabled: false,
    phase: 'disabled',
    description: 'LangGraph Reactivation Agent',
  },
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURES[feature]?.enabled ?? false;
}

/**
 * Check if user's subscription allows feature
 */
export function canAccessFeature(
  feature: FeatureFlag, 
  userSubscription: 'free' | 'pro' | 'enterprise'
): boolean {
  const config = FEATURES[feature];
  if (!config?.enabled) return false;
  
  const hierarchy = { free: 0, pro: 1, enterprise: 2 };
  const required = config.requiresSubscription || 'free';
  
  return hierarchy[userSubscription] >= hierarchy[required];
}

/**
 * Get all enabled features for a phase
 */
export function getFeaturesByPhase(phase: 1 | 2 | 3 | 'disabled'): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[])
    .filter(key => FEATURES[key].phase === phase);
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[])
    .filter(key => FEATURES[key].enabled);
}

/**
 * Feature gate component helper
 */
export function withFeatureGate<T>(
  feature: FeatureFlag,
  component: T,
  fallback: T | null = null
): T | null {
  return isFeatureEnabled(feature) ? component : fallback;
}

// =========================================================================
// ADMIN: Bulk operations (for testing)
// =========================================================================

export function enablePhase(phase: 1 | 2 | 3): void {
  (Object.keys(FEATURES) as FeatureFlag[]).forEach(key => {
    if (FEATURES[key].phase === phase) {
      FEATURES[key].enabled = true;
    }
  });
}

export function disableAllExceptPhase1(): void {
  (Object.keys(FEATURES) as FeatureFlag[]).forEach(key => {
    FEATURES[key].enabled = FEATURES[key].phase === 1;
  });
}

