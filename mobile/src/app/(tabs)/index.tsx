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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { HeroBalanceCard } from '../../components/home/HeroBalanceCard';
import { QuickActionGrid } from '../../components/home/QuickActionGrid';
import { AIBudgetInsightCard } from '../../components/home/AIBudgetInsightCard';
import { TransactionCard } from '../../components/common/TransactionCard';
import { generateSpendingInsights } from '../../services/aiService';
import { Bell, Sparkles, ChevronRight, ArrowDownLeft, ArrowUpRight, TrendingUp } from '../../components/ui/icons';
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
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('default', { month: 'short' });

  // Calculations
  const totalIncomeAllTime = useMemo(
    () => incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [incomes]
  );
  const totalExpenseAllTime = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  // Available Balance
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

  const recentTransactions = unifiedTransactions.slice(0, 6);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* Top Header Bar with Brand Logo & User Profile */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.headerLogoContainer,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.headerLogoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextCol}>
              <Text style={[styles.brandTitleText, { color: colors.text }]}>ExpenseAI</Text>
              <Text style={[styles.brandSubtitleText, { color: colors.textMuted }]}>Smart Finance</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.userProfileBtn}
          >
            <View style={styles.userInfoTextCol}>
              <Text style={[styles.greetingText, { color: colors.textMuted }]}>Account</Text>
              <Text style={[styles.userNameText, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.text }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 1. Hero Balance Card */}
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

        {/* 2. Quick Action Grid */}
        <QuickActionGrid
          onScanPress={() => router.push('/modal/scan')}
          onVoicePress={() => router.push('/modal/voice')}
          onAddExpensePress={() => router.push('/modal/add-expense')}
          onAiChatPress={() => router.push('/modal/ai-chat')}
        />

        {/* 3. Monthly Cash Flow Summary Bar */}
        {(monthIncomeTotal > 0 || monthExpenseTotal > 0) && (
          <View
            style={[
              styles.cashflowCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.cashflowHeader}>
              <View style={styles.cashflowTitleRow}>
                <TrendingUp size={14} color={colors.text} />
                <Text style={[styles.cashflowTitle, { color: colors.text }]}>
                  {monthName} Cash Flow
                </Text>
              </View>
              <View
                style={[
                  styles.savingsBadge,
                  {
                    backgroundColor:
                      monthNetSavings >= 0 ? colors.successBg : colors.dangerBg,
                    borderColor:
                      monthNetSavings >= 0 ? 'rgba(16, 185, 129, 0.2)' : colors.dangerBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.savingsBadgeText,
                    { color: monthNetSavings >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  Net: {monthNetSavings >= 0 ? '+' : ''}{currency}{monthNetSavings.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.ratioBarContainer,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
            >
              <View
                style={[
                  styles.ratioBarIncome,
                  {
                    flex: Math.max(1, monthIncomeTotal),
                    backgroundColor: colors.success,
                  },
                ]}
              />
              <View
                style={[
                  styles.ratioBarExpense,
                  {
                    flex: Math.max(1, monthExpenseTotal),
                    backgroundColor: colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.ratioLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  +{currency}{monthIncomeTotal.toLocaleString('en-IN')} In
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.text }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                  -{currency}{monthExpenseTotal.toLocaleString('en-IN')} Out
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 4. AI Advisor Insight */}
        <AIBudgetInsightCard insights={aiInsights} />

        {/* 5. Recent Activity List */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/expenses')}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>View all</Text>
              <ChevronRight size={13} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyRecent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.emptyRecentText, { color: colors.textSecondary }]}>
                No transactions recorded yet
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
    paddingVertical: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoContainer: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  brandSubtitleText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 13,
  },
  userInfoTextCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cashflowCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  savingsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratioBarContainer: {
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  ratioBarIncome: {
    height: '100%',
  },
  ratioBarExpense: {
    height: '100%',
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  recentSection: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  emptyRecent: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyRecentText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
