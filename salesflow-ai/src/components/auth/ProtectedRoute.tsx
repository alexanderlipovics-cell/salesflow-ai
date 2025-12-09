/**
 * Protected Route Component
 * 
 * HOC (Higher-Order Component) to protect routes that require authentication
 * Redirects to login if user is not authenticated
 * 
 * @author Frontend Auth Implementation
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
          <p className="mt-4 text-gray-400">Lädt...</p>
        </div>
      </div>
    );
  }

  // Bei Passwort-Recovery nicht redirecten (Supabase Hash-Flow)
  if (isRecovery) {
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

