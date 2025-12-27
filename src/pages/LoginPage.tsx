/**
 * Login Page
 * 
 * User login page with Aura OS design
 * Handles login flow and redirects to dashboard on success
 * 
 * @author Frontend Auth Implementation
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabaseClient } from '../lib/supabaseClient';
import { LoginForm } from '../components/auth/LoginForm';
import { Sparkles } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, isLoading } = useAuth();

  // Get the redirect location (from where user was redirected)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleLogin = async (email: string, password: string) => {
    console.log('LoginPage: handleLogin called with email:', email);
    try {
      console.log('LoginPage: Calling login function...');
      await login({ email, password });
      // kleine Wartezeit, bis Tokens sicher gespeichert sind
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Onboarding Check
      const { data: userData } = await supabaseClient.auth.getUser();
      const userId = userData?.user?.id;
      let onboardingComplete: boolean | null = null;

      if (userId) {
        try {
          const { data: profile } = await supabaseClient
            .from('users')
            .select('onboarding_complete, vertical, name, email')
            .eq('id', userId)
            .single();
          onboardingComplete = profile?.onboarding_complete ?? null;
        } catch (e) {
          console.warn('LoginPage: could not fetch profile for onboarding check', e);
        }
      }

      // REMOVED: Old onboarding redirect - always go to dashboard or from
      const destination = from ?? '/dashboard';

      console.log('LoginPage: Login successful, navigating to:', destination);
      // Kurze Pause, damit Tokens sicher im Storage sind
      await new Promise((resolve) => setTimeout(resolve, 100));
      navigate(destination, { replace: true });
      // Fallback Hard-Redirect, falls navigate vom Guard abgefangen wird
      setTimeout(() => {
        if (window.location.pathname === '/login') {
          window.location.assign(destination);
        }
      }, 200);
    } catch (err) {
      // Error is handled by useAuth hook
      console.error('LoginPage: Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          {/* Logo & Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/alsales-logo-transparent.png" 
                alt="AlSales" 
                className="h-16"
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              Melden Sie sich an, um fortzufahren
            </p>
          </div>

          {/* Login Form */}
          <LoginForm onSubmit={handleLogin} error={error} isLoading={isLoading} />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          © 2025 Al Sales Solutions. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

