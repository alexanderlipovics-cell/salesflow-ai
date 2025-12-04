import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import * as authService from '../services/authService';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  mlm_company?: string;
  plan?: 'free' | 'starter' | 'growth' | 'scale';
  onboarding_completed?: boolean;
  language?: string;
  notifications_enabled?: boolean;
  avatar_url?: string;
  [key: string]: any;
}

interface AuthContextType {
  // State
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;

  // Auth Actions
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (name: string, email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;

  // Profile Actions
  updateProfile: (data: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      // Versuche Profil aus profiles Tabelle zu laden
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('Profile load error:', error);
      }

      // Profil existiert
      if (data) {
        setProfile(data);
        return data;
      }

      // Profil existiert nicht - erstellen
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          onboarding_completed: false,
          plan: 'free',
        })
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile);
        return newProfile;
      }

      return null;
    } catch (err) {
      console.error('Profile load exception:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH STATE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Initial Session Check
    const initAuth = async () => {
      try {
        const { data: { session } } = await authService.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Auth State Change Listener
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await authService.signIn(email, password);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const { data, error } = await authService.signUp(email, password, {
        name,
        full_name: name,
        onboarding_completed: false,
        plan: 'free',
      });
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const logout = async () => {
    try {
      setProfile(null);
      const { error } = await authService.signOut();
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await authService.resetPassword(email);
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await authService.updatePassword(newPassword);
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) {
      return { error: 'Nicht eingeloggt' };
    }

    try {
      // Update in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Update in user metadata (Fallback)
      const { error: metadataError } = await authService.updateUser(data);
      if (metadataError) {
        console.warn('Metadata update error:', metadataError);
      }

      // Profil neu laden
      await refreshProfile();

      return { error: null };
    } catch (err: any) {
      return { error: err.message || err };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const isAuthenticated = !!user && !!session;

  // Braucht der User das Onboarding?
  // Prüfe sowohl Profil als auch Auth Metadata (Fallback)
  const isOnboardingComplete =
    profile?.onboarding_completed === true ||
    user?.user_metadata?.onboarding_completed === true;

  const hasName =
    profile?.full_name ||
    profile?.first_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name;

  // User braucht KEIN Onboarding wenn:
  // - Onboarding abgeschlossen ODER Name vorhanden
  const needsOnboarding = user && !isOnboardingComplete && !hasName;

  const value: AuthContextType = {
    // State
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    needsOnboarding: !!needsOnboarding,

    // Auth Actions
    login,
    register,
    logout,
    resetPassword,
    updatePassword,

    // Profile Actions
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

