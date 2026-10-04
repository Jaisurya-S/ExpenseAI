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

export const EXPENSES_STORAGE_KEY = '@xpenseai_stored_expenses';
export const INCOMES_STORAGE_KEY = '@xpenseai_stored_incomes';
export const BUDGETS_STORAGE_KEY = '@xpenseai_stored_budgets';

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
  setExpenses: (expenses: Expense[]) => void;
  setIncomes: (incomes: Income[]) => void;
  setBudgets: (budgets: Budget[]) => void;
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

export const useExpenseStore = create<ExpenseStoreState>()(
  persist(
    (set, get) => ({
      expenses: [],
      incomes: [],
      budgets: [],
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

      setExpenses: (incomingExpenses) => {
        if (Array.isArray(incomingExpenses) && incomingExpenses.length > 0) {
          set({ expenses: incomingExpenses, isLoading: false });
        } else if (get().expenses.length === 0) {
          set({ expenses: [], isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      setIncomes: (incomingIncomes) => {
        if (Array.isArray(incomingIncomes) && incomingIncomes.length > 0) {
          set({ incomes: incomingIncomes });
        } else if (get().incomes.length === 0) {
          set({ incomes: [] });
        }
      },

      setBudgets: (incomingBudgets) => {
        if (Array.isArray(incomingBudgets) && incomingBudgets.length > 0) {
          set({ budgets: incomingBudgets });
        } else if (get().budgets.length === 0) {
          set({ budgets: [] });
        }
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

        // 1. Immediate optimistic UI and persistent storage update
        const updatedExpenses = [newExp, ...get().expenses];
        set({ expenses: updatedExpenses });

        // 2. Persist to Firestore in background
        try {
          const realId = await expenseService.createExpense(expense);
          if (realId && realId !== tempId) {
            const finalizedExpenses = get().expenses.map((e) => (e.id === tempId ? { ...e, id: realId } : e));
            set({ expenses: finalizedExpenses });
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

        try {
          await expenseService.updateExpense(id, updates);
        } catch (err) {
          console.warn('updateExpense service error:', err);
        }
      },

      deleteExpense: async (id) => {
        const updatedExpenses = get().expenses.filter((e) => e.id !== id);
        set({ expenses: updatedExpenses });

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

        // 1. Immediate optimistic UI and persistent storage update
        const updatedIncomes = [newInc, ...get().incomes];
        set({ incomes: updatedIncomes });

        // 2. Persist to Firestore in background
        try {
          const realId = await incomeService.createIncome(income);
          if (realId && realId !== tempId) {
            const finalizedIncomes = get().incomes.map((i) => (i.id === tempId ? { ...i, id: realId } : i));
            set({ incomes: finalizedIncomes });
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

        try {
          await incomeService.updateIncome(id, updates);
        } catch (err) {
          console.warn('updateIncome service error:', err);
        }
      },

      deleteIncome: async (id) => {
        const updatedIncomes = get().incomes.filter((i) => i.id !== id);
        set({ incomes: updatedIncomes });

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

        try {
          await budgetService.upsertOverallBudget(userId, amount, period, alertThreshold);
        } catch (err) {
          console.warn('upsertOverallBudget service error:', err);
        }
      },

      deleteBudget: async (budgetId) => {
        const updatedBudgets = get().budgets.filter((b) => b.id !== budgetId);
        set({ budgets: updatedBudgets });

        try {
          await budgetService.deleteBudget(budgetId);
        } catch (err) {
          console.warn('deleteBudget service error:', err);
        }
      },
    }),
    {
      name: '@xpenseai_master_expense_store',
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



