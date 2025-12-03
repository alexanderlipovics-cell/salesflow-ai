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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json",
};

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

  const init: RequestInit = {
    method,
    headers: {
      ...DEFAULT_HEADERS,
      ...headers,
    },
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

