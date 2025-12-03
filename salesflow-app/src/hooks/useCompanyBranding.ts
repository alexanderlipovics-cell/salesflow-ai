/**
 * useCompanyBranding - Hook für Company-spezifisches Branding
 * 
 * Lädt Branding-Konfiguration aus der Datenbank und wendet
 * Company-spezifische Styles auf UI-Komponenten an.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CompanyBranding {
  slug: string;
  name: string;
  tagline?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textLight: string;
  };
  gradients: {
    header: string[];
    button: string[];
  };
  chiefConfig: {
    greeting: string;
    emoji: string;
    personality: string;
    focusAreas: string[];
  };
  compliance: {
    level: 'strict' | 'normal' | 'relaxed';
    warnings: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREDEFINED BRANDINGS
// ═══════════════════════════════════════════════════════════════════════════

const COMPANY_BRANDINGS: Record<string, CompanyBranding> = {
  // ─────────────────────────────────────────────────────────────────────────
  // ZINZINO
  // ─────────────────────────────────────────────────────────────────────────
  zinzino: {
    slug: 'zinzino',
    name: 'Zinzino',
    tagline: 'Von Raten zu Wissen',
    colors: {
      primary: '#1E3A5F',      // Skandinavisch Dunkelblau
      secondary: '#E8B923',    // Zinzino Gold
      accent: '#3B82F6',       // Akzent Blau
      background: '#F8FAFC',   // Helles Grau
      text: '#1E293B',         // Dunkel
      textLight: '#64748B',    // Grau
    },
    gradients: {
      header: ['#1E3A5F', '#2C5282'],
      button: ['#E8B923', '#D69E2E'],
    },
    chiefConfig: {
      greeting: `Hej! 👋 Ich bin dein Zinzino Sales Coach.

🧪 **Test-basiert verkaufen** ist mein Spezialgebiet!

Ich helfe dir bei:
• BalanceTest erklären & Einwände behandeln
• Kunden durch den Test-Retest-Zyklus begleiten
• Compliant kommunizieren (keine Heilversprechen!)
• Business-Gespräche professionell führen

*"Von Raten zu Wissen"* – Was kann ich für dich tun?`,
      emoji: '🧬',
      personality: 'skandinavisch-sachlich',
      focusAreas: ['BalanceTest', 'Omega-3', 'Test-Retest', 'Health Protocol'],
    },
    compliance: {
      level: 'strict',
      warnings: [
        'Keine Heilversprechen',
        'Keine medizinische Beratung',
        'Keine Einkommensgarantien',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PM-INTERNATIONAL
  // ─────────────────────────────────────────────────────────────────────────
  'pm-international': {
    slug: 'pm-international',
    name: 'PM-International',
    tagline: 'FitLine - Nährstoffoptimierung',
    colors: {
      primary: '#1E40AF',      // PM Blau
      secondary: '#10B981',    // FitLine Grün
      accent: '#6366F1',       // Akzent
      background: '#F0FDF4',   // Leichtes Grün
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#1E40AF', '#3B82F6'],
      button: ['#10B981', '#059669'],
    },
    chiefConfig: {
      greeting: `Servus! 💪 Ich bin dein FitLine Sales Coach.

🏃 **Nährstoffoptimierung für Sportler & Alltag** ist mein Fokus!

Ich helfe dir bei:
• Activize & Basics+ erklären
• Sport-Testimonials nutzen
• NTC (Nährstoff-Transport-Konzept) vermitteln
• Team-Aufbau & Events

Was möchtest du besprechen?`,
      emoji: '💪',
      personality: 'sportlich-motivierend',
      focusAreas: ['Activize', 'NTC', 'Sport-Performance', 'Team-Events'],
    },
    compliance: {
      level: 'strict',
      warnings: [
        'Keine Leistungsversprechen',
        'Keine Doping-Aussagen',
        'Keine Heilversprechen',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LR HEALTH & BEAUTY
  // ─────────────────────────────────────────────────────────────────────────
  'lr-health': {
    slug: 'lr-health',
    name: 'LR Health & Beauty',
    tagline: 'Aloe Vera & Parfum Excellence',
    colors: {
      primary: '#059669',      // LR Grün
      secondary: '#F59E0B',    // Gold/Amber
      accent: '#8B5CF6',       // Parfum Violett
      background: '#ECFDF5',   // Mintgrün
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#059669', '#10B981'],
      button: ['#F59E0B', '#D97706'],
    },
    chiefConfig: {
      greeting: `Hallo! 🌿 Ich bin dein LR Sales Coach.

✨ **Aloe Vera & Lifestyle-Produkte** sind meine Expertise!

Ich helfe dir bei:
• Aloe Vera Drinking Gel erklären
• Parfum-Beratung & Duft-Typologie
• Körperpflege-Routinen empfehlen
• Kunden-Events planen

Wie kann ich dir helfen?`,
      emoji: '🌿',
      personality: 'lifestyle-orientiert',
      focusAreas: ['Aloe Vera', 'Parfum', 'Körperpflege', 'Lifestyle'],
    },
    compliance: {
      level: 'normal',
      warnings: [
        'Keine Heilversprechen',
        'Keine übertriebenen Wirkaussagen',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DOTERRA
  // ─────────────────────────────────────────────────────────────────────────
  doterra: {
    slug: 'doterra',
    name: 'dōTERRA',
    tagline: 'Essential Oils for Life',
    colors: {
      primary: '#7C3AED',      // doTERRA Violett
      secondary: '#059669',    // Natur Grün
      accent: '#F59E0B',       // Warm Amber
      background: '#FAF5FF',   // Lavendel-Hauch
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#7C3AED', '#9333EA'],
      button: ['#059669', '#047857'],
    },
    chiefConfig: {
      greeting: `Namaste! 🌸 Ich bin dein dōTERRA Sales Coach.

🌿 **Ätherische Öle & Wellness** sind mein Bereich!

Ich helfe dir bei:
• Öle-Empfehlungen je nach Bedürfnis
• Diffuser-Blends & Anwendungstipps
• Wellness-Beratungen strukturieren
• CPTG-Qualität erklären

Was duftet heute nach Erfolg?`,
      emoji: '🌸',
      personality: 'achtsam-naturverbunden',
      focusAreas: ['Ätherische Öle', 'Wellness', 'CPTG-Qualität', 'Aromatherapie'],
    },
    compliance: {
      level: 'strict',
      warnings: [
        'Keine therapeutischen Claims',
        'Keine Heilversprechen',
        'FDA-Disclaimer beachten',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AURA OS | B2B EDITION
  // ─────────────────────────────────────────────────────────────────────────
  'b2b_sales': {
    slug: 'b2b_sales',
    name: 'AURA OS',
    tagline: 'B2B Edition',
    colors: {
      primary: '#0F172A',
      secondary: '#3B82F6',
      accent: '#22d3ee',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#1E3A5F'],
      button: ['#3B82F6', '#2563EB'],
    },
    chiefConfig: {
      greeting: `Hallo! 👋 Ich bin CHIEF, dein AURA OS Agent.

💼 **B2B Edition** – Optimiert für Enterprise Sales!

Ich helfe dir bei:
• ROI-Kalkulationen für Kunden
• Value-Selling Strategien
• Enterprise-Deal Orchestrierung
• Stakeholder-Mapping

Welches Projekt besprechen wir?`,
      emoji: '💼',
      personality: 'strategisch-analytisch',
      focusAreas: ['ROI-Rechner', 'Value-Selling', 'Enterprise', 'Stakeholder'],
    },
    compliance: {
      level: 'normal',
      warnings: [],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AURA OS | NETWORK PRO EDITION
  // ─────────────────────────────────────────────────────────────────────────
  'network_marketing': {
    slug: 'network_marketing',
    name: 'AURA OS',
    tagline: 'Network Pro Edition',
    colors: {
      primary: '#0F172A',
      secondary: '#8B5CF6',
      accent: '#22d3ee',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#3B0764'],
      button: ['#8B5CF6', '#7C3AED'],
    },
    chiefConfig: {
      greeting: `Hey! 👋 Ich bin CHIEF, dein AURA OS Agent.

🚀 **Network Pro Edition** – Skaliere dein Business!

Ich helfe dir bei:
• Team-Duplikation & Onboarding
• Rank-Tracking & Comp-Plan Optimierung
• Partner-Aktivierung
• Event-Strategien

Bereit zum Wachsen?`,
      emoji: '🚀',
      personality: 'motivierend-skalierungsorientiert',
      focusAreas: ['Duplikation', 'Rank-Tracking', 'Team-Building', 'Events'],
    },
    compliance: {
      level: 'strict',
      warnings: [
        'Keine Einkommensversprechen',
        'Keine Heilversprechen',
        'Compliant kommunizieren',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AURA OS | MAKLER EDITION
  // ─────────────────────────────────────────────────────────────────────────
  'real_estate': {
    slug: 'real_estate',
    name: 'AURA OS',
    tagline: 'Makler Edition',
    colors: {
      primary: '#0F172A',
      secondary: '#10B981',
      accent: '#22d3ee',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#064E3B'],
      button: ['#10B981', '#059669'],
    },
    chiefConfig: {
      greeting: `Hallo! 👋 Ich bin CHIEF, dein AURA OS Agent.

🏠 **Makler Edition** – Mehr Abschlüsse, weniger Aufwand!

Ich helfe dir bei:
• Emotionale Exposés in Sekunden
• Käufer-Qualifizierung & Scoring
• Objektmanagement & Pipeline
• Eigentümer-Akquise

Welches Objekt besprechen wir?`,
      emoji: '🏠',
      personality: 'professionell-marktexpert',
      focusAreas: ['Exposé-Generator', 'Lead-Scoring', 'Objektmanagement', 'Akquise'],
    },
    compliance: {
      level: 'normal',
      warnings: [],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AURA OS | COACHING EDITION
  // ─────────────────────────────────────────────────────────────────────────
  'coaching': {
    slug: 'coaching',
    name: 'AURA OS',
    tagline: 'Coaching Edition',
    colors: {
      primary: '#0F172A',
      secondary: '#F59E0B',
      accent: '#22d3ee',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#78350F'],
      button: ['#F59E0B', '#D97706'],
    },
    chiefConfig: {
      greeting: `Hallo! 👋 Ich bin CHIEF, dein AURA OS Agent.

🎯 **Coaching Edition** – Skaliere dein Coaching-Business!

Ich helfe dir bei:
• High-Ticket Sales Strategien
• Discovery Call Optimierung
• Client Journey Mapping
• Retention & Upselling

Welchen Klienten besprechen wir?`,
      emoji: '🎯',
      personality: 'empathisch-transformativ',
      focusAreas: ['High-Ticket', 'Discovery Calls', 'Retention', 'Upselling'],
    },
    compliance: {
      level: 'normal',
      warnings: [],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AURA OS | FINANCE EDITION
  // ─────────────────────────────────────────────────────────────────────────
  'finance': {
    slug: 'finance',
    name: 'AURA OS',
    tagline: 'Finance Edition',
    colors: {
      primary: '#0F172A',
      secondary: '#06B6D4',
      accent: '#22d3ee',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#164E63'],
      button: ['#06B6D4', '#0891B2'],
    },
    chiefConfig: {
      greeting: `Hallo! 👋 Ich bin CHIEF, dein AURA OS Agent.

💰 **Finance Edition** – Vertrauen aufbauen, Abschlüsse sichern!

Ich helfe dir bei:
• Bedarfsanalyse & Beratung
• Produkt-Erklärungen
• Empfehlungsmarketing
• Compliance-sichere Kommunikation

Welchen Kunden besprechen wir?`,
      emoji: '💰',
      personality: 'vertrauenswürdig-kompetent',
      focusAreas: ['Beratung', 'Empfehlungen', 'Compliance', 'Vorsorge'],
    },
    compliance: {
      level: 'strict',
      warnings: [
        'Keine Renditeversprechen',
        'Keine Anlageberatung ohne Lizenz',
        'Risiken erwähnen',
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT (AURA OS - Autonomous Enterprise System)
  // ─────────────────────────────────────────────────────────────────────────
  default: {
    slug: 'default',
    name: 'AURA OS',
    tagline: 'Autonomous Enterprise System',
    colors: {
      primary: '#0F172A',
      secondary: '#22d3ee',
      accent: '#10B981',
      background: '#F8FAFC',
      text: '#1E293B',
      textLight: '#64748B',
    },
    gradients: {
      header: ['#0F172A', '#1E293B'],
      button: ['#22d3ee', '#06b6d4'],
    },
    chiefConfig: {
      greeting: `Hallo! 👋 Ich bin CHIEF, dein AURA OS Agent.

🎯 CHIEF hat deinen Tag vorbereitet und kennt deine Leads!

Ich helfe dir bei:
• Tages-Planung & Prioritäten
• Einwand-Behandlung
• Follow-up Strategien
• Abschluss-Techniken

Was steht heute an?`,
      emoji: '✦',
      personality: 'professionell-hilfreich',
      focusAreas: ['Verkauf', 'Follow-ups', 'Einwände', 'Abschlüsse'],
    },
    compliance: {
      level: 'normal',
      warnings: [],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCompanyBranding(overrideSlug?: string): {
  branding: CompanyBranding;
  isLoading: boolean;
  styles: ReturnType<typeof generateStyles>;
  companySlug: string;
  editionName: string;
} {
  const { companySlug: authCompanySlug, vertical: authVertical } = useAuth() as { 
    companySlug?: string;
    vertical?: string;
  };
  const [isLoading, setIsLoading] = useState(false);
  
  // Bestimme Company-Slug (aus Props, AuthContext oder Vertical)
  // Priorität: 1) Override Prop, 2) Company Slug (für Networks), 3) Vertical, 4) Default
  const slug = useMemo(() => {
    // 1. Explicit override
    if (overrideSlug) return overrideSlug.toLowerCase();
    
    // 2. Spezifischer Company-Slug (z.B. 'zinzino', 'pm-international')
    if (authCompanySlug && authCompanySlug !== 'default' && authCompanySlug !== 'other') {
      // Prüfe ob es ein bekanntes Company-Branding gibt
      if (COMPANY_BRANDINGS[authCompanySlug.toLowerCase()]) {
        return authCompanySlug.toLowerCase();
      }
    }
    
    // 3. Vertical-basiertes AURA OS Edition Branding
    if (authVertical && COMPANY_BRANDINGS[authVertical.toLowerCase()]) {
      return authVertical.toLowerCase();
    }
    
    // 4. Default
    return 'default';
  }, [overrideSlug, authCompanySlug, authVertical]);
  
  // Edition-Name für UI-Anzeige
  const editionName = useMemo(() => {
    const branding = COMPANY_BRANDINGS[slug] || COMPANY_BRANDINGS.default;
    if (branding.name === 'AURA OS' && branding.tagline) {
      return `AURA OS | ${branding.tagline}`;
    }
    return branding.name;
  }, [slug]);

  // Hole Branding (aktuell statisch, später aus DB)
  const branding = useMemo(() => {
    return COMPANY_BRANDINGS[slug] || COMPANY_BRANDINGS.default;
  }, [slug]);

  // Generiere Styles basierend auf Branding
  const styles = useMemo(() => generateStyles(branding), [branding]);

  return {
    branding,
    isLoading,
    styles,
    companySlug: slug,
    editionName,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateStyles(branding: CompanyBranding) {
  const { colors } = branding;
  
  return {
    // Header
    header: {
      backgroundColor: colors.primary,
    },
    headerGradient: branding.gradients.header,
    headerTitle: {
      color: '#FFFFFF',
    },
    headerSubtitle: {
      color: 'rgba(255,255,255,0.85)',
    },
    
    // Buttons
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
    },
    buttonGradient: branding.gradients.button,
    
    // Messages
    assistantBubble: {
      backgroundColor: '#FFFFFF',
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    
    // Accents
    accent: {
      color: colors.accent,
    },
    accentBackground: {
      backgroundColor: colors.accent + '15',
    },
    
    // Container
    container: {
      backgroundColor: colors.background,
    },
    
    // Text
    text: {
      color: colors.text,
    },
    textLight: {
      color: colors.textLight,
    },
    
    // Badges
    complianceBadge: {
      backgroundColor: branding.compliance.level === 'strict' 
        ? '#FEF3C7' 
        : branding.compliance.level === 'normal'
          ? '#DBEAFE'
          : '#D1FAE5',
      borderColor: branding.compliance.level === 'strict'
        ? '#F59E0B'
        : branding.compliance.level === 'normal'
          ? '#3B82F6'
          : '#10B981',
    },
    
    // Input
    input: {
      borderColor: colors.primary + '40',
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    
    // Send Button
    sendButton: {
      backgroundColor: colors.primary,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { COMPANY_BRANDINGS };
export type { CompanyBranding as BrandingConfig };

