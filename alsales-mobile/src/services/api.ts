import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://salesflow-ai.onrender.com/api';

class ApiService {
  private token: string | null = null;

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('access_token', token);
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('access_token');
    }
    return this.token;
  }

  async logout() {
    this.token = null;
    await AsyncStorage.removeItem('access_token');
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken();
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await this.logout();
      throw new Error('Session expired');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    console.log('API Login versuch für:', email);
    
    // Versuche verschiedene Formate
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.access_token) {
      await this.setToken(data.access_token);
    }
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getLeads(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.request(`/leads${query}`);
    console.log('LEADS API Response:', JSON.stringify(response, null, 2));
    return response;
  }

  async getLead(id: string) {
    return this.request(`/leads/${id}`);
  }

  async getTodayFollowups() {
    const response = await this.request('/followups/today');
    console.log('FOLLOWUPS API Response:', JSON.stringify(response, null, 2));
    return response;
  }
}

export const api = new ApiService();

