import React, { useState, useEffect } from 'react';
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
import { ExpenseCard } from '../../components/common/ExpenseCard';
import { generateSpendingInsights } from '../../services/aiService';
import { Bell, Sparkles, ChevronRight, PlusCircle } from 'lucide-react-native';
import { useAppTheme } from '../../hooks/use-theme';
import { Expense } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const { expenses, budgets, deleteExpense, setDraftExpense } = useExpenseStore();
  const { colors, isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthKey));
  const totalSpentMonth = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleEditExpense = (expense: Expense) => {
    setDraftExpense(expense);
    router.push('/modal/add-expense');
  };

  const handleDeleteExpense = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this expense?')) {
        deleteExpense(id);
      }
    } else {
      Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
      ]);
    }
  };

  // Total monthly budget is sum of budgets or profile target limit
  const totalBudget = budgets.length > 0
    ? budgets.reduce((sum, b) => sum + (b.amount || 0), 0)
    : profile.totalBudgetLimit || 0;

  const monthName = new Date().toLocaleString('default', { month: 'long' });

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

  const recentExpenses = expenses.slice(0, 5);
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
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Hello,</Text>
              <Text style={[styles.userNameText, { color: colors.text }]}>
                {displayName}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/modal/ai-chat')}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Sparkles size={17} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={[
                styles.headerActionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
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

        {/* 1. Hero Balance / Spend Tracker */}
        <HeroBalanceCard
          totalSpent={totalSpentMonth}
          monthlyBudget={totalBudget}
          monthName={monthName}
        />

        {/* 2. Actions: Add, Scan, Voice, Advisor */}
        <QuickActionGrid
          onScanPress={() => router.push('/modal/scan')}
          onVoicePress={() => router.push('/modal/voice')}
          onManualPress={() => router.push('/modal/add-expense')}
          onAiChatPress={() => router.push('/modal/ai-chat')}
        />

        {/* 3. AI Insights Card */}
        <AIBudgetInsightCard insights={aiInsights} />

        {/* 4. Recent Transactions */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/expenses')}
              style={styles.viewAllBtn}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {recentExpenses.length === 0 ? (
            <View
              style={[
                styles.emptyRecent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <PlusCircle size={32} color={colors.primary} style={{ marginBottom: 10, opacity: 0.8 }} />
              <Text style={[styles.emptyRecentText, { color: colors.text }]}>
                No expenses logged yet
              </Text>
              <Text style={[styles.emptyRecentSub, { color: colors.textSecondary }]}>
                Tap Add, Scan, or Voice above to record your first transaction.
              </Text>
            </View>
          ) : (
            recentExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onPress={() => handleEditExpense(expense)}
                onDelete={() => handleDeleteExpense(expense.id)}
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
  recentSection: {
    marginHorizontal: 16,
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
    maxWidth: 260,
  },
});
