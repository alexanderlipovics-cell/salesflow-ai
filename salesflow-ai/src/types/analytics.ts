// Analytics Types für Dashboard

export type TemplatePartnerStat = {
  template_id: string;
  template_name: string;
  partner_conversions_30d: number;
};

export type CompanyFunnelSpeed = {
  company_id: string | null;
  company_name: string;
  leads_with_partner: number;
  avg_days_to_partner: number;
  min_days_to_partner: number;
  max_days_to_partner: number;
};

export type SegmentPartnerPerformance = {
  segment_id: string;
  segment_name: string;
  leads_in_segment: number;
  partner_conversions: number;
  partner_conversion_rate_pct: number;
};

export type RepLeaderboardEntry = {
  user_id: string;
  name: string;
  current_streak: number;
  contacts_30d: number;
  conversions_30d: number;
  conversion_rate_30d_pct: number;
};

export type TodayCockpitItem = {
  contact_id: string;
  contact_name: string | null;
  next_action_type: string | null;
  next_action_at: string;
  last_contact_at: string | null;
  status: string;
  lead_score: number;
};

export type AnalyticsData = {
  topTemplates: TemplatePartnerStat[];
  funnelSpeed: CompanyFunnelSpeed[];
  segmentPerformance: SegmentPartnerPerformance[];
  repLeaderboard: RepLeaderboardEntry[];
  todayCockpit: TodayCockpitItem[];
};
