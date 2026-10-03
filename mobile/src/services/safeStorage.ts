import { Platform } from 'react-native';

// In-memory memory map for flawless fallback on native / dev client
const memoryStore = new Map<string, string>();

let NativeAsyncStorage: any = null;
try {
  const mod = require('@react-native-async-storage/async-storage');
  NativeAsyncStorage = mod?.default || mod;
} catch (e) {
  NativeAsyncStorage = null;
}

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.getItem === 'function') {
        const val = await NativeAsyncStorage.getItem(key).catch(() => null);
        if (val !== null && val !== undefined) return val;
      }
    } catch (err) {
      // Native storage bridge not available or null
    }
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.setItem === 'function') {
        await NativeAsyncStorage.setItem(key, value).catch(() => {});
      }
    } catch (err) {
      // Native storage bridge not available or null
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.removeItem === 'function') {
        await NativeAsyncStorage.removeItem(key).catch(() => {});
      }
    } catch (err) {
      // Native storage bridge not available or null
    }
  },

  clear: async (): Promise<void> => {
    memoryStore.clear();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.clear === 'function') {
        await NativeAsyncStorage.clear().catch(() => {});
      }
    } catch (err) {}
  },
};

export default safeStorage;
