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
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, crashlytics, auth } from './firebase';
import { Expense } from '../types';
import safeStorage from './safeStorage';

const EXPENSES_COLLECTION = 'expenses';
const CACHE_KEY = '@xpenseai_cached_expenses';

export const expenseService = {
  // Subscribe to real-time expense updates
  subscribeUserExpenses: (
    userId: string,
    onData: (expenses: Expense[]) => void,
    onError?: (err: Error) => void
  ) => {
    try {
      const q = query(
        collection(db, EXPENSES_COLLECTION),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const items: Expense[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              userId: data.userId,
              amount: Number(data.amount) || 0,
              category: data.category,
              description: data.description || '',
              merchant: data.merchant || '',
              date: data.date || new Date().toISOString().split('T')[0],
              paymentMethod: data.paymentMethod || 'UPI',
              receiptUrl: data.receiptUrl,
              notes: data.notes,
              tags: data.tags || [],
              aiConfidence: data.aiConfidence,
              aiSuggestedCategory: data.aiSuggestedCategory,
              isAiGenerated: data.isAiGenerated,
              inputMethod: data.inputMethod,
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
              const parsed: Expense[] = JSON.parse(cached);
              const cleaned = parsed.filter((e) => !e.id?.startsWith('seed-'));
              onData(cleaned);
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
      console.warn('subscribeUserExpenses error:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  // Create new expense
  createExpense: async (expense: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    let finalId = 'exp-' + Date.now();
    try {
      const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
        ...expense,
        createdAt: serverTimestamp(),
      });
      finalId = docRef.id;
      crashlytics.log(`Expense created in Firestore: ${docRef.id} (${expense.category}, ${expense.amount})`);
    } catch (err: any) {
      console.warn('Firestore write fallback to local cache:', err?.message || err);
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      const items: Expense[] = cached ? JSON.parse(cached) : [];
      const newExp: Expense = {
        ...expense,
        id: finalId,
        createdAt: new Date().toISOString(),
      };
      const filtered = items.filter((e) => e.id !== finalId);
      filtered.unshift(newExp);
      await safeStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('AsyncStorage cache write error:', cacheErr);
    }

    return finalId;
  },

  // Update existing expense
  updateExpense: async (id: string, updates: Partial<Expense>): Promise<void> => {
    if (!id.startsWith('local-') && !id.startsWith('exp-')) {
      try {
        const docRef = doc(db, EXPENSES_COLLECTION, id);
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('Firestore update fallback to local cache:', err?.message || err);
      }
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      if (cached) {
        let items: Expense[] = JSON.parse(cached);
        items = items.map((e) => (e.id === id ? { ...e, ...updates } : e));
        await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('AsyncStorage cache update error:', cacheErr);
    }
  },

  // Delete expense
  deleteExpense: async (id: string): Promise<void> => {
    if (!id.startsWith('local-') && !id.startsWith('exp-')) {
      try {
        const docRef = doc(db, EXPENSES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn('Firestore delete fallback to local cache:', err?.message || err);
      }
    }

    try {
      const cached = await safeStorage.getItem(CACHE_KEY);
      if (cached) {
        let items: Expense[] = JSON.parse(cached);
        items = items.filter((e) => e.id !== id);
        await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('AsyncStorage cache delete error:', cacheErr);
    }
  },
};
