/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls
 * - Login, Signup, Logout
 * - Token management
 * - Current user fetching
 * 
 * @author Frontend Auth Implementation
 */

import { supabase } from "../lib/supabase";

// Base URL - VITE_API_BASE_URL sollte OHNE /api sein (z.B. https://salesflow-ai.onrender.com)
// Production: https://salesflow-ai.onrender.com
// Development: http://localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://salesflow-ai.onrender.com' : 'http://localhost:8000');
// Entfernt wiederholte /api-Endungen und trailing Slashes robust
const cleanBaseUrl = API_BASE_URL
  .replace(/(\/api)+\/?$/, '') // strip mehrfach angehängte /api
  .replace(/\/+$/, '');        // strip trailing /

console.log('authService: API Base URL configured:', cleanBaseUrl);
console.log('authService: VITE_API_BASE_URL from env:', import.meta.env.VITE_API_BASE_URL);
console.log('authService: PROD mode:', import.meta.env.PROD);

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name: string; // Wird in first_name und last_name aufgeteilt
  company?: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

class AuthService {
  /**
   * Login user with email and password
   * Uses form-urlencoded format as required by OAuth2PasswordRequestForm
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Clear stale tokens before performing a fresh login to avoid race/old session issues
    this.clearTokens();

    console.log('authService.login: Starting login request for email:', credentials.email);
    console.log('authService.login: API URL:', `${cleanBaseUrl}/api/auth/login`);
    
    // OAuth2PasswordRequestForm expects form-urlencoded with "username" field
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);  // OAuth2 uses "username" not "email"
    formData.append('password', credentials.password);

    console.log('authService.login: Making fetch request...');
    const response = await fetch(`${cleanBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    console.log('authService.login: Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login fehlgeschlagen');
    }

    // Backend returns: { access_token, refresh_token, token_type, expires_in, user }
    const backendResponse = await response.json();
    console.log('authService.login: Backend response structure:', JSON.stringify(backendResponse, null, 2));
    console.log('authService.login: access_token exists:', !!backendResponse.access_token);
    console.log('authService.login: refresh_token exists:', !!backendResponse.refresh_token);
    console.log('authService.login: user exists:', !!backendResponse.user);

    // Validate response structure
    if (!backendResponse.access_token) {
      console.error('authService.login: ERROR - access_token missing in response!');
      throw new Error('Invalid login response: access_token missing');
    }
    if (!backendResponse.refresh_token) {
      console.error('authService.login: ERROR - refresh_token missing in response!');
      throw new Error('Invalid login response: refresh_token missing');
    }

    // Convert to frontend format: { user, tokens: { access_token, refresh_token, token_type, expires_in } }
    const data: AuthResponse = {
      user: {
        id: backendResponse.user.id,
        email: backendResponse.user.email,
        name: `${backendResponse.user.first_name || ''} ${backendResponse.user.last_name || ''}`.trim(),
        company: backendResponse.user.company,
        role: backendResponse.user.role,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      tokens: {
        access_token: backendResponse.access_token,
        refresh_token: backendResponse.refresh_token,
        token_type: backendResponse.token_type,
        expires_in: backendResponse.expires_in,
      },
      message: 'Login erfolgreich',
    };

    // Store tokens in localStorage
    console.log('authService.login: Storing tokens in localStorage...');
    console.log('authService.login: data.tokens structure:', JSON.stringify(data.tokens, null, 2));
    console.log('authService.login: data.tokens.access_token exists:', !!data.tokens?.access_token);
    console.log('authService.login: data.tokens.access_token length:', data.tokens?.access_token?.length || 0);
    
    if (!data.tokens?.access_token) {
      console.error('authService.login: CRITICAL ERROR - data.tokens.access_token is missing!');
      console.error('authService.login: Full data object:', JSON.stringify(data, null, 2));
      throw new Error('Cannot save tokens: access_token is missing in data.tokens');
    }
    
    this.setTokens(data.tokens);
    console.log('authService.login: Token stored. Verifying...');
    const storedToken = this.getAccessToken();
    console.log('authService.login: Stored token exists:', !!storedToken);
    console.log('authService.login: Stored token length:', storedToken?.length || 0);
    
    if (!storedToken) {
      console.error('authService.login: CRITICAL ERROR - Token was not saved to localStorage!');
      console.error('authService.login: localStorage.getItem("access_token"):', localStorage.getItem('access_token'));
    }

    return data;
  }

  /**
   * Register new user
   */
  async signup(signupData: SignupData): Promise<AuthResponse> {
    // Registriere über Supabase Auth (erstellt auch auth.users)
    const { data, error } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          full_name: signupData.name,
          company: signupData.company ?? null,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Registrierung fehlgeschlagen');
    }

