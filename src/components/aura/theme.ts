/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - DESIGN SYSTEM                                                   ║
 * ║  Premium Dark Glassmorphism Theme                                          ║
 * ║  Inspired by: Linear, Bloomberg Terminal, Crypto Exchanges                 ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// DEEP SPACE BACKGROUNDS
// ═══════════════════════════════════════════════════════════════════════════
export const AURA_COLORS = {
  // Base Backgrounds (Deep Space)
  bg: {
    primary: '#020617',      // Slate 950 - fast schwarz, blau-stichig
    secondary: '#0f172a',    // Slate 900
    tertiary: '#1e293b',     // Slate 800
    elevated: '#334155',     // Slate 700
  },

  // Glass Surfaces
  glass: {
    surface: 'rgba(15, 23, 42, 0.6)',      // Dunkles durchsichtiges Slate
    surfaceHover: 'rgba(30, 41, 59, 0.7)', // Hover State
    border: 'rgba(255, 255, 255, 0.08)',   // Subtle Border
    borderHover: 'rgba(255, 255, 255, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.03)',
  },

  // Neon Accents
  neon: {
    cyan: '#22d3ee',
    cyanGlow: 'rgba(34, 211, 238, 0.3)',
    cyanSubtle: 'rgba(34, 211, 238, 0.1)',
    
    purple: '#a855f7',
    purpleGlow: 'rgba(168, 85, 247, 0.3)',
    purpleSubtle: 'rgba(168, 85, 247, 0.1)',
    
    amber: '#f59e0b',
    amberGlow: 'rgba(245, 158, 11, 0.3)',
    amberSubtle: 'rgba(245, 158, 11, 0.1)',
    
    green: '#10b981',
    greenGlow: 'rgba(16, 185, 129, 0.3)',
    greenSubtle: 'rgba(16, 185, 129, 0.1)',
    
    rose: '#f43f5e',
    roseGlow: 'rgba(244, 63, 94, 0.3)',
    roseSubtle: 'rgba(244, 63, 94, 0.1)',
    
    blue: '#3b82f6',
    blueGlow: 'rgba(59, 130, 246, 0.3)',
    blueSubtle: 'rgba(59, 130, 246, 0.1)',
  },

  // Text
  text: {
    primary: '#f8fafc',      // Slate 50 - Headlines
    secondary: '#e2e8f0',    // Slate 200 - Body
    muted: '#94a3b8',        // Slate 400 - Captions
    subtle: '#64748b',       // Slate 500 - Disabled
  },

  // Surface Colors (für Cards, Modals, etc.)
  surface: {
    primary: '#1e293b',      // Slate 800 - Haupt-Surface
    secondary: '#334155',    // Slate 700 - Sekundär-Surface
    tertiary: '#475569',     // Slate 600 - Tertiär-Surface
    elevated: '#64748b',     // Slate 500 - Erhöhte Surfaces
  },

  // Accent Colors (für Buttons, Highlights, etc.)
  accent: {
    primary: '#3b82f6',      // Blue 500 - Haupt-Accent
    secondary: '#8b5cf6',    // Purple 500 - Sekundär-Accent
    success: '#10b981',      // Green 500 - Success
    warning: '#f59e0b',      // Amber 500 - Warning
    error: '#ef4444',        // Red 500 - Error
  },

  // Border Colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',    // Haupt-Border
    secondary: 'rgba(255, 255, 255, 0.08)', // Sekundär-Border
    subtle: 'rgba(255, 255, 255, 0.05)',    // Subtiler Border
    accent: 'rgba(59, 130, 246, 0.3)',      // Accent-Border
  },

  // Status Colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SPACING & SIZING
// ═══════════════════════════════════════════════════════════════════════════
export const AURA_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const AURA_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// ═══════════════════════════════════════════════════════════════════════════
// SHADOWS & GLOWS
// ═══════════════════════════════════════════════════════════════════════════
export const AURA_SHADOWS = {
  // Size-based shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  // Special shadows
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },
  neonCyan: {
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  neonAmber: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  neonPurple: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════
export const AURA_FONTS = {
  headline: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: AURA_COLORS.text.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: AURA_COLORS.text.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: AURA_COLORS.text.secondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: AURA_COLORS.text.secondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: AURA_COLORS.text.muted,
  },
  mono: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: 'monospace',
    color: AURA_COLORS.text.muted,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GRADIENT PRESETS (für LinearGradient)
// ═══════════════════════════════════════════════════════════════════════════
export const AURA_GRADIENTS = {
  // Background Ambient Blobs
  cyanBlob: ['rgba(34, 211, 238, 0.15)', 'transparent'],
  purpleBlob: ['rgba(168, 85, 247, 0.15)', 'transparent'],
  amberBlob: ['rgba(245, 158, 11, 0.12)', 'transparent'],
  
  // Card Accents
  cyanAccent: ['rgba(34, 211, 238, 0.2)', 'rgba(34, 211, 238, 0.05)'],
  purpleAccent: ['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.05)'],
  amberAccent: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)'],
  greenAccent: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)'],
  
  // Surface Gradients
  glassSurface: ['rgba(15, 23, 42, 0.8)', 'rgba(15, 23, 42, 0.6)'],
  darkFade: ['#020617', '#0f172a'],
  
  // Autopilot Special
  autopilot: ['rgba(245, 158, 11, 0.15)', 'rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.95)'],
};

export default {
  colors: AURA_COLORS,
  spacing: AURA_SPACING,
  radius: AURA_RADIUS,
  shadows: AURA_SHADOWS,
  fonts: AURA_FONTS,
  gradients: AURA_GRADIENTS,
};

