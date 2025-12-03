import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'sales_flow_auth_token';
const REFRESH_TOKEN_KEY = 'sales_flow_refresh_token';
const USER_DATA_KEY = 'sales_flow_user_data';
const REMEMBER_ME_KEY = 'sales_flow_remember_me';
const BIOMETRIC_ENABLED_KEY = 'sales_flow_biometric_enabled';

const storageProxy = {
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async deleteItem(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export class SecureStorage {
  static async storeAuthToken(token: string) {
    await storageProxy.setItem(AUTH_TOKEN_KEY, token);
  }

  static async getAuthToken() {
    return storageProxy.getItem(AUTH_TOKEN_KEY);
  }

  static async removeAuthToken() {
    await storageProxy.deleteItem(AUTH_TOKEN_KEY);
  }

  static async storeRefreshToken(token: string) {
    await storageProxy.setItem(REFRESH_TOKEN_KEY, token);
  }

  static async getRefreshToken() {
    return storageProxy.getItem(REFRESH_TOKEN_KEY);
  }

  static async removeRefreshToken() {
    await storageProxy.deleteItem(REFRESH_TOKEN_KEY);
  }

  static async storeUserData(userData: unknown) {
    await storageProxy.setItem(USER_DATA_KEY, JSON.stringify(userData));
  }

  static async getUserData<T = unknown>() {
    const data = await storageProxy.getItem(USER_DATA_KEY);
    return data ? (JSON.parse(data) as T) : null;
  }

  static async removeUserData() {
    await storageProxy.deleteItem(USER_DATA_KEY);
  }

  static async setRememberMe(enabled: boolean) {
    await storageProxy.setItem(REMEMBER_ME_KEY, String(enabled));
  }

  static async getRememberMe() {
    const value = await storageProxy.getItem(REMEMBER_ME_KEY);
    return value === 'true';
  }

  static async setBiometricEnabled(enabled: boolean) {
    await storageProxy.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
  }

  static async getBiometricEnabled() {
    const value = await storageProxy.getItem(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  }

  static async clearAll() {
    await Promise.all([
      this.removeAuthToken(),
      this.removeRefreshToken(),
      this.removeUserData(),
    ]);
  }
}

export const SecureStorageKeys = {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_DATA_KEY,
  REMEMBER_ME_KEY,
  BIOMETRIC_ENABLED_KEY,
} as const;

