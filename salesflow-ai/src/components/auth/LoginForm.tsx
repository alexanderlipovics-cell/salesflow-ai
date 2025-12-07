/**
 * Login Form Component
 * 
 * Form for user login with email and password
 * Aura OS Design System styling
 * 
 * @author Frontend Auth Implementation
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    setValidationError('');

    // Validation
    if (!email || !password) {
      setValidationError('Bitte füllen Sie alle Felder aus');
      return;
    }

    if (!email.includes('@')) {
      setValidationError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    try {
      console.log('LoginForm: Calling onSubmit with email:', email);
      await onSubmit(email, password);
      console.log('LoginForm: onSubmit completed successfully');
    } catch (err) {
      console.error('LoginForm: onSubmit error:', err);
      // Error is handled by parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          E-Mail-Adresse
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail size={20} className="text-gray-400" />
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all backdrop-blur-md"
            placeholder="max@example.com"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
          Passwort
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock size={20} className="text-gray-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all backdrop-blur-md"
            placeholder="••••••••"
            disabled={isLoading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {(error || validationError) && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error || validationError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Wird angemeldet...</span>
          </>
        ) : (
          <>
            <LogIn size={20} />
            <span>Anmelden</span>
          </>
        )}
      </button>

      {/* Footer Links */}
      <div className="text-center space-y-2">
        <Link
          to="/forgot-password"
          className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
        >
          Passwort vergessen?
        </Link>
        <div className="text-sm text-gray-400">
          Noch kein Konto?{' '}
          <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Jetzt registrieren
          </Link>
        </div>
      </div>
    </form>
  );
};

