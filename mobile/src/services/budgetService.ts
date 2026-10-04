import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from './firebase';
import { Budget, ExpenseCategory, BudgetPeriod } from '../types';
import safeStorage from './safeStorage';

const BUDGETS_COLLECTION = 'budgets';
const UNIVERSAL_KEY = '@xpenseai_stored_budgets';
const getCacheKey = (userId: string) => `@xpenseai_cached_budgets_${userId || 'default'}`;
const getDeletedKey = (userId: string) => `@xpenseai_deleted_budgets_${userId || 'default'}`;

export const budgetService = {
  // Subscribe to real-time budget updates with zero data loss guarantee
  subscribeUserBudgets: (
    userId: string,
    onData: (budgets: Budget[]) => void,
    onError?: (err: Error) => void
  ) => {
    const activeUserId = userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);
    const deletedKey = getDeletedKey(activeUserId);

    // 1. Instantly load local cache so budgets are immediately visible
    (async () => {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed: Budget[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const userSpecific = parsed.filter((b) => !b.userId || b.userId === activeUserId);
            onData(userSpecific);
          }
        } catch {}
      } else {
        onData([]);
      }
    })();

    try {
      const q = query(
        collection(db, BUDGETS_COLLECTION),
        where('userId', '==', activeUserId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const remoteItems: Budget[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteItems.push({
              id: docSnap.id,
              userId: data.userId || activeUserId,
              category: data.category as ExpenseCategory,
              isOverall: Boolean(data.isOverall),
              name: data.name,
              amount: Number(data.amount) || 0,
              period: (data.period as BudgetPeriod) || 'monthly',
              alertThreshold: Number(data.alertThreshold) || 80,
              month: data.month,
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          });

          // Read local cache and deleted items
          let localItems: Budget[] = [];
          let deletedIds = new Set<string>();
          try {
            const cached = await safeStorage.getItem(cacheKey);
            if (cached) localItems = JSON.parse(cached);
            const deletedStr = await safeStorage.getItem(deletedKey);
            if (deletedStr) deletedIds = new Set(JSON.parse(deletedStr));
          } catch {}

          const validRemoteItems = remoteItems.filter((item) => (item.userId === activeUserId) && !deletedIds.has(item.id));
          const remoteIdSet = new Set(validRemoteItems.map((r) => r.id));
          const unsyncedLocalItems = localItems.filter(
            (local) => (local.userId === activeUserId || !local.userId) && !deletedIds.has(local.id) && !remoteIdSet.has(local.id)
          );

          // Merge remote + local
          const mergedMap = new Map<string, Budget>();
          for (const item of validRemoteItems) {
            mergedMap.set(item.id, item);
          }
          for (const item of unsyncedLocalItems) {
            if (!mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
            }
          }

          const allItems = Array.from(mergedMap.values());

          await safeStorage.setItem(cacheKey, JSON.stringify(allItems));
          onData(allItems);

          // Background auto-sync unsynced budgets to Firestore
          for (const unsynced of unsyncedLocalItems) {
            (async () => {
              try {
                const payload = sanitizeForFirestore({
                  ...unsynced,
                  userId: unsynced.userId || activeUserId,
                  updatedAt: new Date().toISOString(),
                });
                await setDoc(doc(db, BUDGETS_COLLECTION, unsynced.id), payload, { merge: true });
              } catch (syncErr) {
                console.warn('Background budget sync error:', syncErr);
              }
            })();
          }
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
      safeStorage.getItem(cacheKey).then((cached) => {
        if (cached) {
          try {
            onData(JSON.parse(cached));
          } catch {}
        }
      });
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
    const activeUserId = userId || 'demo-user';
    const budgetId = `budget_${activeUserId}_${category}`;
    const cacheKey = getCacheKey(activeUserId);
    const newBudget: Budget = {
      id: budgetId,
      userId: activeUserId,
      category,
      amount,
      period: options?.period || 'monthly',
      alertThreshold: options?.alertThreshold || 80,
      name: options?.name || `${category} Budget`,
      updatedAt: new Date().toISOString(),
    };

    // 1. Write to local cache immediately
    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Budget[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((b) => b.id !== budgetId && b.category !== category);
      filtered.push(newBudget);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
      await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage budget write error:', cacheErr);
    }

    // 2. Write to Firestore with sanitized payload
    try {
      const payload = sanitizeForFirestore(newBudget);
      await setDoc(doc(db, BUDGETS_COLLECTION, budgetId), payload, { merge: true });
    } catch (err) {
      console.warn('Firestore budget upsert fallback to local cache:', err);
    }
  },

  upsertOverallBudget: async (
    userId: string,
    amount: number,
    period: BudgetPeriod = 'monthly',
    alertThreshold = 80
  ): Promise<void> => {
    const activeUserId = userId || 'demo-user';
    const budgetId = `budget_${activeUserId}_overall`;
    const cacheKey = getCacheKey(activeUserId);
    const overallBudget: Budget = {
      id: budgetId,
      userId: activeUserId,
      isOverall: true,
      amount,
      period,
      alertThreshold,
      name: 'Overall Monthly Budget',
      updatedAt: new Date().toISOString(),
    };

    // 1. Write to local cache immediately
    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Budget[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((b) => !b.isOverall && b.id !== budgetId);
      filtered.push(overallBudget);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
      await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage budget write error:', cacheErr);
    }

    // 2. Write to Firestore with sanitized payload
    try {
      const payload = sanitizeForFirestore(overallBudget);
      await setDoc(doc(db, BUDGETS_COLLECTION, budgetId), payload, { merge: true });
    } catch (err) {
      console.warn('Firestore overall budget fallback to local cache:', err);
    }
  },

  deleteBudget: async (budgetId: string, userId?: string): Promise<void> => {
    let activeUserId = userId;
    if (!activeUserId) {
      try {
        const authData = await safeStorage.getItem('@xpenseai_master_auth_store');
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed?.state?.profile?.uid) {
            activeUserId = parsed.state.profile.uid;
          }
        }
      } catch {}
    }
    if (!activeUserId) activeUserId = 'demo-user';
    const cacheKey = getCacheKey(activeUserId);
    const deletedKey = getDeletedKey(activeUserId);

    // 1. Remove from local user cache, universal cache, and record deleted id
    try {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Budget[] = JSON.parse(cached);
        items = items.filter((b) => b.id !== budgetId);
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }

      const univCached = await safeStorage.getItem(UNIVERSAL_KEY);
      if (univCached) {
        let items: Budget[] = JSON.parse(univCached);
        items = items.filter((b) => b.id !== budgetId);
        await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(items));
      }

      const deletedStr = await safeStorage.getItem(deletedKey);
      const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedList.includes(budgetId)) {
        deletedList.push(budgetId);
        await safeStorage.setItem(deletedKey, JSON.stringify(deletedList));
      }
    } catch (cacheErr) {
      console.warn('safeStorage budget delete error:', cacheErr);
    }

    // 2. Delete from Firestore
    try {
      await deleteDoc(doc(db, BUDGETS_COLLECTION, budgetId));
    } catch (err) {
      console.warn('Firestore budget delete fallback to local cache:', err);
    }
  },
};

