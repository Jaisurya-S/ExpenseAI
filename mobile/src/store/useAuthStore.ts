import { create } from 'zustand';
import { UserProfile } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

interface AuthState {
  user: User | null;
  profile: UserProfile;
  isLoading: boolean;
  isInitialized: boolean;
  themeMode: 'dark' | 'light' | 'system';
  setCurrency: (currency: string) => Promise<void>;
  setThemeMode: (mode: 'dark' | 'light' | 'system') => Promise<void>;
  toggleNotifications: () => Promise<void>;
  toggleBiometrics: () => Promise<void>;
  loginDemoUser: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  uid: '',
  email: '',
  displayName: '',
  photoURL: null,
  currency: '₹',
  monthlyIncome: 0,
  totalBudgetLimit: 0,
  notificationsEnabled: true,
  biometricsEnabled: false,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: DEFAULT_PROFILE,
  isLoading: false,
  isInitialized: false,
  themeMode: 'dark',

  initAuth: () => {
    // Load local stored preferences
    AsyncStorage.getItem('@xpenseai_user_profile').then((data) => {
      if (data) {
        set({ profile: { ...DEFAULT_PROFILE, ...JSON.parse(data) } });
      }
    });

    AsyncStorage.getItem('@xpenseai_theme_mode').then((mode) => {
      if (mode) {
        set({ themeMode: mode as 'dark' | 'light' | 'system' });
      }
    });

    // Safety timeout in case onAuthStateChanged is delayed
    const timeoutId = setTimeout(() => {
      if (!get().isInitialized) {
        set({ isInitialized: true });
      }
    }, 2000);

    // Subscribe to Firebase Auth
    const unsub = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        clearTimeout(timeoutId);
        if (firebaseUser) {
          set({
            user: firebaseUser,
            isInitialized: true,
            profile: {
              ...get().profile,
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Xpense User',
            },
          });
        } else {
          set({
            user: null,
            isInitialized: true,
          });
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.warn('Firebase Auth State Error:', error);
        set({ isInitialized: true });
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  },

  setCurrency: async (currency: string) => {
    const updated = { ...get().profile, currency };
    set({ profile: updated });
    await AsyncStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  setThemeMode: async (mode: 'dark' | 'light' | 'system') => {
    set({ themeMode: mode });
    await AsyncStorage.setItem('@xpenseai_theme_mode', mode);
  },

  toggleNotifications: async () => {
    const updated = { ...get().profile, notificationsEnabled: !get().profile.notificationsEnabled };
    set({ profile: updated });
    await AsyncStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  toggleBiometrics: async () => {
    const updated = { ...get().profile, biometricsEnabled: !get().profile.biometricsEnabled };
    set({ profile: updated });
    await AsyncStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  loginDemoUser: async () => {
    set({ isLoading: true });
    // Simulate instant demo login
    setTimeout(() => {
      set({
        user: {
          uid: 'demo-user',
          email: 'alex.morgan@xpenseai.com',
          displayName: 'Alex Morgan',
          emailVerified: true,
          isAnonymous: false,
          metadata: {},
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'demo-token',
          getIdTokenResult: async () => ({ token: 'demo-token' } as any),
          reload: async () => {},
          toJSON: () => ({}),
          phoneNumber: null,
          photoURL: null,
          providerId: 'firebase',
        } as unknown as User,
        profile: { ...DEFAULT_PROFILE, uid: 'demo-user' },
        isLoading: false,
      });
    }, 400);
  },

  loginWithEmail: async (email: string, pass: string) => {
    set({ isLoading: true });
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const u = res.user;
      set({
        user: u,
        isLoading: false,
        profile: {
          ...get().profile,
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split('@')[0] || 'Google User',
          photoURL: u.photoURL || null,
        },
      });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  registerWithEmail: async (email: string, pass: string, name: string) => {
    set({ isLoading: true });
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      set({
        isLoading: false,
        profile: {
          ...get().profile,
          uid: res.user.uid,
          email: res.user.email,
          displayName: name || res.user.email?.split('@')[0] || 'User',
        },
      });
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    set({ user: null });
  },
}));
