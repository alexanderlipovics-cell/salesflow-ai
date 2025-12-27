import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  biometricEnabled: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: Partial<User>
  ) => Promise<void>;
  refreshSession: () => Promise<void>;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@alsales/auth";
const BIOMETRIC_KEY = "@alsales/biometric_enabled";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

const storeSession = async (session: Session) => {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to store session", e);
  }
};

const loadStoredSession = async (): Promise<Session | null> => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to parse stored session", e);
    return null;
  }
};

const clearStoredSession = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear session", e);
  }
};

const storeBiometricEnabled = async (value: boolean) => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_KEY, value ? "1" : "0");
  } catch (e) {
    console.error("Failed to store biometric flag", e);
  }
};

const loadBiometricEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_KEY);
    return value === "1";
  } catch (e) {
    console.error("Failed to load biometric flag", e);
    return false;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(false);

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelRefreshTimer = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  };

  const buildSessionFromAuthResponse = (res: AuthResponse): Session => {
    const expiresAt = Date.now() + res.expires_in * 1000;
    return {
      user: res.user,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt,
    };
  };

  const applySession = useCallback(async (newSession: Session | null) => {
    setSession(newSession);
    if (newSession) {
      await storeSession(newSession);
    } else {
      await clearStoredSession();
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken) return;
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });

      if (!response.ok) {
        console.error("Token refresh failed", await response.text());
        await applySession(null);
        Alert.alert("Sitzung abgelaufen", "Bitte melde dich erneut an.");
        return;
      }

      const data: AuthResponse = await response.json();
      const newSession = buildSessionFromAuthResponse(data);
      await applySession(newSession);
    } catch (error) {
      console.error("Error refreshing token", error);
      await applySession(null);
      Alert.alert("Sitzung abgelaufen", "Bitte melde dich erneut an.");
    }
  }, [API_URL, applySession, session?.refreshToken]);

  const scheduleRefresh = useCallback(
    (sessionToSchedule: Session) => {
      cancelRefreshTimer();
      const now = Date.now();
      const refreshInMs = sessionToSchedule.expiresAt - now - 60_000;
      if (refreshInMs <= 0) {
        void refreshSession();
        return;
      }
      const id = setTimeout(() => {
        void refreshSession();
      }, refreshInMs);
      refreshTimeoutRef.current = id;
    },
    [refreshSession]
  );

  const authenticateBiometric = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return false;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Mit Biometrie anmelden",
        fallbackLabel: "PIN verwenden",
      });
      return result.success;
    } catch (e) {
      console.error("Biometric auth error", e);
      return false;
    }
  }, []);

  // Init: Session + Biometrie
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [storedSession, bioEnabled] = await Promise.all([
          loadStoredSession(),
          loadBiometricEnabled(),
        ]);
        setBiometricEnabled(bioEnabled);

        if (storedSession && storedSession.expiresAt > Date.now()) {
          if (bioEnabled) {
            const ok = await authenticateBiometric();
            if (!ok) {
              await applySession(null);
              setLoading(false);
              setInitialized(true);
              return;
            }
          }
          setSession(storedSession);
          scheduleRefresh(storedSession);
        } else {
          await clearStoredSession();
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    void init();

    return () => {
      cancelRefreshTimer();
    };
  }, [applySession, authenticateBiometric, scheduleRefresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("Login failed", text);
          Alert.alert("Login fehlgeschlagen", "Bitte prüfe deine Zugangsdaten.");
          throw new Error("Login failed");
        }

        const data: AuthResponse = await response.json();
        const newSession = buildSessionFromAuthResponse(data);
        await applySession(newSession);
        scheduleRefresh(newSession);
      } catch (error) {
        console.error("Login error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL, applySession, scheduleRefresh]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      if (session?.accessToken) {
        void fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }).catch(() => {});
      }
      await applySession(null);
    } finally {
      cancelRefreshTimer();
      setLoading(false);
    }
  }, [API_URL, applySession, session?.accessToken]);

  const signUp = useCallback(
    async (email: string, password: string, userData?: Partial<User>) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, ...userData }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("Signup failed", text);
          Alert.alert("Registrierung fehlgeschlagen", "Bitte versuche es erneut.");
          throw new Error("Signup failed");
        }

        const data: AuthResponse = await response.json();
        const newSession = buildSessionFromAuthResponse(data);
        await applySession(newSession);
        scheduleRefresh(newSession);
      } catch (error) {
        console.error("Signup error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL, applySession, scheduleRefresh]
  );

  const enableBiometrics = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (!ok) {
      Alert.alert(
        "Biometrie nicht verfügbar",
        "Auf diesem Gerät ist keine Biometrie aktiviert."
      );
      return;
    }
    await storeBiometricEnabled(true);
    setBiometricEnabled(true);
    Alert.alert("Biometrie aktiviert", "Du kannst dich künftig mit FaceID/TouchID anmelden.");
  }, [authenticateBiometric]);

  const disableBiometrics = useCallback(async () => {
    await storeBiometricEnabled(false);
    setBiometricEnabled(false);
    Alert.alert("Biometrie deaktiviert", "Biometrische Anmeldung ist deaktiviert.");
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      initialized,
      biometricEnabled,
      signIn,
      signOut,
      signUp,
      refreshSession,
      enableBiometrics,
      disableBiometrics,
    }),
    [
      session,
      loading,
      initialized,
      biometricEnabled,
      signIn,
      signOut,
      signUp,
      refreshSession,
      enableBiometrics,
      disableBiometrics,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};