import {
  API_CONFIG,
  LIVE_API_BASE_URL,
  USE_MOCK_API,
} from '../config/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type FetchStyleOptions = RequestInit & { skipJson?: boolean };
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  skipJson?: boolean;
}

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? 'demo-user-1';

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  const base =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
    LIVE_API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:8000/api';
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;
  return `${base}${normalizedEndpoint}`;
}

const toHeaders = (input?: HeadersInit): Record<string, string> => {
  if (!input) return {};
  if (input instanceof Headers) {
    const obj: Record<string, string> = {};
    input.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (Array.isArray(input)) {
    return input.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }
  return input;
};

async function runRequest<T>(
  endpoint: string,
  init: FetchStyleOptions = {},
): Promise<T> {
  const { skipJson, headers, ...rest } = init;

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...toHeaders(headers),
  };
  if (DEFAULT_USER_ID && !mergedHeaders['X-User-Id']) {
    mergedHeaders['X-User-Id'] = DEFAULT_USER_ID;
  }

  const response = await fetch(buildUrl(endpoint), {
    headers: mergedHeaders,
    ...rest,
  });

  const isJson =
    response.headers?.get('content-type')?.includes('application/json');
  const payload =
    isJson && !skipJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload || 'Request failed'
        : payload?.message || 'Request failed';
    throw new Error(message);
  }

  return (payload as T) ?? ({} as T);
}

export async function apiClient<T>(
  endpoint: string,
  init?: FetchStyleOptions,
): Promise<T>;
export async function apiClient<T>(
  endpoint: string,
  method: HttpMethod,
  body?: unknown,
  options?: RequestOptions,
): Promise<T>;
export async function apiClient<T>(
  endpoint: string,
  initOrMethod?: FetchStyleOptions | HttpMethod,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  if (
    typeof initOrMethod === 'string' &&
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(initOrMethod)
  ) {
    const method = initOrMethod as HttpMethod;
    const headers: Record<string, string> = options.headers ?? {};
    const payload =
      body !== undefined && body !== null
        ? typeof body === 'string'
          ? body
          : JSON.stringify(body)
        : undefined;
    return runRequest(endpoint, {
      method,
      body: payload,
      headers,
      skipJson: options.skipJson,
    });
  }

  return runRequest(endpoint, initOrMethod as FetchStyleOptions);
}

export { API_CONFIG, USE_MOCK_API, LIVE_API_BASE_URL };
