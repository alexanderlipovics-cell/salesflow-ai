/**
 * LR HEALTH & BEAUTY Compensation Plan (DE)
 * 
 * ⚠️ DISCLAIMER: Alle Zahlen sind vereinfachte Beispielwerte.
 * 
 * LR Health & Beauty ist ein deutsches Unternehmen
 * mit Fokus auf Aloe Vera Produkte, Kosmetik und Parfüms.
 * 
 * Besonderheit: Fast Track Bonus (garantiertes Mindesteinkommen in ersten Monaten)
 */

import { CompensationPlan } from '../../types/compensation';

export const LR_HEALTH_DE_PLAN: CompensationPlan = {
  company_id: 'lr-health',
  company_name: 'LR Health & Beauty',
  company_logo: '💄',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'PV',
  unit_code: 'pv',
  currency: 'EUR',
  
  // Durchschnittswerte für Berechnungen
  avg_personal_volume_per_customer: 50,   // Aloe Vera Produkte, Parfüms
  avg_personal_volume_per_partner: 120,   // Starter Set + Eigenbedarf
  
  version: 1,
  last_updated: '2024-12',
  
  ranks: [
    {
      id: 'partner',
      name: 'Partner',
      order: 0,
      unit: 'pv',
      requirements: { 
        min_personal_volume: 0 
      },
      earning_estimate: { 
        avg_monthly_income: 0 
      },
    },
    {
      id: 'junior_manager',
      name: 'Junior Manager',
      order: 1,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 4000,
      },
      // Fast Track: 250€ garantiert in ersten 3 Monaten
      earning_estimate: { 
        avg_monthly_income: 250, 
        range: [200, 400] 
      },
    },
    {
      id: 'manager',
      name: 'Manager',
      order: 2,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 8000,
      },
      // Fast Track: 500€ garantiert
      earning_estimate: { 
        avg_monthly_income: 500, 
        range: [400, 800] 
      },
    },
    {
      id: 'junior_team_leader',
      name: 'Junior Team Leader',
      order: 3,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 12000,
        leg_volume_requirements: { 
          legs_required: 2, 
          min_volume_per_leg: 3000 
        },
      },
      // Fast Track: 1000€ garantiert
      earning_estimate: { 
        avg_monthly_income: 1000, 
        range: [800, 1500] 
      },
    },
    {
      id: 'team_leader',
      name: 'Team Leader',
      order: 4,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 16000,
        leg_volume_requirements: { 
          legs_required: 3, 
          min_volume_per_leg: 4000 
        },
      },
      // Fast Track: 1250€ garantiert
      earning_estimate: { 
        avg_monthly_income: 1250, 
        range: [1000, 2000] 
      },
    },
    {
      id: 'executive',
      name: 'Executive',
      order: 5,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 25000,
        leg_volume_requirements: { 
          legs_required: 3, 
          min_volume_per_leg: 6000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 2500, 
        range: [1500, 5000] 
      },
    },
    {
      id: 'top_executive',
      name: 'Top Executive',
      order: 6,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 40000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 8000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 5000, 
        range: [3000, 10000] 
      },
    },
    {
      id: 'organization_leader',
      name: 'Organization Leader',
      order: 7,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 60000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 12000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 8000, 
        range: [5000, 15000] 
      },
    },
    {
      id: 'top_organization_leader',
      name: 'Top Organization Leader',
      order: 8,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 100000,
        leg_volume_requirements: { 
          legs_required: 5, 
          min_volume_per_leg: 15000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 15000, 
        range: [8000, 30000] 
      },
    },
  ],
  
  disclaimer: 'Fast Track Bonus nur in ersten 3 Monaten und bei Erfüllung der Qualifikation. Alle Angaben sind vereinfachte Beispielwerte. Keine Verdienstgarantie.',
};

// Convenience exports
export const LR_HEALTH_RANKS = LR_HEALTH_DE_PLAN.ranks;
export const LR_HEALTH_UNIT = LR_HEALTH_DE_PLAN.unit_label;

// Fast Track Info
export const LR_FAST_TRACK_INFO = {
  duration_months: 3,
  ranks_with_guarantee: ['junior_manager', 'manager', 'junior_team_leader', 'team_leader'],
  note: 'Garantiertes Mindesteinkommen bei Rangqualifikation in den ersten 3 Monaten',
};

