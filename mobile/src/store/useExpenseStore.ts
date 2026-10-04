import { create } from 'zustand';
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

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  expenses: [],
  incomes: [],
  budgets: [],
  isLoading: true,
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

  setExpenses: (expenses) => set({ expenses, isLoading: false }),
  setIncomes: (incomes) => set({ incomes }),
  setBudgets: (budgets) => set({ budgets }),
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
    const tempId = 'exp-' + Date.now();
    const newExp: Expense = {
      ...expense,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    // Optimistic UI update
    set((state) => ({
      expenses: [newExp, ...state.expenses],
    }));

    try {
      const realId = await expenseService.createExpense(expense);
      if (realId && realId !== tempId) {
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === tempId ? { ...e, id: realId } : e)),
        }));
        return realId;
      }
    } catch (err) {
      console.warn('addExpense service error:', err);
    }
    return tempId;
  },

  updateExpense: async (id, updates) => {
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    try {
      await expenseService.updateExpense(id, updates);
    } catch (err) {
      console.warn('updateExpense service error:', err);
    }
  },

  deleteExpense: async (id) => {
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
    try {
      await expenseService.deleteExpense(id);
    } catch (err) {
      console.warn('deleteExpense service error:', err);
    }
  },

  // Income CRUD
  addIncome: async (income) => {
    const tempId = 'inc-' + Date.now();
    const newInc: Income = {
      ...income,
      id: tempId,
      createdAt: new Date().toISOString(),
    };
    // Optimistic UI update
    set((state) => ({
      incomes: [newInc, ...state.incomes],
    }));

    try {
      const realId = await incomeService.createIncome(income);
      if (realId && realId !== tempId) {
        set((state) => ({
          incomes: state.incomes.map((i) => (i.id === tempId ? { ...i, id: realId } : i)),
        }));
        return realId;
      }
    } catch (err) {
      console.warn('addIncome service error:', err);
    }
    return tempId;
  },

  updateIncome: async (id, updates) => {
    set((state) => ({
      incomes: state.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
    try {
      await incomeService.updateIncome(id, updates);
    } catch (err) {
      console.warn('updateIncome service error:', err);
    }
  },

  deleteIncome: async (id) => {
    set((state) => ({
      incomes: state.incomes.filter((i) => i.id !== id),
    }));
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
    const docId = `${userId}_${category}`;
    set((state) => {
      const existing = state.budgets.find((b) => b.category === category && !b.isOverall);
      if (existing) {
        return {
          budgets: state.budgets.map((b) =>
            b.category === category && !b.isOverall
              ? {
                  ...b,
                  amount,
                  period: options?.period || b.period || 'monthly',
                  alertThreshold: options?.alertThreshold || b.alertThreshold || 80,
                  updatedAt: new Date().toISOString(),
                }
              : b
          ),
        };
      }
      return {
        budgets: [
          ...state.budgets,
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
        ],
      };
    });
    try {
      await budgetService.upsertBudget(userId, category, amount, options);
    } catch (err) {
      console.warn('upsertBudget service error:', err);
    }
  },

  upsertOverallBudget: async (userId, amount, period = 'monthly', alertThreshold = 80) => {
    const docId = `${userId}_OVERALL`;
    set((state) => {
      const existing = state.budgets.find((b) => b.isOverall);
      if (existing) {
        return {
          budgets: state.budgets.map((b) =>
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
          ),
        };
      }
      return {
        budgets: [
          ...state.budgets,
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
        ],
      };
    });
    try {
      await budgetService.upsertOverallBudget(userId, amount, period, alertThreshold);
    } catch (err) {
      console.warn('upsertOverallBudget service error:', err);
    }
  },

  deleteBudget: async (budgetId) => {
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== budgetId),
    }));
    try {
      await budgetService.deleteBudget(budgetId);
    } catch (err) {
      console.warn('deleteBudget service error:', err);
    }
  },
}));

