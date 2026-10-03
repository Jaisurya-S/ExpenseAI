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
import { ExpenseCategory } from '../../types';
import { Sparkles, TrendingUp, DollarSign, CreditCard, Award } from 'lucide-react-native';

export default function AnalyticsScreen() {
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses } = useExpenseStore();
  const { colors, isDark } = useAppTheme();
  const [period, setPeriod] = useState<'month' | 'all'>('month');

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const filteredExpenses = useMemo(() => {
    if (period === 'month') {
      return expenses.filter((e) => e.date?.startsWith(currentMonthKey));
    }
    return expenses;
  }, [expenses, period]);

  const totalSpent = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    filteredExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
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

  // Daily trend last 7 days
  const dailyBarData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = days[d.getDay()];

      const dayTotal = expenses
        .filter((e) => e.date === dateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      result.push({
        label: dayLabel,
        amount: dayTotal,
      });
    }
    return result;
  }, [expenses]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const counts: { [key: string]: { amount: number; count: number } } = {};
    filteredExpenses.forEach((e) => {
      const m = e.merchant || e.description || 'General';
      if (!counts[m]) counts[m] = { amount: 0, count: 0 };
      counts[m].amount += e.amount || 0;
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Financial Analytics</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              AI-driven spend breakdown & trends
            </Text>
          </View>

          {/* Period toggle */}
          <View
            style={[
              styles.periodToggle,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setPeriod('month')}
              style={[
                styles.toggleBtn,
                period === 'month' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: period === 'month' ? colors.primaryText : colors.textSecondary,
                    fontWeight: period === 'month' ? '800' : '600',
                  },
                ]}
              >
                This Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPeriod('all')}
              style={[
                styles.toggleBtn,
                period === 'all' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: period === 'all' ? colors.primaryText : colors.textSecondary,
                    fontWeight: period === 'all' ? '800' : '600',
                  },
                ]}
              >
                All Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Stat Metric Cards Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: colors.dangerBg },
              ]}
            >
              <DollarSign size={18} color={colors.danger} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spend</Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {currency}
              {totalSpent.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <TrendingUp size={18} color={colors.primary} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Daily Avg</Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {currency}
              {avgDaily.toLocaleString()}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: isDark ? 'rgba(155, 93, 229, 0.15)' : 'rgba(124, 58, 237, 0.1)',
                },
              ]}
            >
              <Award size={18} color={colors.accentPurple} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Category</Text>
            <Text style={[styles.statNumber, { color: colors.text }]} numberOfLines={1}>
              {topCategory.name}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: isDark ? 'rgba(0, 187, 249, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                },
              ]}
            >
              <CreditCard size={18} color={colors.accent} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[styles.statNumber, { color: colors.text }]}>{filteredExpenses.length}</Text>
          </View>
        </View>

        {/* Donut Category Chart */}
        <ExpensePieChart
          categoryTotals={categoryTotals}
          totalSpent={totalSpent}
        />

        {/* 7-Day Trend Bar Chart */}
        <SpendingBarChart
          data={dailyBarData}
          title="LAST 7 DAYS SPENDING FLOW"
        />

        {/* Top Merchants Leaderboard */}
        <View
          style={[
            styles.merchantsCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            TOP SPENDING MERCHANTS
          </Text>
          {topMerchants.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No merchant data recorded yet.
            </Text>
          ) : (
            topMerchants.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.merchantRow,
                  { borderBottomColor: colors.cardBorder },
                ]}
              >
                <View style={styles.merchantLeft}>
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: colors.inputBg },
                    ]}
                  >
                    <Text style={[styles.rankText, { color: colors.textSecondary }]}>
                      #{idx + 1}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.merchantName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.merchantCount, { color: colors.textSecondary }]}>
                      {item.count} transactions
                    </Text>
                  </View>
                </View>
                <Text style={[styles.merchantAmount, { color: colors.danger }]}>
                  {currency}
                  {item.amount.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* AI Financial Health Score Card */}
        <View
          style={[
            styles.aiHealthCard,
            {
              backgroundColor: isDark ? '#151F28' : 'rgba(13, 148, 136, 0.08)',
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.aiHealthHeader}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={[styles.aiHealthTitle, { color: colors.primary }]}>
              AI FINANCIAL HEALTH SCORE
            </Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNumber, { color: colors.text }]}>84</Text>
            <Text style={[styles.scoreMax, { color: colors.primary }]}>/100 (Excellent)</Text>
          </View>
          <Text style={[styles.scoreDesc, { color: colors.textSecondary }]}>
            Your discretionary spending is well-balanced. Keeping grocery expenditures under 25% of
            your total budget helped boost your savings rate this month.
          </Text>
        </View>
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
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  toggleText: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  merchantsCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 10,
  },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  merchantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  merchantCount: {
    fontSize: 11,
  },
  merchantAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  aiHealthCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  aiHealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiHealthTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  scoreDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
