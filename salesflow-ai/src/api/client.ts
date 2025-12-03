/**
 * Production-Ready API Client
 * Complete rewrite with auth, caching, retry logic, offline queue
 */
import { API_CONFIG } from '../config/api';
import {
  ApiRequestConfig,
  ApiResponse,
  ApiError,
  HttpMethod,
} from '../types/api';
import { authManager } from '../utils/authManager';
import { cacheManager } from '../utils/cacheManager';
import { offlineQueue } from '../utils/offlineQueue';
import * as MockAPI from './mock';

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.USE_MOCK_API
      ? API_CONFIG.MOCK_API_BASE_URL
      : API_CONFIG.LIVE_API_BASE_URL;
  }

  async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const {
      endpoint,
      method = 'GET',
      data,
      params,
      headers = {},
      timeout = API_CONFIG.TIMEOUT_MS,
      skipAuth = false,
      skipCache = false,
      retries = API_CONFIG.MAX_RETRIES,
    } = config;

    // Use mock API if configured
    if (API_CONFIG.USE_MOCK_API || this.baseURL.startsWith('mock://')) {
      return this.handleMockRequest<T>(config);
    }

    // Check cache for GET requests
    if (method === 'GET' && !skipCache) {
      const cacheKey = cacheManager.generateKey(endpoint, params);
      const cached = cacheManager.get<T>(cacheKey);

      if (cached !== null) {
        return {
          data: cached,
          status: 200,
          headers: new Headers(),
          cached: true,
        };
      }
    }

    // Check if offline
    if (!offlineQueue.getIsOnline()) {
      // Queue request for later
      await offlineQueue.enqueue(config);
      throw new ApiError('Offline - request queued', 0);
    }

    // Build URL with params
    const url = this.buildURL(endpoint, params);

    // Build headers
    const requestHeaders = await this.buildHeaders(headers, skipAuth);

    // Execute request with retry
    return this.executeWithRetry<T>({
      url,
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      timeout,
      retries,
      cacheKey:
        method === 'GET' && !skipCache
          ? cacheManager.generateKey(endpoint, params)
          : undefined,
    });
  }

  private async handleMockRequest<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    // Route to appropriate mock function
    const { endpoint, method = 'GET', data } = config;

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      let mockData: any;

      // Route to mock functions based on endpoint
      if (endpoint.includes('today')) {
        mockData = await (MockAPI as any).fetchToday();
      } else if (endpoint.includes('speed-hunter')) {
        if (method === 'POST') {
          mockData = await (MockAPI as any).startSpeedHunterSession();
        }
      } else {
        // Default mock response
        mockData = { success: true, endpoint, method };
      }

      return {
        data: mockData as T,
        status: 200,
        headers: new Headers(),
        cached: false,
      };
    } catch (error) {
      throw new ApiError(
        `Mock API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  private async executeWithRetry<T>(options: {
    url: string;
    method: HttpMethod;
    headers: HeadersInit;
    body?: string;
    timeout: number;
    retries: number;
    cacheKey?: string;
  }): Promise<ApiResponse<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        const response = await this.executeRequest<T>(options);

        // Cache successful GET responses
        if (options.method === 'GET' && options.cacheKey && !response.cached) {
          cacheManager.set(options.cacheKey, response.data);
        }

        return response;
      } catch (error) {
        lastError = error as ApiError;

        // Don't retry on client errors (4xx except 408, 429)
        if (
          error instanceof ApiError &&
          error.isClientError() &&
          !API_CONFIG.RETRY_STATUS_CODES.includes(error.status)
        ) {
          throw error;
        }

        // Handle 401 - try to refresh token
        if (error instanceof ApiError && error.isUnauthorized()) {
          try {
            await authManager.refreshAccessToken();
            options.headers = await this.buildHeaders({}, false);
            continue; // Retry with new token
          } catch (refreshError) {
            // Refresh failed - clear auth and throw
            await authManager.clearToken();
            throw error;
          }
        }

        // If last attempt, throw
        if (attempt === options.retries) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        const delay = API_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private async executeRequest<T>(options: {
    url: string;
    method: HttpMethod;
    headers: HeadersInit;
    body?: string;
    timeout: number;
  }): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorDetail: string;
        try {
          const errorBody = await response.json();
          errorDetail =
            errorBody.detail ||
            errorBody.message ||
            errorBody.error ||
            response.statusText;
        } catch {
          // Don't try to read body again - it's already consumed
          errorDetail = response.statusText;
        }

        throw new ApiError(
          `API Error (${response.status}): ${errorDetail}`,
          response.status,
          errorDetail
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {
          data: {} as T,
          status: 204,
          headers: response.headers,
          cached: false,
        };
      }

      // Parse JSON
      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers,
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(
          `Request timeout after ${options.timeout}ms`,
          408
        );
      }

      // Network error
      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  private async buildHeaders(
    customHeaders: Record<string, string>,
    skipAuth: boolean
  ): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    if (!skipAuth) {
      // Try to get token from Supabase session first
      const token = await authManager.getSupabaseToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Convenience methods
  get<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, endpoint, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, endpoint, method: 'POST', data });
  }

  put<T>(
    endpoint: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, endpoint, method: 'PUT', data });
  }

  patch<T>(
    endpoint: string,
    data?: any,
    config?: Partial<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, endpoint, method: 'PATCH', data });
  }

  delete<T>(endpoint: string, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, endpoint, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

