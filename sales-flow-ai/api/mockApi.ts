// api/mockApi.ts

import { Platform } from 'react-native';
import { Stage, Channel, Outcome, DISC } from '../types/leadCrud';

// Utility-Funktion zur Simulation einer API-Latenz
const simulateNetworkDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// --- Typdefinitionen basierend auf den JSON-Beispielen ---

// 2.1 GET /api/mobile/today
export type UserStats = {
  today_contacts_target: number;
  today_contacts_done: number;
  today_points_target: number;
  today_points_done: number;
  streak_day: number;
};

export type DueLead = {
  id: string;
  name: string;
  stage: Stage; // Jetzt typisiert
  next_contact_due_at: string;
  priority_score: number;
  channel: Channel; // Jetzt typisiert
  company_name: string;
};

export type SquadSummary = {
  has_active_challenge: boolean;
  challenge_title: string;
  my_rank: number;
  my_points: number;
  my_team_points: number;
  target_points: number;
};

export type TodayData = {
  user_stats: UserStats;
  due_leads: DueLead[];
  squad_summary: SquadSummary;
};

// 2.2 Speed Hunter
export type NextLead = {
  lead_id: string;
  name: string;
  stage: Stage; // Jetzt typisiert
  last_contact_at: string;
  disc_primary: DISC; // Jetzt typisiert
  company_id: string;
  language_code: string;
};

export type SpeedHunterSessionResponse = {
  session_id: string;
  daily_goal: number;
  mode: 'points' | 'contacts';
  streak_day: number;
  next_lead: NextLead;
};

export type SpeedHunterActionResponse = {
  ok: boolean;
  new_totals: {
    total_contacts: number;
    total_points: number;
  };
  next_lead: NextLead;
};

// 2.4 GET /api/mobile/squad
export type Challenge = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  target_points: number;
};

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  name: string;
  points: number;
  team_name: string;
  is_me: boolean;
};

export type SquadData = {
  has_active_challenge: boolean;
  challenge: {
    title: string;
    start_date: string;
    end_date: string;
    target_points: number;
  };
  me: {
    rank: number;
    points: number;
  };
  leaderboard: LeaderboardEntry[];
};

// 2.5 GET /api/mobile/profile
export type UserProfile = {
  id: string;
  name: string;
  email: string;
};

export type UserSettings = {
  default_company_id: string;
  default_company_name: string;
  daily_goal_contacts: number;
  daily_goal_mode: 'points' | 'contacts';
  language_code: string;
  notifications_enabled: boolean;
};

export type ProfileData = {
  user: UserProfile;
  settings: UserSettings;
};

// 2.3 GET /api/mobile/leads/{id}
export type LeadDetail = {
  id: string;
  name: string;
  phone: string;
  channel_main: Channel; // Jetzt typisiert
  stage: Stage; // Jetzt typisiert
  disc_primary: DISC; // Jetzt typisiert
  disc_confidence: number;
  company_id: string;
};

export type LastActivity = {
  type: string;
  at: string;
  note: string;
};

export type NextStep = {
  due_at: string;
  suggestion: string;
};

export type RecentAction = {
  id: string;
  type: Channel | 'speed_hunter'; // Channel oder interne Art (Channel includes phone_call now)
  outcome: Outcome; // Jetzt typisiert
  at: string;
};

// 8. POST /api/mobile/action (Loggt eine allgemeine Aktion)
// Typ für die Antwort, ähnlich wie Speed Hunter, aber ohne next_lead
export type GeneralActionResponse = {
  ok: boolean;
  new_totals: {
    total_contacts: number;
    total_points: number;
  };
};

export type LeadDetailData = {
  lead: LeadDetail;
  last_activity: LastActivity;
  next_step: NextStep;
  memory_summary: string[];
  recent_actions: RecentAction[];
};

// --- Mock-Daten ---

const MOCK_TODAY_DATA: TodayData = {
  user_stats: {
    today_contacts_target: 20,
    today_contacts_done: 8,
    today_points_target: 40,
    today_points_done: 22,
    streak_day: 4
  },
  due_leads: [
    {
      id: "lead-1",
      name: "Katrin H.",
      stage: "early_follow_up",
      next_contact_due_at: "2025-11-30T15:00:00Z",
      priority_score: 0.92,
      channel: "whatsapp",
      company_name: "Zinzino"
    },
    {
      id: "lead-2",
      name: "Michael S.",
      stage: "reactivation",
      next_contact_due_at: "2025-11-30T18:30:00Z",
      priority_score: 0.81,
      channel: "instagram_dm",
      company_name: "Herbalife"
    },
    {
      id: "lead-3",
      name: "Sarah M.",
      stage: "interested" as Stage,
      next_contact_due_at: "2025-12-01T10:00:00Z",
      priority_score: 0.98,
      channel: "telegram",
      company_name: "Zinzino"
    },
  ],
  squad_summary: {
    has_active_challenge: true,
    challenge_title: "November Sprint",
    my_rank: 3,
    my_points: 186,
    my_team_points: 1240,
    target_points: 2000
  }
};

