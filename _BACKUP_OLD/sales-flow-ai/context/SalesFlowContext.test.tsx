// context/SalesFlowContext.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSalesFlow, SalesFlowProvider } from './SalesFlowContext';
import * as mockApi from '../api/mockApi'; // Mocken Sie die API-Aufrufe

// Wichtig: Mocken der gesamten mockApi-Datei, um API-Calls zu simulieren
jest.mock('../api/mockApi', () => ({
  fetchToday: jest.fn(),
  fetchSquad: jest.fn(),
  fetchProfile: jest.fn(),
  // Exportiere alle notwendigen Typen als Dummies
  __esModule: true,
  UserStats: class {},
  TodayData: class {},
  SquadData: class {},
  ProfileData: class {},
}));

// Mock-Daten für erfolgreichen initialen Fetch
const mockTodayData = {
    user_stats: { 
      today_contacts_target: 20, 
      today_contacts_done: 8, 
      today_points_target: 40, 
      today_points_done: 22, 
      streak_day: 4 
    },
    due_leads: [],
    squad_summary: { 
      has_active_challenge: true, 
      challenge_title: "Sprint", 
      my_rank: 1, 
      my_points: 100, 
      team_points: 500, 
      target_points: 1000 
    }
};

const mockSquadData = { 
  challenge: { title: 'Test' }, 
  me: { rank: 1 }, 
  leaderboard: [], 
  has_active_challenge: true 
};

const mockProfileData = { 
  user: { name: 'Test' }, 
  settings: { default_company_name: 'Test' } 
};

describe('SalesFlowContext', () => {
  beforeEach(() => {
    // Setze die API Mocks für jeden Test zurück und definiere die Rückgabewerte
    (mockApi.fetchToday as jest.Mock).mockResolvedValue(mockTodayData);
    (mockApi.fetchSquad as jest.Mock).mockResolvedValue(mockSquadData);
    (mockApi.fetchProfile as jest.Mock).mockResolvedValue(mockProfileData);
  });

  it('sollte den initialen Zustand korrekt laden und Loading-Status setzen', async () => {
    const { result } = renderHook(() => useSalesFlow(), { wrapper: SalesFlowProvider });
    
    // Prüfe initialen Loading-Status
    expect(result.current.loading.today).toBe(true);

    // Warte, bis alle API-Aufrufe abgeschlossen sind
    await waitFor(() => expect(result.current.loading.today).toBe(false));

    // Prüfe, ob die Daten geladen wurden
    expect(result.current.todayData?.user_stats.today_contacts_done).toBe(8);
    expect(result.current.squadData).toEqual(mockSquadData);
  });

  it('sollte die user_stats aktualisieren (Speed Hunter Action)', async () => {
    const { result } = renderHook(() => useSalesFlow(), { wrapper: SalesFlowProvider });
    
    // Warte, bis initialer Load abgeschlossen ist
    await waitFor(() => expect(result.current.loading.today).toBe(false));

    // Definiere die neuen Stats, die von Speed Hunter zurückkommen würden
    const newStats = { 
        ...result.current.todayData!.user_stats,
        today_contacts_done: 9,
        today_points_done: 26 
    };

    // Führe die Update-Aktion aus
    act(() => {
      result.current.updateUserStats(newStats);
    });

    // Prüfe, ob der State korrekt aktualisiert wurde
    expect(result.current.todayData?.user_stats.today_contacts_done).toBe(9);
    expect(result.current.todayData?.user_stats.today_points_done).toBe(26);

    // Stelle sicher, dass Targets unverändert sind
    expect(result.current.todayData?.user_stats.today_contacts_target).toBe(20);
  });
});

