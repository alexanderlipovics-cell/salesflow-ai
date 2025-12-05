export type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  instagram: string | null;
  vertical: string | null;
  status: string;
};

export type LeadTask = {
  id: string;
  lead_id: string;
  task_type: 'hunter' | 'follow_up' | 'field_ops';
  status: 'open' | 'done' | 'skipped';
  due_at: string | null;
  note: string | null;
};

// Dieser Typ verbindet den Task mit den Lead-Daten (JOIN)
// Wichtig für das Hunter Board, da wir dort den Namen anzeigen müssen.
export type HunterTask = LeadTask & {
  lead: Lead | null;
};

// ─────────────────────────────────────────────────────────────────
// Lead Scoring Types
// ─────────────────────────────────────────────────────────────────

export type LeadScore = {
  id: string;
  lead_id: string;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  calculated_at: string;
  factors: ScoreFactor[];
};

export type ScoreFactor = {
  rule_id: string;
  rule_name: string;
  points: number;
  reason: string;
};

export type LeadScoringRule = {
  id: string;
  name: string;
  description: string;
  field: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: string | number | null;
  points: number;
  is_active: boolean;
};

// Lead mit Score (aus View leads_with_scores)
export type LeadWithScore = Lead & {
  score: number | null;
  temperature: 'hot' | 'warm' | 'cold' | null;
  calculated_at: string | null;
};

// Follow-Up Task mit Lead und Score
export type FollowUpTask = LeadTask & {
  lead: LeadWithScore | null;
};

