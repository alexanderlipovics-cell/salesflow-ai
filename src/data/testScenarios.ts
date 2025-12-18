/**
 * TEAM-CHIEF Test Scenarios
 * Pre-defined squad data for testing AI coaching quality
 */
import { TestScenario, TeamChiefInput, ScenarioType } from '../types/teamChief';

// SCENARIO 1: Balanced Squad (Original Example)
const BALANCED_SQUAD: TeamChiefInput = {
  leader: {
    user_id: "user-alex",
    name: "Alex"
  },
  squad: {
    id: "squad-1",
    name: "Team Phoenix"
  },
  challenge: {
    id: "challenge-1",
    title: "November Sprint",
    start_date: "2025-11-01",
    end_date: "2025-11-30",
    target_points: 2000
  },
  leaderboard: [
    { rank: 1, user_id: "user-sabrina", name: "Sabrina", points: 360 },
    { rank: 2, user_id: "user-marco", name: "Marco", points: 260 },
    { rank: 3, user_id: "user-alex", name: "Alex", points: 210 },
    { rank: 4, user_id: "user-lisa", name: "Lisa", points: 75 },
    { rank: 5, user_id: "user-tom", name: "Tom", points: 40 }
  ],
  member_stats: [
    {
      user_id: "user-sabrina",
      name: "Sabrina",
      points: 360,
      contacts: 95,
      active_days: 19,
      last_active_at: "2025-11-29T19:30:00Z"
    },
    {
      user_id: "user-marco",
      name: "Marco",
      points: 260,
      contacts: 70,
      active_days: 15,
      last_active_at: "2025-11-28T18:45:00Z"
    },
    {
      user_id: "user-alex",
      name: "Alex",
      points: 210,
      contacts: 60,
      active_days: 14,
      last_active_at: "2025-11-29T12:10:00Z"
    },
    {
      user_id: "user-lisa",
      name: "Lisa",
      points: 75,
      contacts: 22,
      active_days: 6,
      last_active_at: "2025-11-20T17:00:00Z"
    },
    {
      user_id: "user-tom",
      name: "Tom",
      points: 40,
      contacts: 12,
      active_days: 4,
      last_active_at: "2025-11-18T16:30:00Z"
    }
  ],
  summary: {
    total_points: 1240,
    total_contacts: 380,
    member_count: 12,
    active_members: 9,
    inactive_members: 3,
    period_from: "2025-11-01",
    period_to: "2025-11-30"
  }
};

// SCENARIO 2: Struggling Squad
const STRUGGLING_SQUAD: TeamChiefInput = {
  leader: {
    user_id: "user-maria",
    name: "Maria"
  },
  squad: {
    id: "squad-2",
    name: "Team Rocket"
  },
  challenge: {
    id: "challenge-1",
    title: "November Sprint",
    start_date: "2025-11-01",
    end_date: "2025-11-30",
    target_points: 2000
  },
  leaderboard: [
    { rank: 1, user_id: "user-maria", name: "Maria", points: 120 },
    { rank: 2, user_id: "user-kevin", name: "Kevin", points: 45 },
    { rank: 3, user_id: "user-sarah", name: "Sarah", points: 30 },
    { rank: 4, user_id: "user-mike", name: "Mike", points: 15 },
    { rank: 5, user_id: "user-julia", name: "Julia", points: 10 }
  ],
  member_stats: [
    {
      user_id: "user-maria",
      name: "Maria",
      points: 120,
      contacts: 35,
      active_days: 8,
      last_active_at: "2025-11-29T14:20:00Z"
    },
    {
      user_id: "user-kevin",
      name: "Kevin",
      points: 45,
      contacts: 15,
      active_days: 3,
      last_active_at: "2025-11-25T10:00:00Z"
    },
    {
      user_id: "user-sarah",
      name: "Sarah",
      points: 30,
      contacts: 10,
      active_days: 2,
      last_active_at: "2025-11-22T16:30:00Z"
    },
    {
      user_id: "user-mike",
      name: "Mike",
      points: 15,
      contacts: 5,
      active_days: 1,
      last_active_at: "2025-11-15T12:00:00Z"
    },
    {
      user_id: "user-julia",
      name: "Julia",
      points: 10,
      contacts: 3,
      active_days: 1,
      last_active_at: "2025-11-10T09:00:00Z"
    }
  ],
  summary: {
    total_points: 220,
    total_contacts: 68,
    member_count: 8,
    active_members: 2,
    inactive_members: 6,
    period_from: "2025-11-01",
    period_to: "2025-11-30"
  }
};

