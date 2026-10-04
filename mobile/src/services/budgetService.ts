import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Budget, ExpenseCategory, BudgetPeriod } from '../types';
import safeStorage from './safeStorage';

const BUDGETS_COLLECTION = 'budgets';
const CACHE_KEY = '@xpenseai_cached_budgets';

export const budgetService = {
  subscribeUserBudgets: (
    userId: string,
    onData: (budgets: Budget[]) => void,
    onError?: (err: Error) => void
  ) => {
    try {
      const q = query(
        collection(db, BUDGETS_COLLECTION),
        where('userId', '==', userId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const items: Budget[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              userId: data.userId,
              category: data.category as ExpenseCategory,
              isOverall: Boolean(data.isOverall),
              name: data.name,
              amount: Number(data.amount) || 0,
              period: (data.period as BudgetPeriod) || 'monthly',
              alertThreshold: Number(data.alertThreshold) || 80,
              month: data.month,
              updatedAt: data.updatedAt,
            });
          });

          await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
          onData(items);
        },
        async (err) => {
          const cached = await safeStorage.getItem(CACHE_KEY);
          if (cached) {
            try {
              const parsed: Budget[] = JSON.parse(cached);
              const cleaned = parsed.filter((b) => !b.id?.startsWith('b'));
              onData(cleaned);
            } catch {
              onData([]);
            }
          } else {
            onData([]);
          }
          if (onError) onError(err);
        }
      );

      return unsubscribe;
    } catch (err: any) {
      console.warn('subscribeUserBudgets error:', err);
      if (onError) onError(err);
      return () => {};
    }
  },

  upsertBudget: async (
    userId: string,
    category: ExpenseCategory,
    amount: number,
    options?: {
      period?: BudgetPeriod;
      alertThreshold?: number;
      name?: string;
    }
  ): Promise<void> => {
    try {
      const docId = `${userId}_${category}`;
      const docRef = doc(db, BUDGETS_COLLECTION, docId);
      await setDoc(
        docRef,
        {
          userId,
          category,
          isOverall: false,
          amount: Number(amount),
          period: options?.period || 'monthly',
          alertThreshold: options?.alertThreshold || 80,
          name: options?.name || undefined,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('upsertBudget fallback:', err);
      const cached = await safeStorage.getItem(CACHE_KEY);
      let items: Budget[] = cached ? JSON.parse(cached) : [];
      const existingIdx = items.findIndex((b) => b.category === category && !b.isOverall);
      if (existingIdx >= 0) {
        items[existingIdx].amount = amount;
        if (options?.period) items[existingIdx].period = options.period;
        if (options?.alertThreshold) items[existingIdx].alertThreshold = options.alertThreshold;
      } else {
        items.push({
          id: `${userId}_${category}`,
          userId,
          category,
          isOverall: false,
          amount,
          period: options?.period || 'monthly',
          alertThreshold: options?.alertThreshold || 80,
          updatedAt: new Date().toISOString(),
        });
      }
      await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
    }
  },

  upsertOverallBudget: async (
    userId: string,
    amount: number,
    period: BudgetPeriod = 'monthly',
    alertThreshold: number = 80
  ): Promise<void> => {
    try {
      const docId = `${userId}_OVERALL`;
      const docRef = doc(db, BUDGETS_COLLECTION, docId);
      await setDoc(
        docRef,
        {
          userId,
          isOverall: true,
          amount: Number(amount),
          period,
          alertThreshold,
          name: 'Overall Budget',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('upsertOverallBudget fallback:', err);
      const cached = await safeStorage.getItem(CACHE_KEY);
      let items: Budget[] = cached ? JSON.parse(cached) : [];
      const existingIdx = items.findIndex((b) => b.isOverall);
      if (existingIdx >= 0) {
        items[existingIdx].amount = amount;
        items[existingIdx].period = period;
        items[existingIdx].alertThreshold = alertThreshold;
      } else {
        items.push({
          id: `${userId}_OVERALL`,
          userId,
          isOverall: true,
          amount,
          period,
          alertThreshold,
          name: 'Overall Budget',
          updatedAt: new Date().toISOString(),
        });
      }
      await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
    }
  },

  deleteBudget: async (budgetId: string): Promise<void> => {
    try {
      const docRef = doc(db, BUDGETS_COLLECTION, budgetId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('deleteBudget fallback:', err);
      const cached = await safeStorage.getItem(CACHE_KEY);
      if (cached) {
        let items: Budget[] = JSON.parse(cached);
        items = items.filter((b) => b.id !== budgetId);
        await safeStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    }
  },
};

