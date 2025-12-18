/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  MOCK DMO SERVICE - NetworkerOS                                            ║
 * ║  Mock-Daten für DMO Tracker, Check-ins, Team Dashboard                     ║
 * ║                                                                            ║
 * ║  TODO: Ersetze diese Mocks mit echten API-Calls wenn Backend fertig ist    ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DMOMetric {
  id: string;
  label: string;
  icon: string;
  current: number;
  target: number;
  color: string;
  description: string;
}

export interface DMOSummary {
  date: string;
  metrics: DMOMetric[];
  completionRate: number;
  statusLevel: 'ahead' | 'on_track' | 'behind' | 'critical';
  estimatedTimeMinutes: number;
}

export interface CheckIn {
  id: string;
  leadId: string;
  leadName: string;
  action: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  isOverdue: boolean;
  disgType?: 'D' | 'I' | 'S' | 'G';
  suggestedMessage?: string;
  completed: boolean;
}

export interface SuggestedContact {
  id: string;
  name: string;
  reason: string;
  lastContact: string;
  score: number;
  disgType?: 'D' | 'I' | 'S' | 'G';
  suggestedAction: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  rank: string;
  status: 'active' | 'inactive' | 'new';
  dmoProgress: number;
  contactsThisWeek: number;
  closesThisMonth: number;
  lastActive: string;
  needsHelp: boolean;
  disgType?: 'D' | 'I' | 'S' | 'G';
}

