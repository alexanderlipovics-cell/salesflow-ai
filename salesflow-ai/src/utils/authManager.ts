/**
 * Auth Manager
 * Centralized auth token management (works for Web and React Native)
 */
import { supabaseClient } from '@/lib/supabaseClient';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class AuthManager {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  async initialize(): Promise<void> {
    try {
      this.token = await this.getStoredToken();
      this.refreshToken = await this.getStoredRefreshToken();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }
    return await this.getStoredToken();
  }

  async setToken(token: string, refreshToken?: string): Promise<void> {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    // Use localStorage for web
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    }
  }

  async clearToken(): Promise<void> {
    this.token = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  async refreshAccessToken(): Promise<string> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Use Supabase session refresh
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.refreshSession();

        if (error || !session) {
          throw new Error('Token refresh failed');
        }

        const newToken = session.access_token;
        const newRefreshToken = session.refresh_token;

        await this.setToken(newToken, newRefreshToken);

        return newToken;
      } catch (error) {
        await this.clearToken();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async getStoredToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    // Try localStorage first
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      return stored;
    }

    // Fallback: Get from Supabase session
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        await this.setToken(session.access_token, session.refresh_token);
        return session.access_token;
      }
    } catch (error) {
      console.error('Failed to get session:', error);
    }

    return null;
  }

  private async getStoredRefreshToken(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) {
      return stored;
    }

    // Fallback: Get from Supabase session
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (session?.refresh_token) {
        return session.refresh_token;
      }
    } catch (error) {
      console.error('Failed to get refresh token:', error);
    }

    return null;
  }

  // Get token from Supabase session (primary method)
  async getSupabaseToken(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        this.token = session.access_token;
        return session.access_token;
      }
    } catch (error) {
      console.error('Failed to get Supabase token:', error);
    }
    return null;
  }
}

export const authManager = new AuthManager();

