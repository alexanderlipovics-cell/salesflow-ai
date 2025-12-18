/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Component Exports                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// Main Dashboard
export { AuraOsDashboard } from './AuraOsDashboard';
export { default } from './AuraOsDashboard';

// Sub-Components
export { HeaderBar } from './HeaderBar';
export { ModuleCard } from './ModuleCard';
export { StatsBar } from './StatsBar';
export { ChiefAutopilotCard } from './ChiefAutopilotCard';
export { FeatureCard } from './FeatureCard';
export { BottomDock } from './BottomDock';
export { AuraOsLogo } from './AuraOsLogo';

// Types
export type {
  ModuleCardData,
  StatItem,
  FeatureCardData,
  NavItem,
  ChiefAgent,
  ChiefMetric,
} from './types';