export interface TeamAlert {
  id: string;
  memberId: string;
  memberName: string;
  type: 'inactive' | 'struggling' | 'achievement' | 'milestone';
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  teamDmoAverage: number;
  teamClosesThisMonth: number;
  teamContactsThisWeek: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const METRIC_COLORS = {
  newContacts: '#10B981',    // Emerald/Green
  checkIns: '#3B82F6',       // Blue
  reactivations: '#F59E0B',  // Amber
  calls: '#A855F7',          // Purple
};

const DEFAULT_TARGETS = {
  newContacts: 8,
  checkIns: 6,
  reactivations: 2,
  calls: 3,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getStatusLevel = (rate: number): DMOSummary['statusLevel'] => {
  if (rate >= 100) return 'ahead';
  if (rate >= 75) return 'on_track';
  if (rate >= 50) return 'behind';
  return 'critical';
};

const randomInt = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

export const generateMockDMOSummary = (): DMOSummary => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  // Simuliere unterschiedliche Fortschritte basierend auf Tageszeit
  const hour = now.getHours();
  const progressMultiplier = Math.min(1, hour / 18); // Bis 18 Uhr sollte alles erledigt sein
  
  const metrics: DMOMetric[] = [
    {
      id: 'newContacts',
      label: 'Neue Kontakte',
      icon: '👤',
      current: Math.round(DEFAULT_TARGETS.newContacts * progressMultiplier * (0.7 + Math.random() * 0.5)),
      target: DEFAULT_TARGETS.newContacts,
      color: METRIC_COLORS.newContacts,
      description: 'Erstansprachen heute',
    },
    {
      id: 'checkIns',
      label: 'Check-ins',
      icon: '🔄',
      current: Math.round(DEFAULT_TARGETS.checkIns * progressMultiplier * (0.6 + Math.random() * 0.6)),
      target: DEFAULT_TARGETS.checkIns,
      color: METRIC_COLORS.checkIns,
      description: 'Nachfass-Aktionen',
    },
    {
      id: 'reactivations',
      label: 'Reaktivierungen',
      icon: '👻',
      current: Math.round(DEFAULT_TARGETS.reactivations * progressMultiplier * (0.5 + Math.random() * 0.7)),
      target: DEFAULT_TARGETS.reactivations,
      color: METRIC_COLORS.reactivations,
      description: 'Ghost-Buster Aktionen',
    },
    {
      id: 'calls',
      label: 'Calls/Meetings',
      icon: '📞',
      current: Math.round(DEFAULT_TARGETS.calls * progressMultiplier * (0.6 + Math.random() * 0.6)),
      target: DEFAULT_TARGETS.calls,
      color: METRIC_COLORS.calls,
      description: 'Telefonate & Meetings',
    },
  ];

  const totalProgress = metrics.reduce((sum, m) => sum + (m.current / m.target), 0);
  const completionRate = Math.min(100, Math.round((totalProgress / metrics.length) * 100));
  
  const remainingActions = metrics.reduce((sum, m) => sum + Math.max(0, m.target - m.current), 0);
  
  return {
    date: dateStr,
    metrics,
    completionRate,
    statusLevel: getStatusLevel(completionRate),
    estimatedTimeMinutes: remainingActions * 5,
  };
};

export const generateMockCheckIns = (): CheckIn[] => {
  const checkIns: CheckIn[] = [
    {
      id: '1',
      leadId: 'lead-1',
      leadName: 'Sarah M.',
      action: 'Nachfragen wegen Produktinteresse',
      dueDate: 'Heute',
      priority: 'high',
      isOverdue: false,
      disgType: 'I',
      suggestedMessage: 'Hey Sarah! 🌟 Wie geht\'s dir? Hatte noch an unser Gespräch über die Produkte gedacht. Hast du schon Zeit gehabt, dir alles anzuschauen?',
      completed: false,
    },
    {
      id: '2',
      leadId: 'lead-2',
      leadName: 'Thomas K.',
      action: 'Business-Möglichkeit ansprechen',
      dueDate: 'Überfällig (2 Tage)',
      priority: 'high',
      isOverdue: true,
      disgType: 'D',
      suggestedMessage: 'Hi Thomas, kurz und direkt: Hast du diese Woche 15 Minuten für ein kurzes Gespräch über die Geschäftsmöglichkeit?',
      completed: false,
    },
    {
      id: '3',
      leadId: 'lead-3',
      leadName: 'Lisa R.',
      action: 'Testergebnis besprechen',
      dueDate: 'Heute',
      priority: 'medium',
      isOverdue: false,
      disgType: 'S',
      suggestedMessage: 'Liebe Lisa, ich hoffe es geht dir gut! 💚 Ich wollte mal nachfragen, wie es dir mit dem Test geht und ob du Fragen hast?',
      completed: false,
    },
    {
      id: '4',
      leadId: 'lead-4',
      leadName: 'Michael B.',
      action: 'Produkt-Feedback einholen',
      dueDate: 'Morgen',
      priority: 'low',
      isOverdue: false,
      disgType: 'G',
      suggestedMessage: 'Hallo Michael, ich würde mich sehr über dein Feedback zu den Produkten freuen. Wie sind deine bisherigen Erfahrungen?',
      completed: false,
    },
  ];
  
  return checkIns;
};

export const generateMockSuggestedContacts = (): SuggestedContact[] => {
  return [
    {
      id: '1',
      name: 'Michael B.',
      reason: 'Hat auf Instagram geliked 👍',
      lastContact: 'Vor 3 Tagen',
      score: 85,
      disgType: 'I',
      suggestedAction: 'Story Reply',
    },
    {
      id: '2',
      name: 'Anna S.',
      reason: 'Geburtstag heute! 🎂',
      lastContact: 'Vor 2 Wochen',
      score: 70,
      disgType: 'S',
      suggestedAction: 'Gratulieren',
    },
    {
      id: '3',
      name: 'Peter W.',
      reason: 'Neue Position bei LinkedIn 🎉',
      lastContact: 'Vor 1 Monat',
      score: 65,
      disgType: 'D',
      suggestedAction: 'Gratulieren',
    },
    {
      id: '4',
      name: 'Julia H.',
      reason: 'Hat Webinar angesehen 📺',
      lastContact: 'Vor 5 Tagen',
      score: 80,
      disgType: 'G',
      suggestedAction: 'Follow-up',
    },
    {
      id: '5',
      name: 'Max F.',
      reason: 'Alte Klassenkameradin 🏫',
      lastContact: 'Vor 3 Monaten',
      score: 50,
      disgType: 'I',
      suggestedAction: 'Reconnect',
    },
  ];
};

export const generateMockTeamStats = (): TeamStats => ({
  totalMembers: 12,
  activeMembers: 9,
  newMembersThisMonth: 2,
  teamDmoAverage: 67,
  teamClosesThisMonth: 8,
  teamContactsThisWeek: 156,
});

export const generateMockTeamMembers = (): TeamMember[] => [
  {
    id: '1',
    name: 'Sarah M.',
    rank: 'Silver',
    status: 'active',
    dmoProgress: 92,
    contactsThisWeek: 24,
    closesThisMonth: 3,
    lastActive: 'Vor 10 Min.',
    needsHelp: false,
    disgType: 'I',
  },
  {
    id: '2',
    name: 'Thomas K.',
    rank: 'Bronze',
    status: 'active',
    dmoProgress: 45,
    contactsThisWeek: 8,
    closesThisMonth: 1,
    lastActive: 'Vor 2 Std.',
    needsHelp: true,
    disgType: 'D',
  },
  {
    id: '3',
    name: 'Lisa R.',
    rank: 'Gold',
    status: 'active',
    dmoProgress: 100,
    contactsThisWeek: 35,
    closesThisMonth: 5,
    lastActive: 'Vor 5 Min.',
    needsHelp: false,
    disgType: 'S',
  },
  {
    id: '4',
    name: 'Michael B.',
    rank: 'Starter',
    status: 'new',
    dmoProgress: 20,
    contactsThisWeek: 3,
    closesThisMonth: 0,
    lastActive: 'Vor 1 Tag',
    needsHelp: true,
    disgType: 'G',
  },
  {
    id: '5',
    name: 'Anna S.',
    rank: 'Silver',
    status: 'inactive',
    dmoProgress: 0,
    contactsThisWeek: 0,
    closesThisMonth: 0,
    lastActive: 'Vor 5 Tagen',
    needsHelp: true,
    disgType: 'S',
  },
  {
    id: '6',
    name: 'Peter W.',
    rank: 'Bronze',
    status: 'active',
    dmoProgress: 78,
    contactsThisWeek: 18,
    closesThisMonth: 2,
    lastActive: 'Vor 1 Std.',
    needsHelp: false,
    disgType: 'D',
  },
];

export const generateMockTeamAlerts = (): TeamAlert[] => [
  {
    id: '1',
    memberId: '5',
    memberName: 'Anna S.',
    type: 'inactive',
    message: 'Seit 5 Tagen keine Aktivität',
    timestamp: 'Vor 2 Std.',
    priority: 'high',
  },
  {
    id: '2',
    memberId: '4',
    memberName: 'Michael B.',
    type: 'struggling',
    message: 'Neuer Partner braucht Unterstützung bei Erstgesprächen',
    timestamp: 'Vor 4 Std.',
    priority: 'high',
  },
  {
    id: '3',
    memberId: '3',
    memberName: 'Lisa R.',
    type: 'achievement',
    message: '🎉 Hat heute 100% DMO erreicht!',
    timestamp: 'Vor 30 Min.',
    priority: 'low',
  },
  {
    id: '4',
    memberId: '1',
    memberName: 'Sarah M.',
    type: 'milestone',
    message: 'Steht kurz vor Silver Rank! 🏆',
    timestamp: 'Vor 1 Tag',
    priority: 'medium',
  },
];

// =============================================================================
// MOCK API FUNCTIONS
// =============================================================================

export const mockDMOApi = {
  /**
   * Holt die DMO Summary für heute
   */
  getDMOSummary: async (): Promise<DMOSummary> => {
    await delay(300);
    return generateMockDMOSummary();
  },

  /**
   * Loggt eine Aktivität
   */
  logActivity: async (metricId: string): Promise<{ success: boolean; newValue: number }> => {
    await delay(200);
    return { success: true, newValue: randomInt(1, 10) };
  },

  /**
   * Aktualisiert die Ziele
   */
  updateTargets: async (targets: typeof DEFAULT_TARGETS): Promise<{ success: boolean }> => {
    await delay(300);
    return { success: true };
  },
};

export const mockCheckInsApi = {
  /**
   * Holt alle Check-ins für heute
   */
  getTodaysCheckIns: async (): Promise<CheckIn[]> => {
    await delay(300);
    return generateMockCheckIns();
  },

  /**
   * Markiert einen Check-in als erledigt
   */
  completeCheckIn: async (checkInId: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },

  /**
   * Verschiebt einen Check-in
   */
  snoozeCheckIn: async (checkInId: string, newDate: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },
};

export const mockContactsApi = {
  /**
   * Holt vorgeschlagene Kontakte für heute
   */
  getSuggestedContacts: async (): Promise<SuggestedContact[]> => {
    await delay(300);
    return generateMockSuggestedContacts();
  },

  /**
   * Holt alle Kontakte
   */
  getAllContacts: async (): Promise<SuggestedContact[]> => {
    await delay(400);
    return generateMockSuggestedContacts();
  },
};

export const mockTeamApi = {
  /**
   * Holt Team-Statistiken
   */
  getTeamStats: async (): Promise<TeamStats> => {
    await delay(300);
    return generateMockTeamStats();
  },

  /**
   * Holt alle Team-Mitglieder
   */
  getTeamMembers: async (): Promise<TeamMember[]> => {
    await delay(400);
    return generateMockTeamMembers();
  },

  /**
   * Holt Team-Alerts
   */
  getTeamAlerts: async (): Promise<TeamAlert[]> => {
    await delay(300);
    return generateMockTeamAlerts();
  },

  /**
   * Löscht einen Alert
   */
  dismissAlert: async (alertId: string): Promise<{ success: boolean }> => {
    await delay(200);
    return { success: true };
  },

  /**
   * Sendet eine Nachricht an ein Team-Mitglied
   */
  sendMessage: async (memberId: string, message: string): Promise<{ success: boolean }> => {
    await delay(300);
    return { success: true };
  },
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  dmo: mockDMOApi,
  checkIns: mockCheckInsApi,
  contacts: mockContactsApi,
  team: mockTeamApi,
};

