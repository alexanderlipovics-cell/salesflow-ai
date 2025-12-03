/**
 * API Type Definitions
 * Complete type safety for API client
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestConfig {
  endpoint: string;
  method?: HttpMethod;
  data?: any;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean;
  skipCache?: boolean;
  retries?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  cached: boolean;
}

export class ApiError extends Error {
  status: number;
  response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }

  isNetworkError(): boolean {
    return this.status === 0;
  }

  isTimeout(): boolean {
    return this.status === 408 || this.message.includes('timeout');
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export interface QueuedRequest {
  id: string;
  config: ApiRequestConfig;
  timestamp: number;
  retries: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

