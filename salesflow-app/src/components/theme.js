/**
 * Sales Flow AI - Design System Theme
 * =====================================
 * Zentrale Theme-Konstanten für konsistentes Design
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // Primary Brand Colors
  primary: '#3b82f6',      // Blue
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  
  // Secondary Colors
  secondary: '#8b5cf6',    // Purple
  secondaryLight: '#a78bfa',
  secondaryDark: '#7c3aed',
  
  // Accent Colors
  accent: '#06b6d4',       // Cyan
  accentLight: '#22d3ee',
  lime: '#a3e635',         // Lime for CTAs
  
  // Status Colors
  success: '#10b981',
  successLight: '#34d399',
  successBg: '#d1fae5',
  
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningBg: '#fef3c7',
  
  error: '#ef4444',
  errorLight: '#f87171',
  errorBg: '#fee2e2',
  
  info: '#3b82f6',
  infoLight: '#60a5fa',
  infoBg: '#dbeafe',
  
  // Priority Colors
  priorityHigh: '#ef4444',
  priorityHighBg: '#fee2e2',
  priorityMedium: '#f59e0b',
  priorityMediumBg: '#fef3c7',
  priorityLow: '#64748b',
  priorityLowBg: '#f1f5f9',
  priorityUrgent: '#dc2626',
  priorityUrgentBg: '#fecaca',
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  
  // Background Colors
  background: '#f8fafc',
  backgroundDark: '#0f172a',
  card: '#ffffff',
  cardDark: '#1e293b',
  
  // Text Colors
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  textLight: '#cbd5e1',
  textWhite: '#ffffff',
  
  // Border Colors
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#334155',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════════════════════════

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING
// ═══════════════════════════════════════════════════════════════════════════════

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  
  // Body Text
  body: {
    fontSize: 16,
    fontWeight: 'normal',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 20,
  },
  
  // Labels & Captions
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal',
    lineHeight: 16,
  },
  
  // Buttons
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════════════════════════════════════

export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const STATUS_CONFIG = {
  new: { label: 'Neu', color: COLORS.info, bg: COLORS.infoBg, icon: '🆕' },
  contacted: { label: 'Kontaktiert', color: COLORS.primary, bg: COLORS.infoBg, icon: '📞' },
  qualified: { label: 'Qualifiziert', color: COLORS.success, bg: COLORS.successBg, icon: '✅' },
  meeting_scheduled: { label: 'Meeting', color: COLORS.secondary, bg: '#f3e8ff', icon: '📅' },
  proposal_sent: { label: 'Angebot', color: COLORS.warning, bg: COLORS.warningBg, icon: '📄' },
  negotiation: { label: 'Verhandlung', color: COLORS.accent, bg: '#cffafe', icon: '🤝' },
  won: { label: 'Gewonnen', color: COLORS.success, bg: COLORS.successBg, icon: '🎉' },
  lost: { label: 'Verloren', color: COLORS.error, bg: COLORS.errorBg, icon: '❌' },
  nurture: { label: 'Nurture', color: COLORS.textSecondary, bg: COLORS.borderLight, icon: '🌱' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const PRIORITY_CONFIG = {
  urgent: { 
    label: '🔥 Dringend', 
    color: COLORS.priorityUrgent, 
    bg: COLORS.priorityUrgentBg 
  },
  high: { 
    label: '🔴 Hoch', 
    color: COLORS.priorityHigh, 
    bg: COLORS.priorityHighBg 
  },
  medium: { 
    label: '🟡 Mittel', 
    color: COLORS.priorityMedium, 
    bg: COLORS.priorityMediumBg 
  },
  low: { 
    label: '🔵 Niedrig', 
    color: COLORS.priorityLow, 
    bg: COLORS.priorityLowBg 
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION TYPE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const ACTION_TYPE_CONFIG = {
  call: { label: 'Anrufen', icon: '📞', color: COLORS.success },
  email: { label: 'E-Mail', icon: '📧', color: COLORS.primary },
  meeting: { label: 'Meeting', icon: '🤝', color: COLORS.secondary },
  message: { label: 'Nachricht', icon: '💬', color: COLORS.accent },
  follow_up: { label: 'Follow-up', icon: '📋', color: COLORS.warning },
  task: { label: 'Aufgabe', icon: '✅', color: COLORS.textSecondary },
};

export default {
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  ACTION_TYPE_CONFIG,
};

