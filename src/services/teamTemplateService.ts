/**
 * Team Template Service
 * 
 * API Integration für das Team-Duplikations-System.
 * Verbindet Frontend mit GPT-5.1 Team Duplication Backend.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../config/apiConfig';

// ============================================
// TYPES
// ============================================

export interface TeamTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  created_by: string;
  sequence_ids: string[];
  message_template_ids: string[];
  daily_flow_config?: Record<string, unknown>;
  objection_handler_ids: string[];
  shared_with: string[];
  is_public: boolean;
  version: number;
  times_cloned: number;
  created_at: string;
  updated_at: string;
}

export interface TeamTemplateListItem {
  id: string;
  name: string;
  description?: string;
  created_by_name: string;
  sequence_count: number;
  template_count: number;
  times_cloned: number;
  is_public: boolean;
  created_at: string;
}

export interface CloneTemplateResponse {
  success: boolean;
  cloned_template_id: string;
  cloned_sequences: number;
  cloned_message_templates: number;
  message: string;
}

export interface TeamTemplateSyncStatus {
  clone_id: string;
  original_template_id: string;
  original_version: number;
  current_version: number;
  is_outdated: boolean;
  changes_available: string[];
  last_sync_at?: string;
}

export interface CreateTeamTemplateRequest {
  name: string;
  description?: string;
  sequence_ids?: string[];
  message_template_ids?: string[];
  daily_flow_config?: Record<string, unknown>;
  objection_handler_ids?: string[];
  is_public?: boolean;
}

// ============================================
// API FUNCTIONS
// ============================================

export async function listTeamTemplates(
  includePublic: boolean = true
): Promise<TeamTemplateListItem[]> {
  const response = await apiClient.get<TeamTemplateListItem[]>(
    API_ENDPOINTS.TEAM_TEMPLATES.LIST,
    { params: { include_public: includePublic } }
  );
  return response.data;
}

export async function createTeamTemplate(
  request: CreateTeamTemplateRequest
): Promise<TeamTemplate> {
  const response = await apiClient.post<TeamTemplate>(
    API_ENDPOINTS.TEAM_TEMPLATES.CREATE,
    request
  );
  return response.data;
}

export async function getTeamTemplate(templateId: string): Promise<TeamTemplate> {
  const response = await apiClient.get<TeamTemplate>(
    API_ENDPOINTS.TEAM_TEMPLATES.GET(templateId)
  );
  return response.data;
}

export async function updateTeamTemplate(
  templateId: string,
  request: Partial<CreateTeamTemplateRequest>
): Promise<TeamTemplate> {
  const response = await apiClient.put<TeamTemplate>(
    API_ENDPOINTS.TEAM_TEMPLATES.UPDATE(templateId),
    request
  );
  return response.data;
}

export async function cloneTeamTemplate(
  templateId: string,
  customizeName?: string
): Promise<CloneTemplateResponse> {
  const response = await apiClient.post<CloneTemplateResponse>(
    API_ENDPOINTS.TEAM_TEMPLATES.CLONE(templateId),
    { customize_name: customizeName }
  );
  return response.data;
}

export async function shareTeamTemplate(
  templateId: string,
  userIds: string[]
): Promise<{ success: boolean; shared_with_count: number; message: string }> {
  const response = await apiClient.post<{
    success: boolean;
    shared_with_count: number;
    message: string;
  }>(API_ENDPOINTS.TEAM_TEMPLATES.SHARE(templateId), { user_ids: userIds });
  return response.data;
}

export async function getSyncStatus(
  templateId: string,
  cloneId: string
): Promise<TeamTemplateSyncStatus> {
  const response = await apiClient.get<TeamTemplateSyncStatus>(
    API_ENDPOINTS.TEAM_TEMPLATES.SYNC_STATUS(templateId),
    { params: { clone_id: cloneId } }
  );
  return response.data;
}

export async function syncWithOriginal(
  templateId: string,
  cloneId: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    API_ENDPOINTS.TEAM_TEMPLATES.SYNC(templateId),
    undefined,
    { params: { clone_id: cloneId } }
  );
  return response.data;
}

// ============================================
// REACT QUERY KEYS
// ============================================

export const teamTemplateQueryKeys = {
  all: ['team-templates'] as const,
  list: ['team-templates', 'list'] as const,
  detail: (id: string) => ['team-templates', 'detail', id] as const,
  syncStatus: (id: string, cloneId: string) =>
    ['team-templates', 'sync-status', id, cloneId] as const,
};

export default {
  listTeamTemplates,
  createTeamTemplate,
  getTeamTemplate,
  updateTeamTemplate,
  cloneTeamTemplate,
  shareTeamTemplate,
  getSyncStatus,
  syncWithOriginal,
};

