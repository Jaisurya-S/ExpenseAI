import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, crashlytics } from './firebase';
import { Income } from '../types';
import safeStorage from './safeStorage';

const INCOMES_COLLECTION = 'incomes';
const CACHE_KEY = '@xpenseai_cached_incomes';

export const incomeService = {
  // Subscribe to real-time income updates
  subscribeUserIncomes: (
    userId: string,
    onData: (incomes: Income[]) => void,
    onError?: (err: Error) => void
  ) => {
    try {
      const q = query(
        collection(db, INCOMES_COLLECTION),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const items: Income[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              userId: data.userId,
              amount: Number(data.amount) || 0,
              source: data.source || 'Other',
              description: data.description || '',
              payer: data.payer || '',
              date: data.date || new Date().toISOString().split('T')[0],
              paymentMethod: data.paymentMethod || 'UPI',
              receiptUrl: data.receiptUrl,
              notes: data.notes,
              tags: data.tags || [],
              isOpeningBalance: Boolean(data.isOpeningBalance),
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
            });
          });

          // Cache locally
          await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
          onData(items);
        },
        async (firestoreError) => {
          // Load local cache or empty
          const cached = await safeStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const parsed: Income[] = JSON.parse(cached);
              onData(parsed);
            } catch {
              onData([]);
            }
          } else {
            onData([]);
          }
          if (onError) onError(firestoreError);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.warn('subscribeUserIncomes error:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  // Create new income
  createIncome: async (income: Omit<Income, 'id' | 'createdAt'>): Promise<string> => {
    let finalId = 'inc-' + Date.now();
    try {
      const docRef = await addDoc(collection(db, INCOMES_COLLECTION), {
        ...income,
        createdAt: serverTimestamp(),
      });
      finalId = docRef.id;
      crashlytics.log(`Income created in Firestore: ${docRef.id} (${income.source}, ${income.amount})`);
    } catch (err: any) {
      console.warn('Firestore income write fallback to local cache:', err?.message || err);
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      const items: Income[] = cached ? JSON.parse(cached) : [];
      const newInc: Income = {
        ...income,
        id: finalId,
        createdAt: new Date().toISOString(),
      };
      const filtered = items.filter((i) => i.id !== finalId);
      filtered.unshift(newInc);
      await safeStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('AsyncStorage income cache write error:', cacheErr);
    }

    return finalId;
  },

  // Update existing income
  updateIncome: async (id: string, updates: Partial<Income>): Promise<void> => {
    if (!id.startsWith('local-') && !id.startsWith('inc-')) {
      try {
        const docRef = doc(db, INCOMES_COLLECTION, id);
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('Firestore income update fallback to local cache:', err?.message || err);
      }
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
        await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('AsyncStorage income cache update error:', cacheErr);
    }
  },

  // Delete income
  deleteIncome: async (id: string): Promise<void> => {
    if (!id.startsWith('local-') && !id.startsWith('inc-')) {
      try {
        const docRef = doc(db, INCOMES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn('Firestore income delete fallback to local cache:', err?.message || err);
      }
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.filter((i) => i.id !== id);
        await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('AsyncStorage income cache delete error:', cacheErr);
    }
  },
};
