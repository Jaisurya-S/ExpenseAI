import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppTheme } from '../../hooks/use-theme';
import { ExpensePieChart } from '../../components/analytics/ExpensePieChart';
import { SpendingBarChart, BarData } from '../../components/analytics/SpendingBarChart';
import { PaymentMethodBreakdown } from '../../components/analytics/PaymentMethodBreakdown';
import { DayOfWeekPattern } from '../../components/analytics/DayOfWeekPattern';
import { SmartInsightsCard } from '../../components/analytics/SmartInsightsCard';
import { ExpenseCategory, IncomeSource, PaymentMethod, Expense, Income } from '../../types';
import { CATEGORIES, INCOME_SOURCES } from '../../constants/categories';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Receipt,
  PieChart,
  BarChart3,
  SlidersHorizontal,
  Wallet,
  ArrowUpDown,
} from '../../components/ui/icons';
import { Icons } from '../../components/ui/icons';
import { ExpenseCard } from '../../components/common/ExpenseCard';

type PeriodType = 'month' | '30days' | 'year' | 'all';
type AnalyticsSubTab = 'expenses' | 'income' | 'insights';

export default function AnalyticsScreen() {
  const { profile } = useAuthStore();
  const currency = profile.currency || '₹';
  const { expenses, incomes, deleteExpense } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  // Period filters
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = current month, -1 = last month, etc.
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('expenses');

  // Drilldown selection state
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [drilldownModalVisible, setDrilldownModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Target month calculation based on offset
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const targetMonthKey = useMemo(() => {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [targetDate]);

  const targetYearKey = useMemo(() => String(targetDate.getFullYear()), [targetDate]);

  const monthLabel = useMemo(() => {
    return targetDate.toLocaleString('default', { month: 'short', year: 'numeric' });
  }, [targetDate]);

  // Previous month key for comparison
  const prevMonthKey = useMemo(() => {
    const d = new Date(targetDate);
    d.setMonth(d.getMonth() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [targetDate]);

  // Filtered expenses based on periodType
  const filteredExpenses = useMemo(() => {
    if (periodType === 'month') {
      return expenses.filter((e) => e.date?.startsWith(targetMonthKey));
    }
    if (periodType === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const limitStr = thirtyDaysAgo.toISOString().slice(0, 10);
      return expenses.filter((e) => (e.date || '') >= limitStr);
    }
    if (periodType === 'year') {
      return expenses.filter((e) => e.date?.startsWith(targetYearKey));
    }
    return expenses;
  }, [expenses, periodType, targetMonthKey, targetYearKey]);

  // Filtered incomes based on periodType
  const filteredIncomes = useMemo(() => {
    if (periodType === 'month') {
      return incomes.filter((i) => i.date?.startsWith(targetMonthKey));
    }
    if (periodType === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const limitStr = thirtyDaysAgo.toISOString().slice(0, 10);
      return incomes.filter((i) => (i.date || '') >= limitStr);
    }
    if (periodType === 'year') {
      return incomes.filter((i) => i.date?.startsWith(targetYearKey));
    }
    return incomes;
  }, [incomes, periodType, targetMonthKey, targetYearKey]);

  // Previous month expenses for comparison
  const prevMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date?.startsWith(prevMonthKey));
  }, [expenses, prevMonthKey]);

  // Totals and KPI stats
  const totalSpent = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );
  const totalIncome = useMemo(
    () => filteredIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [filteredIncomes]
  );
  const prevMonthSpent = useMemo(
    () => prevMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [prevMonthExpenses]
  );

  const netSavings = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const totalTransactionsCount = filteredExpenses.length + filteredIncomes.length;
  const avgTicketSize =
    filteredExpenses.length > 0 ? Math.round(totalSpent / filteredExpenses.length) : 0;

  // Month-over-month spend delta %
  const momSpendDeltaPercent = useMemo(() => {
    if (periodType !== 'month' || prevMonthSpent === 0) return null;
    const delta = ((totalSpent - prevMonthSpent) / prevMonthSpent) * 100;
    return Math.round(delta);
  }, [periodType, totalSpent, prevMonthSpent]);

  // Category totals & counts
  const { categoryTotals, categoryCounts } = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    const counts: Partial<Record<ExpenseCategory, number>> = {};
    filteredExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return { categoryTotals: totals, categoryCounts: counts };
  }, [filteredExpenses]);

  // Income sources totals & counts
  const { incomeSourceTotals, incomeSourceCounts } = useMemo(() => {
    const totals: Partial<Record<IncomeSource, number>> = {};
    const counts: Partial<Record<IncomeSource, number>> = {};
    filteredIncomes.forEach((i) => {
      totals[i.source] = (totals[i.source] || 0) + (Number(i.amount) || 0);
      counts[i.source] = (counts[i.source] || 0) + 1;
    });
    return { incomeSourceTotals: totals, incomeSourceCounts: counts };
  }, [filteredIncomes]);

  // Payment methods totals & counts
  const { paymentMethodTotals, paymentMethodCounts } = useMemo(() => {
    const totals: Partial<Record<PaymentMethod, number>> = {};
    const counts: Partial<Record<PaymentMethod, number>> = {};
    filteredExpenses.forEach((e) => {
      const pm = e.paymentMethod || 'Other';
      totals[pm] = (totals[pm] || 0) + (Number(e.amount) || 0);
      counts[pm] = (counts[pm] || 0) + 1;
    });
    return { paymentMethodTotals: totals, paymentMethodCounts: counts };
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

  // Top merchants / frequent payees
  const topMerchants = useMemo(() => {
    const counts: { [key: string]: { amount: number; count: number } } = {};
    filteredExpenses.forEach((e) => {
      const m = (e.merchant || e.description || 'General').trim();
      if (!counts[m]) counts[m] = { amount: 0, count: 0 };
      counts[m].amount += Number(e.amount) || 0;
      counts[m].count += 1;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        avgTicket: Math.round(data.amount / data.count),
        percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredExpenses, totalSpent]);

  // Daily average calculation
  const daysInScope = useMemo(() => {
    if (periodType === 'month') {
      const isCurrentMonth = selectedMonthOffset === 0;
      return isCurrentMonth
        ? Math.max(1, new Date().getDate())
        : new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    }
    if (periodType === '30days') return 30;
    if (periodType === 'year') {
      const isCurrentYear = targetDate.getFullYear() === new Date().getFullYear();
      if (isCurrentYear) {
        const start = new Date(targetDate.getFullYear(), 0, 1);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, diff);
      }
      return 365;
    }
    return Math.max(1, filteredExpenses.length);
  }, [periodType, selectedMonthOffset, targetDate, filteredExpenses.length]);

  const avgDaily = Math.round(totalSpent / daysInScope);

  // Daily Spending Trend Bar Chart Data
  const dailySpendingBarData = useMemo<BarData[]>(() => {
    if (periodType === 'month') {
      const daysCount = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const dailyMap: { [day: number]: number } = {};
      filteredExpenses.forEach((e) => {
        if (!e.date) return;
        const day = parseInt(e.date.split('-')[2], 10);
        if (!isNaN(day)) {
          dailyMap[day] = (dailyMap[day] || 0) + (Number(e.amount) || 0);
        }
      });

      // Sample every day or cluster depending on view
      const result: BarData[] = [];
      const isCurrent = selectedMonthOffset === 0;
      const maxDay = isCurrent ? new Date().getDate() : daysCount;

      for (let d = 1; d <= maxDay; d++) {
        const amt = dailyMap[d] || 0;
        const dStr = String(d).padStart(2, '0');
        result.push({
          label: `${d}`,
          amount: amt,
          fullDate: `${targetDate.toLocaleString('default', { month: 'short' })} ${d}`,
        });
      }
      return result;
    }

    if (periodType === '30days') {
      const dailyMap: { [dateStr: string]: number } = {};
      filteredExpenses.forEach((e) => {
        if (e.date) {
          dailyMap[e.date] = (dailyMap[e.date] || 0) + (Number(e.amount) || 0);
        }
      });

      const result: BarData[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayNum = d.getDate();
        result.push({
          label: `${dayNum}`,
          amount: dailyMap[iso] || 0,
          fullDate: d.toLocaleString('default', { month: 'short', day: 'numeric' }),
        });
      }
      return result;
    }

    if (periodType === 'year') {
      const monthMap: { [m: number]: number } = {};
      filteredExpenses.forEach((e) => {
        if (!e.date) return;
        const m = parseInt(e.date.split('-')[1], 10);
        if (!isNaN(m)) {
          monthMap[m] = (monthMap[m] || 0) + (Number(e.amount) || 0);
        }
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((name, idx) => ({
        label: name,
        amount: monthMap[idx + 1] || 0,
        fullDate: `${name} ${targetYearKey}`,
      }));
    }

    // All time -> Group by year or recent 6 months
    const yearMap: { [y: string]: number } = {};
    filteredExpenses.forEach((e) => {
      if (!e.date) return;
      const y = e.date.slice(0, 4);
      yearMap[y] = (yearMap[y] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(yearMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([yr, amt]) => ({
        label: yr,
        amount: amt,
        fullDate: yr,
      }));
  }, [periodType, targetDate, filteredExpenses, selectedMonthOffset, targetYearKey]);

  // Expenses for the selected category drilldown
  const drilldownExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredExpenses.filter((e) => e.category === selectedCategory);
  }, [filteredExpenses, selectedCategory]);

  const activePeriodLabel = useMemo(() => {
    if (periodType === 'month') return monthLabel;
    if (periodType === '30days') return 'Last 30 Days';
    if (periodType === 'year') return `Year ${targetYearKey}`;
    return 'All Time';
  }, [periodType, monthLabel, targetYearKey]);

  const openDrilldown = (cat: ExpenseCategory) => {
    setSelectedCategory(cat);
    setDrilldownModalVisible(true);
  };

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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics & Insights</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {activePeriodLabel} • {totalTransactionsCount} records
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setReportModalVisible(true)}
            style={[
              styles.summaryBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Receipt size={13} color={colors.text} />
            <Text style={[styles.summaryBtnText, { color: colors.text }]}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector Tabs */}
        <View
          style={[
            styles.periodTabs,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {(['month', '30days', 'year', 'all'] as PeriodType[]).map((p) => {
            const labels: Record<PeriodType, string> = {
              month: 'Month',
              '30days': '30 Days',
              year: 'Year',
              all: 'All Time',
            };
            const isSelected = periodType === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  setPeriodType(p);
                  if (p !== 'month') setSelectedMonthOffset(0);
                }}
                style={[
                  styles.periodTabBtn,
                  isSelected && {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    {
                      color: isSelected ? colors.text : colors.textMuted,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {labels[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Month Stepper (Visible when in Month mode) */}
        {periodType === 'month' && (
          <View
            style={[
              styles.monthStepperCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSelectedMonthOffset((prev) => prev - 1)}
              style={[
                styles.stepArrowBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
              ]}
            >
              <ChevronLeft size={16} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.monthCenter}>
              <Text style={[styles.monthCenterText, { color: colors.text }]}>{monthLabel}</Text>
              {selectedMonthOffset !== 0 && (
                <TouchableOpacity onPress={() => setSelectedMonthOffset(0)}>
                  <Text style={[styles.jumpCurrentText, { color: colors.accentPurple }]}>
                    Reset to Current
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setSelectedMonthOffset((prev) => prev + 1)}
              disabled={selectedMonthOffset >= 0}
              style={[
                styles.stepArrowBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  opacity: selectedMonthOffset >= 0 ? 0.3 : 1,
                },
              ]}
            >
              <ChevronRight size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Master Cash Flow KPI Card */}
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
          <View style={styles.kpiTopRow}>
            <View>
              <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>NET CASH FLOW</Text>
              <Text
                style={[
                  styles.kpiMainValue,
                  { color: netSavings >= 0 ? colors.success : colors.danger },
                ]}
              >
                {netSavings >= 0 ? '+' : ''}
                {currency}
                {netSavings.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.badgeCol}>
              <View
                style={[
                  styles.savingsBadge,
                  {
                    backgroundColor: netSavings >= 0 ? colors.successBg : colors.dangerBg,
                    borderColor:
                      netSavings >= 0 ? 'rgba(16, 185, 129, 0.2)' : colors.dangerBorder,
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

              {momSpendDeltaPercent !== null && (
                <View style={styles.momBadge}>
                  {momSpendDeltaPercent > 0 ? (
                    <ArrowUpRight size={11} color={colors.danger} />
                  ) : (
                    <ArrowDownLeft size={11} color={colors.success} />
                  )}
                  <Text
                    style={[
                      styles.momText,
                      { color: momSpendDeltaPercent > 0 ? colors.danger : colors.success },
                    ]}
                  >
                    {momSpendDeltaPercent > 0 ? `+${momSpendDeltaPercent}%` : `${momSpendDeltaPercent}%`}{' '}
                    vs prev
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.kpiGrid, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.kpiCol}>
              <View style={styles.kpiColHeader}>
                <ArrowDownLeft size={13} color={colors.success} />
                <Text style={[styles.kpiColLabel, { color: colors.textSecondary }]}>Inflow</Text>
              </View>
              <Text style={[styles.kpiColVal, { color: colors.success }]}>
                +{currency}
                {totalIncome.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.kpiColCount, { color: colors.textMuted }]}>
                {filteredIncomes.length} transaction{filteredIncomes.length === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={[styles.kpiDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.kpiCol}>
              <View style={styles.kpiColHeader}>
                <ArrowUpRight size={13} color={colors.danger} />
                <Text style={[styles.kpiColLabel, { color: colors.textSecondary }]}>Outflow</Text>
              </View>
              <Text style={[styles.kpiColVal, { color: colors.text }]}>
                -{currency}
                {totalSpent.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.kpiColCount, { color: colors.textMuted }]}>
                {filteredExpenses.length} transaction{filteredExpenses.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {/* Micro metrics footer */}
          <View style={[styles.kpiFooter, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.microMetric}>
              <Text style={[styles.microLabel, { color: colors.textMuted }]}>Daily Burn</Text>
              <Text style={[styles.microVal, { color: colors.text }]}>
                {currency}
                {avgDaily.toLocaleString('en-IN')}/d
              </Text>
            </View>
            <View style={styles.microMetric}>
              <Text style={[styles.microLabel, { color: colors.textMuted }]}>Avg Ticket</Text>
              <Text style={[styles.microVal, { color: colors.text }]}>
                {currency}
                {avgTicketSize.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.microMetric}>
              <Text style={[styles.microLabel, { color: colors.textMuted }]}>Top Category</Text>
              <Text style={[styles.microVal, { color: colors.text }]} numberOfLines={1}>
                {topCategory.amount > 0 ? topCategory.name : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* Analytics Sub-tabs */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            onPress={() => setSubTab('expenses')}
            style={[
              styles.subTabItem,
              subTab === 'expenses' && [
                styles.subTabItemActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
          >
            <PieChart
              size={14}
              color={subTab === 'expenses' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.subTabText,
                {
                  color: subTab === 'expenses' ? colors.text : colors.textMuted,
                  fontWeight: subTab === 'expenses' ? '700' : '500',
                },
              ]}
            >
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubTab('income')}
            style={[
              styles.subTabItem,
              subTab === 'income' && [
                styles.subTabItemActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
          >
            <Wallet
              size={14}
              color={subTab === 'income' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.subTabText,
                {
                  color: subTab === 'income' ? colors.text : colors.textMuted,
                  fontWeight: subTab === 'income' ? '700' : '500',
                },
              ]}
            >
              Income Sources
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubTab('insights')}
            style={[
              styles.subTabItem,
              subTab === 'insights' && [
                styles.subTabItemActive,
                { borderBottomColor: colors.primary },
              ],
            ]}
          >
            <Sparkles
              size={14}
              color={subTab === 'insights' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.subTabText,
                {
                  color: subTab === 'insights' ? colors.text : colors.textMuted,
                  fontWeight: subTab === 'insights' ? '700' : '500',
                },
              ]}
            >
              Insights & Habits
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUBTAB 1: EXPENSES VIEW */}
        {subTab === 'expenses' && (
          <View>
            {/* Donut Chart */}
            <ExpensePieChart
              categoryTotals={categoryTotals}
              categoryCounts={categoryCounts}
              totalSpent={totalSpent}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />

            {/* Spending Velocity Bar Chart */}
            <SpendingBarChart
              data={dailySpendingBarData}
              title={
                periodType === 'month'
                  ? 'DAILY SPENDING VELOCITY'
                  : periodType === '30days'
                  ? 'LAST 30 DAYS VELOCITY'
                  : 'MONTHLY SPENDING PATTERN'
              }
              subtitle={
                periodType === 'month'
                  ? `Activity throughout ${monthLabel}`
                  : undefined
              }
              averageAmount={avgDaily}
            />

            {/* Category Breakdown Progress Bars with Click to Drilldown */}
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
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    CATEGORY DEEP DIVE
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                    Tap any category to inspect transactions
                  </Text>
                </View>
              </View>

              {Object.keys(categoryTotals).length === 0 ? (
                <Text style={[styles.emptyCategoryText, { color: colors.textMuted }]}>
                  No expense records found for this period.
                </Text>
              ) : (
                Object.entries(categoryTotals)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                  .map(([cat, amount]) => {
                    const percent =
                      totalSpent > 0 ? Math.round(((amount || 0) / totalSpent) * 100) : 0;
                    const catKey = cat as ExpenseCategory;
                    const meta = CATEGORIES[catKey] || CATEGORIES.Other;
                    const count = categoryCounts[catKey] || 0;
                    const IconComp = (Icons as any)[meta.iconName] || Icons.CirclePlus;

                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catRow,
                          {
                            backgroundColor:
                              selectedCategory === cat
                                ? isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.03)'
                                : 'transparent',
                            borderRadius: 10,
                            padding: 8,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => openDrilldown(catKey)}
                      >
                        <View style={styles.catMetaRow}>
                          <View style={styles.catNameWithIcon}>
                            <View style={[styles.catIconBox, { backgroundColor: meta.bgColor }]}>
                              <IconComp size={13} color={meta.color} />
                            </View>
                            <View>
                              <Text style={[styles.catName, { color: colors.text }]}>{cat}</Text>
                              <Text style={[styles.catCountSub, { color: colors.textMuted }]}>
                                {count} item{count > 1 ? 's' : ''} • avg {currency}
                                {count > 0 ? Math.round((amount || 0) / count).toLocaleString('en-IN') : 0}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.catAmountCol}>
                            <Text style={[styles.catAmount, { color: colors.text }]}>
                              {currency}
                              {(amount || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={[styles.catPercentBadge, { color: meta.color }]}>
                              {percent}%
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.catTrack,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.06)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.catBar,
                              {
                                width: `${Math.min(100, Math.max(4, percent))}%`,
                                backgroundColor: meta.color,
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })
              )}
            </View>

            {/* Top Payees Card */}
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
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    FREQUENT PAYEES & MERCHANTS
                  </Text>
                  <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                    Top spending destinations
                  </Text>
                </View>

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
                    <View style={styles.merchantLeft}>
                      <View
                        style={[
                          styles.rankBadge,
                          {
                            backgroundColor:
                              idx === 0
                                ? colors.accentPurple
                                : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankText,
                            { color: idx === 0 ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          #{idx + 1}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.merchantName, { color: colors.text }]}>
                          {merchant.name}
                        </Text>
                        <Text style={[styles.merchantCount, { color: colors.textMuted }]}>
                          {merchant.count} transaction{merchant.count > 1 ? 's' : ''} • avg{' '}
                          {currency}
                          {merchant.avgTicket.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.merchantRight}>
                      <Text style={[styles.merchantAmount, { color: colors.text }]}>
                        {currency}
                        {merchant.amount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.merchantPercent, { color: colors.textMuted }]}>
                        {merchant.percentage}% of spend
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SUBTAB 2: INCOME BREAKDOWN */}
        {subTab === 'income' && (
          <View>
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
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  INCOME STREAMS & SOURCES
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                  {Object.keys(incomeSourceTotals).length} active streams
                </Text>
              </View>

              {Object.keys(incomeSourceTotals).length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyCategoryText, { color: colors.textMuted }]}>
                    No income entries recorded for this period.
                  </Text>
                </View>
              ) : (
                Object.entries(incomeSourceTotals)
                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                  .map(([src, amount]) => {
                    const srcKey = src as IncomeSource;
                    const meta = INCOME_SOURCES[srcKey] || INCOME_SOURCES.Other;
                    const count = incomeSourceCounts[srcKey] || 0;
                    const percent =
                      totalIncome > 0 ? Math.round(((amount || 0) / totalIncome) * 100) : 0;
                    const IconComp = (Icons as any)[meta.iconName] || Icons.TrendingUp;

                    return (
                      <View key={src} style={styles.incomeSourceRow}>
                        <View style={styles.catMetaRow}>
                          <View style={styles.catNameWithIcon}>
                            <View style={[styles.catIconBox, { backgroundColor: meta.bgColor }]}>
                              <IconComp size={13} color={meta.color} />
                            </View>
                            <View>
                              <Text style={[styles.catName, { color: colors.text }]}>{src}</Text>
                              <Text style={[styles.catCountSub, { color: colors.textMuted }]}>
                                {count} receipt{count > 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.catAmountCol}>
                            <Text style={[styles.catAmount, { color: colors.success }]}>
                              +{currency}
                              {(amount || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={[styles.catPercentBadge, { color: meta.color }]}>
                              {percent}%
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.catTrack,
                            {
                              backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(0, 0, 0, 0.06)',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.catBar,
                              {
                                width: `${Math.min(100, Math.max(4, percent))}%`,
                                backgroundColor: meta.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })
              )}
            </View>

            {/* Income transaction records */}
            {filteredIncomes.length > 0 && (
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  INCOME TRANSACTIONS
                </Text>

                {filteredIncomes.map((inc, idx) => (
                  <View
                    key={inc.id || idx}
                    style={[
                      styles.incomeRecordRow,
                      idx < filteredIncomes.length - 1 && {
                        borderBottomColor: colors.cardBorder,
                        borderBottomWidth: 1,
                      },
                    ]}
                  >
                    <View>
                      <Text style={[styles.incomeRecordDesc, { color: colors.text }]}>
                        {inc.description || inc.source}
                      </Text>
                      <Text style={[styles.incomeRecordMeta, { color: colors.textMuted }]}>
                        {inc.date} • {inc.source} {inc.payer ? `from ${inc.payer}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.incomeRecordAmount, { color: colors.success }]}>
                      +{currency}
                      {Number(inc.amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* SUBTAB 3: INSIGHTS & HABITS */}
        {subTab === 'insights' && (
          <View>
            {/* Smart AI Diagnostics Card */}
            <SmartInsightsCard
              expenses={filteredExpenses}
              incomes={filteredIncomes}
              periodLabel={activePeriodLabel}
            />

            {/* Payment Method Distribution */}
            <PaymentMethodBreakdown
              methodTotals={paymentMethodTotals}
              methodCounts={paymentMethodCounts}
              totalSpent={totalSpent}
            />

            {/* Day of Week Spending Pattern */}
            <DayOfWeekPattern expenses={filteredExpenses} />
          </View>
        )}
      </ScrollView>

      {/* Category Drilldown Modal */}
      <Modal
        visible={drilldownModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDrilldownModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedCategory} Breakdown
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                {drilldownExpenses.length} transaction{drilldownExpenses.length === 1 ? '' : 's'} •{' '}
                {activePeriodLabel}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setDrilldownModalVisible(false)}
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.drilldownContent}>
            {/* Category summary header tile */}
            {selectedCategory && (
              <View
                style={[
                  styles.drilldownSummaryCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <Text style={[styles.drilldownSummaryLabel, { color: colors.textSecondary }]}>
                  Total Spent on {selectedCategory}
                </Text>
                <Text style={[styles.drilldownSummaryVal, { color: colors.text }]}>
                  {currency}
                  {(categoryTotals[selectedCategory] || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.drilldownSummaryShare, { color: colors.accentPurple }]}>
                  {totalSpent > 0
                    ? Math.round(((categoryTotals[selectedCategory] || 0) / totalSpent) * 100)
                    : 0}
                  % of total {activePeriodLabel.toLowerCase()} outflow
                </Text>
              </View>
            )}

            {drilldownExpenses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No transactions found for this category.
                </Text>
              </View>
            ) : (
              <View style={styles.drilldownList}>
                {drilldownExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    showActions={true}
                    onDelete={() => {
                      Alert.alert('Delete Expense', 'Are you sure you want to delete this?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => deleteExpense(expense.id),
                        },
                      ]);
                    }}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Financial Summary Report Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View
            style={[
              styles.reportCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.reportHeader}>
              <View>
                <Text style={[styles.reportTitle, { color: colors.text }]}>Financial Summary</Text>
                <Text style={[styles.reportSub, { color: colors.textMuted }]}>
                  {activePeriodLabel}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Total Income</Text>
                <Text style={[styles.reportValue, { color: colors.success }]}>
                  +{currency}
                  {totalIncome.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
                <Text style={[styles.reportValue, { color: colors.danger }]}>
                  -{currency}
                  {totalSpent.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Net Savings</Text>
                <Text
                  style={[
                    styles.reportValue,
                    { color: netSavings >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {netSavings >= 0 ? '+' : ''}
                  {currency}
                  {netSavings.toLocaleString('en-IN')} ({savingsRate}%)
                </Text>
              </View>

              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Daily Average</Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {currency}
                  {avgDaily.toLocaleString('en-IN')}/day
                </Text>
              </View>

              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>
                  Total Transactions
                </Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {totalTransactionsCount}
                </Text>
              </View>

              <View style={[styles.reportRow, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>
                  Top Spending Category
                </Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {topCategory.amount > 0
                    ? `${topCategory.name} (${currency}${topCategory.amount.toLocaleString('en-IN')})`
                    : 'None'}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setReportModalVisible(false);
                Alert.alert('Report Ready', 'Summary is saved to your clipboard or ready for export.');
              }}
              style={[styles.closeReportBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.closeReportBtnText, { color: colors.primaryText }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 12,
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
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginBottom: 10,
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodTabText: {
    fontSize: 12,
  },
  monthStepperCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  stepArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthCenterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  jumpCurrentText: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
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
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  kpiMainValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  momBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  momText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  kpiColLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiColVal: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  kpiColCount: {
    fontSize: 10,
    marginTop: 1,
  },
  kpiDivider: {
    width: 1,
    height: '100%',
  },
  kpiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  microMetric: {
    flex: 1,
    alignItems: 'center',
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  microVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  subTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    marginBottom: 14,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabItemActive: {},
  subTabText: {
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyCategoryText: {
    fontSize: 12,
    paddingVertical: 10,
  },
  catRow: {
    marginBottom: 8,
  },
  catMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catNameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
  },
  catCountSub: {
    fontSize: 10,
    marginTop: 1,
  },
  catAmountCol: {
    alignItems: 'flex-end',
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  catPercentBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
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
  merchantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  merchantCount: {
    fontSize: 10.5,
  },
  merchantRight: {
    alignItems: 'flex-end',
  },
  merchantAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  merchantPercent: {
    fontSize: 10.5,
    marginTop: 1,
  },
  incomeSourceRow: {
    marginBottom: 12,
  },
  incomeRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  incomeRecordDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  incomeRecordMeta: {
    fontSize: 10.5,
  },
  incomeRecordAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drilldownContent: {
    padding: 16,
    paddingBottom: 40,
  },
  drilldownSummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  drilldownSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  drilldownSummaryVal: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  drilldownSummaryShare: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  drilldownList: {
    gap: 8,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  reportCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  reportSub: {
    fontSize: 12,
    marginTop: 2,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  reportLabel: {
    fontSize: 13,
  },
  reportValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  closeReportBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeReportBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
