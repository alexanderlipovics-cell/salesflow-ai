import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          company:companies(id, name, slug, brand_config)
        `)
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
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      return await loadProfile(user.id);
    }
    return null;
  }, [user, loadProfile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH STATE
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Timeout für das Profil-Laden (max 5 Sekunden)
    const loadTimeout = setTimeout(() => {
      console.log('Profile loading timeout - continuing without profile');
      setLoading(false);
    }, 5000);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        loadProfile(sessionUser.id).finally(() => {
          clearTimeout(loadTimeout);
          setLoading(false);
        });
      } else {
        clearTimeout(loadTimeout);
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(loadTimeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      
      if (sessionUser) {
        loadProfile(sessionUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: metadata } 
    });
    return { data, error };
  };

  const signOut = async () => {
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aktualisiert das User-Profil mit beliebigen Feldern
   */
  const updateProfile = async (profileData) => {
    if (!user?.id) return { error: 'Nicht eingeloggt' };
    
    try {
      // Profil aktualisieren
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Profil neu laden
      await refreshProfile();
      
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateCompany = async (companySlug) => {
    if (!user?.id) return { error: 'Nicht eingeloggt' };
    
    try {
      // Company-ID holen
      let companyId = null;
      if (companySlug && companySlug !== 'other') {
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('slug', companySlug)
          .single();
        companyId = company?.id;
      }
      
      // Profil aktualisieren
      const { error } = await supabase
        .from('profiles')
        .update({
          company_id: companyId,
          company_slug: companySlug,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Profil neu laden
      await refreshProfile();
      
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FOUNDER & ADMIN CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Gründer von AURA OS - hat Zugang zu ALLEN Features
  const FOUNDER_EMAILS = [
    'alexander.lipovics@gmail.com',
  ];
  
  // Ist der aktuelle User der Gründer?
  const isFounder = user?.email && FOUNDER_EMAILS.includes(user.email.toLowerCase());
  
  // Admin-Rolle (Gründer + zukünftige Admins)
  const isAdmin = isFounder || profile?.role === 'admin';
  
  // Hat Zugang zu Premium Features (Autopilot, etc.)
  // Aktuell: Nur Gründer, später: zahlende Kunden
  const hasPremiumAccess = isFounder || profile?.subscription_tier === 'premium';
  
  // Hat Zugang zu Autopilot Feature
  const hasAutopilotAccess = isFounder; // Nur Gründer hat Zugang

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  // Braucht der User das Onboarding?
  // Prüfe sowohl Profil als auch Auth Metadata (Fallback)
  const isOnboardingComplete = 
    profile?.onboarding_completed === true ||
    user?.user_metadata?.onboarding_completed === true;
  
  const hasFirstName = 
    profile?.first_name || 
    user?.user_metadata?.first_name;
  
  // User braucht KEIN Onboarding wenn:
  // - Onboarding abgeschlossen ODER Vorname vorhanden
  const needsOnboarding = user && !isOnboardingComplete && !hasFirstName;
  
  // Aktueller Company-Slug (für Branding)
  const companySlug = profile?.company_slug || profile?.company?.slug || 'default';
  
  // Company-Info (für erweiterte Nutzung)
  const company = profile?.company || null;
  
  // User-Name für Personalisierung
  const userName = profile?.full_name || 
                   profile?.first_name || 
                   user?.user_metadata?.full_name ||
                   user?.user_metadata?.first_name ||
                   user?.email?.split('@')[0] || 
                   'User';
  
  // Vorname für Signaturen
  const firstName = profile?.first_name || 
                    user?.user_metadata?.first_name ||
                    userName.split(' ')[0] || 
                    'User';
  
  // Vollständiger Name
  const fullName = profile?.full_name || 
                   user?.user_metadata?.full_name ||
                   `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                   userName;
  
  // Branche / Vertical
  const vertical = profile?.vertical_id || 
                   user?.user_metadata?.vertical ||
                   'network_marketing';
  
  // Sales Level
  const skillLevel = profile?.skill_level || 
                    user?.user_metadata?.skill_level ||
                    'advanced';

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN HELPER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Gibt den aktuellen Access Token zurück (für API-Aufrufe)
   */
  const getAccessToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      // Auth State
      user, 
      profile,
      loading: loading || profileLoading,
      
      // Auth Actions
      signIn, 
      signUp, 
      signOut,
      
      // Profile Actions
      refreshProfile,
      updateProfile,
      updateCompany,
      
      // Computed - Basic
      needsOnboarding,
      companySlug,
      company,
      
      // Computed - User Info
      userName,
      firstName,
      fullName,
      vertical,
      skillLevel,
      
      // Computed - Permissions (NEU)
      isFounder,
      isAdmin,
      hasPremiumAccess,
      hasAutopilotAccess,
      
      // Token Helper
      getAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
