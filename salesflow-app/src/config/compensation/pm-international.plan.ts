/**
 * PM-INTERNATIONAL Compensation Plan (DE)
 * 
 * ⚠️ DISCLAIMER: Alle Zahlen sind vereinfachte Beispielwerte.
 * 
 * PM-International (FitLine) ist ein deutsches Unternehmen
 * mit Fokus auf Nahrungsergänzungsmittel und Sport-Nutrition.
 * 
 * Rechtlich bestätigt durch OLG Frankfurt (Az. 6 U 286/10)
 */

import { CompensationPlan } from '../../types/compensation';

export const PM_INTERNATIONAL_DE_PLAN: CompensationPlan = {
  company_id: 'pm-international',
  company_name: 'PM-International',
  company_logo: '💪',
  region: 'DE',
  plan_type: 'unilevel',
  unit_label: 'Punkte',
  unit_code: 'pv',
  currency: 'EUR',
  
  // Durchschnittswerte für Berechnungen
  avg_personal_volume_per_customer: 80,   // FitLine Basics, Activize etc.
  avg_personal_volume_per_partner: 150,   // Starter Kit + Eigenbedarf
  
  version: 1,
  last_updated: '2024-12',
  
  ranks: [
    {
      id: 'berater',
      name: 'Berater',
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
      id: 'supervisor',
      name: 'Supervisor',
      order: 1,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 1000,
      },
      earning_estimate: { 
        avg_monthly_income: 200, 
        range: [100, 400] 
      },
    },
    {
      id: 'team_manager',
      name: 'Team Manager',
      order: 2,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 4000,
        leg_volume_requirements: { 
          legs_required: 2, 
          min_volume_per_leg: 1000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 600, 
        range: [300, 1200] 
      },
    },
    {
      id: 'executive_manager',
      name: 'Executive Manager',
      order: 3,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 10000,
        leg_volume_requirements: { 
          legs_required: 3, 
          min_volume_per_leg: 2500 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 1500, 
        range: [800, 3000] 
      },
    },
    {
      id: 'vp',
      name: 'Vice President',
      order: 4,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 25000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 5000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 4000, 
        range: [2000, 8000] 
      },
    },
    {
      id: 'senior_vp',
      name: 'Senior Vice President',
      order: 5,
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
        avg_monthly_income: 7000, 
        range: [4000, 15000] 
      },
    },
    {
      id: 'president',
      name: 'President',
      order: 6,
      unit: 'pv',
      requirements: {
        min_personal_volume: 100,
        min_group_volume: 50000,
        leg_volume_requirements: { 
          legs_required: 4, 
          min_volume_per_leg: 10000 
        },
      },
      earning_estimate: { 
        avg_monthly_income: 10000, 
        range: [5000, 25000] 
      },
    },
    {
      id: 'champion',
      name: 'Champion',
      order: 7,
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
        avg_monthly_income: 20000, 
        range: [10000, 50000] 
      },
    },
  ],
  
  disclaimer: 'Basiert auf öffentlichen Informationen und vereinfachten Beispielwerten. Keine Verdienstgarantie. PM-International wurde rechtlich bestätigt (OLG Frankfurt, Az. 6 U 286/10).',
};

// Convenience exports
export const PM_INTERNATIONAL_RANKS = PM_INTERNATIONAL_DE_PLAN.ranks;
export const PM_INTERNATIONAL_UNIT = PM_INTERNATIONAL_DE_PLAN.unit_label;

