// hooks/useSquadCoach.ts

import { useState, useCallback } from 'react';
import { SquadCoachResponse, LoadingState } from '../types/squadCoach';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UseSquadCoachReturn {
  data: SquadCoachResponse | null;
  loadingState: LoadingState;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useSquadCoach(squadId?: string): UseSquadCoachReturn {
  const [data, setData] = useState<SquadCoachResponse | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const loadCoach = useCallback(async () => {
    setLoadingState('loading');
    setError(null);
    
    try {
      // Build URL with optional squad_id param
      const url = new URL(`${API_BASE}/api/squad/coach`);
      if (squadId) {
        url.searchParams.append('squad_id', squadId);
      }
      
      // Get auth token from localStorage or session
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      });
      
      let json;
      try {
        json = await response.json();
      } catch {
        throw new Error('Invalid JSON response');
      }
      
      if (!response.ok) {
        const errorDetail = json.detail || json.message || response.statusText;
        throw new Error(errorDetail);
      }
      
      setData(json);
      setLoadingState('success');
    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Laden des Squad-Coachings';
      setError(errorMessage);
      setLoadingState('error');
      console.error('Squad coach error:', err);
    }
  }, [squadId]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    data,
    loadingState,
    error,
    refresh: loadCoach,
    clearError
  };
}

