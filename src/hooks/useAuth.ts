/**
 * useAuth Hook
 * 
 * React hook for authentication state management
 * Provides user info, login, signup, logout functions
 * 
 * @author Frontend Auth Implementation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService, User, LoginCredentials, SignupData } from '../services/authService';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false); // verhindert parallele /auth/me Calls
  const authFailedRef = useRef<boolean>(false); // verhindert Endlosschleifen nach 401

  /**
   * Load current user on mount
   */
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Load user from backend
   */
  const loadUser = async () => {
    // Kein doppelter Fetch parallel
    if (isFetchingRef.current || authFailedRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    try {
      // Sofort abbrechen, wenn kein Token lokal vorhanden ist
      const token = authService.getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const currentUser = await authService.getCurrentUser();

      if (!currentUser) {
        // 401 oder ungültiger Token: Tokens löschen und redirect zum Login
        await authService.logout();
        setUser(null);
        authFailedRef.current = true;
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        return;
      }

      setUser(currentUser);
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
      authFailedRef.current = true;
      authService.clearTokens?.();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      authFailedRef.current = false; // reset vorherige Fehler-Flags
      isFetchingRef.current = false;
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login fehlgeschlagen';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Signup new user
   */
  const signup = useCallback(async (data: SignupData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.signup(data);
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    await loadUser();
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshUser,
    error,
    clearError,
  };
};

