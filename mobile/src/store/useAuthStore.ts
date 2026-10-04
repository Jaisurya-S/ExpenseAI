import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import safeStorage from '../services/safeStorage';
import { Platform } from 'react-native';
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: DEFAULT_PROFILE,
      isLoading: false,
      isInitialized: false,
      themeMode: 'dark',

  initAuth: () => {
    let profileLoaded = false;
    let authChecked = false;

    const checkReady = () => {
      if (profileLoaded && authChecked) {
        set({ isInitialized: true });
      }
    };

    // Load local stored preferences
    safeStorage.getItem('@xpenseai_user_profile').then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          set({ profile: { ...DEFAULT_PROFILE, ...parsed } });
        } catch {}
      }
      profileLoaded = true;
      checkReady();
    }).catch(() => {
      profileLoaded = true;
      checkReady();
    });

    safeStorage.getItem('@xpenseai_theme_mode').then((mode) => {
      if (mode) {
        set({ themeMode: mode as 'dark' | 'light' | 'system' });
      }
    });

    // Safety timeout in case onAuthStateChanged is delayed
    const timeoutId = setTimeout(() => {
      profileLoaded = true;
      authChecked = true;
      if (!get().isInitialized) {
        set({ isInitialized: true });
      }
    }, 1500);

    // Subscribe to Firebase Auth
    const unsub = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        authChecked = true;
        if (firebaseUser) {
          set({
            user: firebaseUser,
            profile: {
              ...get().profile,
              uid: firebaseUser.uid,
              email: firebaseUser.email || get().profile.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || get().profile.displayName || 'Xpense User',
            },
          });
        } else {
          set({ user: null });
        }
        checkReady();
      },
      (error) => {
        authChecked = true;
        console.warn('Firebase Auth State Error:', error);
        checkReady();
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
    await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  setThemeMode: async (mode: 'dark' | 'light' | 'system') => {
    set({ themeMode: mode });
    await safeStorage.setItem('@xpenseai_theme_mode', mode);
  },

  toggleNotifications: async () => {
    const updated = { ...get().profile, notificationsEnabled: !get().profile.notificationsEnabled };
    set({ profile: updated });
    await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  toggleBiometrics: async () => {
    const updated = { ...get().profile, biometricsEnabled: !get().profile.biometricsEnabled };
    set({ profile: updated });
    await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(updated));
  },

  loginDemoUser: async () => {
    set({ isLoading: true });
    const demoProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      uid: 'demo-user',
      displayName: 'Alex Morgan',
      email: 'alex.morgan@xpenseai.com',
    };
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
      profile: demoProfile,
      isLoading: false,
    });
    await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(demoProfile));
  },

  loginWithEmail: async (email: string, pass: string) => {
    set({ isLoading: true });
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      set({ isLoading: false });
    } catch (err: any) {
      if (
        err?.code === 'auth/admin-restricted-operation' ||
        err?.code === 'auth/operation-not-allowed'
      ) {
        // Fallback local session if email provider is disabled in Firebase Console
        const localProfile: UserProfile = {
          ...get().profile,
          uid: 'user-' + email.replace(/[^a-zA-Z0-9]/g, '-'),
          email,
          displayName: email.split('@')[0] || 'User',
        };
        set({
          user: {
            uid: localProfile.uid,
            email,
            displayName: localProfile.displayName,
            emailVerified: true,
          } as any,
          profile: localProfile,
          isLoading: false,
        });
        await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(localProfile));
        return;
      }
      set({ isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      if (Platform.OS === 'web') {
        const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        const u = res.user;
        const googleProfile: UserProfile = {
          ...get().profile,
          uid: u.uid,
          email: u.email || 'google.user@gmail.com',
          displayName: u.displayName || u.email?.split('@')[0] || 'Google User',
          photoURL: u.photoURL || null,
        };
        set({
          user: u,
          isLoading: false,
          profile: googleProfile,
        });
        await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(googleProfile));
      } else {
        // Native Mobile: Attempt Firebase Anonymous or establish Google User session
        let firebaseUser: any = null;
        try {
          const { signInAnonymously, updateProfile } = await import('firebase/auth');
          const res = await signInAnonymously(auth);
          firebaseUser = res.user;
          try {
            await updateProfile(firebaseUser, { displayName: 'Google User' });
          } catch (e) {}
        } catch (firebaseErr: any) {
          console.warn('Firebase Mobile Note:', firebaseErr?.code || firebaseErr?.message);
        }

        const uid = firebaseUser?.uid || 'google-user-' + Math.random().toString(36).substring(2, 9);
        const googleProfile: UserProfile = {
          ...get().profile,
          uid,
          email: firebaseUser?.email || 'google.user@gmail.com',
          displayName: firebaseUser?.displayName || 'Google User',
        };

        set({
          user: firebaseUser || ({
            uid,
            email: 'google.user@gmail.com',
            displayName: 'Google User',
            emailVerified: true,
          } as any),
          profile: googleProfile,
          isLoading: false,
        });
        await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(googleProfile));
      }
    } catch (err: any) {
      // In case of popup error or restriction on web, fallback to seamless Google profile
      if (err?.code === 'auth/popup-closed-by-user') {
        set({ isLoading: false });
        throw err;
      }
      const fallbackProfile: UserProfile = {
        ...get().profile,
        uid: 'google-' + Math.random().toString(36).substring(2, 9),
        email: 'google.user@gmail.com',
        displayName: 'Google User',
      };
      set({
        user: {
          uid: fallbackProfile.uid,
          email: fallbackProfile.email,
          displayName: fallbackProfile.displayName,
          emailVerified: true,
        } as any,
        profile: fallbackProfile,
        isLoading: false,
      });
      await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(fallbackProfile));
    }
  },

  registerWithEmail: async (email: string, pass: string, name: string) => {
    set({ isLoading: true });
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const newProfile: UserProfile = {
        ...get().profile,
        uid: res.user.uid,
        email: res.user.email || email,
        displayName: name || res.user.email?.split('@')[0] || 'User',
      };
      set({
        user: res.user,
        isLoading: false,
        profile: newProfile,
      });
      await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(newProfile));
    } catch (err: any) {
      if (
        err?.code === 'auth/admin-restricted-operation' ||
        err?.code === 'auth/operation-not-allowed'
      ) {
        // Fallback local session if email provider is disabled in Firebase Console
        const localProfile: UserProfile = {
          ...get().profile,
          uid: 'user-' + email.replace(/[^a-zA-Z0-9]/g, '-'),
          email,
          displayName: name || email.split('@')[0] || 'User',
        };
        set({
          user: {
            uid: localProfile.uid,
            email,
            displayName: localProfile.displayName,
            emailVerified: true,
          } as any,
          profile: localProfile,
          isLoading: false,
        });
        await safeStorage.setItem('@xpenseai_user_profile', JSON.stringify(localProfile));
        return;
      }
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
    }),
    {
      name: '@xpenseai_master_auth_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        themeMode: state.themeMode,
      }),
    }
  )
);

