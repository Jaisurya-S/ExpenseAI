import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, crashlytics } from './firebase';
import { Income } from '../types';
import safeStorage from './safeStorage';

const INCOMES_COLLECTION = 'incomes';
const getCacheKey = (userId: string) => `@xpenseai_cached_incomes_${userId || 'default'}`;

export const incomeService = {
  // Subscribe to real-time income updates
  subscribeUserIncomes: (
    userId: string,
    onData: (incomes: Income[]) => void,
    onError?: (err: Error) => void
  ) => {
    const cacheKey = getCacheKey(userId);

    // 1. Instantly load local cache so data is immediately visible on app open / reload
    safeStorage.getItem(cacheKey).then((cached) => {
      if (cached) {
        try {
          const parsed: Income[] = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
          }
        } catch {}
      }
    });

    try {
      const q = query(
        collection(db, INCOMES_COLLECTION),
        where('userId', '==', userId)
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

          // Sort descending by date, then createdAt
          items.sort((a, b) => {
            const dateCmp = (b.date || '').localeCompare(a.date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          });

          // Cache locally under user key
          await safeStorage.setItem(cacheKey, JSON.stringify(items));
          onData(items);
        },
        async (firestoreError) => {
          console.warn('Firestore income subscription fallback to local cache:', firestoreError);
          const cached = await safeStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed: Income[] = JSON.parse(cached);
              onData(parsed);
            } catch {
              onData([]);
            }
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

  // Create new income record
  createIncome: async (income: Omit<Income, 'id' | 'createdAt'>): Promise<string> => {
    let finalId = 'inc-' + Date.now();
    const cacheKey = getCacheKey(income.userId);

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
      const cached = await safeStorage.getItem(cacheKey);
      const items: Income[] = cached ? JSON.parse(cached) : [];
      const newInc: Income = {
        ...income,
        id: finalId,
        createdAt: new Date().toISOString(),
      };
      const filtered = items.filter((i) => i.id !== finalId);
      filtered.unshift(newInc);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage cache write error:', cacheErr);
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
        console.warn('Firestore update income fallback to local cache:', err?.message || err);
      }
    }

    try {
      const userId = updates.userId || 'default';
      const cacheKey = getCacheKey(userId);
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('safeStorage cache update error:', cacheErr);
    }
  },

  // Delete income
  deleteIncome: async (id: string, userId?: string): Promise<void> => {
    if (!id.startsWith('local-') && !id.startsWith('inc-')) {
      try {
        const docRef = doc(db, INCOMES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn('Firestore delete income fallback to local cache:', err?.message || err);
      }
    }

    try {
      const cacheKey = getCacheKey(userId || 'default');
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.filter((i) => i.id !== id);
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('safeStorage cache delete error:', cacheErr);
    }
  },
};
