/**
 * ZINZINO Compensation Plan (DE)
 * 
 * ⚠️ DISCLAIMER: Alle Zahlen sind vereinfachte Beispielwerte.
 * Für genaue Informationen siehe offizielle Zinzino-Dokumente.
 * 
 * Zinzino ist ein skandinavisches Unternehmen mit Fokus auf
 * personalisierte Gesundheitsprodukte (BalanceOil, ZinoBiotic, etc.)
 */

import { CompensationPlan } from '../../types/compensation';

export const ZINZINO_DE_PLAN: CompensationPlan = {
  company_id: 'zinzino',
  company_name: 'Zinzino',
  company_logo: '🧬',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'Credits',
  unit_code: 'credits',
  currency: 'EUR',
  
  // Durchschnittswerte für Berechnungen
  avg_personal_volume_per_customer: 60,   // Ø Abo-Wert pro Monat (Balance Kit etc.)
  avg_personal_volume_per_partner: 100,   // Eigenbedarf + Starter Kit
  
  version: 1,
  last_updated: '2024-12',
  
  ranks: [
    {
      id: 'starter',
      name: 'Starter',
      order: 0,
      unit: 'credits',
      requirements: { 
        min_personal_volume: 0 
      },
      earning_estimate: { 
        avg_monthly_income: 0 
      },
    },
    {
      id: 'builder',
      name: 'Builder',
      order: 1,
      unit: 'credits',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 500,
      },
      earning_estimate: { 
        avg_monthly_income: 100, 
        range: [50, 200] 
      },
    },
    {
      id: 'team_leader',
      name: 'Team Leader',
      order: 2,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 2000,
        leg_volume_requirements: { 
          legs_required: 2, 
          min_volume_per_leg: 500 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 400, 
        range: [200, 800] 
      },
    },
    {
      id: 'senior_leader',
      name: 'Senior Leader',
      order: 3,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 4000,
        leg_volume_requirements: { 
          legs_required: 3, 
          min_volume_per_leg: 1000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 800, 
        range: [400, 1500] 
      },
    },
    {
      id: 'executive',
      name: 'Executive',
      order: 4,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 8000,
        leg_volume_requirements: { 
          legs_required: 3, 
          min_volume_per_leg: 2000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 1500, 
        range: [800, 3000] 
      },
    },
    {
      id: 'elite',
      name: 'Elite',
      order: 5,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 15000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 3000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 3000, 
        range: [1500, 6000] 
      },
    },
    {
      id: 'ambassador',
      name: 'Ambassador',
      order: 6,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 30000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 6000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 6000, 
        range: [3000, 15000] 
      },
    },
    {
      id: 'crown_ambassador',
      name: 'Crown Ambassador',
      order: 7,
      unit: 'credits',
      requirements: {
        min_personal_volume: 200,
        min_group_volume: 60000,
        leg_volume_requirements: { 
          legs_required: 5, 
          min_volume_per_leg: 10000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 12000, 
        range: [6000, 30000] 
      },
    },
  ],
  
  disclaimer: 'Vereinfachte Beispielwerte basierend auf öffentlichen Informationen. Keine Verdienstgarantie. Für aktuelle und verbindliche Informationen siehe die offiziellen Zinzino-Unterlagen.',
};

// Convenience exports
export const ZINZINO_RANKS = ZINZINO_DE_PLAN.ranks;
export const ZINZINO_UNIT = ZINZINO_DE_PLAN.unit_label;

