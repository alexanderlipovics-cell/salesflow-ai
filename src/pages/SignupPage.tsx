/**
 * Signup Page
 * 
 * User registration page with Aura OS design
 * Handles signup flow and redirects to dashboard on success
 * 
 * @author Frontend Auth Implementation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SignupForm } from '../components/auth/SignupForm';
import { Sparkles } from 'lucide-react';
import { supabaseClient } from '../lib/supabaseClient';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup, error, isLoading } = useAuth();

  const handleSignup = async (
    email: string,
    password: string,
    name: string,
    company?: string
  ) => {
    try {
      await signup({ email, password, name, company });
      // Prüfe, ob Supabase bereits eine Session gesetzt hat
      const { data: sessionData } = await supabaseClient.auth.getSession();
      if (sessionData?.session) {
        // New users → AI Copilot for onboarding
        // navigate('/onboarding', { replace: true });
        navigate('/chat', { replace: true });
      } else {
        // Falls keine Session (z.B. E-Mail-Confirmation aktiviert)
        navigate('/login', { replace: true });
      }
    } catch (err) {
      // Error is handled by useAuth hook
      console.error('Signup failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      {/* Signup Card */}
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
              Erstellen Sie Ihr kostenloses Konto
            </p>
          </div>

          {/* Signup Form */}
          <SignupForm onSubmit={handleSignup} error={error} isLoading={isLoading} />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          © 2025 Al Sales Solutions. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;

