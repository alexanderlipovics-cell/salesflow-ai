/**
 * Theme Configuration für CloserClub Mobile
 * Dark Glassmorphism Design inspired by AURA OS
 */

export const COLORS = {
  // Primary Colors
  primary: '#06b6d4', // Cyan
  primaryDark: '#0891b2',
  primaryLight: '#22d3ee',
  
  // Background
  background: '#0f172a', // Slate-900
  backgroundLight: '#1e293b', // Slate-800
  surface: '#1e293b',
  surfaceLight: '#334155',
  
  // Glass Effects
  glass: 'rgba(30, 41, 59, 0.7)',
  glassLight: 'rgba(51, 65, 85, 0.5)',
  
  // Text
  text: '#f8fafc', // Slate-50
  textSecondary: '#cbd5e1', // Slate-300
  textMuted: '#64748b', // Slate-500
  
  // Accent Colors
  accent: '#f97316', // Orange
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  error: '#ef4444', // Red
  info: '#3b82f6', // Blue
  
  // Status Colors
  hot: '#ef4444',
  warm: '#f59e0b',
  cold: '#3b82f6',
  
  // Borders
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  glow: {
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

