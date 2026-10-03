import { create } from 'zustand';
import { Expense, Budget, ExpenseCategory, PaymentMethod, AIParseResult } from '../types';
import { expenseService } from '../services/expenseService';
import { budgetService } from '../services/budgetService';

interface ExpenseFilterState {
  searchQuery: string;
  selectedCategory: ExpenseCategory | 'ALL';
  selectedPaymentMethod: PaymentMethod | 'ALL';
  selectedMonth: string; // "YYYY-MM"
  sortBy: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
}

interface ExpenseStoreState {
  expenses: Expense[];
  budgets: Budget[];
  isLoading: boolean;
  filters: ExpenseFilterState;
  draftExpense: Partial<Expense> | null;
  pendingVoiceResult: AIParseResult | null;
  pendingScanResult: AIParseResult | null;

  // Actions
  setExpenses: (expenses: Expense[]) => void;
  setBudgets: (budgets: Budget[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: ExpenseCategory | 'ALL') => void;
  setSelectedPaymentMethod: (pm: PaymentMethod | 'ALL') => void;
  setSelectedMonth: (month: string) => void;
  setSortBy: (sort: ExpenseFilterState['sortBy']) => void;
  setDraftExpense: (draft: Partial<Expense> | null) => void;
  setPendingVoiceResult: (res: AIParseResult | null) => void;
  setPendingScanResult: (res: AIParseResult | null) => void;

  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<string>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  upsertBudget: (userId: string, category: ExpenseCategory, amount: number) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
}

const currentYearMonth = new Date().toISOString().slice(0, 7);

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  expenses: [],
  budgets: [],
  isLoading: true,
  filters: {
    searchQuery: '',
    selectedCategory: 'ALL',
    selectedPaymentMethod: 'ALL',
    selectedMonth: currentYearMonth,
    sortBy: 'date-desc',
  },
  draftExpense: null,
  pendingVoiceResult: null,
  pendingScanResult: null,

  setExpenses: (expenses) => set({ expenses, isLoading: false }),
  setBudgets: (budgets) => set({ budgets }),
  setSearchQuery: (query) =>
    set((state) => ({ filters: { ...state.filters, searchQuery: query } })),
  setSelectedCategory: (cat) =>
    set((state) => ({ filters: { ...state.filters, selectedCategory: cat } })),
  setSelectedPaymentMethod: (pm) =>
    set((state) => ({ filters: { ...state.filters, selectedPaymentMethod: pm } })),
  setSelectedMonth: (month) =>
    set((state) => ({ filters: { ...state.filters, selectedMonth: month } })),
  setSortBy: (sort) =>
    set((state) => ({ filters: { ...state.filters, sortBy: sort } })),
  setDraftExpense: (draft) => set({ draftExpense: draft }),
  setPendingVoiceResult: (res) => set({ pendingVoiceResult: res }),
  setPendingScanResult: (res) => set({ pendingScanResult: res }),

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
    // Optimistic UI update
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
    // Optimistic UI update
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    }));
    try {
      await expenseService.deleteExpense(id);
    } catch (err) {
      console.warn('deleteExpense service error:', err);
    }
  },

  upsertBudget: async (userId, category, amount) => {
    const docId = `${userId}_${category}`;
    // Optimistic UI update
    set((state) => {
      const existing = state.budgets.find((b) => b.category === category);
      if (existing) {
        return {
          budgets: state.budgets.map((b) =>
            b.category === category ? { ...b, amount, updatedAt: new Date().toISOString() } : b
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
            amount,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });
    try {
      await budgetService.upsertBudget(userId, category, amount);
    } catch (err) {
      console.warn('upsertBudget service error:', err);
    }
  },

  deleteBudget: async (budgetId) => {
    // Optimistic UI update
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
