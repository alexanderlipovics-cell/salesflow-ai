// ============================================
// 🔌 SALESFLOW AI - API HOOKS (React Query)
// ============================================

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type {
  Lead,
  LeadActivity,
  FollowUpSequence,
  ScheduledFollowUp,
  Team,
  Blueprint,
  DashboardStats,
  Conversation,
  ChatMessage,
  Notification,
  ApiResponse,
  Pagination,
} from '../types/salesflow-ui';

// ==================== API CLIENT ====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// ==================== QUERY KEYS ====================

export const queryKeys = {
  // Leads
  leads: ['leads'] as const,
  lead: (id: string) => ['leads', id] as const,
  leadActivities: (id: string) => ['leads', id, 'activities'] as const,
  hotLeads: ['leads', 'hot'] as const,

  // Dashboard
  dashboardStats: ['dashboard', 'stats'] as const,
  pipeline: ['dashboard', 'pipeline'] as const,

  // Follow-ups
  sequences: ['sequences'] as const,
  sequence: (id: string) => ['sequences', id] as const,
  scheduledFollowUps: ['followups', 'scheduled'] as const,
  overdueFollowUps: ['followups', 'overdue'] as const,

  // Team
  team: ['team'] as const,
  teamMembers: ['team', 'members'] as const,
  blueprints: ['blueprints'] as const,
  blueprint: (id: string) => ['blueprints', id] as const,

  // Chat
  conversations: ['conversations'] as const,
  conversation: (id: string) => ['conversations', id] as const,

  // Notifications
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
};

// ==================== LEAD HOOKS ====================

export function useLeads(params?: {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [...queryKeys.leads, params],
    queryFn: () => apiClient<Lead[]>(`/leads?${new URLSearchParams(params as Record<string, string>)}`),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useInfiniteLeads(params?: { status?: string; priority?: string }) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.leads, 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      apiClient<Lead[]>(`/leads?page=${pageParam}&pageSize=20&${new URLSearchParams(params as Record<string, string>)}`),
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination) return undefined;
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => apiClient<Lead>(`/leads/${id}`),
    enabled: !!id,
  });
}

export function useHotLeads(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.hotLeads, limit],
    queryFn: () => apiClient<Lead[]>(`/leads?priority=hot&limit=${limit}&sort=score:desc`),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: queryKeys.leadActivities(leadId),
    queryFn: () => apiClient<LeadActivity[]>(`/leads/${leadId}/activities`),
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      apiClient<Lead>('/leads', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      apiClient<Lead>(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
    },
  });
}

export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, data }: { ids: string[]; data: Partial<Lead> }) =>
      apiClient<void>('/leads/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ ids, data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads });
    },
  });
}

// ==================== DASHBOARD HOOKS ====================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: () => apiClient<DashboardStats>('/dashboard/stats'),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: queryKeys.pipeline,
    queryFn: () => apiClient<{ stages: Array<{ name: string; count: number; value: number }> }>('/dashboard/pipeline'),
    staleTime: 60 * 1000,
  });
}

// ==================== FOLLOW-UP HOOKS ====================

export function useSequences() {
  return useQuery({
    queryKey: queryKeys.sequences,
    queryFn: () => apiClient<FollowUpSequence[]>('/follow-ups/sequences'),
  });
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: queryKeys.sequence(id),
    queryFn: () => apiClient<FollowUpSequence>(`/follow-ups/sequences/${id}`),
    enabled: !!id,
  });
}

export function useScheduledFollowUps() {
  return useQuery({
    queryKey: queryKeys.scheduledFollowUps,
    queryFn: () => apiClient<ScheduledFollowUp[]>('/follow-ups/scheduled'),
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useOverdueFollowUps() {
  return useQuery({
    queryKey: queryKeys.overdueFollowUps,
    queryFn: () => apiClient<ScheduledFollowUp[]>('/follow-ups/overdue'),
    refetchInterval: 60 * 1000,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FollowUpSequence>) =>
      apiClient<FollowUpSequence>('/follow-ups/sequences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FollowUpSequence> }) =>
      apiClient<FollowUpSequence>(`/follow-ups/sequences/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sequence(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
    },
  });
}

export function useEnrollInSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, sequenceId }: { leadId: string; sequenceId: string }) =>
      apiClient<void>(`/follow-ups/sequences/${sequenceId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledFollowUps });
    },
  });
}

// ==================== TEAM & BLUEPRINT HOOKS ====================

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.team,
    queryFn: () => apiClient<Team>('/team'),
  });
}

export function useBlueprints(params?: { category?: string; isPublic?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.blueprints, params],
    queryFn: () => apiClient<Blueprint[]>(`/team/blueprints?${new URLSearchParams(params as Record<string, string>)}`),
  });
}

export function useBlueprint(id: string) {
  return useQuery({
    queryKey: queryKeys.blueprint(id),
    queryFn: () => apiClient<Blueprint>(`/team/blueprints/${id}`),
    enabled: !!id,
  });
}

export function useCloneBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Blueprint>(`/team/blueprints/${id}/clone`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blueprints });
      queryClient.invalidateQueries({ queryKey: queryKeys.sequences });
    },
  });
}

export function useCreateBlueprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Blueprint>) =>
      apiClient<Blueprint>('/team/blueprints', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blueprints });
    },
  });
}

// ==================== CHAT HOOKS ====================

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => apiClient<Conversation[]>('/chat/conversations'),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => apiClient<Conversation>(`/chat/conversations/${id}`),
    enabled: !!id,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      message,
    }: {
      conversationId?: string;
      message: Partial<ChatMessage>;
    }) =>
      apiClient<{ message: ChatMessage; response: ChatMessage }>(
        conversationId ? `/chat/conversations/${conversationId}/messages` : '/chat/messages',
        {
          method: 'POST',
          body: JSON.stringify(message),
        }
      ),
    onSuccess: (_, { conversationId }) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

// ==================== NOTIFICATION HOOKS ====================

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => apiClient<Notification[]>('/notifications'),
    refetchInterval: 30 * 1000, // 30 seconds
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => apiClient<{ count: number }>('/notifications/unread'),
    refetchInterval: 30 * 1000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient<void>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

// ==================== EXPORT HOOK ====================

export function useExportLeads() {
  return useMutation({
    mutationFn: async (params: { format: 'csv' | 'xlsx'; filters?: Record<string, string> }) => {
      const response = await fetch(
        `${API_BASE_URL}/leads/export?format=${params.format}&${new URLSearchParams(params.filters)}`,
        { method: 'GET' }
      );
      const blob = await response.blob();
      return blob;
    },
  });
}
