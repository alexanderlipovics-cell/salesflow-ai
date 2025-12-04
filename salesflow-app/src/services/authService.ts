import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface SignUpMetadata {
  name?: string;
  full_name?: string;
  mlm_company?: string;
  plan?: 'free' | 'starter' | 'growth' | 'scale';
  onboarding_completed?: boolean;
}

export interface UpdateUserData {
  name?: string;
  full_name?: string;
  mlm_company?: string;
  plan?: 'free' | 'starter' | 'growth' | 'scale';
  onboarding_completed?: boolean;
  [key: string]: any;
}

/**
 * Anmeldung mit Email und Passwort
 */
export async function signIn(email: string, password: string): Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }> {
  return await supabase.auth.signInWithPassword({ email, password });
}

/**
 * Registrierung mit Email und Passwort
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: SignUpMetadata
): Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }> {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {},
    },
  });
}

/**
 * Abmeldung
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  return await supabase.auth.signOut();
}

/**
 * Passwort zurücksetzen - sendet E-Mail mit Reset-Link
 */
export async function resetPassword(email: string, redirectTo?: string): Promise<{ error: AuthError | null }> {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || 'aura-os://reset-password',
  });
}

/**
 * Passwort aktualisieren (nach Reset-Link)
 */
export async function updatePassword(newPassword: string): Promise<{ data: { user: User | null } | null; error: AuthError | null }> {
  return await supabase.auth.updateUser({ password: newPassword });
}

/**
 * User-Profil aktualisieren (Metadata)
 */
export async function updateUser(data: UpdateUserData): Promise<{ data: { user: User | null } | null; error: AuthError | null }> {
  return await supabase.auth.updateUser({
    data,
  });
}

/**
 * Aktuelle Session abrufen
 */
export async function getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
  return await supabase.auth.getSession();
}

/**
 * Auth State Change Listener
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } } {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * Aktuellen User abrufen
 */
export async function getCurrentUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
  const { data: { session }, error } = await getSession();
  return {
    data: { user: session?.user ?? null },
    error,
  };
}

