import { ExpenseCategory, IncomeSource, PaymentMethod } from '../types';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  iconName: string;
  color: string;
  bgColor: string;
  gradient: [string, string];
  keywords: string[];
}

export interface IncomeSourceMeta {
  id: IncomeSource;
  label: string;
  iconName: string;
  color: string;
  bgColor: string;
  gradient: [string, string];
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  Food: {
    id: 'Food',
    label: 'Food & Dining',
    iconName: 'Utensils',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.12)',
    gradient: ['#F97316', '#FB923C'],
    keywords: ['coffee', 'tea', 'starbucks', 'cafe', 'mcdonalds', 'kfc', 'burger', 'pizza', 'subway', 'restaurant', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy', 'snack', 'dine', 'treat', 'bakery'],
  },
  Grocery: {
    id: 'Grocery',
    label: 'Groceries',
    iconName: 'ShoppingCart',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    gradient: ['#10B981', '#34D399'],
    keywords: ['supermarket', 'walmart', 'target', 'costco', 'whole foods', 'grocery', 'trader joe', 'milk', 'vegetables', 'fruits', 'instacart', 'blinkit', 'zepto', 'dmart', 'provisions', 'bread', 'eggs', 'meat'],
  },
  Transport: {
    id: 'Transport',
    label: 'Transport',
    iconName: 'Car',
    color: '#0284C7',
    bgColor: 'rgba(2, 132, 199, 0.12)',
    gradient: ['#0284C7', '#38BDF8'],
    keywords: ['uber', 'lyft', 'grab', 'ola', 'metro', 'subway', 'train', 'bus', 'gas', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'flight', 'airline', 'cab', 'auto', 'fastag'],
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    iconName: 'ShoppingBag',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    gradient: ['#8B5CF6', '#A78BFA'],
    keywords: ['amazon', 'ebay', 'nike', 'adidas', 'zara', 'h&m', 'clothing', 'electronics', 'shoes', 'mall', 'flipkart', 'myntra', 'apparel', 'watch', 'gadget', 'apple store'],
  },
  Bills: {
    id: 'Bills',
    label: 'Bills & Utilities',
    iconName: 'Receipt',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    gradient: ['#EC4899', '#F472B6'],
    keywords: ['electricity', 'water', 'gas bill', 'utility', 'wifi', 'internet', 'broadband', 'verizon', 'at&t', 't-mobile', 'phone bill', 'rent', 'insurance', 'recharge', 'airtel', 'jio', 'maintenance'],
  },
  Entertainment: {
    id: 'Entertainment',
    label: 'Entertainment',
    iconName: 'Film',
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    gradient: ['#6366F1', '#818CF8'],
    keywords: ['netflix', 'spotify', 'hulu', 'disney', 'prime video', 'movie', 'cinema', 'theatre', 'concert', 'steam', 'playstation', 'xbox', 'game', 'pvr', 'hotstar', 'youtube premium'],
  },
  Health: {
    id: 'Health',
    label: 'Health & Medical',
    iconName: 'HeartPulse',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    gradient: ['#EF4444', '#F87171'],
    keywords: ['pharmacy', 'medicine', 'doctor', 'hospital', 'clinic', 'dental', 'cvs', 'walgreens', 'gym', 'fitness', 'supplement', 'therapy', 'apollo', 'tests', 'consultation'],
  },
  Education: {
    id: 'Education',
    label: 'Education',
    iconName: 'GraduationCap',
    color: '#0EA5E9',
    bgColor: 'rgba(14, 165, 233, 0.12)',
    gradient: ['#0EA5E9', '#38BDF8'],
    keywords: ['udemy', 'coursera', 'book', 'tuition', 'course', 'college', 'school', 'exam', 'class', 'training', 'kindle', 'stationery'],
  },
  Investment: {
    id: 'Investment',
    label: 'Investments',
    iconName: 'TrendingUp',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    gradient: ['#059669', '#10B981'],
    keywords: ['stocks', 'crypto', 'mutual fund', 'sip', 'zerodha', 'robinhood', 'etf', 'gold', 'groww', 'binance', 'shares', 'fixed deposit'],
  },
  Other: {
    id: 'Other',
    label: 'Other',
    iconName: 'MoreHorizontal',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    gradient: ['#64748B', '#94A3B8'],
    keywords: ['miscellaneous', 'cash withdrawal', 'transfer', 'general', 'fee', 'donation', 'tip'],
  },
};

export const INCOME_SOURCES: Record<IncomeSource, IncomeSourceMeta> = {
  Salary: {
    id: 'Salary',
    label: 'Salary',
    iconName: 'Briefcase',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    gradient: ['#10B981', '#34D399'],
  },
  Freelance: {
    id: 'Freelance',
    label: 'Freelance',
    iconName: 'Laptop',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    gradient: ['#06B6D4', '#22D3EE'],
  },
  Business: {
    id: 'Business',
    label: 'Business',
    iconName: 'Building2',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  Bonus: {
    id: 'Bonus',
    label: 'Bonus',
    iconName: 'Award',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    gradient: ['#F59E0B', '#FCD34D'],
  },
  Gift: {
    id: 'Gift',
    label: 'Gift',
    iconName: 'Gift',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    gradient: ['#EC4899', '#F472B6'],
  },
  Refund: {
    id: 'Refund',
    label: 'Refund',
    iconName: 'RefreshCw',
    color: '#14B8A6',
    bgColor: 'rgba(20, 184, 166, 0.12)',
    gradient: ['#14B8A6', '#2DD4BF'],
  },
  Cashback: {
    id: 'Cashback',
    label: 'Cashback',
    iconName: 'Percent',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  'Investment return': {
    id: 'Investment return',
    label: 'Investment Return',
    iconName: 'TrendingUp',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    gradient: ['#10B981', '#34D399'],
  },
  Interest: {
    id: 'Interest',
    label: 'Interest',
    iconName: 'Landmark',
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    gradient: ['#6366F1', '#818CF8'],
  },
  'Borrowed money': {
    id: 'Borrowed money',
    label: 'Borrowed Money / Loan',
    iconName: 'HandCoins',
    color: '#E11D48',
    bgColor: 'rgba(225, 29, 72, 0.12)',
    gradient: ['#E11D48', '#FB7185'],
  },
  'Opening Balance': {
    id: 'Opening Balance',
    label: 'Opening Balance',
    iconName: 'PiggyBank',
    color: '#0D9488',
    bgColor: 'rgba(13, 148, 136, 0.12)',
    gradient: ['#0D9488', '#2DD4BF'],
  },
  Other: {
    id: 'Other',
    label: 'Other Income',
    iconName: 'CirclePlus',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    gradient: ['#64748B', '#94A3B8'],
  },
};

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'UPI', label: 'UPI / GPay / PhonePe', icon: 'Smartphone' },
  { id: 'Card', label: 'Credit / Debit Card', icon: 'CreditCard' },
  { id: 'Cash', label: 'Cash', icon: 'Banknote' },
  { id: 'NetBanking', label: 'Net Banking', icon: 'Building2' },
  { id: 'Wallet', label: 'Digital Wallet', icon: 'Wallet' },
  { id: 'Other', label: 'Other', icon: 'CircleEllipsis' },
];

export const ALL_CATEGORIES = Object.keys(CATEGORIES) as ExpenseCategory[];
export const ALL_INCOME_SOURCES = Object.keys(INCOME_SOURCES) as IncomeSource[];

