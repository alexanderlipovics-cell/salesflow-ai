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

// Base URL - VITE_API_BASE_URL sollte OHNE /api sein (z.B. https://salesflow-ai.onrender.com)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Entfernt wiederholte /api-Endungen und trailing Slashes robust
const cleanBaseUrl = API_BASE_URL
  .replace(/(\/api)+\/?$/, '') // strip mehrfach angehängte /api
  .replace(/\/+$/, '');        // strip trailing /

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name: string;
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
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${cleanBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login fehlgeschlagen');
    }

    const data: AuthResponse = await response.json();

    // Store tokens in localStorage
    this.setTokens(data.tokens);

    return data;
  }

  /**
   * Register new user
   */
  async signup(signupData: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${cleanBaseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registrierung fehlgeschlagen');
    }

    const data: AuthResponse = await response.json();

    // Store tokens in localStorage
    this.setTokens(data.tokens);

    return data;
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

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${cleanBaseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry with new token
            return this.getCurrentUser();
          }
        }
        throw new Error('Failed to get user info');
      }

      const data = await response.json();
      return data.user;
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
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
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