const MOCK_SESSION_START_RESPONSE: SpeedHunterSessionResponse = {
  session_id: "sh-session-123",
  daily_goal: 20,
  mode: "points",
  streak_day: 4,
  next_lead: {
    lead_id: "lead-1",
    name: "Katrin H.",
    stage: "early_follow_up",
    last_contact_at: "2025-11-28T18:30:00Z",
    disc_primary: "S",
    company_id: "company-zinzino-1",
    language_code: "de-DE"
  }
};

const MOCK_NEXT_LEAD_RESPONSE: NextLead = {
  lead_id: "lead-2",
  name: "Michael S.",
  stage: "reactivation",
  last_contact_at: "2025-11-21T10:00:00Z",
  disc_primary: "D",
  company_id: "company-zinzino-1",
  language_code: "de-DE"
};

const MOCK_ACTION_RESPONSE: SpeedHunterActionResponse = {
  ok: true,
  new_totals: {
    total_contacts: 9,
    total_points: 26
  },
  next_lead: MOCK_NEXT_LEAD_RESPONSE
};

const MOCK_SQUAD_DATA: SquadData = {
  has_active_challenge: true,
  challenge: {
    title: "November Blitz",
    start_date: "2025-11-01",
    end_date: "2025-11-30",
    target_points: 1000
  },
  me: {
    rank: 7,
    points: 450
  },
  leaderboard: [
    { user_id: 'u-456', name: 'Max Mustermann', rank: 1, points: 580, team_name: 'Alpha', is_me: false },
    { user_id: 'u-789', name: 'Anna Schmidt', rank: 2, points: 520, team_name: 'Beta', is_me: false },
    { user_id: 'u-012', name: 'Tom Weber', rank: 3, points: 490, team_name: 'Alpha', is_me: false },
    { user_id: 'u-111', name: 'Lisa Müller', rank: 4, points: 470, team_name: 'Gamma', is_me: false },
    { user_id: 'u-222', name: 'Peter Klein', rank: 5, points: 460, team_name: 'Beta', is_me: false },
    { user_id: 'u-333', name: 'Sarah Groß', rank: 6, points: 455, team_name: 'Alpha', is_me: false },
    { user_id: 'u-123', name: 'Du', rank: 7, points: 450, team_name: 'Beta', is_me: true },
    { user_id: 'u-444', name: 'Michael Lang', rank: 8, points: 440, team_name: 'Gamma', is_me: false },
    { user_id: 'u-555', name: 'Julia Kurz', rank: 9, points: 430, team_name: 'Alpha', is_me: false },
    { user_id: 'u-666', name: 'David Braun', rank: 10, points: 420, team_name: 'Beta', is_me: false },
  ]
};

const MOCK_PROFILE_DATA: ProfileData = {
  user: {
    id: "user-123",
    name: "Alex",
    email: "alex@example.com"
  },
  settings: {
    default_company_id: "company-zinzino-1",
    default_company_name: "Zinzino",
    daily_goal_contacts: 20,
    daily_goal_mode: "points",
    language_code: "de-DE",
    notifications_enabled: true
  }
};

const MOCK_LEAD_DETAIL_DATA: LeadDetailData = {
  lead: {
    id: "lead-1",
    name: "Katrin H.",
    phone: "+43664...",
    channel_main: "whatsapp",
    stage: "early_follow_up",
    disc_primary: "S",
    disc_confidence: 0.8,
    company_id: "company-zinzino-1"
  },
  last_activity: {
    type: "message",
    at: "2025-11-29T17:00:00Z",
    note: "Sie will nach dem Wochenende entscheiden."
  },
  next_step: {
    due_at: "2025-12-01T18:00:00Z",
    suggestion: "kurzer Reminder mit Fokus auf Alltagstauglichkeit"
  },
  memory_summary: [
    "hat einen stressigen Bürojob",
    "möchte keine täglichen Zoom-Calls",
    "möchte erst mal Produkte testen, bevor sie über Business nachdenkt"
  ],
  recent_actions: [
    {
      id: "act-1",
      type: "speed_hunter",
      outcome: "interested",
      at: "2025-11-29T17:00:00Z"
    },
    {
      id: "act-2",
      type: "phone_call" as Channel,
      outcome: "no_answer",
      at: "2025-11-28T19:30:00Z"
    },
    {
      id: "act-3",
      type: "whatsapp",
      outcome: "lead_inbound",
      at: "2025-11-27T10:00:00Z"
    },
  ]
};

