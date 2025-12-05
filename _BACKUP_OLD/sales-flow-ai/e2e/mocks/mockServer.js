// e2e/mocks/mockServer.js

const MOCK_USER_PROFILE = {
  id: 'user-test-123',
  full_name: 'Test User',
  email: 'test@example.com'
};

const MOCK_TODAY_DATA = {
  user_stats: {
    today_contacts_done: 5,
    today_points_done: 25,
    today_contacts_target: 20,
    today_points_target: 40,
    streak_day: 3
  },
  due_leads: [
    {
      id: 'lead-1',
      name: 'Lisa Müller',
      company_name: 'TechCorp',
      stage: 'warm',
      channel: 'whatsapp',
      priority_score: 0.85,
      next_contact_due_at: new Date(Date.now() + 3600000).toISOString()
    },
    {
      id: 'lead-2',
      name: 'Max Weber',
      company_name: 'StartupX',
      stage: 'hot',
      channel: 'call',
      priority_score: 0.95,
      next_contact_due_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  squad_summary: {
    challenge_title: 'November Sprint',
    my_rank: 3,
    my_points: 180,
    team_points: 1240,
    target_points: 2000
  }
};

const MOCK_SPEED_HUNTER_SESSION = {
  session_id: 'session-test-123',
  started_at: new Date().toISOString(),
  current_lead: {
    id: 'lead-hunter-1',
    name: 'Anna Schmidt',
    company_name: 'GlobalCorp',
    stage: 'warm',
    disc_primary: 'I',
    last_contact_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
};

const MOCK_SQUAD_DATA = {
  has_active_challenge: true,
  challenge: {
    id: 'challenge-1',
    title: 'November Sprint',
    description: 'Push hard this month!',
    start_date: '2025-11-01',
    end_date: '2025-11-30',
    target_points: 2000
  },
  me: {
    rank: 3,
    points: 180
  },
  leaderboard: [
    { rank: 1, user_id: 'user-1', name: 'Sabrina', points: 360 },
    { rank: 2, user_id: 'user-2', name: 'Marco', points: 260 },
    { rank: 3, user_id: 'user-test-123', name: 'Test User', points: 180 },
    { rank: 4, user_id: 'user-4', name: 'Lisa', points: 75 },
    { rank: 5, user_id: 'user-5', name: 'Tom', points: 40 }
  ]
};

module.exports = {
  MOCK_USER_PROFILE,
  MOCK_TODAY_DATA,
  MOCK_SPEED_HUNTER_SESSION,
  MOCK_SQUAD_DATA,
  
  getMockResponse: (endpoint) => {
    const mocks = {
      '/api/mobile/today': MOCK_TODAY_DATA,
      '/api/mobile/speed-hunter/session': MOCK_SPEED_HUNTER_SESSION,
      '/api/mobile/squad': MOCK_SQUAD_DATA,
      '/api/mobile/profile': MOCK_USER_PROFILE
    };
    
    return mocks[endpoint] || { error: 'Mock not found' };
  }
};

