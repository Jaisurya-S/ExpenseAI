import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, Zap } from '../ui/icons';
import { Expense, Income, ExpenseCategory } from '../../types';

interface SmartInsightsCardProps {
  expenses: Expense[];
  incomes: Income[];
  periodLabel: string;
}

export const SmartInsightsCard: React.FC<SmartInsightsCardProps> = ({
  expenses,
  incomes,
  periodLabel,
}) => {
  const { profile } = useAuthStore();
  const { colors, isDark } = useAppTheme();
  const currency = profile.currency || '₹';

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Category breakdown
  const catTotals: Partial<Record<ExpenseCategory, number>> = {};
  expenses.forEach((e) => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.amount) || 0);
  });

  const sortedCats = (Object.entries(catTotals) as [ExpenseCategory, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const topCat = sortedCats[0];
  const topCatPercent = topCat && totalSpent > 0 ? Math.round((topCat[1] / totalSpent) * 100) : 0;

  // Largest individual expense
  const largestExpense = expenses.reduce(
    (max, e) => ((Number(e.amount) || 0) > (Number(max?.amount) || 0) ? e : max),
    null as Expense | null
  );

  // Daily run rate
  const daysPassed = Math.max(1, new Date().getDate());
  const dailyBurn = Math.round(totalSpent / daysPassed);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const projectedMonthEnd = dailyBurn * daysInMonth;

  // Generate dynamic insights
  const insights: {
    id: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    title: string;
    description: string;
  }[] = [];

  if (totalSpent > 0) {
    // 1. Savings / Health Insight
    if (totalIncome > 0) {
      if (savingsRate >= 30) {
        insights.push({
          id: 'savings-good',
          icon: CheckCircle2,
          iconColor: colors.success,
          bgColor: colors.successBg,
          title: `Strong ${savingsRate}% Savings Rate`,
          description: `You are retaining ${currency}${netSavings.toLocaleString('en-IN')} of your income for ${periodLabel.toLowerCase()}. Keep it up!`,
        });
      } else if (savingsRate > 0) {
        insights.push({
          id: 'savings-mod',
          icon: TrendingUp,
          iconColor: colors.accentYellow,
          bgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
          title: `Moderate ${savingsRate}% Savings`,
          description: `You are saving ${currency}${netSavings.toLocaleString('en-IN')}. Trimming ${topCat ? topCat[0] : 'discretionary spend'} can help push savings above 30%.`,
        });
      } else {
        insights.push({
          id: 'savings-def',
          icon: AlertCircle,
          iconColor: colors.danger,
          bgColor: colors.dangerBg,
          title: 'Cash Flow Deficit',
          description: `Spending exceeds recorded income by ${currency}${Math.abs(netSavings).toLocaleString('en-IN')} in ${periodLabel.toLowerCase()}.`,
        });
      }
    }

    // 2. Dominant Category Insight
    if (topCat && topCatPercent >= 35) {
      insights.push({
        id: 'top-cat',
        icon: Zap,
        iconColor: colors.accentPurple,
        bgColor: isDark ? 'rgba(124, 58, 237, 0.15)' : '#EDE9FE',
        title: `${topCat[0]} is your largest outflow`,
        description: `${topCat[0]} makes up ${topCatPercent}% (${currency}${topCat[1].toLocaleString('en-IN')}) of your total spending.`,
      });
    }

    // 3. Burn Rate & Projection (Only relevant on monthly period)
    if (periodLabel.toLowerCase().includes('month') && totalSpent > 500) {
      insights.push({
        id: 'projection',
        icon: Sparkles,
        iconColor: colors.primary,
        bgColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        title: `Burn Rate: ${currency}${dailyBurn.toLocaleString('en-IN')}/day`,
        description: `At current pace, estimated month-end spend is ~${currency}${projectedMonthEnd.toLocaleString('en-IN')}.`,
      });
    }

    // 4. Largest single transaction
    if (largestExpense && Number(largestExpense.amount) > totalSpent * 0.25) {
      insights.push({
        id: 'single-big',
        icon: AlertCircle,
        iconColor: colors.accentYellow,
        bgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
        title: `Largest Transaction: ${currency}${Number(largestExpense.amount).toLocaleString('en-IN')}`,
        description: `"${largestExpense.merchant || largestExpense.description}" represented ${Math.round((Number(largestExpense.amount) / totalSpent) * 100)}% of your expenses.`,
      });
    }
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Sparkles size={14} color={colors.accentPurple} />
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>AI SPENDING DIAGNOSTICS</Text>
        </View>
        <Text style={[styles.cardBadge, { color: colors.textMuted }]}>Automated</Text>
      </View>

      <View style={styles.list}>
        {insights.map((item) => {
          const IconComp = item.icon;
          return (
            <View
              key={item.id}
              style={[
                styles.insightItem,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                <IconComp size={14} color={item.iconColor} />
              </View>
              <View style={styles.contentCol}>
                <Text style={[styles.insightTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.insightDesc, { color: colors.textMuted }]}>
                  {item.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardBadge: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  list: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  contentCol: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
