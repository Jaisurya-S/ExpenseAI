import { Platform } from 'react-native';

// In-memory memory map for instantaneous synchronous fallback
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
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.getItem === 'function') {
        const val = await NativeAsyncStorage.getItem(key).catch(() => null);
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      }
    } catch (err) {
      // Native storage bridge not available or error
    }
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.setItem === 'function') {
        await NativeAsyncStorage.setItem(key, value).catch(() => {});
      }
    } catch (err) {
      // Native storage bridge not available or error
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.removeItem === 'function') {
        await NativeAsyncStorage.removeItem(key).catch(() => {});
      }
    } catch (err) {
      // Native storage bridge not available or error
    }
  },

  clear: async (): Promise<void> => {
    memoryStore.clear();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      if (NativeAsyncStorage && typeof NativeAsyncStorage.clear === 'function') {
        await NativeAsyncStorage.clear().catch(() => {});
      }
    } catch (err) {}
  },
};

export default safeStorage;

