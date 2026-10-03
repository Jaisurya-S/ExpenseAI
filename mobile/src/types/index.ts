export type ExpenseCategory =
  | 'Food'
  | 'Grocery'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Health'
  | 'Education'
  | 'Investment'
  | 'Other';

export type PaymentMethod = 'UPI' | 'Card' | 'Cash' | 'NetBanking' | 'Wallet' | 'Other';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  merchant?: string;
  date: string; // ISO format: YYYY-MM-DD
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  notes?: string;
  tags?: string[];
  aiConfidence?: number;
  aiSuggestedCategory?: ExpenseCategory;
  isAiGenerated?: boolean;
  inputMethod?: 'scan' | 'voice' | 'manual';
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: ExpenseCategory;
  amount: number;
  month?: string; // e.g. "2026-10"
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  currency: string; // "₹", "$", "€", "£"
  monthlyIncome?: number;
  totalBudgetLimit?: number;
  notificationsEnabled: boolean;
  biometricsEnabled: boolean;
  createdAt: string;
}

export interface AIParseResult {
  amount: number;
  category: ExpenseCategory;
  description: string;
  merchant: string;
  date: string;
  paymentMethod: PaymentMethod;
  confidence: number;
  rawText?: string;
}

export interface AnalyticsSummary {
  totalSpent: number;
  monthlyBudget: number;
  categoryTotals: Record<ExpenseCategory, number>;
  dailyTrend: { date: string; amount: number }[];
  topMerchants: { merchant: string; amount: number; count: number }[];
  paymentMethodDistribution: Record<PaymentMethod, number>;
  comparisonWithLastMonthPercent: number;
}
