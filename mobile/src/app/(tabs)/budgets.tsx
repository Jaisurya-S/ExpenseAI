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
} from '../../components/ui/icons';

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
  const monthName = new Date().toLocaleString('default', { month: 'short' });

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
        window.alert('Please enter a valid positive number for the budget limit.');
      } else {
        Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
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

  const handleDeleteBudget = async (id: string) => {
    const msg = 'Are you sure you want to remove this budget?';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        deleteBudget(id);
        setBudgetModalVisible(false);
      }
    } else {
      Alert.alert('Delete Budget', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBudget(id);
            setBudgetModalVisible(false);
          },
        },
      ]);
    }
  };

  const handleSaveOpeningBalance = async () => {
    const amountNum = parseFloat(openingBalanceInput);
    if (isNaN(amountNum) || amountNum < 0) {
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Budgets & Balance</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openAddBudgetModal()}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={14} color={colors.primaryText} />
              <Text style={[styles.addBtnText, { color: colors.primaryText }]}>New Budget</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
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
              activeOpacity={0.8}
              onPress={() => setActiveTab('budgets')}
              style={[
                styles.segmentTab,
                activeTab === 'budgets' && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'budgets' ? colors.text : colors.textMuted,
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
                styles.segmentTab,
                activeTab === 'income' && {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  {
                    color: activeTab === 'income' ? colors.text : colors.textMuted,
                    fontWeight: activeTab === 'income' ? '700' : '500',
                  },
                ]}
              >
                Income Sources ({Object.keys(incomeSourcesMap).length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Overview Card */}
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.overviewTopRow}>
              <View>
                <Text style={[styles.overviewCaption, { color: colors.textSecondary }]}>
                  Current Balance
                </Text>
                <Text
                  style={[
                    styles.overviewAmount,
                    { color: availableBalance < 0 ? colors.danger : colors.text },
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
                  styles.openingPill,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <PiggyBank size={13} color={colors.textSecondary} />
                <Text style={[styles.openingPillText, { color: colors.textSecondary }]}>
                  Opening Balance
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inflow & Outflow columns */}
            <View
              style={[
                styles.overviewGrid,
                { borderTopColor: colors.cardBorder },
              ]}
            >
              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Credits</Text>
                <Text style={[styles.gridValue, { color: colors.success }]}>
                  +{currency}{totalIncomeAllTime.toLocaleString('en-IN')}
                </Text>
              </View>

              <View
                style={[
                  styles.gridDivider,
                  { backgroundColor: colors.cardBorder },
                ]}
              />

              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Debits</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  -{currency}{totalExpenseAllTime.toLocaleString('en-IN')}
                </Text>
              </View>

              <View
                style={[
                  styles.gridDivider,
                  { backgroundColor: colors.cardBorder },
                ]}
              />

              <View style={styles.gridCol}>
                <Text style={[styles.gridLabel, { color: colors.textMuted }]}>{monthName} Spent</Text>
                <Text style={[styles.gridValue, { color: colors.text }]}>
                  {currency}{currentMonthSpent.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Monthly Target Budget Card */}
          {effectiveTotalBudget > 0 && (
            <View
              style={[
                styles.targetCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View style={styles.targetTop}>
                <View>
                  <Text style={[styles.targetSubtitle, { color: colors.textSecondary }]}>
                    {monthName} Spending Budget
                  </Text>
                  <Text style={[styles.targetAmount, { color: colors.text }]}>
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
                    styles.targetEditBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.targetEditText, { color: colors.text }]}>
                    Edit Limit
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.targetTrack,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                ]}
              >
                <View
                  style={[
                    styles.targetBar,
                    {
                      width: `${Math.min(100, totalPercentageUsed)}%`,
                      backgroundColor:
                        totalPercentageUsed >= 100
                          ? colors.danger
                          : totalPercentageUsed >= 80
                          ? colors.accentYellow
                          : colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.targetFooter}>
                <Text style={[styles.targetFooterText, { color: colors.textSecondary }]}>
                  {currency}{currentMonthSpent.toLocaleString('en-IN')} spent
                </Text>
                <Text style={[styles.targetFooterText, { color: totalRemaining > 0 ? colors.success : colors.danger }]}>
                  {currency}{totalRemaining.toLocaleString('en-IN')} remaining ({totalPercentageUsed}%)
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'budgets' ? (
            /* Category Budgets Tab */
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Category Allocations
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openAddBudgetModal()}
                >
                  <Text style={[styles.sectionActionText, { color: colors.textSecondary }]}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {categoryBudgets.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.emptyBoxTitle, { color: colors.text }]}>
                    No category budgets configured
                  </Text>
                  <Text style={[styles.emptyBoxSub, { color: colors.textMuted }]}>
                    Set spending limits on specific categories to keep your expenses in check.
                  </Text>
                </View>
              ) : (
                categoryBudgets.map((b) => {
                  const spent = categorySpentMap[b.category as ExpenseCategory] || 0;
                  return (
                    <BudgetProgressBar
                      key={b.id}
                      budget={b}
                      spent={spent}
                      onEdit={() => openAddBudgetModal(b)}
                    />
                  );
                })
              )}
            </View>
          ) : (
            /* Income Sources Tab */
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Income Sources ({monthName})
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/modal/add-income')}
                >
                  <Text style={[styles.sectionActionText, { color: colors.textSecondary }]}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {Object.keys(incomeSourcesMap).length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.emptyBoxTitle, { color: colors.text }]}>
                    No income logged for this month
                  </Text>
                  <Text style={[styles.emptyBoxSub, { color: colors.textMuted }]}>
                    Tap "+ Income" above to log your salary, freelance, or other earnings.
                  </Text>
                </View>
              ) : (
                Object.entries(incomeSourcesMap).map(([source, amount]) => {
                  const safeAmount = amount || 0;
                  const percentOfTotal = currentMonthIncome > 0
                    ? Math.round((safeAmount / currentMonthIncome) * 100)
                    : 0;

                  return (
                    <View
                      key={source}
                      style={[
                        styles.incomeItemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                          shadowColor: colors.cardShadow,
                        },
                      ]}
                    >
                      <View style={styles.incomeItemTop}>
                        <Text style={[styles.incomeSourceTitle, { color: colors.text }]}>
                          {source}
                        </Text>
                        <Text style={[styles.incomeAmountText, { color: colors.success }]}>
                          +{currency}{safeAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.incomeTrack,
                          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' },
                        ]}
                      >
                        <View
                          style={[
                            styles.incomeBar,
                            {
                              width: `${percentOfTotal}%`,
                              backgroundColor: colors.success,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.incomeSubPercent, { color: colors.textMuted }]}>
                        {percentOfTotal}% of monthly inflow
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* Budget Modal */}
        <Modal
          visible={budgetModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setBudgetModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingBudgetId ? 'Edit Budget Limit' : 'New Spending Limit'}
                </Text>
                <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Overall vs Category Switch */}
              <View
                style={[
                  styles.modalSwitchRow,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setIsOverallBudget(false)}
                  style={[
                    styles.modalSwitchBtn,
                    !isOverallBudget && {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalSwitchBtnText,
                      { color: !isOverallBudget ? colors.text : colors.textMuted, fontWeight: !isOverallBudget ? '700' : '500' },
                    ]}
                  >
                    Category
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsOverallBudget(true)}
                  style={[
                    styles.modalSwitchBtn,
                    isOverallBudget && {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalSwitchBtnText,
                      { color: isOverallBudget ? colors.text : colors.textMuted, fontWeight: isOverallBudget ? '700' : '500' },
                    ]}
                  >
                    Overall Total
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker if Category budget */}
              {!isOverallBudget && (
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Select Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPickerScroll}>
                    {ALL_CATEGORIES.map((cat) => {
                      const isSel = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setSelectedCategory(cat)}
                          style={[
                            styles.categoryPickChip,
                            {
                              backgroundColor: isSel ? colors.primary : colors.card,
                              borderColor: isSel ? colors.primary : colors.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.categoryPickText, { color: isSel ? colors.primaryText : colors.text }]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Budget Limit ({currency})</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="e.g. 5000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                />

                {/* Preset Chips */}
                <View style={styles.presetRow}>
                  {BUDGET_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => setBudgetAmount(preset.toString())}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                        {currency}{preset.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalFooter}>
                {editingBudgetId && (
                  <TouchableOpacity
                    onPress={() => handleDeleteBudget(editingBudgetId)}
                    style={[
                      styles.modalDeleteBtn,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                        borderColor: colors.dangerBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.modalDeleteText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleSaveBudget}
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalSaveText, { color: colors.primaryText }]}>
                    Save Budget
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Opening Balance Modal */}
        <Modal
          visible={openingBalanceModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setOpeningBalanceModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Opening Balance
                </Text>
                <TouchableOpacity onPress={() => setOpeningBalanceModalVisible(false)}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.openingBalanceHint, { color: colors.textSecondary }]}>
                Set the starting liquidity available in your bank/cash before tracking transactions.
              </Text>

              <View style={styles.formGroup}>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      color: colors.text,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  placeholder="e.g. 25000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={openingBalanceInput}
                  onChangeText={setOpeningBalanceInput}
                />

                <View style={styles.presetRow}>
                  {OPENING_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => setOpeningBalanceInput(preset.toString())}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.presetText, { color: colors.textSecondary }]}>
                        {currency}{preset.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={handleSaveOpeningBalance}
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalSaveText, { color: colors.primaryText }]}>
                    Save Opening Balance
                  </Text>
                </TouchableOpacity>
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  segmentTabText: {
    fontSize: 12.5,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  overviewCaption: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  overviewAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  openingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  openingPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overviewGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  gridCol: {
    flex: 1,
    alignItems: 'center',
  },
  gridDivider: {
    width: 1,
    height: '100%',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  targetCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  targetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  targetAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  targetEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetEditText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  targetTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  targetBar: {
    height: '100%',
    borderRadius: 3,
  },
  targetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  targetFooterText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  sectionContainer: {
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionActionText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyBox: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyBoxTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyBoxSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  incomeItemCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  incomeItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incomeSourceTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  incomeAmountText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  incomeTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  incomeBar: {
    height: '100%',
    borderRadius: 2.5,
  },
  incomeSubPercent: {
    fontSize: 11,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalSwitchBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  modalSwitchBtnText: {
    fontSize: 12.5,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryPickerScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryPickText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '500',
  },
  openingBalanceHint: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalDeleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
