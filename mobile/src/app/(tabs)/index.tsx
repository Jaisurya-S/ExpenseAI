import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { HeroBalanceCard } from '../../components/home/HeroBalanceCard';
import { QuickActionGrid } from '../../components/home/QuickActionGrid';
import { AIBudgetInsightCard } from '../../components/home/AIBudgetInsightCard';
import { TransactionCard } from '../../components/common/TransactionCard';
import { generateSpendingInsights } from '../../services/aiService';
import { Bell, Sparkles, ChevronRight, PlusCircle, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/use-theme';
import { Expense, Income, UnifiedTransaction } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const {
    expenses,
    incomes,
    budgets,
    deleteExpense,
    deleteIncome,
    setDraftExpense,
    setDraftIncome,
  } = useExpenseStore();
  const { colors, isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const currency = profile.currency || '₹';

  // Dates & Month filters
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  // Calculations
  const totalIncomeAllTime = useMemo(
    () => incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [incomes]
  );
  const totalExpenseAllTime = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  // Available Balance = Total Inflows - Total Outflows
  const availableBalance = totalIncomeAllTime - totalExpenseAllTime;

  // Monthly stats
  const currentMonthIncomes = useMemo(
    () => incomes.filter((i) => i.date?.startsWith(currentMonthKey)),
    [incomes, currentMonthKey]
  );
  const currentMonthExpenses = useMemo(
    () => expenses.filter((e) => e.date?.startsWith(currentMonthKey)),
    [expenses, currentMonthKey]
  );

  const monthIncomeTotal = currentMonthIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const monthExpenseTotal = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthNetSavings = monthIncomeTotal - monthExpenseTotal;

  // Overall monthly budget limit
  const overallBudgetObj = budgets.find((b) => b.isOverall);
  const categoryBudgetsSum = budgets
    .filter((b) => !b.isOverall)
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalMonthlyBudget = overallBudgetObj?.amount || categoryBudgetsSum || profile.totalBudgetLimit || 0;

  // Unified Transactions (sorted newest first)
  const unifiedTransactions = useMemo(() => {
    const list: UnifiedTransaction[] = [];

    incomes.forEach((inc) => {
      list.push({
        id: inc.id,
        type: 'income',
        amount: inc.amount,
        categoryOrSource: inc.source,
        description: inc.description || inc.source,
        merchantOrPayer: inc.payer,
        date: inc.date,
        paymentMethod: inc.paymentMethod,
        receiptUrl: inc.receiptUrl,
        notes: inc.notes,
        isOpeningBalance: inc.isOpeningBalance,
        rawIncome: inc,
        createdAt: inc.createdAt,
      });
    });

    expenses.forEach((exp) => {
      list.push({
        id: exp.id,
        type: 'expense',
        amount: exp.amount,
        categoryOrSource: exp.category,
        description: exp.description || exp.merchant || exp.category,
        merchantOrPayer: exp.merchant,
        date: exp.date,
        paymentMethod: exp.paymentMethod,
        receiptUrl: exp.receiptUrl,
        notes: exp.notes,
        rawExpense: exp,
        createdAt: exp.createdAt,
      });
    });

    list.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    return list;
  }, [expenses, incomes]);

  const recentTransactions = unifiedTransactions.slice(0, 5);

  const handleEditTransaction = (tx: UnifiedTransaction) => {
    if (tx.type === 'income' && tx.rawIncome) {
      setDraftIncome(tx.rawIncome);
      router.push('/modal/add-income');
    } else if (tx.rawExpense) {
      setDraftExpense(tx.rawExpense);
      router.push('/modal/add-expense');
    }
  };

  const handleDeleteTransaction = (tx: UnifiedTransaction) => {
    const title = tx.type === 'income' ? 'Delete Income' : 'Delete Expense';
    const msg = `Are you sure you want to delete this ${tx.type}?`;

    const performDelete = () => {
      if (tx.type === 'income') {
        deleteIncome(tx.id);
      } else {
        deleteExpense(tx.id);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        performDelete();
      }
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  useEffect(() => {
    generateSpendingInsights(currentMonthExpenses, budgets).then((insights) => {
      setAiInsights(insights);
    });
  }, [expenses, budgets]);

  const onRefresh = async () => {
    setRefreshing(true);
    const insights = await generateSpendingInsights(currentMonthExpenses, budgets);
    setAiInsights(insights);
    setRefreshing(false);
  };

  const displayName = profile.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.userProfileBtn}
          >
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(29, 78, 216, 0.2)',
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome back,</Text>
              <Text style={[styles.userNameText, { color: colors.text }]}>
                {displayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
                },
              ]}
            >
              <Bell size={17} color={colors.textSecondary} />
              {aiInsights.length > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: colors.danger }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Hero Balance & Income/Expense Card */}
        <HeroBalanceCard
          availableBalance={availableBalance}
          totalIncome={totalIncomeAllTime}
          totalExpenses={totalExpenseAllTime}
          monthIncome={monthIncomeTotal}
          monthExpenses={monthExpenseTotal}
          monthlyBudget={totalMonthlyBudget}
          monthName={monthName}
          onAddMoneyPress={() => router.push('/modal/add-income')}
          onSetBudgetPress={() => router.push('/(tabs)/budgets')}
        />

        {/* 2. Quick Action Buttons */}
        <QuickActionGrid
          onScanPress={() => router.push('/modal/scan')}
          onVoicePress={() => router.push('/modal/voice')}
          onBudgetPress={() => router.push('/(tabs)/budgets')}
          onAiChatPress={() => router.push('/modal/ai-chat')}
        />

        {/* 3. Monthly Cash Flow Bar */}
        {(monthIncomeTotal > 0 || monthExpenseTotal > 0) && (
          <View
            style={[
              styles.cashflowCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.04)',
              },
            ]}
          >
            <View style={styles.cashflowHeader}>
              <View style={styles.cashflowTitleRow}>
                <TrendingUp size={15} color={monthNetSavings >= 0 ? '#10B981' : colors.danger} />
                <Text style={[styles.cashflowTitle, { color: colors.text }]}>
                  {monthName} Cash Flow
                </Text>
              </View>
              <View
                style={[
                  styles.savingsBadge,
                  {
                    backgroundColor:
                      monthNetSavings >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.savingsBadgeText,
                    { color: monthNetSavings >= 0 ? '#10B981' : colors.danger },
                  ]}
                >
                  Net: {monthNetSavings >= 0 ? '+' : ''}{currency}{monthNetSavings.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.ratioBarContainer}>
              <View
                style={[
                  styles.ratioBarIncome,
                  {
                    flex: Math.max(1, monthIncomeTotal),
                    backgroundColor: '#10B981',
                  },
                ]}
              />
              <View
                style={[
                  styles.ratioBarExpense,
                  {
                    flex: Math.max(1, monthExpenseTotal),
                    backgroundColor: colors.danger,
                  },
                ]}
              />
            </View>

            <View style={styles.ratioLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  +{currency}{monthIncomeTotal.toLocaleString()} in
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  -{currency}{monthExpenseTotal.toLocaleString()} out
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 4. AI Insights Card */}
        <AIBudgetInsightCard insights={aiInsights} />

        {/* 5. Recent Activity */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/expenses')}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>See all</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyRecent,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
            >
              <Text style={[styles.emptyRecentText, { color: colors.textSecondary }]}>
                No recent transactions
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard
                key={`${tx.type}-${tx.id}`}
                transaction={tx}
                onPress={() => handleEditTransaction(tx)}
                onDelete={() => handleDeleteTransaction(tx)}
              />
            ))
          )}
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
    paddingBottom: 40,
    paddingTop: Platform.OS === 'android' ? 24 : 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bellBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cashflowCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cashflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cashflowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashflowTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratioBarContainer: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    gap: 2,
  },
  ratioBarIncome: {
    borderRadius: 4,
  },
  ratioBarExpense: {
    borderRadius: 4,
  },
  ratioLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentSection: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  recentSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyRecent: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyRecentText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyRecentSub: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 280,
  },
});

