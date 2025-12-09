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
import toast from "react-hot-toast";

// Production: https://salesflow-ai.onrender.com
// Development: http://localhost:8000
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? "https://salesflow-ai.onrender.com" : "http://localhost:8000");

console.log('AuthContext: API URL configured:', API_URL);
console.log('AuthContext: VITE_API_URL from env:', import.meta.env.VITE_API_URL);
console.log('AuthContext: PROD mode:', import.meta.env.PROD);

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  vertical?: string;
  profile?: {
    vertical?: string;
  };
  // weitere Felder nach Bedarf
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData?: Partial<User>
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "salesflow_auth_session";

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // Sekunden
  user: User;
}

const storeSession = (session: Session) => {
  try {
    // Store full session object (for AuthContext)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    // Also store access_token directly (for compatibility with authService and api.ts)
    localStorage.setItem("access_token", session.accessToken);
    localStorage.setItem("refresh_token", session.refreshToken);
  } catch (e) {
    console.error("Failed to store session", e);
  }
};

const loadStoredSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

const clearStoredSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Also clear direct token keys for compatibility
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  } catch (e) {
    console.error("Failed to clear session", e);
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  const refreshTimeoutRef = useRef<number | null>(null);

  const cancelRefreshTimer = () => {
    if (refreshTimeoutRef.current !== null) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  };

  const scheduleRefresh = useCallback(
    (sessionToSchedule: Session) => {
      cancelRefreshTimer();
      const now = Date.now();
      const refreshInMs = sessionToSchedule.expiresAt - now - 60_000; // 1min vor Ablauf
      if (refreshInMs <= 0) {
        // sofort versuchen
        void refreshSession();
        return;
      }
      const id = window.setTimeout(() => {
        void refreshSession();
      }, refreshInMs);
      refreshTimeoutRef.current = id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const applySession = useCallback(
    (newSession: Session | null) => {
      setSession(newSession);
      if (newSession) {
        storeSession(newSession);
        scheduleRefresh(newSession);
      } else {
        clearStoredSession();
        cancelRefreshTimer();
      }
    },
    [scheduleRefresh]
  );

  const buildSessionFromAuthResponse = (res: AuthResponse): Session => {
    const expiresAt = Date.now() + res.expires_in * 1000;
    return {
      user: res.user,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt,
    };
  };

  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken) return;
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });

      if (!response.ok) {
        console.error("Token refresh failed", await response.text());
        applySession(null);
        toast.error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
        return;
      }

      const data: AuthResponse = await response.json();
      const newSession = buildSessionFromAuthResponse(data);
      applySession(newSession);
    } catch (error) {
      console.error("Error refreshing token", error);
      applySession(null);
      toast.error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
    }
  }, [API_URL, applySession, session?.refreshToken]);

  // Initial loading from localStorage
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const stored = loadStoredSession();
        if (stored && stored.expiresAt > Date.now()) {
          setSession(stored);
          scheduleRefresh(stored);
        } else {
          clearStoredSession();
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
  }, [scheduleRefresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        // OAuth2PasswordRequestForm expects form-urlencoded with "username" field
        const formData = new URLSearchParams();
        formData.append('username', email);  // OAuth2 uses "username" not "email"
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let message = "Login fehlgeschlagen. Bitte prüfe deine Eingaben.";
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.detail) message = errJson.detail;
          } catch {
            /* ignore */
          }
          toast.error(message);
          throw new Error(message);
        }

        const data: AuthResponse = await response.json();
        const newSession = buildSessionFromAuthResponse(data);
        applySession(newSession);
        toast.success("Erfolgreich angemeldet.");
      } catch (error) {
        console.error("Login error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL, applySession]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      if (session?.accessToken) {
        void fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }).catch(() => {});
      }
    } finally {
      applySession(null);
      setLoading(false);
    }
  }, [API_URL, applySession, session?.accessToken]);

  const signUp = useCallback(
    async (email: string, password: string, userData?: Partial<User>) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, ...userData }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let message = "Registrierung fehlgeschlagen.";
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.detail) message = errJson.detail;
          } catch {
            /* ignore */
          }
          toast.error(message);
          throw new Error(message);
        }

        const data: AuthResponse = await response.json();
        const newSession = buildSessionFromAuthResponse(data);
        applySession(newSession);
        toast.success("Account erstellt. Willkommen!");
      } catch (error) {
        console.error("Signup error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL, applySession]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/request-password-reset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let message = "Passwort-Reset fehlgeschlagen.";
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.detail) message = errJson.detail;
          } catch {
            /* ignore */
          }
          toast.error(message);
          throw new Error(message);
        }

        toast.success("Wenn ein Account existiert, wurde eine E-Mail gesendet.");
      } catch (error) {
        console.error("Reset password error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL]
  );

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!session?.accessToken) return;
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          let message = "Profil-Update fehlgeschlagen.";
          try {
            const errJson = JSON.parse(errorText);
            if (errJson.detail) message = errJson.detail;
          } catch {
            /* ignore */
          }
          toast.error(message);
          throw new Error(message);
        }

        const updatedUser: User = await response.json();
        const newSession: Session = {
          ...session,
          user: updatedUser,
        };
        applySession(newSession);
        toast.success("Profil aktualisiert.");
      } catch (error) {
        console.error("Update profile error", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [API_URL, applySession, session]
  );

  const value: AuthContextType = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      initialized,
      signIn,
      signOut,
      signUp,
      resetPassword,
      updateProfile,
      refreshSession,
    }),
    [session, loading, initialized, signIn, signOut, signUp, resetPassword, updateProfile, refreshSession]
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
