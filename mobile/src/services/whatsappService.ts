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
    userName = 'Valued User',
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
      weekday: 'short',
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

  const lines: string[] = [
    `📊 *ExpenseAI Daily Summary*`,
    `👤 *Hello ${userName.split(' ')[0]}!*`,
    `📅 *Date:* ${formattedDate}`,
    ``,
    `💰 *Total Spent Today:* ${currency}${totalSpent.toLocaleString()}`,
    `📝 *Transactions:* ${todayExpenses.length} expense${todayExpenses.length === 1 ? '' : 's'}`,
  ];

  if (totalIncome > 0) {
    lines.push(`💵 *Income Received Today:* +${currency}${totalIncome.toLocaleString()}`);
  }

  lines.push(``);

  if (todayExpenses.length === 0) {
    lines.push(`🎉 *Zero expenses logged today!* Great savings!`);
  } else {
    lines.push(`*Categorized Breakdown:*`);
    for (const [cat, info] of Object.entries(categoryMap)) {
      const icon = catEmojis[cat] || '•';
      const itemSample = info.items.slice(0, 2).join(', ');
      const descSnippet = itemSample ? ` _(${itemSample})_` : '';
      lines.push(`${icon} *${cat}:* ${currency}${info.total.toLocaleString()} (${info.count})${descSnippet}`);
    }
  }

  if (monthlyBudget > 0) {
    lines.push(``);
    const pct = Math.min(100, Math.round((monthTotalExpenses / monthlyBudget) * 100));
    lines.push(`📈 *Monthly Budget:* ${currency}${monthTotalExpenses.toLocaleString()} / ${currency}${monthlyBudget.toLocaleString()} (${pct}% used)`);
  }

  lines.push(``);
  lines.push(`_Sent automatically via ExpenseAI_ ✨`);

  return lines.join('\n');
}

/**
 * Format phone number to international format (defaulting to +91 India if no country code provided)
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // If 10 digits (common for India / US), default to +91 (India) or keep as is
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
