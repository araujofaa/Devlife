import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiClient } from '@devlife/api-client';

const webStorage = {
  getItemAsync: async (key: string) => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage.getItem(key);
    }
    return null;
  },
  setItemAsync: async (key: string, value: string) => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.setItem(key, value);
    }
  },
  deleteItemAsync: async (key: string) => {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      (globalThis as any).localStorage.removeItem(key);
    }
  },
};

const secureStore = Platform.OS === 'web' ? webStorage : SecureStore;

export const storage = {
  async getToken(key: 'access_token' | 'refresh_token'): Promise<string | null> {
    return secureStore.getItemAsync(key);
  },
  async setToken(key: 'access_token' | 'refresh_token', value: string): Promise<void> {
    return secureStore.setItemAsync(key, value);
  },
  async removeToken(key: 'access_token' | 'refresh_token'): Promise<void> {
    return secureStore.deleteItemAsync(key);
  },

  async getItem<T>(key: string): Promise<T | null> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// ============================================
// TokenAdapter completo — habilita refresh no mobile
// ============================================
apiClient.setTokenAdapter({
  getToken: async () => storage.getToken('access_token'),
  getRefreshToken: async () => storage.getToken('refresh_token'),
  setTokens: async (access, refresh) => {
    await storage.setToken('access_token', access);
    if (refresh) await storage.setToken('refresh_token', refresh);
  },
  clear: async () => {
    await storage.removeToken('access_token');
    await storage.removeToken('refresh_token');
  },
});