// SCENARIO 3: Star-Heavy Squad
const STAR_HEAVY_SQUAD: TeamChiefInput = {
  leader: {
    user_id: "user-stefan",
    name: "Stefan"
  },
  squad: {
    id: "squad-3",
    name: "Team Elite"
  },
  challenge: {
    id: "challenge-1",
    title: "November Sprint",
    start_date: "2025-11-01",
    end_date: "2025-11-30",
    target_points: 2000
  },
  leaderboard: [
    { rank: 1, user_id: "user-nina", name: "Nina", points: 850 },
    { rank: 2, user_id: "user-paul", name: "Paul", points: 720 },
    { rank: 3, user_id: "user-stefan", name: "Stefan", points: 180 },
    { rank: 4, user_id: "user-emma", name: "Emma", points: 35 },
    { rank: 5, user_id: "user-jonas", name: "Jonas", points: 20 }
  ],
  member_stats: [
    {
      user_id: "user-nina",
      name: "Nina",
      points: 850,
      contacts: 220,
      active_days: 25,
      last_active_at: "2025-11-29T21:00:00Z"
    },
    {
      user_id: "user-paul",
      name: "Paul",
      points: 720,
      contacts: 190,
      active_days: 24,
      last_active_at: "2025-11-29T20:15:00Z"
    },
    {
      user_id: "user-stefan",
      name: "Stefan",
      points: 180,
      contacts: 50,
      active_days: 12,
      last_active_at: "2025-11-29T15:30:00Z"
    },
    {
      user_id: "user-emma",
      name: "Emma",
      points: 35,
      contacts: 12,
      active_days: 3,
      last_active_at: "2025-11-23T11:00:00Z"
    },
    {
      user_id: "user-jonas",
      name: "Jonas",
      points: 20,
      contacts: 8,
      active_days: 2,
      last_active_at: "2025-11-18T14:00:00Z"
    }
  ],
  summary: {
    total_points: 1805,
    total_contacts: 480,
    member_count: 10,
    active_members: 3,
    inactive_members: 7,
    period_from: "2025-11-01",
    period_to: "2025-11-30"
  }
};

// SCENARIO 4: Perfect Squad
const PERFECT_SQUAD: TeamChiefInput = {
  leader: {
    user_id: "user-anna",
    name: "Anna"
  },
  squad: {
    id: "squad-4",
    name: "Dream Team"
  },
  challenge: {
    id: "challenge-1",
    title: "November Sprint",
    start_date: "2025-11-01",
    end_date: "2025-11-30",
    target_points: 2000
  },
  leaderboard: [
    { rank: 1, user_id: "user-lena", name: "Lena", points: 420 },
    { rank: 2, user_id: "user-max", name: "Max", points: 380 },
    { rank: 3, user_id: "user-anna", name: "Anna", points: 360 },
    { rank: 4, user_id: "user-chris", name: "Chris", points: 340 },
    { rank: 5, user_id: "user-sophie", name: "Sophie", points: 320 }
  ],
  member_stats: [
    {
      user_id: "user-lena",
      name: "Lena",
      points: 420,
      contacts: 110,
      active_days: 22,
      last_active_at: "2025-11-29T22:00:00Z"
    },
    {
      user_id: "user-max",
      name: "Max",
      points: 380,
      contacts: 100,
      active_days: 21,
      last_active_at: "2025-11-29T21:30:00Z"
    },
    {
      user_id: "user-anna",
      name: "Anna",
      points: 360,
      contacts: 95,
      active_days: 20,
      last_active_at: "2025-11-29T20:00:00Z"
    },
    {
      user_id: "user-chris",
      name: "Chris",
      points: 340,
      contacts: 90,
      active_days: 19,
      last_active_at: "2025-11-29T19:30:00Z"
    },
    {
      user_id: "user-sophie",
      name: "Sophie",
      points: 320,
      contacts: 85,
      active_days: 18,
      last_active_at: "2025-11-29T18:45:00Z"
    }
  ],
  summary: {
    total_points: 2640,
    total_contacts: 680,
    member_count: 10,
    active_members: 10,
    inactive_members: 0,
    period_from: "2025-11-01",
    period_to: "2025-11-30"
  }
};

