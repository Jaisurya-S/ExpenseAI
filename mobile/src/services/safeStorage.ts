import { Platform } from 'react-native';

// In-memory map for instantaneous fallback
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
    // 1. Direct browser localStorage check
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      }
    } catch (e) {}

    // 2. React Native AsyncStorage check
    try {
      if (NativeAsyncStorage && typeof NativeAsyncStorage.getItem === 'function') {
        const val = await NativeAsyncStorage.getItem(key).catch(() => null);
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      }
    } catch (e) {}

    // 3. In-memory cache fallback
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);

    // Save to browser localStorage
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}

    // Save to React Native AsyncStorage
    try {
      if (NativeAsyncStorage && typeof NativeAsyncStorage.setItem === 'function') {
        await NativeAsyncStorage.setItem(key, value).catch(() => {});
      }
    } catch (e) {}
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);

    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}

    try {
      if (NativeAsyncStorage && typeof NativeAsyncStorage.removeItem === 'function') {
        await NativeAsyncStorage.removeItem(key).catch(() => {});
      }
    } catch (e) {}
  },

  clear: async (): Promise<void> => {
    memoryStore.clear();

    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}

    try {
      if (NativeAsyncStorage && typeof NativeAsyncStorage.clear === 'function') {
        await NativeAsyncStorage.clear().catch(() => {});
      }
    } catch (e) {}
  },
};

export default safeStorage;


