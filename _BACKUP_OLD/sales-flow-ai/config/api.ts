import Constants from 'expo-constants';

import { SecureStorage } from '../utils/secureStorage';
import { logger } from '../utils/logger';

type Environment = 'dev' | 'staging' | 'production';

const ENV: Record<Environment, { apiUrl: string; supabaseUrl: string }> = {
  dev: {
    apiUrl: 'http://localhost:8000/api',
    supabaseUrl: 'https://dev-project.supabase.co',
  },
  staging: {
    apiUrl: 'https://staging-api.salesflow.ai/api',
    supabaseUrl: 'https://staging-project.supabase.co',
  },
  production: {
    apiUrl: 'https://api.salesflow.ai/api',
    supabaseUrl: 'https://production-project.supabase.co',
  },
};

const getEnvVars = () => {
  if (__DEV__) {
    return ENV.dev;
  }

  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;

  if (releaseChannel === 'staging') {
    return ENV.staging;
  }

  return ENV.production;
};

export const API_CONFIG = getEnvVars();
export const USE_MOCK_API = __DEV__ && false;
export const LIVE_API_BASE_URL = API_CONFIG.apiUrl;

async function getAuthToken() {
  try {
    const token = await SecureStorage.getAuthToken();
    return token;
  } catch (error) {
    logger.error('Failed to read auth token from secure storage', error);
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
  options?: {
    skipAuth?: boolean;
    timeout?: number;
  }
): Promise<T> {
  if (__DEV__) {
    logger.debug(`[API] ${method} ${endpoint}`, body);
  }

  const url = `${LIVE_API_BASE_URL}${endpoint}`;
  const timeout = options?.timeout || 10000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (!options?.skipAuth) {
      const token = await getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ✅ FIX: Read response body ONCE to avoid "Body already read" error
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || 'Request failed';
      throw new Error(`API Error ${response.status}: ${errorMessage}`);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    throw error;
  }
}

