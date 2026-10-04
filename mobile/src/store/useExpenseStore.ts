import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Expense,
  Income,
  Budget,
  ExpenseCategory,
  IncomeSource,
  PaymentMethod,
  AIParseResult,
  BudgetPeriod,
} from '../types';
import { expenseService } from '../services/expenseService';
import { incomeService } from '../services/incomeService';
import { budgetService } from '../services/budgetService';

const STORE_KEY = '@xpenseai_master_expense_store';
const AUTH_STORE_KEY = '@xpenseai_master_auth_store';

const getCurrentActiveUserId = (): string => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
      const storedAuth = window.localStorage.getItem(AUTH_STORE_KEY);
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        if (parsed?.state?.profile?.uid) {
          return parsed.state.profile.uid;
        }
      }
    }
  } catch {}
  return 'demo-user';
};

// Synchronous initial load from browser localStorage for instant frame-1 rendering on web
const getInitialPersistedState = (targetUserId?: string): { expenses: Expense[]; incomes: Income[]; budgets: Budget[] } => {
  const activeUserId = targetUserId || getCurrentActiveUserId();
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
      // 1. Try master store key
      const stored = window.localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.state) {
          const allExpenses: Expense[] = Array.isArray(parsed.state.expenses) ? parsed.state.expenses : [];
          const allIncomes: Income[] = Array.isArray(parsed.state.incomes) ? parsed.state.incomes : [];
          const allBudgets: Budget[] = Array.isArray(parsed.state.budgets) ? parsed.state.budgets : [];

          // Strictly filter by active user
          const userExpenses = allExpenses.filter((e) => !e.userId || e.userId === activeUserId);
          const userIncomes = allIncomes.filter((i) => !i.userId || i.userId === activeUserId);
          const userBudgets = allBudgets.filter((b) => !b.userId || b.userId === activeUserId);

          if (userExpenses.length > 0 || userIncomes.length > 0 || userBudgets.length > 0) {
            return { expenses: userExpenses, incomes: userIncomes, budgets: userBudgets };
          }
        }
      }

      // 2. Fallback check for user-scoped cached keys
      let fallbackExpenses: Expense[] = [];
      let fallbackIncomes: Income[] = [];
      let fallbackBudgets: Budget[] = [];

      const userExpKey = `@xpenseai_cached_expenses_${activeUserId}`;
      const userIncKey = `@xpenseai_cached_incomes_${activeUserId}`;
      const userBudKey = `@xpenseai_cached_budgets_${activeUserId}`;

      try {
        const d = JSON.parse(window.localStorage.getItem(userExpKey) || '[]');
        if (Array.isArray(d)) fallbackExpenses = d;
      } catch {}

      try {
        const d = JSON.parse(window.localStorage.getItem(userIncKey) || '[]');
        if (Array.isArray(d)) fallbackIncomes = d;
      } catch {}

      try {
        const d = JSON.parse(window.localStorage.getItem(userBudKey) || '[]');
        if (Array.isArray(d)) fallbackBudgets = d;
      } catch {}

      return {
        expenses: fallbackExpenses,
        incomes: fallbackIncomes,
        budgets: fallbackBudgets,
      };
    }
  } catch {}
  return { expenses: [], incomes: [], budgets: [] };
};

// Direct synchronous browser localStorage persistence helper
const syncWebStorage = (state: Partial<ExpenseStoreState>) => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
      const existing = window.localStorage.getItem(STORE_KEY);
      let parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 };
      if (!parsed.state) parsed.state = {};
      parsed.state = {
        ...parsed.state,
        ...state,
      };
      window.localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
    }
  } catch {}
};

interface ExpenseFilterState {
  searchQuery: string;
  selectedType: 'ALL' | 'expense' | 'income';
  selectedCategory: ExpenseCategory | 'ALL';
  selectedIncomeSource: IncomeSource | 'ALL';
  selectedPaymentMethod: PaymentMethod | 'ALL';
  selectedMonth: string; // "YYYY-MM"
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

interface ExpenseStoreState {
  activeUserId: string;
  expenses: Expense[];
  incomes: Income[];
  budgets: Budget[];
  isLoading: boolean;
  filters: ExpenseFilterState;
  draftExpense: Partial<Expense> | null;
  draftIncome: Partial<Income> | null;
  pendingVoiceResult: AIParseResult | null;
  pendingScanResult: AIParseResult | null;

