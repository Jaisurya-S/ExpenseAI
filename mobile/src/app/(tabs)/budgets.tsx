import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAppTheme } from '../../hooks/use-theme';
import { BudgetProgressBar } from '../../components/budgets/BudgetProgressBar';
import { ALL_CATEGORIES, CATEGORIES, INCOME_SOURCES } from '../../constants/categories';
import { ExpenseCategory, Budget, BudgetPeriod } from '../../types';
import {
  Plus,
  Wallet,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  ChevronRight,
} from 'lucide-react-native';

const THRESHOLD_OPTIONS = [70, 80, 90, 100];
const PERIOD_OPTIONS: { id: BudgetPeriod; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
];

const BUDGET_PRESETS = [2000, 5000, 10000, 20000, 50000];
const OPENING_PRESETS = [5000, 10000, 25000, 50000, 100000];

export default function BudgetsScreen() {
  const router = useRouter();
  const { profile, user } = useAuthStore();
  const currency = profile.currency || '₹';
  const {
    expenses,
    incomes,
    budgets,
    upsertBudget,
    upsertOverallBudget,
    deleteBudget,
    setOpeningBalance,
  } = useExpenseStore();
  const { colors, isDark } = useAppTheme();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'budgets' | 'income'>('budgets');

  // Modal states
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [openingBalanceModalVisible, setOpeningBalanceModalVisible] = useState(false);

  // Form states for Budget
  const [isOverallBudget, setIsOverallBudget] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('Food');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod>('monthly');
  const [selectedThreshold, setSelectedThreshold] = useState<number>(80);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  // Form states for Opening Balance
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  // Financial calculations
  const totalIncomeAllTime = useMemo(
    () => incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [incomes]
  );
  const totalExpenseAllTime = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );
  const availableBalance = totalIncomeAllTime - totalExpenseAllTime;

  const currentMonthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthKey));
  const currentMonthIncomes = incomes.filter((i) => i.date?.startsWith(currentMonthKey));

  const currentMonthSpent = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const currentMonthIncome = currentMonthIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Category spent map
  const categorySpentMap = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {};
    currentMonthExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [currentMonthExpenses]);

  // Income Sources map
  const incomeSourcesMap = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    currentMonthIncomes.forEach((i) => {
      map[i.source] = (map[i.source] || 0) + (Number(i.amount) || 0);
    });
    return map;
  }, [currentMonthIncomes]);

  const overallBudget = budgets.find((b) => b.isOverall);
  const categoryBudgets = budgets.filter((b) => !b.isOverall);
  const totalCategoryBudgeted = categoryBudgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const effectiveTotalBudget = overallBudget?.amount || totalCategoryBudgeted || profile.totalBudgetLimit || 0;
  const totalRemaining = Math.max(0, effectiveTotalBudget - currentMonthSpent);
  const totalPercentageUsed = effectiveTotalBudget > 0
    ? Math.round((currentMonthSpent / effectiveTotalBudget) * 100)
    : 0;

  const openAddBudgetModal = (existing?: Budget) => {
    if (existing) {
      setEditingBudgetId(existing.id);
      setIsOverallBudget(Boolean(existing.isOverall));
      setSelectedCategory(existing.category || 'Food');
      setBudgetAmount(existing.amount.toString());
      setSelectedPeriod(existing.period || 'monthly');
      setSelectedThreshold(existing.alertThreshold || 80);
    } else {
      setEditingBudgetId(null);
      setIsOverallBudget(false);
      const budgetedCats = categoryBudgets.map((b) => b.category);
      const unbudgeted = ALL_CATEGORIES.find((c) => !budgetedCats.includes(c));
      setSelectedCategory(unbudgeted || 'Food');
      setBudgetAmount('');
      setSelectedPeriod('monthly');
      setSelectedThreshold(80);
    }
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const amountNum = parseFloat(budgetAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      }
      return;
    }

    const userId = user?.uid || profile.uid || 'demo-user';

    if (isOverallBudget) {
      await upsertOverallBudget(userId, amountNum, selectedPeriod, selectedThreshold);
    } else {
      await upsertBudget(userId, selectedCategory, amountNum, {
        period: selectedPeriod,
        alertThreshold: selectedThreshold,
      });
    }

    setBudgetModalVisible(false);
  };

  const handleDeleteCurrentBudget = async () => {
    if (editingBudgetId) {
      const confirmDelete = async () => {
        await deleteBudget(editingBudgetId);
        setBudgetModalVisible(false);
      };

      if (Platform.OS === 'web') {
        if (window.confirm('Delete this budget?')) {
          await confirmDelete();
        }
      } else {
        Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]);
      }
    }
  };

  const handleSaveOpeningBalance = async () => {
    const amountNum = parseFloat(openingBalanceInput);
    if (isNaN(amountNum)) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a valid amount.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid number.');
      }
      return;
    }

    const userId = user?.uid || profile.uid || 'demo-user';
    await setOpeningBalance(userId, amountNum);
    setOpeningBalanceModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Budgets</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/modal/add-income')}
              style={[styles.addIncomeBtn, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}
            >
              <ArrowDownLeft size={14} color="#10B981" />
              <Text style={styles.addIncomeBtnText}>+ Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openAddBudgetModal()}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addBtnText}>New Limit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View
          style={[
            styles.tabBarContainer,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('budgets')}
            style={[
              styles.tabItem,
              activeTab === 'budgets' && [
                styles.tabItemActive,
                { backgroundColor: colors.card },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabItemText,
                {
                  color: activeTab === 'budgets' ? colors.text : colors.textSecondary,
                  fontWeight: activeTab === 'budgets' ? '700' : '500',
                },
              ]}
            >
              Categories ({categoryBudgets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('income')}
            style={[
              styles.tabItem,
              activeTab === 'income' && [
                styles.tabItemActive,
                { backgroundColor: colors.card },
              ],
            ]}
          >
            <Text
              style={[
                styles.tabItemText,
                {
                  color: activeTab === 'income' ? colors.text : colors.textSecondary,
                  fontWeight: activeTab === 'income' ? '700' : '500',
                },
              ]}
            >
              Income Sources ({Object.keys(incomeSourcesMap).length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Liquidity Card */}
          <View
            style={[
              styles.heroLiquidityCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.06)',
              },
            ]}
          >
            <View style={styles.liquidityTopRow}>
              <View>
                <Text style={[styles.liquidityCaption, { color: colors.textSecondary }]}>
                  Current Balance
                </Text>
                <Text
                  style={[
                    styles.liquidityAmount,
                    { color: availableBalance < 0 ? '#EF4444' : colors.text },
                  ]}
                >
                  {availableBalance < 0 ? '-' : ''}
                  {currency}
                  {Math.abs(availableBalance).toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const existingOpening = incomes.find(
                    (i) => i.isOpeningBalance || i.source === 'Opening Balance'
                  );
                  setOpeningBalanceInput(existingOpening ? existingOpening.amount.toString() : '0');
                  setOpeningBalanceModalVisible(true);
                }}
                style={[
                  styles.openingBalancePill,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <PiggyBank size={13} color="#10B981" />
                <Text style={[styles.openingBalancePillText, { color: colors.textSecondary }]}>
                  Opening Balance
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inflows vs Outflows */}
            <View
              style={[
                styles.liquidityGrid,
                { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
              ]}
            >
              <View style={styles.gridColumn}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Credits</Text>
                <Text style={[styles.gridValue, { color: '#10B981' }]}>
                  +{currency}{totalIncomeAllTime.toLocaleString('en-IN')}
                </Text>
              </View>

              <View
                style={[
                  styles.gridDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
                ]}
              />

              <View style={styles.gridColumn}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Debits</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  -{currency}{totalExpenseAllTime.toLocaleString('en-IN')}
                </Text>
              </View>

              <View
                style={[
                  styles.gridDivider,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
                ]}
              />

              <View style={styles.gridColumn}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>{monthName} Spent</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  {currency}{currentMonthSpent.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Master Monthly Target Limit Card */}
          {effectiveTotalBudget > 0 && (
            <View
              style={[
                styles.masterCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                  shadowColor: isDark ? '#000' : 'rgba(15, 23, 42, 0.05)',
                },
              ]}
            >
              <View style={styles.masterTop}>
                <View>
                  <Text style={[styles.masterSubtitle, { color: colors.textSecondary }]}>
                    {monthName} Spending Budget
                  </Text>
                  <Text style={[styles.masterAmount, { color: colors.text }]}>
                    {currency}{effectiveTotalBudget.toLocaleString('en-IN')}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setEditingBudgetId(overallBudget?.id || null);
                    setIsOverallBudget(true);
                    setBudgetAmount(effectiveTotalBudget > 0 ? effectiveTotalBudget.toString() : '');
                    setSelectedPeriod(overallBudget?.period || 'monthly');
                    setSelectedThreshold(overallBudget?.alertThreshold || 80);
                    setBudgetModalVisible(true);
                  }}
                  style={[
                    styles.masterEditBtn,
                    { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(29, 78, 216, 0.08)' },
                  ]}
                >
                  <Text style={[styles.masterEditText, { color: colors.primary }]}>
                    Edit Target
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.masterProgressTrack,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
                ]}
              >
                <View
                  style={[
                    styles.masterProgressFill,
                    {
                      width: `${Math.min(100, totalPercentageUsed)}%`,
                      backgroundColor:
                        totalPercentageUsed >= 100
                          ? '#EF4444'
                          : totalPercentageUsed >= 80
                          ? '#F59E0B'
                          : colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.masterFooter}>
                <Text style={[styles.footerSpent, { color: colors.textSecondary }]}>
                  {currency}{currentMonthSpent.toLocaleString('en-IN')} spent ({totalPercentageUsed}%)
                </Text>
                <Text style={[styles.footerRemaining, { color: totalRemaining > 0 ? colors.primary : '#EF4444' }]}>
                  {totalRemaining > 0 ? `${currency}${totalRemaining.toLocaleString('en-IN')} remaining` : 'Limit reached'}
                </Text>
              </View>
            </View>
          )}

          {/* Tab 1: Category Budgets */}
          {activeTab === 'budgets' && (
            <View style={styles.listSection}>
              {categoryBudgets.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Wallet size={24} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No category limits set</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => openAddBudgetModal()}
                    style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.emptyAddBtnText}>+ Set Category Limit</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                categoryBudgets.map((b) => (
                  <BudgetProgressBar
                    key={b.id}
                    budget={b}
                    spent={categorySpentMap[b.category || 'Other'] || 0}
                    onEdit={() => openAddBudgetModal(b)}
                  />
                ))
              )}
            </View>
          )}

          {/* Tab 2: Income Sources */}
          {activeTab === 'income' && (
            <View style={styles.listSection}>
              {Object.keys(incomeSourcesMap).length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <PiggyBank size={24} color="#10B981" style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No income recorded this month</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/modal/add-income')}
                    style={[styles.emptyAddBtn, { backgroundColor: '#10B981' }]}
                  >
                    <Text style={styles.emptyAddBtnText}>+ Add Income</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                Object.entries(incomeSourcesMap).map(([src, val]) => {
                  const meta = INCOME_SOURCES[src as keyof typeof INCOME_SOURCES] || INCOME_SOURCES.Other;
                  const ratio = currentMonthIncome > 0 ? Math.round(((val || 0) / currentMonthIncome) * 100) : 0;
                  return (
                    <View
                      key={src}
                      style={[
                        styles.incomeStreamCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    >
                      <View style={styles.incomeStreamTop}>
                        <View style={styles.incomeStreamLeft}>
                          <View style={[styles.incomeStreamIcon, { backgroundColor: meta.bgColor }]}>
                            <View style={[styles.incomeStreamDot, { backgroundColor: meta.color }]} />
                          </View>
                          <View>
                            <Text style={[styles.incomeStreamTitle, { color: colors.text }]}>
                              {meta.label}
                            </Text>
                            <Text style={[styles.incomeStreamSub, { color: colors.textMuted }]}>
                              {ratio}% of monthly income
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.incomeStreamVal}>
                          +{currency}{(val || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.incomeStreamTrack,
                          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' },
                        ]}
                      >
                        <View
                          style={[
                            styles.incomeStreamFill,
                            {
                              width: `${ratio}%`,
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
          )}
        </ScrollView>

        {/* Set/Edit Budget Modal */}
        <Modal
          visible={budgetModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBudgetModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingBudgetId ? 'Edit Budget' : 'Set Budget Limit'}
                </Text>
                <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Scope Switcher */}
              {!editingBudgetId && (
                <View
                  style={[
                    styles.modalScopeRow,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)' },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setIsOverallBudget(false)}
                    style={[
                      styles.modalScopeBtn,
                      !isOverallBudget && { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalScopeBtnText,
                        { color: !isOverallBudget ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Category Limit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsOverallBudget(true)}
                    style={[
                      styles.modalScopeBtn,
                      isOverallBudget && { backgroundColor: colors.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalScopeBtnText,
                        { color: isOverallBudget ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Overall Budget
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Category Picker */}
              {!isOverallBudget && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryPickerRow}
                  >
                    {ALL_CATEGORIES.map((cat) => {
                      const meta = CATEGORIES[cat];
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setSelectedCategory(cat)}
                          style={[
                            styles.catOption,
                            {
                              backgroundColor: isSelected ? meta.bgColor : isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                              borderColor: isSelected ? meta.color : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.catOptionText,
                              {
                                color: isSelected ? meta.color : colors.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {meta.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Limit Amount ({currency})
              </Text>
              <View
                style={[
                  styles.amountInputContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: colors.primary }]}>{currency}</Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  placeholder="5,000"
                  placeholderTextColor={colors.textMuted}
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                  autoFocus
                />
              </View>

              {/* Presets */}
              <View style={styles.presetRow}>
                {BUDGET_PRESETS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setBudgetAmount(amt.toString())}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.textSecondary }]}>
                      {currency}{amt.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSaveBudget}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.saveBtnText}>
                  Save Budget
                </Text>
              </TouchableOpacity>

              {editingBudgetId && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDeleteCurrentBudget}
                  style={styles.deleteModalBtn}
                >
                  <Text style={styles.deleteModalBtnText}>
                    Delete Budget
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        {/* Set Opening Balance Modal */}
        <Modal
          visible={openingBalanceModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setOpeningBalanceModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Set Opening Balance
                </Text>
                <TouchableOpacity onPress={() => setOpeningBalanceModalVisible(false)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Starting Balance ({currency})
              </Text>
              <View
                style={[
                  styles.amountInputContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: '#10B981' }]}>{currency}</Text>
                <TextInput
                  style={[styles.amountTextInput, { color: colors.text }]}
                  keyboardType="decimal-pad"
                  placeholder="25,000"
                  placeholderTextColor={colors.textMuted}
                  value={openingBalanceInput}
                  onChangeText={setOpeningBalanceInput}
                  autoFocus
                />
              </View>

              {/* Opening Presets */}
              <View style={styles.presetRow}>
                {OPENING_PRESETS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setOpeningBalanceInput(amt.toString())}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                  >
                    <Text style={[styles.presetChipText, { color: '#10B981' }]}>
                      {currency}{amt.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSaveOpeningBalance}
                style={[styles.saveBtn, { backgroundColor: '#10B981' }]}
              >
                <Text style={styles.saveBtnText}>
                  Save Balance
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addIncomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addIncomeBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBarContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    marginTop: 6,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tabItemText: {
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  heroLiquidityCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  liquidityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  liquidityCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  liquidityAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  openingBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  openingBalancePillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  liquidityGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  gridColumn: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  gridDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  masterCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  masterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  masterSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  masterAmount: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  masterEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  masterEditText: {
    fontSize: 11,
    fontWeight: '600',
  },
  masterProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  masterProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  masterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerSpent: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerRemaining: {
    fontSize: 11,
    fontWeight: '600',
  },
  listSection: {},
  emptyState: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  incomeStreamCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  incomeStreamTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incomeStreamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomeStreamIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeStreamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  incomeStreamTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  incomeStreamSub: {
    fontSize: 11,
    marginTop: 1,
  },
  incomeStreamVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  incomeStreamTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  incomeStreamFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalScopeRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalScopeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalScopeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryPickerRow: {
    gap: 6,
    paddingBottom: 6,
  },
  catOption: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catOptionText: {
    fontSize: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteModalBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteModalBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
