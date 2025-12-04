/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - Tailwind CSS Configuration                                      ║
 * ║  Sci-Fi Luxury Dark Theme Extensions                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './App.{js,jsx,ts,tsx}',
    './src/web/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM COLORS - AURA OS PALETTE
      // ═══════════════════════════════════════════════════════════════════
      colors: {
        aura: {
          // Deep Space Backgrounds
          'bg-primary': '#020617',
          'bg-secondary': '#0f172a',
          'bg-tertiary': '#1e293b',
          
          // Neon Accents
          'cyan': '#22d3ee',
          'cyan-glow': 'rgba(34, 211, 238, 0.3)',
          'violet': '#a855f7',
          'violet-glow': 'rgba(168, 85, 247, 0.3)',
          'amber': '#f59e0b',
          'amber-glow': 'rgba(245, 158, 11, 0.3)',
          
          // Glass Surfaces
          'glass': 'rgba(15, 23, 42, 0.6)',
          'glass-border': 'rgba(255, 255, 255, 0.08)',
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM ANIMATIONS
      // ═══════════════════════════════════════════════════════════════════
      animation: {
        // Pulsing "Live" Dot
        'aura-pulse': 'auraPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // Glow Breathe Effect
        'aura-glow': 'auraGlow 3s ease-in-out infinite',
        
        // Orbit Rotation
        'aura-orbit': 'auraOrbit 12s linear infinite',
        
        // Fade In Up
        'aura-fade-in-up': 'auraFadeInUp 0.6s ease-out forwards',
        
        // Scale Pulse
        'aura-scale-pulse': 'auraScalePulse 2s ease-in-out infinite',
      },
      
      keyframes: {
        auraPulse: {
          '0%, 100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': { 
            opacity: '0.5',
            transform: 'scale(0.9)',
          },
        },
        auraGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
            opacity: '0.8',
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(34, 211, 238, 0.6)',
            opacity: '1',
          },
        },
        auraOrbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        auraFadeInUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        auraScalePulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM BACKDROP BLUR
      // ═══════════════════════════════════════════════════════════════════
      backdropBlur: {
        '3xl': '64px',
        '4xl': '96px',
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM BOX SHADOWS - NEON GLOWS
      // ═══════════════════════════════════════════════════════════════════
      boxShadow: {
        'aura-cyan': '0 0 35px rgba(34, 211, 238, 0.25)',
        'aura-cyan-lg': '0 0 60px rgba(34, 211, 238, 0.35)',
        'aura-violet': '0 0 35px rgba(168, 85, 247, 0.25)',
        'aura-violet-lg': '0 0 60px rgba(168, 85, 247, 0.35)',
        'aura-amber': '0 0 35px rgba(245, 158, 11, 0.25)',
        'aura-amber-lg': '0 0 60px rgba(245, 158, 11, 0.35)',
        'aura-glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'aura-inner': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM FONT FAMILIES
      // ═══════════════════════════════════════════════════════════════════
      fontFamily: {
        'aura': ['SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
        'aura-mono': ['SF Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM SPACING
      // ═══════════════════════════════════════════════════════════════════
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ═══════════════════════════════════════════════════════════════════
      // CUSTOM BORDER RADIUS
      // ═══════════════════════════════════════════════════════════════════
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};