// Export all scenarios
export const TEST_SCENARIOS: Record<ScenarioType, TestScenario> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced Squad',
    description: 'Gesundes Squad mit Mix aus Top-Performern und Nachzüglern',
    data: BALANCED_SQUAD,
    expected_focus: [
      'Lisa und Tom reaktivieren',
      'Top-Performer als Mentoren einsetzen',
      'Inaktive Members ansprechen'
    ]
  },
  struggling: {
    id: 'struggling',
    name: 'Struggling Squad',
    description: 'Niedriges Engagement, viele Inaktive, Leader kämpft alleine',
    data: STRUGGLING_SQUAD,
    expected_focus: [
      'Dringend Momentum aufbauen',
      'Individuelle Blockaden verstehen',
      'Realistische Ziele setzen',
      'Leader entlasten'
    ]
  },
  star_heavy: {
    id: 'star_heavy',
    name: 'Star-Heavy Squad',
    description: '2-3 Superstars tragen alles, Rest inaktiv - hohe Abhängigkeit',
    data: STAR_HEAVY_SQUAD,
    expected_focus: [
      'Abhängigkeit von Top-Performern reduzieren',
      'Mittleres Segment aktivieren',
      'Stars als Mentoren nutzen aber nicht überlasten'
    ]
  },
  perfect: {
    id: 'perfect',
    name: 'Perfect Squad',
    description: 'Alle aktiv, Target übertroffen, hohe Energie',
    data: PERFECT_SQUAD,
    expected_focus: [
      'Momentum aufrechterhalten',
      'Nächstes Level setzen',
      'Team feiern',
      'Erfolgsroutinen dokumentieren'
    ]
  },
  all_inactive: {
    id: 'all_inactive',
    name: 'All Inactive',
    description: 'Worst Case - komplettes Squad eingeschlafen',
    data: {
      ...STRUGGLING_SQUAD,
      summary: {
        ...STRUGGLING_SQUAD.summary,
        total_points: 50,
        total_contacts: 15,
        active_members: 0,
        inactive_members: 8
      }
    },
    expected_focus: [
      'Challenge eventuell neu starten',
      'Individuelle 1:1 Gespräche',
      'Grundmotivation hinterfragen'
    ]
  },
  new_squad: {
    id: 'new_squad',
    name: 'New Squad',
    description: 'Frisch gestartet, niedrige Zahlen aber gute Aktivität',
    data: {
      ...BALANCED_SQUAD,
      challenge: {
        ...BALANCED_SQUAD.challenge,
        start_date: '2025-11-25',
        end_date: '2025-12-25'
      },
      summary: {
        total_points: 180,
        total_contacts: 50,
        member_count: 5,
        active_members: 5,
        inactive_members: 0,
        period_from: '2025-11-25',
        period_to: '2025-11-30'
      }
    },
    expected_focus: [
      'Frühes Momentum nutzen',
      'Erwartungen setzen',
      'Routinen etablieren'
    ]
  }
};

