/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL UTILITIES                                       ║
 * ║  URL-Slug-Mapping und Vertical-Routing                                    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { VERTICALS } from '../hooks/useVertical';

// Fallback-Export, falls VERTICALS nicht aus useVertical kommt
export const FALLBACK_VERTICALS = {
  mlm: { name: 'Network Marketing', slug: 'mlm' },
  insurance: { name: 'Versicherungen', slug: 'insurance' },
  realestate: { name: 'Immobilien', slug: 'realestate' },
  solar: { name: 'Solar/Energie', slug: 'solar' },
  finance: { name: 'Finanzberatung', slug: 'finance' }
};

// Export VERTICALS (falls das importierte leer ist, nutze Fallback)
export const VERTICALS_EXPORT = Object.keys(VERTICALS || {}).length > 0 ? VERTICALS : FALLBACK_VERTICALS;

/**
 * Mapping: Vertical ID → URL Slug
 */
const VERTICAL_TO_SLUG = {
  network_marketing: 'networker',
  real_estate: 'immobilien',
  coaching: 'coaching',
  finance: 'finanzvertrieb',
  insurance: 'versicherung',
  solar: 'solar',
  sales_rep: 'handelsvertreter',
  b2b_sales: 'aussendienst',
  freelance_sales: 'freelance',
  custom: 'dashboard',
};

/**
 * Mapping: URL Slug → Vertical ID
 */
const SLUG_TO_VERTICAL = Object.fromEntries(
  Object.entries(VERTICAL_TO_SLUG).map(([id, slug]) => [slug, id])
);

/**
 * Holt den URL-Slug für ein Vertical
 * @param {string} verticalId - Die Vertical ID
 * @returns {string} Der URL-Slug
 */
export function getVerticalSlug(verticalId) {
  return VERTICAL_TO_SLUG[verticalId] || 'dashboard';
}

/**
 * Holt die Vertical ID aus einem URL-Slug
 * @param {string} slug - Der URL-Slug
 * @returns {string|null} Die Vertical ID oder null
 */
export function getVerticalFromSlug(slug) {
  return SLUG_TO_VERTICAL[slug] || null;
}

/**
 * Erstellt die Landing Page URL für ein Vertical
 * @param {string} verticalId - Die Vertical ID
 * @returns {string} Die vollständige URL
 */
export function getVerticalLandingPath(verticalId) {
  const slug = getVerticalSlug(verticalId);
  return `/${slug}`;
}

/**
 * Holt alle Verticals mit ihren Slugs für Landing Pages
 * @returns {Array} Array von Vertical-Objekten mit slug und headline
 */
export function getLandingVerticals() {
  return Object.values(VERTICALS)
    .filter((v) => v.id !== 'custom') // Custom nicht in Landing Page
    .map((vertical) => ({
      ...vertical,
      slug: getVerticalSlug(vertical.id),
      headline: getVerticalHeadline(vertical.id),
    }));
}

/**
 * Generiert eine Headline für ein Vertical
 * @param {string} verticalId - Die Vertical ID
 * @returns {string} Die Headline
 */
function getVerticalHeadline(verticalId) {
  const headlines = {
    network_marketing: 'Für Network Marketer',
    real_estate: 'Für Immobilienprofis',
    coaching: 'Für Coaches & Berater',
    finance: 'Für Finanzberater',
    insurance: 'Für Versicherungsprofis',
    solar: 'Für Solar-Vertrieb',
    sales_rep: 'Für Handelsvertreter',
    b2b_sales: 'Für den Außendienst',
    freelance_sales: 'Für Freelance Sales',
  };
  return headlines[verticalId] || `Für ${VERTICALS[verticalId]?.label || 'Verkäufer'}`;
}

/**
 * Prüft, ob ein Vertical Compensation Plan Support hat
 * @param {string} verticalId - Die Vertical ID
 * @returns {boolean}
 */
export function hasCompensationPlan(verticalId) {
  return VERTICALS[verticalId]?.hasCompensationPlan || false;
}

/**
 * Prüft, ob ein Vertical Team Structure Support hat
 * @param {string} verticalId - Die Vertical ID
 * @returns {boolean}
 */
export function hasTeamStructure(verticalId) {
  return VERTICALS[verticalId]?.hasTeamStructure || false;
}

export { VERTICAL_TO_SLUG, SLUG_TO_VERTICAL };

