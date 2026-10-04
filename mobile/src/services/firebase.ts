import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import safeStorage from './safeStorage';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyCQcyARp6S8W-3gO5ClCSmp4VTevFyfbkQ",
  authDomain: "expense-94f00.firebaseapp.com",
  projectId: "expense-94f00",
  storageBucket: "expense-94f00.firebasestorage.app",
  messagingSenderId: "499433669553",
  appId: "1:499433669553:android:dfd997669106c91b733390"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with safeStorage persistence for React Native / default for Web
let auth: Auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(safeStorage as any),
      });
    } catch (persistErr) {
      auth = getAuth(app);
    }
  }
} catch (e) {
  auth = getAuth(app);
}

// Initialize Firestore with ignoreUndefinedProperties to prevent crashes on undefined fields
let db: Firestore;
try {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
} catch (e) {
  db = getFirestore(app);
}

const storage: FirebaseStorage = getStorage(app);

// Helper to remove any undefined values before sending to Firestore
export const sanitizeForFirestore = <T extends Record<string, any>>(data: T): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
};

// Crashlytics logger wrapper
export const crashlytics = {
  log: (message: string) => {
    console.log(`[Crashlytics Log] ${message}`);
  },
  recordError: (error: Error, customAttributes?: Record<string, any>) => {
    console.error(`[Crashlytics Error]`, error, customAttributes);
  },
  setUserId: (userId: string) => {
    console.log(`[Crashlytics User] ${userId}`);
  },
};

// Cloud Messaging FCM token helper wrapper
export const messagingService = {
  requestPermissionAndGetToken: async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return 'web-demo-fcm-token-' + Date.now();
      }
      return 'expo-push-token-demo-' + Date.now();
    } catch (err) {
      console.warn('FCM token registration warning:', err);
      return null;
    }
  },
};

export { app, auth, db, storage };

