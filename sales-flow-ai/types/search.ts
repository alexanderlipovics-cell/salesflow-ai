export type SearchSortBy = 'relevance' | 'created_at' | 'lead_score' | 'next_action';
export type SearchSortOrder = 'asc' | 'desc';

export interface AdvancedFilters {
  created_after?: string;
  created_before?: string;
  next_action_after?: string;
  next_action_before?: string;

  statuses?: string[];
  lifecycle_stages?: string[];
  lead_sources?: string[];

  lead_score_min?: number;
  lead_score_max?: number;

  last_contact_days?: number;
  total_interactions_min?: number;

  custom_fields?: Record<string, unknown>;

  tags_all?: string[];
  tags_any?: string[];
  tags_none?: string[];
}

export interface SearchQuery {
  query: string;
  filters?: AdvancedFilters;
  sort_by?: SearchSortBy;
  sort_order?: SearchSortOrder;
  page?: number;
  page_size?: number;
}

export interface SearchResult {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  lead_score?: number;
  rank: number;
  headline?: string;
  matched_fields: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: AdvancedFilters;
  sort_by: SearchSortBy;
  sort_order: SearchSortOrder;
  created_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  results_count: number;
  searched_at: string;
}

