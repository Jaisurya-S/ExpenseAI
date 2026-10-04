import { Linking, Platform, Share } from 'react-native';
import { Expense, Income } from '../types';

export interface DailyReportData {
  dateStr?: string; // YYYY-MM-DD
  currency: string;
  todayExpenses: Expense[];
  todayIncomes?: Income[];
  monthTotalExpenses?: number;
  monthlyBudget?: number;
  userName?: string;
}

/**
 * Generate a visual ASCII progress bar for WhatsApp messages
 */
function renderProgressBar(percentage: number): string {
  const totalBars = 10;
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledBars = Math.round((clamped / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  return `[${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${clamped}%`;
}

/**
 * Generate formatted WhatsApp Markdown message for Daily Expense Summary
 */
export function generateDailyWhatsAppReport(data: DailyReportData): string {
  const {
    dateStr = new Date().toISOString().split('T')[0],
    currency = '₹',
    todayExpenses = [],
    todayIncomes = [],
    monthTotalExpenses = 0,
    monthlyBudget = 0,
    userName = 'Friend',
  } = data;

  const totalSpent = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncome = todayIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

  // Group by category
  const categoryMap: Record<string, { total: number; count: number; items: string[] }> = {};
  for (const exp of todayExpenses) {
    const cat = exp.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, count: 0, items: [] };
    }
    categoryMap[cat].total += exp.amount || 0;
    categoryMap[cat].count += 1;
    if (exp.description && !categoryMap[cat].items.includes(exp.description)) {
      categoryMap[cat].items.push(exp.description);
    }
  }

  // Format date nicely
  let formattedDate = dateStr;
  try {
    const d = new Date(dateStr + 'T12:00:00');
    formattedDate = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    formattedDate = dateStr;
  }

  // Emojis for categories
  const catEmojis: Record<string, string> = {
    Food: '🍔',
    Grocery: '🛒',
    Transport: '🚗',
    Shopping: '🛍️',
    Bills: '🧾',
    Entertainment: '🎬',
    Health: '💊',
    Education: '🎓',
    Investment: '📈',
    Other: '💳',
  };

  // Determine Daily Spending Status
  let statusBadge = '🟢 *On Track*';
  if (monthlyBudget > 0) {
    const dailyTarget = monthlyBudget / 30;
    if (totalSpent > dailyTarget * 1.5) {
      statusBadge = '🔴 *High Spending Day*';
    } else if (totalSpent > dailyTarget) {
      statusBadge = '🟡 *Moderate Spending*';
    }
  }

  const lines: string[] = [
    `━━━━━━━━━━━━━━━━━━━`,
    `📊 *EXPENSE AI • DAILY DIGEST*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 *Hello ${userName.split(' ')[0]}!*`,
    `📅 ${formattedDate}`,
    `⚡ Status: ${statusBadge}`,
    ``,
    `💰 *Total Spent Today:* *${currency}${totalSpent.toLocaleString()}*`,
    `📝 *Transactions:* ${todayExpenses.length} record${todayExpenses.length === 1 ? '' : 's'}`,
  ];

  if (totalIncome > 0) {
    lines.push(`💵 *Income Received:* +${currency}${totalIncome.toLocaleString()}`);
  }

  lines.push(``);

  if (todayExpenses.length === 0) {
    lines.push(`🎉 *Zero expenses logged today!* Excellent financial discipline.`);
  } else {
    lines.push(`📂 *Category Breakdown:*`);
    for (const [cat, info] of Object.entries(categoryMap)) {
      const icon = catEmojis[cat] || '•';
      const itemSample = info.items.slice(0, 2).join(', ');
      const descSnippet = itemSample ? ` _(${itemSample})_` : '';
      const pct = totalSpent > 0 ? Math.round((info.total / totalSpent) * 100) : 0;
      lines.push(`${icon} *${cat}:* ${currency}${info.total.toLocaleString()} (${pct}%)${descSnippet}`);
    }
  }

  if (monthlyBudget > 0) {
    lines.push(``);
    const budgetPct = Math.round((monthTotalExpenses / monthlyBudget) * 100);
    const remaining = Math.max(0, monthlyBudget - monthTotalExpenses);
    lines.push(`📈 *Monthly Budget Progress:*`);
    lines.push(`${renderProgressBar(budgetPct)}`);
    lines.push(`• Spent: ${currency}${monthTotalExpenses.toLocaleString()} / ${currency}${monthlyBudget.toLocaleString()}`);
    lines.push(`• Remaining: ${currency}${remaining.toLocaleString()}`);
  }

  lines.push(``);
  lines.push(`💡 *AI Smart Tip:* ${getSmartTip(totalSpent, todayExpenses)}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_ExpenseAI — Your Smart Personal CFO_ ✨`);

  return lines.join('\n');
}

/**
 * Generate a contextual financial tip based on today's logs
 */
function getSmartTip(totalSpent: number, expenses: Expense[]): string {
  if (expenses.length === 0) {
    return 'No spends recorded today. Keep this momentum going to maximize monthly savings!';
  }
  const foodSpend = expenses.filter(e => e.category === 'Food').reduce((s, e) => s + e.amount, 0);
  if (foodSpend > totalSpent * 0.5 && foodSpend > 300) {
    return 'Dining and food took over half of today\'s expenses. Consider meal prep to trim dining costs.';
  }
  const shoppingSpend = expenses.filter(e => e.category === 'Shopping').reduce((s, e) => s + e.amount, 0);
  if (shoppingSpend > 500) {
    return 'For discretionary shopping, try the 48-hour rule before purchasing non-essentials.';
  }
  if (totalSpent > 2000) {
    return 'High spending day recorded. Review upcoming bills to balance out the remaining week.';
  }
  return 'Great job logging your daily expenses consistently. Consistent tracking boosts financial freedom!';
}

/**
 * Format phone number to international format (defaulting to +91 India if no country code provided)
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Open direct WhatsApp chat with the generated report prefilled
 */
export async function openWhatsAppReport(phoneNumber: string, reportText: string): Promise<boolean> {
  try {
    const formattedPhone = formatWhatsAppNumber(phoneNumber);
    const encoded = encodeURIComponent(reportText);

    let url = '';
    if (formattedPhone) {
      url = `https://wa.me/${formattedPhone}?text=${encoded}`;
    } else {
      url = `https://wa.me/?text=${encoded}`;
    }

    const canOpen = await Linking.canOpenURL(url).catch(() => true);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // Fallback to share
      await Share.share({
        message: reportText,
        title: 'ExpenseAI Daily Summary',
      });
      return true;
    }
  } catch (error) {
    console.error('Failed to open WhatsApp:', error);
    try {
      await Share.share({
        message: reportText,
        title: 'ExpenseAI Daily Summary',
      });
      return true;
    } catch {
      return false;
    }
  }
}
