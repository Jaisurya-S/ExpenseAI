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
    keywords: [
      'tea', 'chai', 'coffee', 'cappuccino', 'latte', 'espresso', 'starbucks', 'cafe', 'mcdonalds', 'kfc',
      'burger', 'pizza', 'subway', 'restaurant', 'lunch', 'dinner', 'breakfast', 'brunch', 'zomato', 'swiggy',
      'snack', 'snacks', 'samosa', 'puff', 'biscuit', 'cookies', 'vada', 'dosa', 'idli', 'poori', 'puri',
      'roti', 'chapati', 'paratha', 'naan', 'meals', 'thali', 'rice', 'biryani', 'curry', 'shawarma', 'roll',
      'sandwich', 'toast', 'maggi', 'noodles', 'pasta', 'momos', 'chaat', 'panipuri', 'bhel', 'juice',
      'lassi', 'shake', 'smoothie', 'soda', 'coke', 'pepsi', 'drink', 'beverage', 'water bottle', 'ice cream',
      'kulfi', 'cake', 'pastry', 'bakery', 'sweet', 'sweets', 'dessert', 'treat', 'dine', 'pan', 'cigarette'
    ],
  },
  Grocery: {
    id: 'Grocery',
    label: 'Groceries',
    iconName: 'ShoppingCart',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    gradient: ['#10B981', '#34D399'],
    keywords: [
      'grocery', 'groceries', 'supermarket', 'walmart', 'target', 'costco', 'whole foods', 'trader joe',
      'dmart', 'reliance fresh', 'blinkit', 'zepto', 'instamart', 'bigbasket', 'instacart', 'milk', 'curd',
      'yogurt', 'paneer', 'cheese', 'butter', 'ghee', 'bread', 'eggs', 'egg', 'meat', 'chicken', 'fish',
      'vegetables', 'veggies', 'tomato', 'onion', 'potato', 'fruits', 'apple', 'banana', 'mango', 'provisions',
      'rice bag', 'atta', 'flour', 'dal', 'pulses', 'oil', 'cooking oil', 'sugar', 'salt', 'spices', 'detergent', 'soap'
    ],
  },
  Transport: {
    id: 'Transport',
    label: 'Transport',
    iconName: 'Car',
    color: '#0284C7',
    bgColor: 'rgba(2, 132, 199, 0.12)',
    gradient: ['#0284C7', '#38BDF8'],
    keywords: [
      'uber', 'lyft', 'ola', 'rapido', 'cab', 'taxi', 'auto', 'rickshaw', 'e-rickshaw', 'auto fare',
      'metro', 'subway', 'train', 'bus', 'bus ticket', 'train ticket', 'flight', 'airline', 'ticket',
      'gas', 'fuel', 'petrol', 'diesel', 'cng', 'parking', 'toll', 'tollgate', 'fastag', 'bike', 'scooter'
    ],
  },
  Shopping: {
    id: 'Shopping',
    label: 'Shopping',
    iconName: 'ShoppingBag',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    gradient: ['#8B5CF6', '#A78BFA'],
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'ebay', 'nike', 'adidas', 'zara', 'h&m',
      'clothing', 'clothes', 'shirt', 't-shirt', 'pants', 'jeans', 'dress', 'shoes', 'footwear',
      'electronics', 'gadget', 'watch', 'mall', 'apparel', 'apple store'
    ],
  },
  Bills: {
    id: 'Bills',
    label: 'Bills & Utilities',
    iconName: 'Receipt',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
    gradient: ['#EC4899', '#F472B6'],
    keywords: [
      'recharge', 'mobile recharge', 'electricity', 'current bill', 'eb bill', 'water bill', 'gas bill',
      'lpg', 'cylinder', 'utility', 'wifi', 'internet', 'broadband', 'airtel', 'jio', 'vi', 'bsnl',
      'verizon', 'at&t', 'phone bill', 'rent', 'house rent', 'maintenance', 'insurance'
    ],
  },
  Entertainment: {
    id: 'Entertainment',
    label: 'Entertainment',
    iconName: 'Film',
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
    gradient: ['#6366F1', '#818CF8'],
    keywords: [
      'netflix', 'spotify', 'prime video', 'amazon prime', 'hotstar', 'disney', 'youtube premium',
      'movie', 'cinema', 'pvr', 'inox', 'theatre', 'concert', 'game', 'gaming', 'steam', 'playstation', 'xbox'
    ],
  },
  Health: {
    id: 'Health',
    label: 'Health & Medical',
    iconName: 'HeartPulse',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.12)',
    gradient: ['#EF4444', '#F87171'],
    keywords: [
      'pharmacy', 'medicine', 'tablet', 'syrup', 'doctor', 'hospital', 'clinic', 'dental', 'gym',
      'fitness', 'supplement', 'therapy', 'apollo', 'netmeds', 'pharmeasy', 'tests', 'consultation'
    ],
  },
  Education: {
    id: 'Education',
    label: 'Education',
    iconName: 'GraduationCap',
    color: '#0EA5E9',
    bgColor: 'rgba(14, 165, 233, 0.12)',
    gradient: ['#0EA5E9', '#38BDF8'],
    keywords: [
      'udemy', 'coursera', 'book', 'tuition', 'course', 'college', 'school', 'exam', 'class',
      'training', 'kindle', 'stationery', 'notebook', 'pen'
    ],
  },
  Investment: {
    id: 'Investment',
    label: 'Investments',
    iconName: 'TrendingUp',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    gradient: ['#059669', '#10B981'],
    keywords: [
      'stocks', 'crypto', 'mutual fund', 'sip', 'zerodha', 'groww', 'robinhood', 'etf', 'gold',
      'shares', 'fixed deposit', 'fd', 'rd'
    ],
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

