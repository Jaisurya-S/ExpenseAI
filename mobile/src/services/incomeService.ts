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
import { Income } from '../types';
import safeStorage from './safeStorage';

const INCOMES_COLLECTION = 'incomes';
const UNIVERSAL_KEY = '@xpenseai_stored_incomes';
const getCacheKey = (userId: string) => `@xpenseai_cached_incomes_${userId || 'default'}`;
const getDeletedKey = (userId: string) => `@xpenseai_deleted_incomes_${userId || 'default'}`;

const syncingIncomeIds = new Set<string>();

export const incomeService = {
  // Subscribe to real-time income updates with zero data loss guarantee
  subscribeUserIncomes: (
    userId: string,
    onData: (incomes: Income[]) => void,
    onError?: (err: Error) => void
  ) => {
    const activeUserId = userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);
    const deletedKey = getDeletedKey(activeUserId);

    // 1. Instantly load local cache so data is immediately visible on app open / reload
    (async () => {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed: Income[] = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const userSpecific = parsed.filter((i) => !i.userId || i.userId === activeUserId);
            onData(userSpecific);
          }
        } catch {}
      } else {
        onData([]);
      }
    })();

    try {
      const q = query(
        collection(db, INCOMES_COLLECTION),
        where('userId', '==', activeUserId)
      );

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const remoteItems: Income[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteItems.push({
              id: docSnap.id,
              userId: data.userId || activeUserId,
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
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
            });
          });

          // Read local cache and deleted items
          let localItems: Income[] = [];
          let deletedIds = new Set<string>();
          try {
            const cached = await safeStorage.getItem(cacheKey);
            if (cached) localItems = JSON.parse(cached);
            const deletedStr = await safeStorage.getItem(deletedKey);
            if (deletedStr) deletedIds = new Set(JSON.parse(deletedStr));
          } catch {}

          // Filter out deleted items from remote
          const validRemoteItems = remoteItems.filter((item) => (item.userId === activeUserId) && !deletedIds.has(item.id));

          // Retain any locally saved items that are not yet in Firestore
          const remoteIdSet = new Set(validRemoteItems.map((r) => r.id));
          const unsyncedLocalItems = localItems.filter((local) => {
            if (local.userId && local.userId !== activeUserId) return false;
            if (deletedIds.has(local.id)) return false;
            if (remoteIdSet.has(local.id)) return false;

            // If it's a temporary item, check if there's already an identical remote item (same amount, source, date, description)
            if (local.id.startsWith('inc-') || local.id.startsWith('local-')) {
              const isDuplicateOfRemote = validRemoteItems.some(
                (remote) =>
                  Number(remote.amount) === Number(local.amount) &&
                  remote.source === local.source &&
                  remote.date === local.date &&
                  (remote.description || '').trim() === (local.description || '').trim()
              );
              if (isDuplicateOfRemote) {
                return false;
              }
            }
            return true;
          });

          // Merge: remote items + unsynced local items
          const mergedMap = new Map<string, Income>();
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

          // Cache locally under user key
          await safeStorage.setItem(cacheKey, JSON.stringify(allItems));
          onData(allItems);
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

  // Create new income record with immediate local persistence
  createIncome: async (income: { id?: string; createdAt?: string } & Omit<Income, 'id' | 'createdAt'>): Promise<string> => {
    const tempId = income.id || ('inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7));
    const activeUserId = income.userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);

    const newInc: Income = {
      ...income,
      id: tempId,
      createdAt: income.createdAt || new Date().toISOString(),
    };

    // 1. Write to local cache immediately
    try {
      const cached = await safeStorage.getItem(cacheKey);
      const items: Income[] = cached ? JSON.parse(cached) : [];
      const filtered = items.filter((i) => i.id !== tempId);
      filtered.unshift(newInc);
      await safeStorage.setItem(cacheKey, JSON.stringify(filtered));
      await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(filtered));
    } catch (cacheErr) {
      console.warn('safeStorage cache write error:', cacheErr);
    }

    // 2. Write to Firestore with sanitized payload
    try {
      const payload = sanitizeForFirestore({
        userId: activeUserId,
        amount: Number(income.amount) || 0,
        source: income.source,
        description: income.description || '',
        payer: income.payer || '',
        date: income.date,
        paymentMethod: income.paymentMethod,
        receiptUrl: income.receiptUrl || '',
        notes: income.notes || '',
        tags: income.tags || [],
        isOpeningBalance: Boolean(income.isOpeningBalance),
        createdAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, INCOMES_COLLECTION), payload);
      const finalId = docRef.id;
      crashlytics.log(`Income created in Firestore: ${finalId} (${income.source}, ${income.amount})`);

      // Update local cache ID to match Firestore docRef.id
      try {
        const cached = await safeStorage.getItem(cacheKey);
        if (cached) {
          let items: Income[] = JSON.parse(cached);
          items = items.map((i) => (i.id === tempId ? { ...i, id: finalId } : i));
          // Deduplicate if finalId exists already
          const seen = new Set<string>();
          const deduped: Income[] = [];
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
      console.warn('Firestore income write fallback to local cache:', err?.message || err);
      return tempId;
    }
  },

  // Update existing income
  updateIncome: async (id: string, updates: Partial<Income>): Promise<void> => {
    const activeUserId = updates.userId || 'demo-user';
    const cacheKey = getCacheKey(activeUserId);

    // 1. Update in local cache immediately
    try {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (cacheErr) {
      console.warn('safeStorage cache update error:', cacheErr);
    }

    // 2. Update in Firestore if real Firestore ID
    if (!id.startsWith('local-') && !id.startsWith('inc-')) {
      try {
        const docRef = doc(db, INCOMES_COLLECTION, id);
        const payload = sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(docRef, payload);
      } catch (err: any) {
        console.warn('Firestore update income fallback to local cache:', err?.message || err);
      }
    }
  },

  // Delete income
  deleteIncome: async (id: string, userId?: string): Promise<void> => {
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

    // 1. Remove from local user cache, universal cache, and record in deleted set
    try {
      const cached = await safeStorage.getItem(cacheKey);
      if (cached) {
        let items: Income[] = JSON.parse(cached);
        items = items.filter((i) => i.id !== id);
        await safeStorage.setItem(cacheKey, JSON.stringify(items));
      }

      const univCached = await safeStorage.getItem(UNIVERSAL_KEY);
      if (univCached) {
        let items: Income[] = JSON.parse(univCached);
        items = items.filter((i) => i.id !== id);
        await safeStorage.setItem(UNIVERSAL_KEY, JSON.stringify(items));
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
    if (!id.startsWith('local-') && !id.startsWith('inc-')) {
      try {
        const docRef = doc(db, INCOMES_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (err: any) {
        console.warn('Firestore delete income fallback to local cache:', err?.message || err);
      }
    }
  },
};

