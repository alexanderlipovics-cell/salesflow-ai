export interface Lead {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;

  // Status & Priority
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'nurture';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  temperature: 'hot' | 'warm' | 'cold' | null;

  // Scoring
  p_score: number | null;
  p_score_trend: 'up' | 'down' | 'flat' | null;

  created_at: string;

  // Relations (Joined Data)
  lead_verifications?: LeadVerification[];
  lead_enrichments?: LeadEnrichment[];
  lead_intents?: LeadIntent[];
}

export interface LeadVerification {
  id: string;
  v_score: number;
  email_valid: boolean | null;
  phone_valid: boolean | null;
}

export interface LeadEnrichment {
  id: string;
  company_size_range: string | null;
  person_seniority: string | null;
  person_linkedin_url: string | null;
}

export interface LeadIntent {
  id: string;
  i_score: number;
  intent_stage: string | null;
  last_activity_at: string | null;
}
