/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICALS INDEX                                          ║
 * ║  Zentrale Exports für Vertical System                                     ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// Types
export * from './types';

// Definitions
export * from './definitions';

// Adapters (Goal Breakdown Engine)
export * from './adapters';

// Re-exports for convenience
import { ALL_VERTICALS, VERTICAL_LIST } from './definitions';
import { VerticalConfig, VerticalId, VerticalSelectorOption } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Holt eine Vertical-Konfiguration anhand der ID
 */
export function getVerticalById(id: VerticalId): VerticalConfig | undefined {
  return ALL_VERTICALS[id];
}

/**
 * Holt alle verfügbaren Verticals als Selector-Optionen
 */
export function getVerticalSelectorOptions(): VerticalSelectorOption[] {
  return VERTICAL_LIST.map(v => ({
    id: v.id,
    label: v.label,
    icon: v.icon,
    color: v.color,
    description: v.description,
  }));
}

/**
 * Holt die Objection-Prompts für ein Vertical
 */
export function getObjectionPromptForVertical(verticalId: VerticalId): string {
  const vertical = ALL_VERTICALS[verticalId];
  if (!vertical) return '';
  
  const ctx = vertical.objection_context;
  
  return `
BRANCHE: ${vertical.label}
PRODUKT/SERVICE: ${ctx.product_type}
TYPISCHE EINWÄNDE: ${ctx.typical_objections.join(', ')}
TONALITÄT: ${ctx.tone}
ENTSCHEIDER: ${ctx.decision_maker}
SALES-ZYKLUS: ${ctx.sales_cycle}
${ctx.price_range ? `PREISBEREICH: ${ctx.price_range}` : ''}

Berücksichtige diese Branchenspezifika bei der Einwandbehandlung.
`.trim();
}

/**
 * Holt die Daily Flow Defaults für ein Vertical
 */
export function getDailyFlowDefaultsForVertical(verticalId: VerticalId) {
  const vertical = ALL_VERTICALS[verticalId];
  return vertical?.daily_flow_defaults ?? {
    new_contacts: 8,
    followups: 6,
    reactivations: 2,
  };
}

/**
 * Prüft ob ein Vertical Compensation Plans unterstützt
 */
export function hasCompensationPlan(verticalId: VerticalId): boolean {
  return ALL_VERTICALS[verticalId]?.has_compensation_plan ?? false;
}

/**
 * Prüft ob ein Vertical Team-Struktur hat
 */
export function hasTeamStructure(verticalId: VerticalId): boolean {
  return ALL_VERTICALS[verticalId]?.has_team_structure ?? false;
}

/**
 * Holt die KPIs für ein Vertical
 */
export function getKpisForVertical(verticalId: VerticalId) {
  return ALL_VERTICALS[verticalId]?.kpis ?? [];
}

/**
 * Holt die Activity Types für ein Vertical
 */
export function getActivityTypesForVertical(verticalId: VerticalId) {
  return ALL_VERTICALS[verticalId]?.activity_types ?? [];
}

/**
 * Formatiert Vertical-Context für CHIEF AI
 */
export function formatVerticalContextForChief(verticalId: VerticalId): string {
  const vertical = ALL_VERTICALS[verticalId];
  if (!vertical) return '';
  
  const ctx = vertical.objection_context;
  
  return `
<vertical_context>
BRANCHE: ${vertical.label} (${vertical.icon})
BESCHREIBUNG: ${vertical.description}

GESCHÄFTSMODELL:
- Provisions-Modell: ${vertical.commission_model}
- Hat Compensation Plan: ${vertical.has_compensation_plan ? 'Ja' : 'Nein'}
- Hat Team-Struktur: ${vertical.has_team_structure ? 'Ja' : 'Nein'}

PRIMÄRE KPIs:
${vertical.kpis.map(k => `- ${k.emoji} ${k.label}`).join('\n')}

TYPISCHE EINWÄNDE:
${ctx.typical_objections.map(o => `- "${o}"`).join('\n')}

KOMMUNIKATIONSSTIL:
${ctx.tone}

ENTSCHEIDER: ${ctx.decision_maker}
SALES-ZYKLUS: ${ctx.sales_cycle}
${ctx.price_range ? `PREISBEREICH: ${ctx.price_range}` : ''}
</vertical_context>
`.trim();
}

