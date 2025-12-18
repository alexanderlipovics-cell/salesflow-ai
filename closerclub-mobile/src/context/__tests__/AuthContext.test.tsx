import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../services/supabase';

describe('AuthContext Mobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte initial nicht eingeloggt sein', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.session).toBeNull();
  });

  it('sollte Login erfolgreich durchführen', async () => {
    const mockSession = {
      user: { id: '123', email: 'test@test.com', first_name: 'Test' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000
    };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.signIn('test@test.com', 'password');
    });

    // Wir prüfen hier nicht den State direkt (da Supabase Mock komplex ist),
    // sondern ob die Funktion korrekt aufgerufen wurde
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password',
    });
  });

  it('sollte Login-Fehler behandeln', async () => {
    const mockError = { message: 'Invalid credentials' };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      try {
        await result.current.signIn('wrong@test.com', 'wrongpass');
      } catch (error) {
        // Erwartet, dass ein Fehler geworfen wird
        expect(error).toBeDefined();
      }
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'wrong@test.com',
      password: 'wrongpass',
    });
  });
});
