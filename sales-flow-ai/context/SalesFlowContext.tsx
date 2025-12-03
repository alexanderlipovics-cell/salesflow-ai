// context/SalesFlowContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  TodayData, 
  SquadData, 
  ProfileData, 
  fetchToday, 
  fetchSquad, 
  fetchProfile,
  updateProfileSettings,
  UserStats 
} from '../api/mockApi';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';

// --- Typdefinitionen ---

interface ApiErrorState {
  message: string | null;
  status: number | null;
  timestamp: number;
}

// Der Typ des globalen Zustands
interface SalesFlowState {
  todayData: TodayData | null;
  squadData: SquadData | null;
  profileData: ProfileData | null;
  loading: {
    today: boolean;
    squad: boolean;
    profile: boolean;
  };
  apiError: ApiErrorState;
}

// Der Typ der Aktionen / Funktionen, die exportiert werden
interface SalesFlowActions {
  refetchToday: () => Promise<void>;
  refetchSquad: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  updateUserStats: (newStats: UserStats) => void;
  updateProfile: (newSettings: { default_company_name: string }) => Promise<void>;
  handleError: (error: any, endpoint: string) => void;
  dismissError: () => void;
}

// Kombination aus State und Actions
type SalesFlowContextType = SalesFlowState & SalesFlowActions;

// Initialer Context-Wert
const initialContext: SalesFlowContextType = {
  todayData: null,
  squadData: null,
  profileData: null,
  loading: { today: false, squad: false, profile: false },
  apiError: { message: null, status: null, timestamp: 0 },
  refetchToday: async () => {},
  refetchSquad: async () => {},
  refetchProfile: async () => {},
  updateUserStats: () => {},
  updateProfile: async () => {},
  handleError: () => {},
  dismissError: () => {},
};

// Erstellen des Context
const SalesFlowContext = createContext<SalesFlowContextType>(initialContext);

// Export-Hook zur einfachen Verwendung
export const useSalesFlow = () => useContext(SalesFlowContext);

// --- Provider Komponente ---

export const SalesFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SalesFlowState>({
    todayData: null,
    squadData: null,
    profileData: null,
    loading: { today: false, squad: false, profile: false },
    apiError: { message: null, status: null, timestamp: 0 },
  });

  const dismissError = useCallback(() => {
    setState(prev => ({
      ...prev,
      apiError: { message: null, status: null, timestamp: 0 },
    }));
  }, []);

  const handleError = useCallback((error: any, endpoint: string) => {
    const status =
      error?.status ??
      error?.statusCode ??
      error?.response?.status ??
      error?.response?.statusCode ??
      null;

    let message: string | null = null;

    if (typeof error === 'string') {
      message = error;
    } else if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.response?.data?.detail) {
      message = error.response.data.detail;
    } else if (error?.response?.detail) {
      message = error.response.detail;
    } else if (error?.message) {
      message = error.message;
    } else {
      message = 'Unbekannter Fehler';
    }

    const contextualMessage = endpoint ? `${endpoint}: ${message}` : message;

    logger.error('[SalesFlow][API Error]', {
      endpoint,
      status,
      message,
      raw: error,
    });

    setState(prev => ({
      ...prev,
      apiError: {
        message: contextualMessage,
        status,
        timestamp: Date.now(),
      },
    }));
  }, []);

  // --- Fetch-Funktionen ---

  const refetchToday = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, today: true } }));
    try {
      const data = await fetchToday();
      setState(prev => ({ ...prev, todayData: data }));
      dismissError();
    } catch (e) {
      handleError(e, 'Today Dashboard');
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, today: false } }));
    }
  }, [dismissError, handleError]);

  const refetchSquad = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, squad: true } }));
    try {
      const data = await fetchSquad();
      setState(prev => ({ ...prev, squadData: data }));
    } catch (e) {
      handleError(e, 'Squad Overview');
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, squad: false } }));
    }
  }, [handleError]);

  const refetchProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, profile: true } }));
    try {
      const data = await fetchProfile();
      setState(prev => ({ ...prev, profileData: data }));
    } catch (e) {
      handleError(e, 'Profil');
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, profile: false } }));
    }
  }, [handleError]);

  // --- Spezielle Update-Funktion für Speed Hunter ---
  // Wird nach POST /api/speed-hunter/action aufgerufen
  const updateUserStats = useCallback((newStats: UserStats) => {
    setState(prev => {
        if (!prev.todayData) return prev;

        return {
            ...prev,
            todayData: {
                ...prev.todayData,
                user_stats: newStats,
            },
        };
    });
  }, []);

  // --- Update Profile Settings ---
  const updateProfile = useCallback(async (newSettings: { default_company_name: string }) => {
    try {
      const updatedData = await updateProfileSettings(newSettings);
      
      setState(prev => ({ 
        ...prev, 
        profileData: updatedData 
      }));
      
      Alert.alert('Erfolg', 'Profil-Einstellungen aktualisiert.');
    } catch (e) {
      handleError(e, 'Profil aktualisieren');
      Alert.alert('Fehler', 'Profil konnte nicht aktualisiert werden.');
    }
  }, [handleError]);

  // Daten beim Start laden
  useEffect(() => {
    refetchToday();
    refetchSquad();
    refetchProfile();
  }, [refetchToday, refetchSquad, refetchProfile]);

  const value = {
    ...state,
    refetchToday,
    refetchSquad,
    refetchProfile,
    updateUserStats,
    updateProfile,
    handleError,
    dismissError,
  };

  return (
    <SalesFlowContext.Provider value={value}>
      {children}
    </SalesFlowContext.Provider>
  );
};

