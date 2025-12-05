export interface User {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  company_name: string;
  role: 'user' | 'admin' | 'manager';
  avatar_url?: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  email: string;
  role: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface OAuthProvider {
  id: 'google' | 'apple';
  name: string;
  icon: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

