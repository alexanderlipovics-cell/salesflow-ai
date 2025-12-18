/**
 * API Index
 * Production-ready API layer with mock/live switching
 */
import { apiClient } from './client';
import { API_CONFIG } from '../config/api';
import { ApiResponse } from '../types/api';

// Import mock API functions if they exist
// For now, we'll use inline mocks
type TodayData = {
  user_stats: {
    today_contacts_target: number;
    today_contacts_done: number;
    today_points_target: number;
    today_points_done: number;
    streak_day: number;
  };
  due_leads: any[];
  squad_summary: any;
};

type SpeedHunterSession = {
  session_id: string;
  currentLead?: any;
};

type GeneralActionResponse = {
  success: boolean;
  points: number;
};

// Mock implementations (fallback)
const mockFetchToday = async (): Promise<TodayData> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    user_stats: {
      today_contacts_target: 20,
      today_contacts_done: 5,
      today_points_target: 40,
      today_points_done: 12,
      streak_day: 3,
    },
    due_leads: [],
    squad_summary: {
      has_active_challenge: true,
      challenge_title: 'November Sprint',
      my_rank: 5,
      my_points: 120,
      my_team_points: 800,
      target_points: 2000,
    },
  };
};

const mockStartSpeedHunterSession = async (): Promise<SpeedHunterSession> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    session_id: `session_${Date.now()}`,
  };
};

const mockLogGeneralAction = async (
  leadId: string,
  actionType: string,
  outcome: string,
  points: number = 5
): Promise<GeneralActionResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    success: true,
    points,
  };
};

/**
 * Fetch today's data
 */
export const fetchToday = async (): Promise<TodayData> => {
  if (API_CONFIG.USE_MOCK_API) {
    return mockFetchToday();
  }

  const response = await apiClient.get<TodayData>('today');
  return response.data;
};

/**
 * Start Speed Hunter session
 */
export const startSpeedHunterSession = async (): Promise<SpeedHunterSession> => {
  if (API_CONFIG.USE_MOCK_API) {
    return mockStartSpeedHunterSession();
  }

  const response = await apiClient.post<SpeedHunterSession>('speed-hunter/start');
  return response.data;
};

/**
 * Fetch next lead in Speed Hunter session
 */
export const fetchNextLead = async (sessionId: string): Promise<any> => {
  if (API_CONFIG.USE_MOCK_API) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      id: `lead_${Date.now()}`,
      name: 'Test Lead',
      stage: 'hot_prospect',
      company_id: 'test_company',
      disc_primary: 'D',
      last_contact_at: new Date().toISOString(),
    };
  }

  const response = await apiClient.get<any>(`speed-hunter/${sessionId}/next`);
  return response.data;
};

/**
 * Log Speed Hunter action
 */
export const logSpeedHunterAction = async (
  sessionId: string,
  data: {
    lead_id: string;
    outcome: string;
    channel: string;
  }
): Promise<any> => {
  if (API_CONFIG.USE_MOCK_API) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { success: true };
  }

  const response = await apiClient.post<any>(`speed-hunter/${sessionId}/action`, data);
  return response.data;
};

/**
 * Log general action
 */
export const logGeneralAction = async (
  leadId: string,
  actionType: string,
  outcome: string,
  points: number = 5
): Promise<GeneralActionResponse> => {
  if (API_CONFIG.USE_MOCK_API) {
    return mockLogGeneralAction(leadId, actionType, outcome, points);
  }

  const response = await apiClient.post<GeneralActionResponse>('action', {
    lead_id: leadId,
    action_type: actionType,
    outcome,
    points,
  });

  return response.data;
};

// Export API client for advanced usage
export { apiClient };
export * from './client';
export * from '../types/api';

