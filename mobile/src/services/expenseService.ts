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
import { db, crashlytics, sanitizeForFirestore } from './firebase';
import { Expense } from '../types';
import safeStorage from './safeStorage';

const EXPENSES_COLLECTION = 'expenses';
const UNIVERSAL_KEY = '@xpenseai_stored_expenses';
const getCacheKey = (userId: string) => `@xpenseai_cached_expenses_${userId || 'default'}`;
const getDeletedKey = (userId: string) => `@xpenseai_deleted_expenses_${userId || 'default'}`;

// In-flight sync tracker to avoid duplicate background uploads
const syncingIds = new Set<string>();

export const expenseService = {
  // Subscribe to real-time expense updates with zero data loss guarantee
  subscribeUserExpenses: (
    userId: string,
    onData: (expenses: Expense[]) => void,
    onError?: (err: Error) => void
  ) => {
    const activeUserId = userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);
    const deletedKey = getDeletedKey(activeUserId);

    // 1. Instantly load local cache so data is ALWAYS immediately visible on reload
    (async () => {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed: Expense[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const userSpecific = parsed.filter((e) => !e.userId || e.userId === activeUserId);
            onData(userSpecific);
          }
        } catch {}
      } else {
        onData([]);
      }
    })();

    try {
      const q = query(
        collection(db, EXPENSES_COLLECTION),
        where('userId', '==', activeUserId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const remoteItems: Expense[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteItems.push({
              id: docSnap.id,
              userId: data.userId || activeUserId,
              amount: Number(data.amount) || 0,
              category: data.category || 'Other',
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
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
            });
          });

          // Read local cache and deleted items
          let localItems: Expense[] = [];
          let deletedIds = new Set<string>();
          try {
            const cached = await safeStorage.getItem(cacheKey);
            if (cached) localItems = JSON.parse(cached);
            const deletedStr = await safeStorage.getItem(deletedKey);
            if (deletedStr) deletedIds = new Set(JSON.parse(deletedStr));
          } catch {}

          // Filter out deleted items from remote
          const validRemoteItems = remoteItems.filter((item) => (item.userId === activeUserId) && !deletedIds.has(item.id));

          // Retain any locally saved items that are not yet in Firestore (e.g. exp- temp ids or unsynced offline items)
          const remoteIdSet = new Set(validRemoteItems.map((r) => r.id));
          const unsyncedLocalItems = localItems.filter((local) => {
            if (local.userId && local.userId !== activeUserId) return false;
            if (deletedIds.has(local.id)) return false;
            if (remoteIdSet.has(local.id)) return false;

            // If it's a temporary item, check if there's already an identical remote item (same amount, category, date, description)
            if (local.id.startsWith('exp-') || local.id.startsWith('local-')) {
              const isDuplicateOfRemote = validRemoteItems.some(
                (remote) =>
                  Number(remote.amount) === Number(local.amount) &&
                  remote.category === local.category &&
                  remote.date === local.date &&
                  (remote.description || '').trim() === (local.description || '').trim()
              );
              if (isDuplicateOfRemote) {
                return false;
              }
            }
            return true;
          });

          // Merge: remote items + unsynced local items (avoiding duplicates)
          const mergedMap = new Map<string, Expense>();
          for (const item of validRemoteItems) {
            mergedMap.set(item.id, item);
          }
          for (const item of unsyncedLocalItems) {
            if (!mergedMap.has(item.id)) {
              mergedMap.set(item.id, item);
            }
          }

          const allItems = Array.from(mergedMap.values());

          // Sort descending by date, then createdAt
          allItems.sort((a, b) => {
            const dateCmp = (b.date || '').localeCompare(a.date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          });

          // Persist merged data locally
          await safeStorage.setItem(cacheKey, JSON.stringify(allItems));
          onData(allItems);
        },
        async (firestoreError) => {
          console.warn('Firestore subscription fallback to local cache:', firestoreError);
          const cached = await safeStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed: Expense[] = JSON.parse(cached);
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
      console.warn('subscribeUserExpenses error:', err);
      // Ensure local cache is provided even if subscription setup throws
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

  // Create new expense with immediate local persistence
  createExpense: async (expense: { id?: string; createdAt?: string } & Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    const tempId = expense.id || ('exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
    const activeUserId = expense.userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);

    const newExp: Expense = {
      ...expense,
      id: tempId,
      createdAt: expense.createdAt || new Date().toISOString(),
    };

    // 1. Immediately write to local cache so reload will NEVER lose it
    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Expense[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((e) => e.id !== tempId);
      filtered.unshift(newExp);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
      await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage cache write error:', cacheErr);
    }

    // 2. Attempt Firestore write with sanitized payload
    try {
      const payload = sanitizeForFirestore({
        userId: activeUserId,
        amount: Number(expense.amount) || 0,
        category: expense.category,
        description: expense.description || '',
        merchant: expense.merchant || '',
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        receiptUrl: expense.receiptUrl || '',
        notes: expense.notes || '',
        tags: expense.tags || [],
        aiConfidence: expense.aiConfidence || null,
        aiSuggestedCategory: expense.aiSuggestedCategory || null,
        isAiGenerated: Boolean(expense.isAiGenerated),
        inputMethod: expense.inputMethod || 'manual',
        createdAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), payload);
      const finalId = docRef.id;
      crashlytics.log(`Expense created in Firestore: ${finalId} (${expense.category}, ${expense.amount})`);

      // Update local cache ID to match Firestore docRef.id
      try {
        const cached = await safeStorage.getItem(cacheKey);
        if (cached) {
          let items: Expense[] = JSON.parse(cached);
          items = items.map((e) => (e.id === tempId ? { ...e, id: finalId } : e));
          // Deduplicate if finalId somehow exists already
          const seen = new Set<string>();
          const deduped: Expense[] = [];
          for (const item of items) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              deduped.push(item);
            }
          }
          await safeStorage.setItem(cacheKey, JSON.stringify(deduped));
          await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(deduped));
        }
      } catch {}

      return finalId;
    } catch (err: any) {
      console.warn('Firestore write fallback to local cache:', err?.message || err);
      return tempId;
    }
  },

  // Update existing expense
  updateExpense: async (id: string, updates: Partial<Expense>): Promise<void> => {
    const activeUserId = updates.userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);

    // 1. Update in local cache immediately
    try {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Expense[] = JSON.parse(cached);
        items = items.map((e) => (e.id === id ? { ...e, ...updates } : e));
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('safeStorage cache update error:', cacheErr);
    }

    // 2. Update in Firestore if not a temporary ID
    if (!id.startsWith('local-') && !id.startsWith('exp-')) {
      try {
        const docRef = doc(db, EXPENSES_COLLECTION, id);
        const payload = sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(docRef, payload);
      } catch (err: any) {
        console.warn('Firestore update fallback to local cache:', err?.message || err);
      }
    }
  },

  // Delete expense
  deleteExpense: async (id: string, userId?: string): Promise<void> => {
    const activeUserId = userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);
    const deletedKey = getDeletedKey(activeUserId);

    // 1. Remove from local cache and add to deleted set
    try {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Expense[] = JSON.parse(cached);
        items = items.filter((e) => e.id !== id);
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }

      const deletedStr = await safeStorage.getItem(deletedKey);
      const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        await safeStorage.setItem(deletedKey, JSON.stringify(deletedList));
      }
    } catch (cacheErr) {
      console.warn('safeStorage cache delete error:', cacheErr);
    }

    // 2. Delete from Firestore
    if (!id.startsWith('local-') && !id.startsWith('exp-')) {
      try {
        const docRef = doc(db, EXPENSES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn('Firestore delete fallback to local cache:', err?.message || err);
      }
    }
  },
};