  // Actions
  setActiveUser: (userId: string) => void;
  clearStore: () => void;
  setExpenses: (expenses: Expense[], forUserId?: string) => void;
  setIncomes: (incomes: Income[], forUserId?: string) => void;
  setBudgets: (budgets: Budget[], forUserId?: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedType: (type: 'ALL' | 'expense' | 'income') => void;
  setSelectedCategory: (cat: ExpenseCategory | 'ALL') => void;
  setSelectedIncomeSource: (source: IncomeSource | 'ALL') => void;
  setSelectedPaymentMethod: (pm: PaymentMethod | 'ALL') => void;
  setSelectedMonth: (month: string) => void;
  setSortBy: (sort: ExpenseFilterState['sortBy']) => void;
  setDraftExpense: (draft: Partial<Expense> | null) => void;
  setDraftIncome: (draft: Partial<Income> | null) => void;
  setPendingVoiceResult: (res: AIParseResult | null) => void;
  setPendingScanResult: (res: AIParseResult | null) => void;

  // Expense CRUD
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Income CRUD
  addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => Promise<string>;
  updateIncome: (id: string, updates: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  setOpeningBalance: (userId: string, amount: number, date?: string) => Promise<void>;

  // Budget CRUD
  upsertBudget: (
    userId: string,
    category: ExpenseCategory,
    amount: number,
    options?: { period?: BudgetPeriod; alertThreshold?: number; name?: string }
  ) => Promise<void>;
  upsertOverallBudget: (
    userId: string,
    amount: number,
    period?: BudgetPeriod,
    alertThreshold?: number
  ) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
}

const currentYearMonth = new Date().toISOString().slice(0, 7);
const initialUserId = getCurrentActiveUserId();
const initialData = getInitialPersistedState(initialUserId);

export const useExpenseStore = create<ExpenseStoreState>()(
  persist(
    (set, get) => ({
      activeUserId: initialUserId,
      expenses: initialData.expenses,
      incomes: initialData.incomes,
      budgets: initialData.budgets,
      isLoading: false,
      filters: {
        searchQuery: '',
        selectedType: 'ALL',
        selectedCategory: 'ALL',
        selectedIncomeSource: 'ALL',
        selectedPaymentMethod: 'ALL',
        selectedMonth: currentYearMonth,
        sortBy: 'date-desc',
      },
      draftExpense: null,
      draftIncome: null,
      pendingVoiceResult: null,
      pendingScanResult: null,

      setActiveUser: (userId) => {
        const targetUserId = userId || 'demo-user';
        if (get().activeUserId === targetUserId) return;
        const loaded = getInitialPersistedState(targetUserId);
        set({
          activeUserId: targetUserId,
          expenses: loaded.expenses,
          incomes: loaded.incomes,
          budgets: loaded.budgets,
        });
        syncWebStorage({
          expenses: loaded.expenses,
          incomes: loaded.incomes,
          budgets: loaded.budgets,
        });
      },

      clearStore: () => {
        set({ expenses: [], incomes: [], budgets: [] });
        syncWebStorage({ expenses: [], incomes: [], budgets: [] });
      },

      setExpenses: (incomingExpenses, forUserId) => {
        const targetUserId = forUserId || get().activeUserId || 'demo-user';
        const validIncoming = Array.isArray(incomingExpenses)
          ? incomingExpenses.filter((e) => !e.userId || e.userId === targetUserId)
          : [];
        const incomingIds = new Set(validIncoming.map((e) => e.id));
        const localOnly = get().expenses.filter((e) => {
          if (e.userId && e.userId !== targetUserId) return false;
          if (incomingIds.has(e.id)) return false;
          // If it's a temp id, check if an identical incoming item already exists
          if (e.id.startsWith('exp-') || e.id.startsWith('local-')) {
            const matches = validIncoming.some(
              (remote) =>
                Number(remote.amount) === Number(e.amount) &&
                remote.category === e.category &&
                remote.date === e.date &&
                (remote.description || '').trim() === (e.description || '').trim()
            );
            if (matches) return false;
          }
          return true;
        });
        const merged = [...validIncoming, ...localOnly];
        const seen = new Set<string>();
        const deduped: Expense[] = [];
        for (const item of merged) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }
        set({ expenses: deduped, isLoading: false });
        syncWebStorage({ expenses: deduped });
      },

      setIncomes: (incomingIncomes, forUserId) => {
        const targetUserId = forUserId || get().activeUserId || 'demo-user';
        const validIncoming = Array.isArray(incomingIncomes)
          ? incomingIncomes.filter((i) => !i.userId || i.userId === targetUserId)
          : [];
        const incomingIds = new Set(validIncoming.map((i) => i.id));
        const localOnly = get().incomes.filter((i) => {
          if (i.userId && i.userId !== targetUserId) return false;
          if (incomingIds.has(i.id)) return false;
          if (i.id.startsWith('inc-') || i.id.startsWith('local-')) {
            const matches = validIncoming.some(
              (remote) =>
                Number(remote.amount) === Number(i.amount) &&
                remote.source === i.source &&
                remote.date === i.date &&
                (remote.description || '').trim() === (i.description || '').trim()
            );
            if (matches) return false;
          }
          return true;
        });
        const merged = [...validIncoming, ...localOnly];
        const seen = new Set<string>();
        const deduped: Income[] = [];
        for (const item of merged) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }
        set({ incomes: deduped });
        syncWebStorage({ incomes: deduped });
      },

      setBudgets: (incomingBudgets, forUserId) => {
        const targetUserId = forUserId || get().activeUserId || 'demo-user';
        const validIncoming = Array.isArray(incomingBudgets)
          ? incomingBudgets.filter((b) => !b.userId || b.userId === targetUserId)
          : [];
        const incomingIds = new Set(validIncoming.map((b) => b.id));
        const localOnly = get().budgets.filter(
          (b) => (b.userId === targetUserId || !b.userId) && !incomingIds.has(b.id)
        );
        const merged = [...validIncoming, ...localOnly];
        set({ budgets: merged });
        syncWebStorage({ budgets: merged });
      },

      setSearchQuery: (query) =>
        set((state) => ({ filters: { ...state.filters, searchQuery: query } })),
      setSelectedType: (type) =>
        set((state) => ({ filters: { ...state.filters, selectedType: type } })),
      setSelectedCategory: (cat) =>
        set((state) => ({ filters: { ...state.filters, selectedCategory: cat } })),
      setSelectedIncomeSource: (source) =>
        set((state) => ({ filters: { ...state.filters, selectedIncomeSource: source } })),
      setSelectedPaymentMethod: (pm) =>
        set((state) => ({ filters: { ...state.filters, selectedPaymentMethod: pm } })),
      setSelectedMonth: (month) =>
        set((state) => ({ filters: { ...state.filters, selectedMonth: month } })),
      setSortBy: (sort) =>
        set((state) => ({ filters: { ...state.filters, sortBy: sort } })),
      setDraftExpense: (draft) => set({ draftExpense: draft }),
      setDraftIncome: (draft) => set({ draftIncome: draft }),
      setPendingVoiceResult: (res) => set({ pendingVoiceResult: res }),
      setPendingScanResult: (res) => set({ pendingScanResult: res }),

      // Expense CRUD
      addExpense: async (expense) => {
        const tempId = 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const newExp: Expense = {
          ...expense,
          id: tempId,
          createdAt: new Date().toISOString(),
        };

        // 1. Immediate optimistic UI and synchronous persistent storage update
        const updatedExpenses = [newExp, ...get().expenses.filter((e) => e.id !== tempId)];
        set({ expenses: updatedExpenses });
        syncWebStorage({ expenses: updatedExpenses });

        // 2. Persist to Firestore in background passing newExp so tempId is preserved
        try {
          const realId = await expenseService.createExpense(newExp);
          if (realId && realId !== tempId) {
            const currentList = get().expenses;
            const hasReal = currentList.some((e) => e.id === realId);
            const finalized = hasReal
              ? currentList.filter((e) => e.id !== tempId)
              : currentList.map((e) => (e.id === tempId ? { ...e, id: realId } : e));
            set({ expenses: finalized });
            syncWebStorage({ expenses: finalized });
            return realId;
          }
        } catch (err) {
          console.warn('addExpense service error:', err);
        }
        return tempId;
      },

      updateExpense: async (id, updates) => {
        const updatedExpenses = get().expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
        set({ expenses: updatedExpenses });
        syncWebStorage({ expenses: updatedExpenses });

        try {
          await expenseService.updateExpense(id, updates);
        } catch (err) {
          console.warn('updateExpense service error:', err);
        }
      },

      deleteExpense: async (id) => {
        const updatedExpenses = get().expenses.filter((e) => e.id !== id);
        set({ expenses: updatedExpenses });
        syncWebStorage({ expenses: updatedExpenses });

        try {
          await expenseService.deleteExpense(id);
        } catch (err) {
          console.warn('deleteExpense service error:', err);
        }
      },

      // Income CRUD
      addIncome: async (income) => {
        const tempId = 'inc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
        const newInc: Income = {
          ...income,
          id: tempId,
          createdAt: new Date().toISOString(),
        };

        // 1. Immediate optimistic UI and synchronous persistent storage update
        const updatedIncomes = [newInc, ...get().incomes.filter((i) => i.id !== tempId)];
        set({ incomes: updatedIncomes });
        syncWebStorage({ incomes: updatedIncomes });

        // 2. Persist to Firestore in background passing newInc so tempId is preserved
        try {
          const realId = await incomeService.createIncome(newInc);
          if (realId && realId !== tempId) {
            const currentList = get().incomes;
            const hasReal = currentList.some((i) => i.id === realId);
            const finalized = hasReal
              ? currentList.filter((i) => i.id !== tempId)
              : currentList.map((i) => (i.id === tempId ? { ...i, id: realId } : i));
            set({ incomes: finalized });
            syncWebStorage({ incomes: finalized });
            return realId;
          }
        } catch (err) {
          console.warn('addIncome service error:', err);
        }
        return tempId;
      },

      updateIncome: async (id, updates) => {
        const updatedIncomes = get().incomes.map((i) => (i.id === id ? { ...i, ...updates } : i));
        set({ incomes: updatedIncomes });
        syncWebStorage({ incomes: updatedIncomes });

        try {
          await incomeService.updateIncome(id, updates);
        } catch (err) {
          console.warn('updateIncome service error:', err);
        }
      },

      deleteIncome: async (id) => {
        const updatedIncomes = get().incomes.filter((i) => i.id !== id);
        set({ incomes: updatedIncomes });
        syncWebStorage({ incomes: updatedIncomes });

        try {
          await incomeService.deleteIncome(id);
        } catch (err) {
          console.warn('deleteIncome service error:', err);
        }
      },

      setOpeningBalance: async (userId, amount, date) => {
        const state = get();
        const existingOpening = state.incomes.find(
          (i) => i.isOpeningBalance || i.source === 'Opening Balance'
        );
        const effectiveDate = date || new Date().toISOString().split('T')[0];

        if (existingOpening) {
          await get().updateIncome(existingOpening.id, {
            amount,
            date: effectiveDate,
          });
        } else {
          await get().addIncome({
            userId,
            amount,
            source: 'Opening Balance',
            description: 'Starting Opening Balance',
            date: effectiveDate,
            paymentMethod: 'Other',
            isOpeningBalance: true,
          });
        }
      },

      // Budget CRUD
      upsertBudget: async (userId, category, amount, options) => {
        const docId = `budget_${userId}_${category}`;
        const existing = get().budgets.find((b) => b.category === category && !b.isOverall);

        let updatedBudgets: Budget[];
        if (existing) {
          updatedBudgets = get().budgets.map((b) =>
            b.category === category && !b.isOverall
              ? {
                  ...b,
                  amount,
                  period: options?.period || b.period || 'monthly',
                  alertThreshold: options?.alertThreshold || b.alertThreshold || 80,
                  updatedAt: new Date().toISOString(),
                }
              : b
          );
        } else {
          updatedBudgets = [
            ...get().budgets,
            {
              id: docId,
              userId,
              category,
              isOverall: false,
              amount,
              period: options?.period || 'monthly',
              alertThreshold: options?.alertThreshold || 80,
              updatedAt: new Date().toISOString(),
            },
          ];
        }

        set({ budgets: updatedBudgets });
        syncWebStorage({ budgets: updatedBudgets });

        try {
          await budgetService.upsertBudget(userId, category, amount, options);
        } catch (err) {
          console.warn('upsertBudget service error:', err);
        }
      },

      upsertOverallBudget: async (userId, amount, period = 'monthly', alertThreshold = 80) => {
        const docId = `budget_${userId}_OVERALL`;
        const existing = get().budgets.find((b) => b.isOverall);

        let updatedBudgets: Budget[];
        if (existing) {
          updatedBudgets = get().budgets.map((b) =>
            b.isOverall
              ? {
                  ...b,
                  amount,
                  period,
                  alertThreshold,
                  name: 'Overall Budget',
                  updatedAt: new Date().toISOString(),
                }
              : b
          );
        } else {
          updatedBudgets = [
            ...get().budgets,
            {
              id: docId,
              userId,
              isOverall: true,
              amount,
              period,
              alertThreshold,
              name: 'Overall Budget',
              updatedAt: new Date().toISOString(),
            },
          ];
        }

        set({ budgets: updatedBudgets });
        syncWebStorage({ budgets: updatedBudgets });

        try {
          await budgetService.upsertOverallBudget(userId, amount, period, alertThreshold);
        } catch (err) {
          console.warn('upsertOverallBudget service error:', err);
        }
      },

      deleteBudget: async (budgetId) => {
        const updatedBudgets = get().budgets.filter((b) => b.id !== budgetId);
        set({ budgets: updatedBudgets });
        syncWebStorage({ budgets: updatedBudgets });

        try {
          await budgetService.deleteBudget(budgetId);
        } catch (err) {
          console.warn('deleteBudget service error:', err);
        }
      },
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        expenses: state.expenses,
        incomes: state.incomes,
        budgets: state.budgets,
        filters: state.filters,
      }),
    }
  )
);




