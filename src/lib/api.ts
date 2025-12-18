type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

export interface ApiRequestOptions {
  method?: HttpMethod;
  data?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Production: https://salesflow-ai.onrender.com/api
// Development: /api (proxied to http://localhost:8000/api)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "")}/api`
  : (import.meta.env.PROD ? "https://salesflow-ai.onrender.com/api" : "/api");

console.log('lib/api: API Base URL configured:', API_BASE_URL);
console.log('lib/api: VITE_API_BASE_URL from env:', import.meta.env.VITE_API_BASE_URL);
console.log('lib/api: PROD mode:', import.meta.env.PROD);

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json",
};

/**
 * Get access token from localStorage
 * Supports multiple storage formats:
 * 1. Direct access_token key
 * 2. AuthContext format (salesflow_auth_session)
 * 3. Supabase Auth session (sb-*-auth-token)
 * 4. Supabase Client session (via getSession)
 */
function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  
  // Try authService format first (direct access_token key)
  const directToken = localStorage.getItem("access_token");
  if (directToken) {
    console.log('api.getAccessToken: Found token in access_token');
    return directToken;
  }
  
  // Try AuthContext format (JSON object in salesflow_auth_session)
  try {
    const sessionJson = localStorage.getItem("salesflow_auth_session");
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      if (session?.accessToken) {
        console.log('api.getAccessToken: Found token in salesflow_auth_session');
        return session.accessToken;
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  // Try Supabase Auth session (sb-*-auth-token format)
  try {
    // Supabase stores session in localStorage with pattern: sb-<project-ref>-auth-token
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    
    for (const key of supabaseKeys) {
      const sessionJson = localStorage.getItem(key);
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        if (session?.access_token) {
          console.log(`api.getAccessToken: Found token in ${key}`);
          return session.access_token;
        }
      }
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  // Try Supabase Client session (check localStorage directly for Supabase format)
  // Supabase stores session as: sb-<project-ref>-auth-token with structure:
  // { access_token: "...", refresh_token: "...", expires_at: ... }
  try {
    // Search all localStorage keys that might contain auth tokens
    const allKeys = Object.keys(localStorage);
    const authKeys = allKeys.filter(k => 
      k.includes('auth') || k.includes('token') || k.startsWith('sb-')
    );
    
    for (const key of authKeys) {
      const tokenData = localStorage.getItem(key);
      if (tokenData) {
        try {
          const parsed = JSON.parse(tokenData);
          // Check for access_token in parsed object
          if (parsed?.access_token) {
            console.log(`api.getAccessToken: Found token in ${key}`);
            return parsed.access_token;
          }
          // Also check for nested structure
          if (parsed?.session?.access_token) {
            console.log(`api.getAccessToken: Found token in ${key}.session`);
            return parsed.session.access_token;
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  console.warn('api.getAccessToken: No token found in any storage location');
  const authRelatedKeys = Object.keys(localStorage).filter(k => 
    k.includes('auth') || k.includes('token') || k.includes('session')
  );
  console.log('api.getAccessToken: Auth-related localStorage keys:', authRelatedKeys);
  
  return null;
}

function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          params.append(key, String(entry));
        }
      });
      return;
    }
    params.append(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", data, query, headers, signal } = options;
  const url = `${API_BASE_URL}${normalizePath(path)}${buildQueryString(query)}`;

  // Get access token and add Authorization header
  const token = getAccessToken();
  const requestHeaders: Record<string, string> = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
    console.log(`api.request: Added Authorization header for ${path} (token length: ${token.length})`);
  } else {
    console.warn(`api.request: No token found for ${path}`);
  }

  const init: RequestInit = {
    method,
    headers: requestHeaders,
    credentials: "include",
    signal,
  };

  if (data !== undefined && method !== "GET") {
    init.headers = {
      "Content-Type": "application/json",
      ...init.headers,
    };
    init.body = JSON.stringify(data);
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `API request failed (${response.status} ${response.statusText}): ${
        errorText || "Unbekannter Fehler"
      }`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "data">) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, data?: unknown, options?: Omit<ApiRequestOptions, "method" | "data">) {
    return request<T>(path, { ...options, method: "POST", data });
  },
  patch<T>(path: string, data?: unknown, options?: Omit<ApiRequestOptions, "method" | "data">) {
    return request<T>(path, { ...options, method: "PATCH", data });
  },
  delete<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "data">) {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};

export default api;

