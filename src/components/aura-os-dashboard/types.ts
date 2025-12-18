/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Type Definitions                                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

export interface ModuleCardData {
  id: string;
  title: string;
  label: string;
  metric: string;
  icon: 'autopilot' | 'chat' | 'sequence';
}

export interface StatItem {
  label: string;
  value: string;
}

export interface FeatureCardData {
  id: string;
  title: string;
  metric: string;
  trend?: string;
  type: 'outreach' | 'finance';
}

export interface NavItem {
  id: string;
  icon: 'home' | 'dashboard' | 'autopilot' | 'chat' | 'user';
  label: string;
  active?: boolean;
}

export interface ChiefAgent {
  id: string;
  name: string;
}

export interface ChiefMetric {
  label: string;
  value: string;
}

