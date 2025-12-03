/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL DEFINITIONS                                     ║
 * ║  Komplette Konfiguration für alle Branchen                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { VerticalConfig, VerticalId } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. NETWORK MARKETING
// ═══════════════════════════════════════════════════════════════════════════

export const NETWORK_MARKETING_VERTICAL: VerticalConfig = {
  id: 'network_marketing',
  label: 'Network Marketing',
  icon: '🌐',
  color: '#8b5cf6',
  description: 'MLM, Direktvertrieb & Teamaufbau',
  
  commission_model: 'mlm_rank',
  has_compensation_plan: true,
  has_team_structure: true,
  
  kpis: [
    { id: 'customers', label: 'Kunden', emoji: '👥', unit: 'Anzahl' },
    { id: 'partners', label: 'Partner', emoji: '🤝', unit: 'Anzahl' },
    { id: 'team_volume', label: 'Team-Volumen', emoji: '📊', unit: 'PV/Credits' },
    { id: 'personal_volume', label: 'Persönliches Volumen', emoji: '💎', unit: 'PV/Credits' },
    { id: 'rank', label: 'Rang', emoji: '🏆', unit: 'Level' },
  ],
  primary_kpi: 'team_volume',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Kontakt', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'presentation', label: 'Präsentation', emoji: '📊', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#F59E0B', maps_to_daily_flow: 'reactivations' },
    { id: 'onboarding', label: 'Onboarding', emoji: '🚀', color: '#EC4899', maps_to_daily_flow: null },
    { id: 'team_call', label: 'Team-Call', emoji: '📱', color: '#3B82F6', maps_to_daily_flow: null },
  ],
  
  goal_types: [
    { id: 'income', label: 'Einkommen', emoji: '💰', unit: '€/Monat' },
    { id: 'rank', label: 'Rang erreichen', emoji: '🏆', unit: 'Level' },
    { id: 'customers', label: 'Kunden gewinnen', emoji: '👥', unit: 'Anzahl' },
    { id: 'partners', label: 'Partner aufbauen', emoji: '🤝', unit: 'Anzahl' },
  ],
  
  objection_context: {
    typical_objections: [
      'Ich habe keine Zeit',
      'Das ist mir zu teuer',
      'Das ist doch Pyramide',
      'Ich kenne niemanden',
      'Ich muss noch überlegen',
      'Mein Partner muss zustimmen',
      'Ich bin nicht der Typ dafür',
    ],
    tone: 'authentisch, nicht pushy, beziehungsorientiert',
    product_type: 'Produkt + Geschäftsmöglichkeit',
    decision_maker: 'Privatperson',
    sales_cycle: '1-4 Wochen',
    price_range: '50-500€ Einstieg',
  },
  
  daily_flow_defaults: {
    new_contacts: 8,
    followups: 6,
    reactivations: 2,
  },
  
  playbook_categories: [
    'Erstkontakt',
    'Produktpräsentation',
    'Business-Präsentation',
    'Einwandbehandlung',
    'Abschluss',
    'Onboarding',
    'Teamführung',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: true,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. IMMOBILIEN / REAL ESTATE
// ═══════════════════════════════════════════════════════════════════════════

export const REAL_ESTATE_VERTICAL: VerticalConfig = {
  id: 'real_estate',
  label: 'Immobilien',
  icon: '🏠',
  color: '#10b981',
  description: 'Makler, Immobilienvermittlung & Investments',
  
  commission_model: 'per_deal',
  has_compensation_plan: false,
  has_team_structure: false,
  
  kpis: [
    { id: 'listings', label: 'Objekte', emoji: '🏘️', unit: 'Anzahl', description: 'Aktive Listings' },
    { id: 'viewings', label: 'Besichtigungen', emoji: '👁️', unit: 'Anzahl' },
    { id: 'offers', label: 'Angebote', emoji: '📝', unit: 'Anzahl' },
    { id: 'closings', label: 'Abschlüsse', emoji: '🔑', unit: 'Anzahl' },
    { id: 'commission', label: 'Provision', emoji: '💰', unit: '€' },
    { id: 'avg_deal_size', label: 'Ø Objektwert', emoji: '📊', unit: '€' },
  ],
  primary_kpi: 'closings',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Interessent', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'viewing', label: 'Besichtigung', emoji: '🏠', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'acquisition', label: 'Akquise-Call', emoji: '📱', color: '#F59E0B', maps_to_daily_flow: 'new_contacts' },
    { id: 'offer', label: 'Angebot erstellt', emoji: '📝', color: '#EC4899', maps_to_daily_flow: null },
    { id: 'notary', label: 'Notartermin', emoji: '✍️', color: '#22C55E', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#64748B', maps_to_daily_flow: 'reactivations' },
  ],
  
  goal_types: [
    { id: 'income', label: 'Provisions-Ziel', emoji: '💰', unit: '€/Monat' },
    { id: 'listings', label: 'Objekte akquirieren', emoji: '🏘️', unit: 'Anzahl' },
    { id: 'closings', label: 'Abschlüsse', emoji: '🔑', unit: 'Anzahl/Monat' },
  ],
  
  objection_context: {
    typical_objections: [
      'Die Provision ist mir zu hoch',
      'Ich verkaufe lieber privat',
      'Ich habe schon einen Makler',
      'Der Preis ist zu niedrig angesetzt',
      'Wir wollen noch warten',
      'Wir müssen noch mit der Familie sprechen',
      'Die Besichtigung hat uns nicht überzeugt',
      'Wir finden nichts Passendes',
    ],
    tone: 'professionell, vertrauenswürdig, marktexpertise zeigend',
    product_type: 'Immobilie (Kauf/Verkauf/Vermietung)',
    decision_maker: 'Eigentümer / Käufer-Paar / Familie',
    sales_cycle: '3-12 Monate',
    price_range: '200.000€ - 2.000.000€',
  },
  
  daily_flow_defaults: {
    new_contacts: 5,
    followups: 8,
    reactivations: 2,
  },
  
  playbook_categories: [
    'Objekt-Akquise',
    'Käufer-Erstgespräch',
    'Besichtigung',
    'Preisverhandlung',
    'Einwandbehandlung',
    'Abschluss',
    'After-Sales',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: false,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. COACHING & BERATUNG
// ═══════════════════════════════════════════════════════════════════════════

export const COACHING_VERTICAL: VerticalConfig = {
  id: 'coaching',
  label: 'Coaching & Beratung',
  icon: '💼',
  color: '#f59e0b',
  description: 'Business Coaching, Life Coaching & Consulting',
  
  commission_model: 'recurring',
  has_compensation_plan: false,
  has_team_structure: false,
  
  kpis: [
    { id: 'leads', label: 'Leads', emoji: '🎯', unit: 'Anzahl' },
    { id: 'discovery_calls', label: 'Discovery Calls', emoji: '📞', unit: 'Anzahl' },
    { id: 'clients', label: 'Aktive Klienten', emoji: '👤', unit: 'Anzahl' },
    { id: 'sessions', label: 'Sessions', emoji: '🎙️', unit: 'Anzahl/Woche' },
    { id: 'mrr', label: 'MRR', emoji: '💰', unit: '€', description: 'Monthly Recurring Revenue' },
    { id: 'client_lifetime', label: 'Ø Kundendauer', emoji: '📊', unit: 'Monate' },
  ],
  primary_kpi: 'clients',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Lead', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'discovery_call', label: 'Discovery Call', emoji: '🎯', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'proposal', label: 'Angebot gesendet', emoji: '📝', color: '#F59E0B', maps_to_daily_flow: null },
    { id: 'onboarding', label: 'Onboarding', emoji: '🚀', color: '#EC4899', maps_to_daily_flow: null },
    { id: 'session', label: 'Coaching Session', emoji: '🎙️', color: '#22C55E', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#64748B', maps_to_daily_flow: 'reactivations' },
  ],
  
  goal_types: [
    { id: 'income', label: 'Umsatz-Ziel', emoji: '💰', unit: '€/Monat' },
    { id: 'clients', label: 'Klienten aufbauen', emoji: '👤', unit: 'Anzahl' },
    { id: 'mrr', label: 'MRR erreichen', emoji: '📈', unit: '€/Monat' },
  ],
  
  objection_context: {
    typical_objections: [
      'Das ist mir zu teuer',
      'Ich habe gerade keine Zeit',
      'Ich muss noch überlegen',
      'Ich bin mir nicht sicher, ob Coaching was für mich ist',
      'Was ist der ROI?',
      'Ich habe schon einen Coach',
      'Ich schaffe das alleine',
      'Mein Geschäftspartner muss zustimmen',
    ],
    tone: 'empathisch, fragend, transformationsorientiert',
    product_type: 'High-Ticket Coaching / Beratung',
    decision_maker: 'Unternehmer / Führungskraft',
    sales_cycle: '2-8 Wochen',
    price_range: '2.000€ - 25.000€',
  },
  
  daily_flow_defaults: {
    new_contacts: 5,
    followups: 6,
    reactivations: 2,
  },
  
  playbook_categories: [
    'Lead Nurturing',
    'Discovery Call',
    'Needs Analysis',
    'Angebotspräsentation',
    'Einwandbehandlung',
    'Abschluss',
    'Onboarding',
    'Retention',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: false,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. FINANZVERTRIEB
// ═══════════════════════════════════════════════════════════════════════════

export const FINANCE_VERTICAL: VerticalConfig = {
  id: 'finance',
  label: 'Finanzvertrieb',
  icon: '💰',
  color: '#3b82f6',
  description: 'Finanzberatung, Investments & Vermögensaufbau',
  
  commission_model: 'hybrid',
  has_compensation_plan: true,
  has_team_structure: true,
  
  kpis: [
    { id: 'leads', label: 'Leads', emoji: '🎯', unit: 'Anzahl' },
    { id: 'consultations', label: 'Beratungen', emoji: '📊', unit: 'Anzahl' },
    { id: 'applications', label: 'Anträge', emoji: '📝', unit: 'Anzahl' },
    { id: 'contracts', label: 'Abschlüsse', emoji: '✅', unit: 'Anzahl' },
    { id: 'volume', label: 'Abschluss-Volumen', emoji: '💎', unit: '€' },
    { id: 'commission', label: 'Provision', emoji: '💰', unit: '€' },
  ],
  primary_kpi: 'contracts',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Kontakt', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'consultation', label: 'Beratungsgespräch', emoji: '📊', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'application', label: 'Antrag gestellt', emoji: '📝', color: '#F59E0B', maps_to_daily_flow: null },
    { id: 'close', label: 'Abschluss', emoji: '✅', color: '#22C55E', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#64748B', maps_to_daily_flow: 'reactivations' },
    { id: 'referral', label: 'Empfehlung erhalten', emoji: '🌟', color: '#EC4899', maps_to_daily_flow: null },
  ],
  
  goal_types: [
    { id: 'income', label: 'Provisions-Ziel', emoji: '💰', unit: '€/Monat' },
    { id: 'contracts', label: 'Abschlüsse', emoji: '✅', unit: 'Anzahl/Monat' },
    { id: 'volume', label: 'Volumen', emoji: '💎', unit: '€/Monat' },
  ],
  
  objection_context: {
    typical_objections: [
      'Ich habe schon einen Berater',
      'Das ist mir zu riskant',
      'Ich habe kein Geld zum Sparen',
      'Ich muss das mit meiner Frau/Mann besprechen',
      'Die Rendite ist zu niedrig',
      'Ich verstehe das Produkt nicht',
      'Ich habe gehört, das ist unseriös',
      'Ich brauche Bedenkzeit',
    ],
    tone: 'vertrauenswürdig, kompetent, langfristig denkend',
    product_type: 'Finanzprodukte (Versicherung, Investment, Vorsorge)',
    decision_maker: 'Privatperson / Paar',
    sales_cycle: '2-6 Wochen',
    price_range: '50€ - 500€ monatlich',
  },
  
  daily_flow_defaults: {
    new_contacts: 6,
    followups: 8,
    reactivations: 2,
  },
  
  playbook_categories: [
    'Erstkontakt',
    'Bedarfsanalyse',
    'Produktpräsentation',
    'Einwandbehandlung',
    'Abschluss',
    'Empfehlungsmarketing',
    'Bestandskundenpflege',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: true,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. VERSICHERUNG
// ═══════════════════════════════════════════════════════════════════════════

export const INSURANCE_VERTICAL: VerticalConfig = {
  id: 'insurance',
  label: 'Versicherung',
  icon: '🛡️',
  color: '#0ea5e9',
  description: 'Versicherungsvermittlung & Maklertätigkeit',
  
  commission_model: 'hybrid',
  has_compensation_plan: false,
  has_team_structure: false,
  
  kpis: [
    { id: 'leads', label: 'Leads', emoji: '🎯', unit: 'Anzahl' },
    { id: 'consultations', label: 'Beratungen', emoji: '📊', unit: 'Anzahl' },
    { id: 'quotes', label: 'Angebote', emoji: '📝', unit: 'Anzahl' },
    { id: 'policies', label: 'Policen', emoji: '📋', unit: 'Anzahl' },
    { id: 'premium_volume', label: 'Prämienvolumen', emoji: '💰', unit: '€' },
  ],
  primary_kpi: 'policies',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Kontakt', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'consultation', label: 'Beratung', emoji: '📊', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'quote', label: 'Angebot erstellt', emoji: '📝', color: '#F59E0B', maps_to_daily_flow: null },
    { id: 'close', label: 'Abschluss', emoji: '✅', color: '#22C55E', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#64748B', maps_to_daily_flow: 'reactivations' },
  ],
  
  goal_types: [
    { id: 'income', label: 'Provisions-Ziel', emoji: '💰', unit: '€/Monat' },
    { id: 'policies', label: 'Policen abschließen', emoji: '📋', unit: 'Anzahl/Monat' },
  ],
  
  objection_context: {
    typical_objections: [
      'Ich bin schon gut versichert',
      'Das ist mir zu teuer',
      'Ich muss das mit meinem Partner besprechen',
      'Die Versicherung zahlt ja eh nie',
      'Ich brauche keine Versicherung',
      'Ich habe schlechte Erfahrungen gemacht',
    ],
    tone: 'seriös, beratend, risikobewusst',
    product_type: 'Versicherungsprodukte',
    decision_maker: 'Privatperson / Familie',
    sales_cycle: '1-4 Wochen',
    price_range: '20€ - 200€ monatlich',
  },
  
  daily_flow_defaults: {
    new_contacts: 6,
    followups: 8,
    reactivations: 3,
  },
  
  playbook_categories: [
    'Erstkontakt',
    'Bedarfsanalyse',
    'Produktvergleich',
    'Einwandbehandlung',
    'Abschluss',
    'Bestandskundenpflege',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: false,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. SOLAR / ERNEUERBARE ENERGIEN
// ═══════════════════════════════════════════════════════════════════════════

export const SOLAR_VERTICAL: VerticalConfig = {
  id: 'solar',
  label: 'Solar & Energie',
  icon: '☀️',
  color: '#eab308',
  description: 'Photovoltaik, Speicher & Energielösungen',
  
  commission_model: 'per_deal',
  has_compensation_plan: false,
  has_team_structure: false,
  
  kpis: [
    { id: 'leads', label: 'Leads', emoji: '🎯', unit: 'Anzahl' },
    { id: 'site_visits', label: 'Vor-Ort-Termine', emoji: '🏠', unit: 'Anzahl' },
    { id: 'quotes', label: 'Angebote', emoji: '📝', unit: 'Anzahl' },
    { id: 'installations', label: 'Installationen', emoji: '☀️', unit: 'Anzahl' },
    { id: 'kwp_volume', label: 'kWp Volumen', emoji: '⚡', unit: 'kWp' },
    { id: 'revenue', label: 'Umsatz', emoji: '💰', unit: '€' },
  ],
  primary_kpi: 'installations',
  
  activity_types: [
    { id: 'new_contact', label: 'Neuer Lead', emoji: '👋', color: '#10B981', maps_to_daily_flow: 'new_contacts' },
    { id: 'followup', label: 'Follow-up', emoji: '📞', color: '#06B6D4', maps_to_daily_flow: 'followups' },
    { id: 'site_visit', label: 'Vor-Ort-Termin', emoji: '🏠', color: '#8B5CF6', maps_to_daily_flow: null },
    { id: 'quote', label: 'Angebot erstellt', emoji: '📝', color: '#F59E0B', maps_to_daily_flow: null },
    { id: 'close', label: 'Auftrag', emoji: '✅', color: '#22C55E', maps_to_daily_flow: null },
    { id: 'reactivation', label: 'Reaktivierung', emoji: '🔄', color: '#64748B', maps_to_daily_flow: 'reactivations' },
  ],
  
  goal_types: [
    { id: 'income', label: 'Umsatz-Ziel', emoji: '💰', unit: '€/Monat' },
    { id: 'installations', label: 'Installationen', emoji: '☀️', unit: 'Anzahl/Monat' },
    { id: 'kwp', label: 'kWp Volumen', emoji: '⚡', unit: 'kWp/Monat' },
  ],
  
  objection_context: {
    typical_objections: [
      'Das ist mir zu teuer',
      'Lohnt sich das überhaupt?',
      'Mein Dach ist nicht geeignet',
      'Die Technik ändert sich so schnell',
      'Ich warte noch auf bessere Förderung',
      'Was passiert nach 20 Jahren?',
      'Wir planen umzuziehen',
    ],
    tone: 'technisch kompetent, nachhaltigkeitsorientiert, ROI-fokussiert',
    product_type: 'PV-Anlage / Speicher / Komplettlösung',
    decision_maker: 'Hausbesitzer / Familie',
    sales_cycle: '4-12 Wochen',
    price_range: '15.000€ - 50.000€',
  },
  
  daily_flow_defaults: {
    new_contacts: 4,
    followups: 6,
    reactivations: 2,
  },
  
  playbook_categories: [
    'Lead-Qualifizierung',
    'Vor-Ort-Beratung',
    'Angebotspräsentation',
    'Einwandbehandlung',
    'Abschluss',
    'After-Sales',
  ],
  
  features: {
    lead_scoring: true,
    proposal_reminders: true,
    team_dashboard: false,
    finance_tracking: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_VERTICALS: Record<VerticalId, VerticalConfig> = {
  network_marketing: NETWORK_MARKETING_VERTICAL,
  real_estate: REAL_ESTATE_VERTICAL,
  coaching: COACHING_VERTICAL,
  finance: FINANCE_VERTICAL,
  insurance: INSURANCE_VERTICAL,
  solar: SOLAR_VERTICAL,
  custom: {
    ...NETWORK_MARKETING_VERTICAL,
    id: 'custom',
    label: 'Eigene Branche',
    icon: '⚙️',
    color: '#64748b',
    description: 'Individuelle Konfiguration',
  },
};

export const VERTICAL_LIST = Object.values(ALL_VERTICALS).filter(v => v.id !== 'custom');

