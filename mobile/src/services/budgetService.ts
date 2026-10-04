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
const getCacheKey = (userId: string) => `@xpenseai_cached_budgets_${userId || 'default'}`;

export const budgetService = {
  subscribeUserBudgets: (
    userId: string,
    onData: (budgets: Budget[]) => void,
    onError?: (err: Error) => void
  ) => {
    const cacheKey = getCacheKey(userId);

    // 1. Instantly load local cache so budgets are immediately visible
    safeStorage.getItem(cacheKey).then((cached) => {
      if (cached) {
        try {
          const parsed: Budget[] = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
          }
        } catch {}
      }
    });

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

          await safeStorage.setItem(cacheKey, JSON.stringify(items));
          onData(items);
        },
        async (err) => {
          console.warn('Firestore budget subscription fallback to local cache:', err);
          const cached = await safeStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed: Budget[] = JSON.parse(cached);
              onData(parsed);
            } catch {
              onData([]);
            }
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
    options?: { period?: BudgetPeriod; alertThreshold?: number; name?: string }
  ): Promise<void> => {
    const budgetId = `budget_${userId}_${category}`;
    const cacheKey = getCacheKey(userId);
    const newBudget: Budget = {
      id: budgetId,
      userId,
      category,
      amount,
      period: options?.period || 'monthly',
      alertThreshold: options?.alertThreshold || 80,
      name: options?.name || `${category} Budget`,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, BUDGETS_COLLECTION, budgetId), newBudget, { merge: true });
    } catch (err) {
      console.warn('Firestore budget upsert fallback to local cache:', err);
    }

    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Budget[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((b) => b.id !== budgetId && b.category !== category);
      filtered.push(newBudget);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage budget write error:', cacheErr);
    }
  },

  upsertOverallBudget: async (
    userId: string,
    amount: number,
    period: BudgetPeriod = 'monthly',
    alertThreshold = 80
  ): Promise<void> => {
    const budgetId = `budget_${userId}_overall`;
    const cacheKey = getCacheKey(userId);
    const overallBudget: Budget = {
      id: budgetId,
      userId,
      isOverall: true,
      amount,
      period,
      alertThreshold,
      name: 'Overall Monthly Budget',
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, BUDGETS_COLLECTION, budgetId), overallBudget, { merge: true });
    } catch (err) {
      console.warn('Firestore overall budget fallback to local cache:', err);
    }

    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Budget[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((b) => !b.isOverall && b.id !== budgetId);
      filtered.push(overallBudget);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage budget write error:', cacheErr);
    }
  },

  deleteBudget: async (budgetId: string, userId?: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, BUDGETS_COLLECTION, budgetId));
    } catch (err) {
      console.warn('Firestore budget delete fallback to local cache:', err);
    }

    try {
      const cacheKey = getCacheKey(userId || 'default');
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Budget[] = JSON.parse(cached);
        items = items.filter((b) => b.id !== budgetId);
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('safeStorage budget delete error:', cacheErr);
    }
  },
};
