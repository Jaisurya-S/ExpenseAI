import AsyncStorage from '@react-native-async-storage/async-storage';

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Direct browser localStorage check if on web
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {}

    // 2. React Native AsyncStorage (native iOS / Android)
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null && val !== undefined) return val;
    } catch (e) {}

    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Save to browser localStorage
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}

    // Save to React Native AsyncStorage
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {}
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}

    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {}
  },

  clear: async (): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}

    try {
      await AsyncStorage.clear();
    } catch (e) {}
  },
};

export default safeStorage;



