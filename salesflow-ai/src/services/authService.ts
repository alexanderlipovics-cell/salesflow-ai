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
    this.setTokens(data.tokens);

    return data;
  }

  /**
   * Register new user
   */
  async signup(signupData: SignupData): Promise<AuthResponse> {
    // Teile name in first_name und last_name auf
    const nameParts = signupData.name.trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    // Backend erwartet: email, password, first_name, last_name, company
    const backendData = {
      email: signupData.email,
      password: signupData.password,
      first_name: first_name,
      last_name: last_name,
      ...(signupData.company && { company: signupData.company }),
    };

    const response = await fetch(`${cleanBaseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registrierung fehlgeschlagen');
    }

    const backendResponse = await response.json();

    // Backend gibt zurück: { access_token, refresh_token, token_type, expires_in, user }
    // Frontend erwartet: { user, tokens: { access_token, refresh_token, token_type, expires_in } }
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
      message: 'Registrierung erfolgreich',
    };

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
          // Ungültiger Token: alles löschen und null zurück
          this.clearTokens();
          return null;
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