// --- API-Wrapper-Funktionen ---

// 1. GET /api/mobile/today
export const fetchToday = async (): Promise<TodayData> => {
  await simulateNetworkDelay();
  // Platzhalter-URL für das echte Backend
  // const REAL_URL = 'http://your-backend.com/api/mobile/today';
  // const response = await fetch(REAL_URL);
  // return response.json();
  return MOCK_TODAY_DATA;
};

// 2. POST /api/speed-hunter/session
export const startSpeedHunterSession = async (goal: number, mode: 'points' | 'contacts'): Promise<SpeedHunterSessionResponse> => {
  await simulateNetworkDelay();
  // Die Body-Logik wurde in den Mock verschoben, das echte Backend würde den Body nutzen
  return MOCK_SESSION_START_RESPONSE;
};

// 3. GET /api/speed-hunter/session/{session_id}/next-lead
export const fetchNextLead = async (sessionId: string): Promise<NextLead> => {
  await simulateNetworkDelay();
  // Die Session-ID wird hier ignoriert, da der Mock immer den gleichen Lead liefert
  return MOCK_NEXT_LEAD_RESPONSE;
};

// 4. POST /api/speed-hunter/action
export const logSpeedHunterAction = async (sessionId: string, leadId: string, actionType: string, outcome: string): Promise<SpeedHunterActionResponse> => {
  await simulateNetworkDelay();
  // Hier würde das echte Backend die Aktion loggen und die neuen Totals berechnen
  return MOCK_ACTION_RESPONSE;
};

// 6. GET /api/mobile/squad
export const fetchSquad = async (): Promise<SquadData> => {
  await simulateNetworkDelay();
  // const REAL_URL = 'http://your-backend.com/api/mobile/squad';
  // const response = await fetch(REAL_URL);
  // return response.json();
  return MOCK_SQUAD_DATA;
};

// 7. GET /api/mobile/profile
export const fetchProfile = async (): Promise<ProfileData> => {
  await simulateNetworkDelay();
  // const REAL_URL = 'http://your-backend.com/api/mobile/profile';
  // const response = await fetch(REAL_URL);
  // return response.json();
  return MOCK_PROFILE_DATA;
};

// Available companies (could come from API)
export const AVAILABLE_COMPANIES = ['GlobalCorp', 'SmallBiz', 'EnterpriseX', 'StartupY', 'Zinzino', 'Herbalife'];

// Update profile settings
export const updateProfileSettings = async (
  newSettings: { default_company_name: string }
): Promise<ProfileData> => {
  await simulateNetworkDelay(400);
  
  MOCK_PROFILE_DATA.settings.default_company_name = newSettings.default_company_name;
  
  return MOCK_PROFILE_DATA;
};

// 5. GET /api/mobile/leads/{id}
export const fetchLeadDetail = async (leadId: string): Promise<LeadDetailData> => {
  await simulateNetworkDelay();
  // const REAL_URL = `http://your-backend.com/api/mobile/leads/${leadId}`;
  // const response = await fetch(REAL_URL);
  // return response.json();
  return MOCK_LEAD_DETAIL_DATA;
};

// 8. POST /api/mobile/action (Loggt eine allgemeine Aktion)
// Wird von LeadDetailScreen oder Call/Message-Buttons verwendet.
export const logGeneralAction = async (
  leadId: string, 
  actionType: string, 
  outcome: string, 
  points: number = 5
): Promise<GeneralActionResponse> => {
  await simulateNetworkDelay(400); 
  
  // Im Mock: Wir erhöhen die Totals basierend auf der letzten bekannten total.
  // Im echten Backend würde der Server dies berechnen.
  
  const currentTotalContacts = MOCK_TODAY_DATA.user_stats.today_contacts_done;
  const currentTotalPoints = MOCK_TODAY_DATA.user_stats.today_points_done;

  MOCK_TODAY_DATA.user_stats.today_contacts_done = currentTotalContacts + 1;
  MOCK_TODAY_DATA.user_stats.today_points_done = currentTotalPoints + points;

  return {
    ok: true,
    new_totals: {
      total_contacts: MOCK_TODAY_DATA.user_stats.today_contacts_done,
      total_points: MOCK_TODAY_DATA.user_stats.today_points_done,
    },
  };
};

