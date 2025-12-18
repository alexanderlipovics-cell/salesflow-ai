/**
 * Analytics Dashboard Types
 * Complete type definitions for the 10-query analytics dashboard
 */

export interface TemplateWinner {
  template_id: string;
  template_name: string;
  partner_conversions_30d: number;
}

export interface SegmentPerformance {
  segment_id: string;
  segment_name: string;
  leads_in_segment: number;
  partner_conversions: number;
  partner_conversion_rate_pct: number;
}

export interface CompanyFunnelSpeed {
  company_name: string;
  leads_with_partner: number;
  avg_days_to_partner: number;
  min_days_to_partner: number;
  max_days_to_partner: number;
}

export interface ChannelReplyRate {
  company_name: string;
  channel: string;
  outbound_messages: number;
  replies: number;
  reply_rate_pct: number;
}

export interface BestSendTime {
  hour_of_day: number;
  outbound_msgs: number;
  replies: number;
  reply_rate_pct: number;
}

export interface TouchesToPartner {
  avg_touches_until_partner: number;
  min_touches: number;
  max_touches: number;
}

export interface GhostedStage {
  current_stage: string;
  leads_in_stage: number;
  avg_days_since_last_contact: number;
}

export interface TopNetworker {
  user_id: string;
  name: string;
  current_streak: number;
  contacts_30d: number;
  conversions_30d: number;
  conversion_rate_30d_pct: number;
}

export interface CompanyConversion {
  company_name: string;
  leads_total: number;
  partner_leads: number;
  partner_conversion_rate_pct: number;
}

export interface TemplateSegmentMatrix {
  segment_name: string;
  template_name: string;
  partner_conversions: number;
  segment_rank: number;
}

export interface RevenueTimelinePoint {
  date: string;
  revenue: number;
  signups: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface LeadSourceSlice {
  name: string;
  value: number;
}

export interface TopPerformer {
  name: string;
  revenue: number;
}

export interface DashboardData {
  templateWinners: TemplateWinner[];
  segmentPerformance: SegmentPerformance[];
  companyFunnelSpeed: CompanyFunnelSpeed[];
  channelReplyRates: ChannelReplyRate[];
  bestSendTimes: BestSendTime[];
  touchesToPartner: TouchesToPartner;
  ghostedStages: GhostedStage[];
  topNetworkers: TopNetworker[];
  companyConversions: CompanyConversion[];
  templateSegmentMatrix: TemplateSegmentMatrix[];
  lastUpdated: string;
  revenue: number;
  signups: number;
  conversion_rate: number;
  avg_deal_size: number;
  revenue_timeline: RevenueTimelinePoint[];
  funnel: FunnelStage[];
  lead_sources: LeadSourceSlice[];
  top_performers: TopPerformer[];
}

