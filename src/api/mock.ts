/**
 * Mock API
 * Mock implementations for development/testing
 */

export type TodayData = {
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

export type SpeedHunterSession = {
  session_id: string;
  currentLead?: any;
};

export type GeneralActionResponse = {
  success: boolean;
  points: number;
};

const simulateNetworkDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchToday = async (): Promise<TodayData> => {
  await simulateNetworkDelay(300);
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

export const startSpeedHunterSession = async (): Promise<SpeedHunterSession> => {
  await simulateNetworkDelay(300);
  return {
    session_id: `session_${Date.now()}`,
  };
};

export const fetchNextLead = async (sessionId: string): Promise<any> => {
  await simulateNetworkDelay(300);
  return {
    id: `lead_${Date.now()}`,
    name: 'Test Lead',
    stage: 'hot_prospect',
    company_id: 'test_company',
    disc_primary: 'D',
    last_contact_at: new Date().toISOString(),
  };
};

export const logSpeedHunterAction = async (
  sessionId: string,
  data: {
    lead_id: string;
    outcome: string;
    channel: string;
  }
): Promise<any> => {
  await simulateNetworkDelay(200);
  return { success: true };
};

export const logGeneralAction = async (
  leadId: string,
  actionType: string,
  outcome: string,
  points: number = 5
): Promise<GeneralActionResponse> => {
  await simulateNetworkDelay(200);
  return {
    success: true,
    points,
  };
};

