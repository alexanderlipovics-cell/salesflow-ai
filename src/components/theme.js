/**
 * Design System Theme
 * ===================
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
  
  // Background Colors (Tailwind Slate)
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
// SHADOWS (für CSS/Tailwind)
// ═══════════════════════════════════════════════════════════════════════════════

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
    fontSize: '32px',
    fontWeight: 'bold',
    lineHeight: '40px',
  },
  h2: {
    fontSize: '24px',
    fontWeight: 'bold',
    lineHeight: '32px',
  },
  h3: {
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '28px',
  },
  h4: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '24px',
  },
  
  // Body Text
  body: {
    fontSize: '16px',
    fontWeight: 'normal',
    lineHeight: '24px',
  },
  bodySmall: {
    fontSize: '14px',
    fontWeight: 'normal',
    lineHeight: '20px',
  },
  
  // Labels & Captions
  label: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '20px',
  },
  caption: {
    fontSize: '12px',
    fontWeight: 'normal',
    lineHeight: '16px',
  },
  
  // Buttons
  button: {
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '24px',
  },
  buttonSmall: {
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '20px',
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
