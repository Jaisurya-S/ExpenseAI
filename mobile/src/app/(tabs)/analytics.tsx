import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ExpensePieChart } from '../../components/analytics/ExpensePieChart';
import { SpendingBarChart } from '../../components/analytics/SpendingBarChart';
import { ExpenseCategory, IncomeSource } from '../../types';
import { INCOME_SOURCES } from '../../constants/categories';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  CreditCard,
  Award,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
} from '../../components/ui/icons';

export default function AnalyticsScreen() {
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses, incomes } = useExpenseStore();
  const { colors, isDark } = useAppTheme();
  const [period, setPeriod] = useState<'month' | 'all'>('month');

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('default', { month: 'short' });

  const filteredExpenses = useMemo(() => {
    if (period === 'month') {
      return expenses.filter((e) => e.date?.startsWith(currentMonthKey));
    }
    return expenses;
  }, [expenses, period, currentMonthKey]);

  const filteredIncomes = useMemo(() => {
    if (period === 'month') {
      return incomes.filter((i) => i.date?.startsWith(currentMonthKey));
    }
    return incomes;
  }, [incomes, period, currentMonthKey]);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = filteredIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    filteredExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    });
    return totals;
  }, [filteredExpenses]);

  // Top category
  const topCategory = useMemo(() => {
    let topCat: ExpenseCategory = 'Other';
    let max = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val && val > max) {
        max = val;
        topCat = cat as ExpenseCategory;
      }
    });
    return { name: topCat, amount: max };
  }, [categoryTotals]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const counts: { [key: string]: { amount: number; count: number } } = {};
    filteredExpenses.forEach((e) => {
      const m = e.merchant || e.description || 'General';
      if (!counts[m]) counts[m] = { amount: 0, count: 0 };
      counts[m].amount += Number(e.amount) || 0;
      counts[m].count += 1;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [filteredExpenses]);

  const avgDaily = Math.round(totalSpent / (new Date().getDate() || 1));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Cash flow, spending habits & trends
            </Text>
          </View>

          {/* Period toggle in Shadcn segmented control style */}
          <View
            style={[
              styles.segmentedControl,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setPeriod('month')}
              style={[
                styles.segmentBtn,
                period === 'month' && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: period === 'month' ? colors.text : colors.textMuted,
                    fontWeight: period === 'month' ? '700' : '500',
                  },
                ]}
              >
                {monthName}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPeriod('all')}
              style={[
                styles.segmentBtn,
                period === 'all' && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: period === 'all' ? colors.text : colors.textMuted,
                    fontWeight: period === 'all' ? '700' : '500',
                  },
                ]}
              >
                All Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comparative Overview Card */}
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
          <View style={styles.compTopRow}>
            <View>
              <Text style={[styles.compLabel, { color: colors.textSecondary }]}>
                Net Cash Flow
              </Text>
              <Text
                style={[
                  styles.compNetValue,
                  { color: netSavings >= 0 ? colors.success : colors.danger },
                ]}
              >
                {netSavings >= 0 ? '+' : ''}
                {currency}
                {netSavings.toLocaleString('en-IN')}
              </Text>
            </View>

            <View
              style={[
                styles.savingsBadge,
                {
                  backgroundColor: netSavings >= 0 ? colors.successBg : colors.dangerBg,
                  borderColor: netSavings >= 0 ? 'rgba(16, 185, 129, 0.2)' : colors.dangerBorder,
                },
              ]}
            >
              <PiggyBank size={13} color={netSavings >= 0 ? colors.success : colors.danger} />
              <Text
                style={[
                  styles.savingsBadgeText,
                  { color: netSavings >= 0 ? colors.success : colors.danger },
                ]}
              >
                {savingsRate}% Saved
              </Text>
            </View>
          </View>

          <View style={[styles.compGrid, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.compCol}>
              <View style={styles.compColHeader}>
                <ArrowDownLeft size={13} color={colors.success} />
                <Text style={[styles.compColLabel, { color: colors.textSecondary }]}>Inflow</Text>
              </View>
              <Text style={[styles.compColVal, { color: colors.success }]}>
                +{currency}{totalIncome.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={[styles.compDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.compCol}>
              <View style={styles.compColHeader}>
                <ArrowUpRight size={13} color={colors.danger} />
                <Text style={[styles.compColLabel, { color: colors.textSecondary }]}>Outflow</Text>
              </View>
              <Text style={[styles.compColVal, { color: colors.text }]}>
                -{currency}{totalSpent.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Stat Metrics Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statTile,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.cardBorder },
                ]}
              >
                <DollarSign size={14} color={colors.text} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Average</Text>
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {currency}{avgDaily.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>per day</Text>
          </View>

          <View
            style={[
              styles.statTile,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.statHeader}>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)', borderColor: colors.cardBorder },
                ]}
              >
                <Award size={14} color={colors.text} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Category</Text>
            </View>
            <Text style={[styles.statVal, { color: colors.text }]} numberOfLines={1}>
              {topCategory.name}
            </Text>
            <Text style={[styles.statSub, { color: colors.textMuted }]}>
              {currency}{topCategory.amount.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Category Breakdown Progress Bars */}
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Spending by Category
          </Text>

          {Object.keys(categoryTotals).length === 0 ? (
            <Text style={[styles.emptyCategoryText, { color: colors.textMuted }]}>
              No expenses recorded for this period.
            </Text>
          ) : (
            Object.entries(categoryTotals)
              .sort((a, b) => (b[1] || 0) - (a[1] || 0))
              .map(([cat, amount]) => {
                const percent = totalSpent > 0 ? Math.round(((amount || 0) / totalSpent) * 100) : 0;
                return (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catMetaRow}>
                      <Text style={[styles.catName, { color: colors.text }]}>{cat}</Text>
                      <Text style={[styles.catAmount, { color: colors.text }]}>
                        {currency}{(amount || 0).toLocaleString('en-IN')}{' '}
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>({percent}%)</Text>
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.catTrack,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                      ]}
                    >
                      <View
                        style={[
                          styles.catBar,
                          {
                            width: `${percent}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
          )}
        </View>

        {/* Top Merchants List */}
        {topMerchants.length > 0 && (
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Frequent Payees
            </Text>
            {topMerchants.map((merchant, idx) => (
              <View
                key={merchant.name}
                style={[
                  styles.merchantRow,
                  idx < topMerchants.length - 1 && {
                    borderBottomColor: colors.cardBorder,
                    borderBottomWidth: 1,
                  },
                ]}
              >
                <View>
                  <Text style={[styles.merchantName, { color: colors.text }]}>
                    {merchant.name}
                  </Text>
                  <Text style={[styles.merchantCount, { color: colors.textMuted }]}>
                    {merchant.count} transaction{merchant.count > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={[styles.merchantAmount, { color: colors.text }]}>
                  {currency}{merchant.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  compTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  compLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  compNetValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  compCol: {
    flex: 1,
    alignItems: 'center',
  },
  compColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  compColLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  compColVal: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  compDivider: {
    width: 1,
    height: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  emptyCategoryText: {
    fontSize: 12,
    paddingVertical: 8,
  },
  catRow: {
    marginBottom: 10,
  },
  catMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  catName: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  catAmount: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  catTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  catBar: {
    height: '100%',
    borderRadius: 2.5,
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  merchantCount: {
    fontSize: 11,
  },
  merchantAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