    const authUser = data.user;
    const session = data.session;

    if (!authUser) {
      throw new Error('Registrierung fehlgeschlagen: Kein Benutzer zurückgegeben.');
    }

    const tokens: AuthTokens = {
      access_token: session?.access_token ?? '',
      refresh_token: session?.refresh_token ?? '',
      token_type: session?.token_type ?? 'bearer',
      expires_in: session?.expires_in ?? 0,
    };

    if (tokens.access_token && tokens.refresh_token) {
      this.setTokens(tokens);
    }

    const fullName =
      (authUser.user_metadata && (authUser.user_metadata.full_name || authUser.user_metadata.name)) ||
      signupData.name;

    const user: User = {
      id: authUser.id,
      email: authUser.email ?? signupData.email,
      name: fullName,
      company: authUser.user_metadata?.company ?? signupData.company,
      role: authUser.role ?? 'authenticated',
      is_active: true,
      created_at: authUser.created_at ?? new Date().toISOString(),
    };

    return {
      user,
      tokens,
      message: 'Registrierung erfolgreich',
    };
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    const token = this.getAccessToken();

    if (token) {
      try {
        await fetch(`${cleanBaseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    // Clear tokens from localStorage
    this.clearTokens();
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    const token = this.getAccessToken();
    console.log('authService.getCurrentUser: Token from localStorage:', token ? `exists (length: ${token.length})` : 'NOT FOUND');

    if (!token) {
      console.warn('authService.getCurrentUser: No token found in localStorage');
      return null;
    }

    try {
      console.log('authService.getCurrentUser: Making request to:', `${cleanBaseUrl}/api/auth/me`);
      console.log('authService.getCurrentUser: Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      const response = await fetch(`${cleanBaseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('authService.getCurrentUser: Response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          // Ungültiger Token: alles löschen und null zurück
          this.clearTokens();
          return null;
        }
        throw new Error('Failed to get user info');
      }

      const data = await response.json();
      // Backend returns the user object directly (not nested under "user")
      return data.user ?? data;
    } catch (error) {
      console.error('Get current user failed:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${cleanBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.setTokens(data);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${cleanBaseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Passwort ändern fehlgeschlagen');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Store tokens in localStorage
   */
  private setTokens(tokens: AuthTokens): void {
    console.log('authService.setTokens: Called with tokens:', JSON.stringify({
      has_access_token: !!tokens?.access_token,
      access_token_length: tokens?.access_token?.length || 0,
      has_refresh_token: !!tokens?.refresh_token,
      refresh_token_length: tokens?.refresh_token?.length || 0,
    }, null, 2));
    
    if (!tokens) {
      console.error('authService.setTokens: ERROR - tokens parameter is null/undefined!');
      throw new Error('Cannot save tokens: tokens parameter is missing');
    }
    
    if (!tokens.access_token) {
      console.error('authService.setTokens: ERROR - tokens.access_token is missing!');
      console.error('authService.setTokens: Full tokens object:', JSON.stringify(tokens, null, 2));
      throw new Error('Cannot save tokens: access_token is missing');
    }
    
    try {
      console.log('authService.setTokens: Storing access_token (length:', tokens.access_token.length, ')');
      localStorage.setItem('access_token', tokens.access_token);
      
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }
      
      console.log('authService.setTokens: Tokens stored. Verifying...');
      const verifyToken = localStorage.getItem('access_token');
      const verifyRefresh = localStorage.getItem('refresh_token');
      
      console.log('authService.setTokens: Verification - access_token exists:', !!verifyToken, 'length:', verifyToken?.length || 0);
      console.log('authService.setTokens: Verification - refresh_token exists:', !!verifyRefresh, 'length:', verifyRefresh?.length || 0);
      
      if (!verifyToken) {
        console.error('authService.setTokens: CRITICAL ERROR - Token was not saved to localStorage!');
        console.error('authService.setTokens: localStorage.getItem("access_token"):', localStorage.getItem('access_token'));
        throw new Error('Failed to save access_token to localStorage');
      }
    } catch (error) {
      console.error('authService.setTokens: Exception while saving tokens:', error);
      throw error;
    }
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token from localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Clear tokens from localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export types
export type { LoginCredentials, SignupData, AuthTokens, User, AuthResponse };
