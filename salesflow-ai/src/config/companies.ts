/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPANY REGISTRY                                                          ║
 * ║  Zentrale Registry für alle unterstützten Network-Marketing-Firmen         ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// ============================================
// COMPANY REGISTRY
// ============================================

/**
 * Zentrale Registry aller unterstützten Firmen
 */
export const COMPANY_REGISTRY = {
  zinzino: {
    id: 'zinzino',
    name: 'Zinzino',
    slug: 'zinzino',
    hasCompPlan: true,
    compPlanId: 'zinzino_de_2024',
    emoji: '🧬',
    color: '#1E3A5F',
    externalPlanUrl: 'https://www.zinzino.com/compensation-plan',
    description: 'Omega-3 Balance & Gesundheitsprodukte',
  },
  herbalife: {
    id: 'herbalife',
    name: 'Herbalife',
    slug: 'herbalife',
    hasCompPlan: false, // Noch nicht implementiert
    compPlanId: null,
    emoji: '🌿',
    color: '#78BE20',
    externalPlanUrl: 'https://www.herbalife.com/business-opportunity',
    description: 'Ernährung & Gewichtsmanagement',
  },
  doterra: {
    id: 'doterra',
    name: 'dōTERRA',
    slug: 'doterra',
    hasCompPlan: false, // Noch nicht implementiert
    compPlanId: null,
    emoji: '🌸',
    color: '#7C3AED',
    externalPlanUrl: 'https://www.doterra.com/business',
    description: 'Ätherische Öle & Wellness',
  },
  'pm-international': {
    id: 'pm-international',
    name: 'PM-International',
    slug: 'pm-international',
    hasCompPlan: false, // Noch nicht implementiert
    compPlanId: null,
    emoji: '💪',
    color: '#1E40AF',
    externalPlanUrl: 'https://www.pm-international.com/career',
    description: 'FitLine Nährstoffoptimierung',
  },
  'lr-health': {
    id: 'lr-health',
    name: 'LR Health & Beauty',
    slug: 'lr-health',
    hasCompPlan: false, // Noch nicht implementiert
    compPlanId: null,
    emoji: '🌿',
    color: '#059669',
    externalPlanUrl: 'https://www.lrworld.com/business',
    description: 'Aloe Vera & Lifestyle-Produkte',
  },
  other: {
    id: 'other',
    name: 'Anderes Network',
    slug: 'other',
    hasCompPlan: false,
    compPlanId: null,
    emoji: '🎯',
    color: '#64748B',
    externalPlanUrl: null,
    description: 'Generischer Sales Coach',
  },
} as const;

// ============================================
// TYPES
// ============================================

/**
 * Union-Typ aller bekannten Company-Keys
 */
export type CompanyKey = keyof typeof COMPANY_REGISTRY;

/**
 * Company-Eintrag-Typ
 */
export type CompanyEntry = typeof COMPANY_REGISTRY[CompanyKey];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalisiert einen Company-Key auf lowercase und mappt bekannte Varianten.
 * Gibt 'other' zurück, wenn der Key unbekannt ist.
 * 
 * @example
 * normalizeCompanyKey('ZINZINO') // 'zinzino'
 * normalizeCompanyKey('Zinzino') // 'zinzino'
 * normalizeCompanyKey('LR') // 'lr-health'
 * normalizeCompanyKey('unknown') // 'other'
 */
export function normalizeCompanyKey(key: string): CompanyKey {
  if (!key) return 'other';
  
  const normalized = key.toLowerCase().trim();
  
  // Direkte Matches
  if (normalized in COMPANY_REGISTRY) {
    return normalized as CompanyKey;
  }
  
  // Alias-Mapping für häufige Varianten
  const aliases: Record<string, CompanyKey> = {
    // Zinzino Varianten
    'zinzino': 'zinzino',
    'zz': 'zinzino',
    
    // Herbalife Varianten
    'herbalife': 'herbalife',
    'hbl': 'herbalife',
    
    // doTERRA Varianten
    'doterra': 'doterra',
    'doterra': 'doterra',
    'dōterra': 'doterra',
    
    // PM-International Varianten
    'pm-international': 'pm-international',
    'pm': 'pm-international',
    'pmi': 'pm-international',
    'fitline': 'pm-international',
    
    // LR Health Varianten
    'lr-health': 'lr-health',
    'lr': 'lr-health',
    'lr-health-beauty': 'lr-health',
    'lr health': 'lr-health',
    'lr health & beauty': 'lr-health',
    
    // General/Other Varianten
    'other': 'other',
    'general': 'other',
    'andere': 'other',
  };
  
  return aliases[normalized] || 'other';
}

/**
 * Prüft, ob ein Key eine bekannte Firma ist (nicht 'other')
 */
export function isKnownCompany(key: string): boolean {
  const normalized = normalizeCompanyKey(key);
  return normalized !== 'other';
}

/**
 * Holt die Company-Infos für einen Key
 */
export function getCompanyInfo(key: string): CompanyEntry {
  const normalized = normalizeCompanyKey(key);
  return COMPANY_REGISTRY[normalized];
}

/**
 * Gibt alle Firmen zurück, die einen Compensation Plan haben
 */
export function getCompaniesWithPlan(): CompanyEntry[] {
  return Object.values(COMPANY_REGISTRY).filter(c => c.hasCompPlan);
}

/**
 * Gibt alle Firmen zurück
 */
export function getAllCompanies(): CompanyEntry[] {
  return Object.values(COMPANY_REGISTRY);
}

/**
 * Gibt die externe Plan-URL für eine Firma zurück
 */
export function getExternalPlanUrl(key: string): string | null {
  const company = getCompanyInfo(key);
  return company.externalPlanUrl;
}

// ============================================
// EXPORTS
// ============================================

export default COMPANY_REGISTRY;

