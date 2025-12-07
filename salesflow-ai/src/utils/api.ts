import { authFetch } from "../lib/authFetch";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8003/api";

export const api = {
  async get(endpoint: string) {
    const response = await authFetch(`${API_BASE_URL}${endpoint}`, { method: "GET" });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
};

export const clearCache = () => {
  // Cache clearing logic if needed
};

export default api;


